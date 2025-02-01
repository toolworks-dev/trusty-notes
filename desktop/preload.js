const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron
  },
  minimizeToTray: () => {
    const window = require('@electron/remote').getCurrentWindow()
    window.minimize()
  },
  updates: {
    onUpdateAvailable: (callback) => {
      console.log('Registering update listener')
      ipcRenderer.on('update-available', (_, info) => {
        console.log('Update available:', info)
        callback(info)
      })
    },
    openReleasePage: (url) => {
      console.log('Opening release page:', url)
      shell.openExternal(url)
    }
  }
})

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded')
}) 