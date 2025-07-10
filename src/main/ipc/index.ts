// Main IPC setup - exports all handler functions
export { setupIpcHandlers } from './handlers'

// This index file allows easy expansion:
// - Add new handler files (e.g., './user-handlers', './settings-handlers')
// - Export them here
// - Import and call them in main/index.ts 