const { app, BrowserWindow, protocol, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const url = require('url')

let tray = null
let win = null

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('TrustyNotes')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    win.show()
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false
    }
  })

  win.on('minimize', (event) => {
    event.preventDefault()
    win.hide()
  })

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      win.hide()
      return false
    }
    return true
  })

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https: file:; " +
          "connect-src 'self' https: file:; " +
          "frame-src 'none';"
        ]
      }
    })
  })

  win.webContents.session.webRequest.onBeforeRequest({ 
    urls: ['https://plausible.toolworks.dev/*'] 
  }, (details, callback) => {
    callback({ cancel: true })
  })

  const indexPath = path.join(__dirname, 'dist', 'index.html')
  console.log('Loading from:', indexPath)
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath)
    app.quit()
    return
  }

  win.loadFile(indexPath).catch(err => {
    console.error('Failed to load index.html:', err)
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully')
  })
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURIComponent(url.fileURLToPath(request.url))
    console.log('File request:', request.url)
    console.log('Resolved path:', pathname)
    
    try {
      if (fs.existsSync(pathname)) {
        callback(pathname)
      } else {
        console.error('File not found:', pathname)
        callback({ error: -6 })
      }
    } catch (error) {
      console.error('Protocol error:', error)
      callback({ error: -2 })
    }
  })
  
  createWindow()
  createTray()
}).catch(err => {
  console.error('Failed to initialize app:', err)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
}) 