import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
      properties: ['openFile', 'multiSelections'] as ('openFile' | 'multiSelections')[],
      filters: [
        { name: 'STL Files', extensions: ['stl', 'obj'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    return result.canceled ? null : result.filePaths
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
    async (_, stlFilePaths: string[], unityProjectPath: string): Promise<CopyResult[]> => {
      try {
        if (!stlFilePaths?.length || !unityProjectPath) {
          throw new Error('Both STL file paths and Unity project path are required')
        }

        const results: CopyResult[] = []
        const assetsFolder = path.join(unityProjectPath, 'Assets', 'Resources')
        const modelsFolder = path.join(assetsFolder, 'Models')

        console.log('Target Assets folder:', assetsFolder)
        console.log('Target Models folder:', modelsFolder)

        // Create directory structure
        await fs.mkdir(modelsFolder, { recursive: true })

        for (const filePath of stlFilePaths) {
          try {
            console.log('Processing file:', filePath)
            await fs.access(filePath)

            const fileExt = path.extname(filePath).toLowerCase()
            let destinationPath = ''
            let fileName = ''
            let objFilePath: string | undefined

            if (fileExt === '.stl') {
              // Convert STL to OBJ
              console.log('Converting STL to OBJ...')
              objFilePath = await convertStlToObj(filePath)
              if (!objFilePath) {
                throw new Error('OBJ file path is undefined after conversion')
              }
              fileName = path.basename(objFilePath)
              destinationPath = path.join(modelsFolder, fileName)
            } else if (fileExt === '.obj') {
              fileName = path.basename(filePath)
              destinationPath = path.join(modelsFolder, fileName)
            } else {
              throw new Error(`Unsupported file type: ${fileExt}`)
            }

            // Copy the file (either original OBJ or converted OBJ)
            await fs.copyFile(fileExt === '.stl' && objFilePath ? objFilePath : filePath, destinationPath)
            await fs.access(destinationPath)

            try {
              await updateButtonUIScript(unityProjectPath, fileName)
            } catch (updateError) {
              console.warn('Warning: Could not update ButtonUI.cs:', updateError)
            }

            results.push({
              success: true,
              destinationPath,
              message: `File copied successfully to ${destinationPath}`
            })
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            })
          }
        }

        return results
      } catch (error) {
        return [{
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }]
      }
    }
  )

  // Helper function for STL to OBJ conversion
  const convertStlToObj = async (stlFilePath: string): Promise<string> => {
    try {
      // Create output path for OBJ file
      const objFilePath = stlFilePath.replace(/\.stl$/i, '.obj')
      
      // Use a command-line tool like assimp for conversion
      // You'll need to have assimp installed on the system
      const { stderr } = await execAsync(
        `assimp export "${stlFilePath}" "${objFilePath}"`
      )

      if (stderr) {
        console.error('Conversion warning:', stderr)
      }

      // Verify the output file exists
      await fs.access(objFilePath)
      
      return objFilePath
    } catch (error) {
      console.error('Error converting STL to OBJ:', error)
      throw error
    }
  }
}
