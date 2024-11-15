import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

const app = express();
let client;
let db;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body) {
    console.log('Body:', {
      hasPublicKey: !!req.body.public_key,
      notesCount: req.body.notes?.length,
      clientVersion: req.body.client_version
    });
  }
  next();
});

async function setupDatabase() {
  try {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: ServerApiVersion.v1,
    });

    await client.connect();
    db = client.db('notes-sync');
    
    await db.collection('notes').createIndexes([
      { key: { public_key: 1 } },
      { key: { public_key: 1, id: 1 }, unique: true },
      { key: { timestamp: -1 } },
    ]);

    await db.collection('users').createIndex(
      { last_sync: 1 },
      { expireAfterSeconds: 180 * 24 * 60 * 60 }
    );

    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

app.post('/api/sync', async (req, res) => {
  console.log('Received sync request:', {
    hasPublicKey: !!req.body.public_key,
    notesCount: req.body.notes?.length,
    clientVersion: req.body.client_version,
    contentType: req.headers['content-type']
  });

  const { public_key, notes, client_version } = req.body;

  if (!public_key || !Array.isArray(notes)) {
    console.log('Invalid request format:', { 
      hasPublicKey: !!public_key, 
      hasNotes: !!notes,
      isNotesArray: Array.isArray(notes)
    });
    return res.status(400).json({ 
      error: 'Invalid request format',
      details: {
        hasPublicKey: !!public_key,
        hasNotes: !!notes,
        isNotesArray: Array.isArray(notes)
      }
    });
  }

  const MIN_CLIENT_VERSION = '0.1.0';
  if (client_version < MIN_CLIENT_VERSION) {
    return res.status(400).json({ 
      error: 'Please update your client to the latest version' 
    });
  }

  try {
    // Update user's last sync time
    await db.collection('users').updateOne(
      { public_key },
      { 
        $set: { last_sync: new Date() },
        $inc: { sync_count: 1 }
      },
      { upsert: true }
    );

    const results = await processNotes(public_key, notes);
    
    // Log the response we're about to send
    console.log('Sending sync response:', {
      notesCount: results.notes.length,
      updatedIds: results.updated,
      conflictIds: results.conflicts
    });

    await db.collection('sync_logs').insertOne({
      public_key,
      timestamp: new Date(),
      notes_count: notes.length,
      success: true,
      response: {
        notes_count: results.notes.length,
        updated_count: results.updated.length,
        conflicts_count: results.conflicts.length
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Sync error:', error);
    
    await db.collection('error_logs').insertOne({
      public_key,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

async function processNotes(public_key, incoming_notes) {
  const session = client.startSession();
  
  try {
    const results = await session.withTransaction(async () => {
      const notesCollection = db.collection('notes');
      const results = { 
        notes: [],
        updated: [], 
        conflicts: [] 
      };

      // Process incoming notes
      for (const note of incoming_notes) {
        const existing = await notesCollection.findOne({
          public_key,
          id: note.id,
        });

        if (!existing || existing.timestamp < note.timestamp) {
          if (note.deleted) {
            // If note is marked as deleted, remove it from the database
            await notesCollection.deleteOne({ public_key, id: note.id });
          } else {
            // Otherwise update/insert the note
            await notesCollection.updateOne(
              { public_key, id: note.id },
              { $set: { ...note, public_key } },
              { upsert: true }
            );
          }
          results.updated.push(note.id);
        } else if (existing.timestamp === note.timestamp && 
                  existing.signature !== note.signature) {
          results.conflicts.push(note.id);
        }
      }

      // Fetch all non-deleted notes for this user
      const allNotes = await notesCollection
        .find({ 
          public_key,
          deleted: { $ne: true }
        })
        .toArray();
      
      results.notes = allNotes.map(note => ({
        id: note.id,
        data: note.data,
        nonce: note.nonce,
        timestamp: note.timestamp,
        signature: note.signature,
        deleted: note.deleted
      }));

      return results;
    });

    return results;
  } finally {
    await session.endSession();
  }
}
app.get('/api/health', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ 
      status: 'healthy',
      database: 'connected',
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    path: req.path
  });
});

const PORT = process.env.PORT || 3222;

setupDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`Sync endpoint: http://localhost:${PORT}/api/sync`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Allowed origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  try {
    await client?.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});