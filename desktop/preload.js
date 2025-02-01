const { contextBridge } = require('electron')

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
  }
})

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded')
}) 