const { app, BrowserWindow, protocol, Tray, Menu, shell, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const url = require('url')
const windowStateKeeper = require('electron-window-state')
const https = require('https')

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
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 720
  })

  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false
    }
  })

  mainWindowState.manage(win)

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

  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools()
  }
}

function compareVersions(v1, v2) {
  const normalize = v => v.split('.').map(Number)
  const a = normalize(v1)
  const b = normalize(v2)
  
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0
    const y = b[i] || 0
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

function checkForUpdates() {
  const currentVersion = app.getVersion()
  console.log('Checking for updates. Current version:', currentVersion)
  
  const options = {
    hostname: 'api.github.com',
    path: '/repos/toolworks-dev/trusty-notes/releases/latest',
    headers: {
      'User-Agent': 'TrustyNotes',
      'Accept': 'application/vnd.github.v3+json'
    }
  }

  https.get(options, (res) => {
    let data = ''
    
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      try {
        const release = JSON.parse(data)
        console.log('GitHub response:', release)
        
        if (res.statusCode === 200 && release.tag_name) {
          const latestVersion = release.tag_name.replace('v', '')
          console.log('Latest version from GitHub:', latestVersion)
          
          if (compareVersions(currentVersion, latestVersion) < 0) {
            console.log('Update available, showing system notification')
            const notification = new Notification({
              title: 'TrustyNotes Update Available',
              body: `Version ${latestVersion} is available. Click to download.`,
              icon: path.join(__dirname, 'icon.png')
            })

            notification.on('click', () => {
              shell.openExternal(release.html_url)
            })

            notification.show()
          } else {
            console.log('No update needed')
          }
        } else {
          console.error('Invalid GitHub response:', res.statusCode, release)
        }
      } catch (error) {
        console.error('Failed to parse release info:', error)
        console.error('Response data:', data)
      }
    })
  }).on('error', (error) => {
    console.error('Failed to check for updates:', error)
  })
}

function setupUpdateChecker() {
  console.log('Setting up update checker')
  
  // Check immediately
  checkForUpdates()
  
  // Then check every hour
  const interval = setInterval(checkForUpdates, 60 * 60 * 1000)
  
  // Clean up interval on window close
  win.on('closed', () => clearInterval(interval))
}

function createAppMenu() {
  const isMac = process.platform === 'darwin'
  
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('new-note')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function handleAppQuit() {
  win.webContents.send('app-quitting')
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  app.quit()
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
  setupUpdateChecker()
  createAppMenu()

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('trustynotes', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('trustynotes')
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    const noteId = new URL(url).searchParams.get('note')
    if (noteId) {
      win.webContents.send('open-note', noteId)
    }
  })
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