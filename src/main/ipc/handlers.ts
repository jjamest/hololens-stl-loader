import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

interface CopyResult {
  success: boolean
  destinationPath?: string
  message?: string
  error?: string
}

// Helper function to update ButtonUI.cs with new STL filename
const updateButtonUIScript = async (
  unityProjectPath: string,
  newStlFileName: string
): Promise<void> => {
  const buttonUIPath = path.join(unityProjectPath, 'Assets', 'Scripts', 'ButtonUI.cs')

  try {
    // Check if ButtonUI.cs exists
    await fs.access(buttonUIPath)
    console.log('ButtonUI.cs found, updating STL reference...')

    // Read the current content
    const content = await fs.readFile(buttonUIPath, 'utf-8')

    // Regular expression to find and replace the STL filename in the Path.Combine line
    // This matches: Path.Combine(Application.dataPath, "Models", "any-filename.stl")
    const stlPathRegex =
      /(Path\.Combine\s*\(\s*Application\.dataPath\s*,\s*"Models"\s*,\s*")[^"]+\.stl("\s*\)\s*;)/g

    // Replace with the new filename
    const updatedContent = content.replace(stlPathRegex, `$1${newStlFileName}$2`)

    // Check if any replacement was made
    if (content !== updatedContent) {
      // Write the updated content back
      await fs.writeFile(buttonUIPath, updatedContent, 'utf-8')
      console.log(`Successfully updated ButtonUI.cs with new STL file: ${newStlFileName}`)
    } else {
      console.log('No STL path found in ButtonUI.cs to update')
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      console.log('ButtonUI.cs not found, skipping script update')
    } else {
      console.error('Error updating ButtonUI.cs:', error)
      throw error
    }
  }
}

export const setupIpcHandlers = (): void => {
  // File selection handlers
  ipcMain.handle('select-stl-file', async () => {
    const dialogOptions = {
      properties: ['openFile'] as 'openFile'[],
      filters: [
        { name: 'STL Files', extensions: ['stl', 'obj'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    return result.canceled ? null : result.filePaths[0] || null
  })

  ipcMain.handle('select-unity-project', async () => {
    const dialogOptions = {
      properties: ['openDirectory'] as 'openDirectory'[]
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    return result.canceled ? null : result.filePaths[0] || null
  })

  // STL copy handler
  ipcMain.handle(
    'copy-stl-to-unity',
    async (_, stlFilePath: string, unityProjectPath: string): Promise<CopyResult> => {
      try {
        if (!stlFilePath || !unityProjectPath) {
          throw new Error('Both STL file path and Unity project path are required')
        }

        console.log('Copy operation starting...')
        console.log('STL file path:', stlFilePath)
        console.log('Unity project path:', unityProjectPath)

        // Verify STL file exists
        await fs.access(stlFilePath)
        console.log('STL file exists and is accessible')

        // Setup destination paths
        const assetsFolder = path.join(unityProjectPath, 'Assets')
        const modelsFolder = path.join(assetsFolder, 'Models')

        console.log('Target Assets folder:', assetsFolder)
        console.log('Target Models folder:', modelsFolder)

        // Create directory structure
        await fs.mkdir(modelsFolder, { recursive: true })
        console.log('Directory structure ensured')

        // Copy file
        const fileName = path.basename(stlFilePath)
        const destinationPath = path.join(modelsFolder, fileName)

        console.log('Copying from:', stlFilePath)
        console.log('Copying to:', destinationPath)

        await fs.copyFile(stlFilePath, destinationPath)
        console.log('File copied successfully!')

        // Verify copy
        await fs.access(destinationPath)
        console.log('Copy verified: File exists at destination')

        // Update ButtonUI.cs script with new STL filename
        try {
          await updateButtonUIScript(unityProjectPath, fileName)
          console.log('ButtonUI.cs update completed')
        } catch (updateError) {
          console.warn('Warning: Could not update ButtonUI.cs:', updateError)
          // Don't fail the entire operation if script update fails
        }

        return {
          success: true,
          destinationPath,
          message: `STL file copied successfully to ${destinationPath} and ButtonUI.cs updated`
        }
      } catch (error) {
        console.error('Error copying STL file:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    }
  )
}
