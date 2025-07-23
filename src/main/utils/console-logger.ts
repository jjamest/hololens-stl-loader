import { BrowserWindow } from 'electron'

interface LogData {
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: string
  source: 'main' | 'renderer'
}

class ConsoleLogger {
  private mainWindow: BrowserWindow | null = null
  private originalMethods: {
    log: typeof console.log
    error: typeof console.error
    warn: typeof console.warn
    info: typeof console.info
  }

  constructor() {
    // Store original console methods
    this.originalMethods = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    this.setupMainProcessLogging()
  }

  private sendLogToRenderer(
    level: LogData['level'],
    message: string,
    source: LogData['source'] = 'main'
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const logData: LogData = {
        level,
        message,
        timestamp: new Date().toISOString(),
        source
      }
      this.mainWindow.webContents.send('console-log', logData)
    }
  }

  private setupMainProcessLogging(): void {
    // Override console methods to send to renderer
    console.log = (...args) => {
      this.originalMethods.log(...args)
      this.sendLogToRenderer('log', args.join(' '))
    }

    console.error = (...args) => {
      this.originalMethods.error(...args)
      this.sendLogToRenderer('error', args.join(' '))
    }

    console.warn = (...args) => {
      this.originalMethods.warn(...args)
      this.sendLogToRenderer('warn', args.join(' '))
    }

    console.info = (...args) => {
      this.originalMethods.info(...args)
      this.sendLogToRenderer('info', args.join(' '))
    }
  }

  cleanup(): void {
    // Restore original console methods
    console.log = this.originalMethods.log
    console.error = this.originalMethods.error
    console.warn = this.originalMethods.warn
    console.info = this.originalMethods.info
  }
}

export const consoleLogger = new ConsoleLogger()
