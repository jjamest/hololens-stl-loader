import { app, shell, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupIpcHandlers } from './ipc'
import { consoleLogger } from './utils/console-logger'

console.log('[main] Starting Electron main process')

// Store reference to main window for IPC communication
let mainWindow: BrowserWindow | null = null

// Create application menu with zoom shortcuts
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.reload()
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow?.webContents.reloadIgnoringCache()
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow?.webContents.toggleDevTools()
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.zoomLevel = 0
            }
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow?.webContents.zoomLevel || 0
            mainWindow?.webContents.setZoomLevel(currentZoom + 0.5)
          }
        },
        {
          label: 'Zoom In (Alternative)',
          accelerator: 'CmdOrCtrl+=',
          visible: false,
          click: () => {
            const currentZoom = mainWindow?.webContents.zoomLevel || 0
            mainWindow?.webContents.setZoomLevel(currentZoom + 0.5)
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow?.webContents.zoomLevel || 0
            mainWindow?.webContents.setZoomLevel(currentZoom - 0.5)
          }
        }
      ]
    }
  ]

  // Add macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false, // Changed to false to show menu with zoom shortcuts
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Create menu with zoom shortcuts
  createMenu()

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    mainWindow!.maximize() // Maximize the window instead of fullscreen
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    consoleLogger.cleanup()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the application
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Set up console logging after window is ready
  consoleLogger.setMainWindow(mainWindow)

  // Log application start only from main process
  console.log('Application started')
}

// App initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.inova.holovision')

  setupIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
