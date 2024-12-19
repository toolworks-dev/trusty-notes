db = db.getSiblingDB('admin')

const rootUser = db.getUser(process.env.MONGO_INITDB_ROOT_USERNAME)
if (!rootUser) {
  db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
    roles: [
      { role: 'root', db: 'admin' },
      { role: 'readWrite', db: 'notes-sync' },
      { role: 'dbAdmin', db: 'notes-sync' }
    ]
  })
}

db = db.getSiblingDB('notes-sync')

const notesUser = db.getUser(process.env.MONGO_INITDB_ROOT_USERNAME)
if (!notesUser) {
  db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
    roles: [
      { role: 'readWrite', db: 'notes-sync' },
      { role: 'dbAdmin', db: 'notes-sync' }
    ]
  })
} 