import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { STLLoader } from 'three-stdlib'
import { BufferGeometry } from 'three'

// Function to convert STL file to OBJ format
const convertStlToObj = async (stlFilePath: string): Promise<string> => {
  const loader = new STLLoader()

  // Read STL file
  const stlData = await fs.readFile(stlFilePath)

  // Parse STL geometry - convert Buffer to ArrayBuffer
  const arrayBuffer = new ArrayBuffer(stlData.length)
  const uint8Array = new Uint8Array(arrayBuffer)
  uint8Array.set(stlData)
  const geometry: BufferGeometry = loader.parse(arrayBuffer)

  // Generate OBJ content
  let objContent = '# Converted from STL\n'

  // Add vertices
  const positions = geometry.attributes.position.array
  for (let i = 0; i < positions.length; i += 3) {
    objContent += `v ${positions[i]} ${positions[i + 1]} ${positions[i + 2]}\n`
  }

  // Add normals if available
  if (geometry.attributes.normal) {
    const normals = geometry.attributes.normal.array
    for (let i = 0; i < normals.length; i += 3) {
      objContent += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`
    }
  }

  // Add faces
  const vertexCount = positions.length / 3
  for (let i = 1; i <= vertexCount; i += 3) {
    if (geometry.attributes.normal) {
      objContent += `f ${i}//${i} ${i + 1}//${i + 1} ${i + 2}//${i + 2}\n`
    } else {
      objContent += `f ${i} ${i + 1} ${i + 2}\n`
    }
  }

  // Create output file path
  const objFilePath = stlFilePath.replace(/\.stl$/i, '.obj')

  // Write OBJ file
  await fs.writeFile(objFilePath, objContent, 'utf8')

  return objFilePath
}

// Helper function to copy entire folder recursively
async function copyFolderRecursively(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      await copyFolderRecursively(sourcePath, destinationPath)
    } else {
      // Copy all files
      await fs.copyFile(sourcePath, destinationPath)
      console.log(`Copied file: ${entry.name}`)
    }
  }
}

export const setupIpcHandlers = (): void => {
  // File selection handlers
  ipcMain.handle('select-model-files', async () => {
    const dialogOptions = {
      properties: ['openFile', 'multiSelections'] as ('openFile' | 'multiSelections')[],
      filters: [
        { name: '3D Files', extensions: ['stl', 'obj'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || !result.filePaths) {
      return null
    }

    const processedFiles: string[] = []

    for (const filePath of result.filePaths) {
      const ext = path.extname(filePath).toLowerCase()

      if (ext === '.stl') {
        // Convert STL to OBJ
        console.log('Detected STL file, automatically converting to OBJ')

        try {
          const objFilePath = await convertStlToObj(filePath)
          processedFiles.push(objFilePath)
        } catch (error) {
          console.error(`Failed to convert STL file ${filePath}:`, error)
          // Still include the original STL file if conversion fails
          processedFiles.push(filePath)
        }
      } else {
        // Keep non-STL files as is
        processedFiles.push(filePath)
      }
    }

    return processedFiles
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

  ipcMain.handle('select-dicom-folder', async () => {
    const dialogOptions = {
      properties: ['openDirectory'] as 'openDirectory'[]
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    const selectedFolder = result.filePaths[0]
    console.log(`Selected DICOM folder: ${selectedFolder}`)

    return selectedFolder
  })

  // Check if BuildScript.cs exists in Unity project
  ipcMain.handle('check-build-script', async (_, unityProjectPath: string) => {
    try {
      const buildScriptPath = path.join(unityProjectPath, 'Assets', 'Editor', 'BuildScript.cs')

      try {
        await fs.access(buildScriptPath)
        console.log(`Build script found at: ${buildScriptPath}`)
        return { exists: true, path: buildScriptPath }
      } catch {
        console.log(`Build script not found at: ${buildScriptPath}`)
        return { exists: false, path: buildScriptPath }
      }
    } catch (error) {
      console.error('Error checking build script:', error)
      return {
        exists: false,
        path: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('attach-build-script', async (_, unityProjectPath: string) => {
    try {
      // Get the path to the BuildScript.cs in resources folder
      const resourcesPath = path.join(__dirname, '..', '..', 'resources', 'BuildScript.cs')

      // Create the destination path in Unity project
      const editorPath = path.join(unityProjectPath, 'Assets', 'Editor')
      const destinationPath = path.join(editorPath, 'BuildScript.cs')

      // Create Editor folder if it doesn't exist
      await fs.mkdir(editorPath, { recursive: true })

      // Copy the BuildScript.cs file
      await fs.copyFile(resourcesPath, destinationPath)

      console.log(`Build script attached successfully: ${destinationPath}`)
      return {
        success: true,
        path: destinationPath,
        message: 'BuildScript.cs has been successfully attached to the Unity project'
      }
    } catch (error) {
      console.error('Error attaching build script:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Import files to Unity project
  ipcMain.handle(
    'import-to-unity',
    async (
      _,
      selectedFiles: { [buttonNum: number]: string } | string[],
      selectedDicomFolder: string,
      unityProjectPath: string
    ) => {
      console.log('Received selectedFiles:', selectedFiles)
      console.log('Type of selectedFiles:', typeof selectedFiles)
      console.log('Is array?', Array.isArray(selectedFiles))

      const results: {
        success: boolean
        destinationPath?: string
        message?: string
        error?: string
      }[] = []

      try {
        // Create Resources folder structure
        const resourcesPath = path.join(unityProjectPath, 'Assets', 'Resources')
        const modelsPath = path.join(resourcesPath, 'Models')
        const dicomPath = path.join(resourcesPath, 'DICOM')

        await fs.mkdir(resourcesPath, { recursive: true })
        await fs.mkdir(modelsPath, { recursive: true })
        await fs.mkdir(dicomPath, { recursive: true })

        // Handle both old array format and new object format
        let filesToProcess: { [buttonNum: number]: string } = {}

        if (Array.isArray(selectedFiles)) {
          // Convert old array format to new object format
          // Map each file to buttons 1, 2, 3, 4 sequentially
          selectedFiles.forEach((filePath, index) => {
            const buttonNum = index + 1 // Start from Button1
            if (buttonNum <= 4) {
              // Only handle up to 4 buttons
              filesToProcess[buttonNum] = filePath
            }
          })
          console.log('Converted array to object:', filesToProcess)
        } else {
          // Use the object format directly
          filesToProcess = selectedFiles
        }

        // Copy selected files to respective Button folders
        for (const [buttonNumStr, filePath] of Object.entries(filesToProcess)) {
          console.log('Processing buttonNumStr:', buttonNumStr, 'filePath:', filePath)
          if (!filePath) continue // Skip if no file selected for this button

          const buttonNum = parseInt(buttonNumStr, 10)
          console.log('Parsed buttonNum:', buttonNum)
          try {
            const buttonFolderName = `Button${buttonNum}`
            console.log('Creating folder:', buttonFolderName)
            const buttonFolderPath = path.join(modelsPath, buttonFolderName)

            // Delete existing button folder if it exists, then create a new one
            try {
              await fs.rm(buttonFolderPath, { recursive: true, force: true })
              console.log(`Cleared existing folder: ${buttonFolderName}`)
            } catch {
              // Folder might not exist, which is fine
              console.log(`No existing folder to clear for: ${buttonFolderName}`)
            }

            // Create button-specific folder
            await fs.mkdir(buttonFolderPath, { recursive: true })

            const fileName = path.basename(filePath)
            const destinationPath = path.join(buttonFolderPath, fileName)

            await fs.copyFile(filePath, destinationPath)

            results.push({
              success: true,
              destinationPath,
              message: `Successfully copied ${fileName} to ${buttonFolderName}`
            })

            console.log(`Copied file: ${fileName} to ${destinationPath}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            results.push({
              success: false,
              error: `Failed to copy ${path.basename(filePath)} to Button${buttonNum}: ${errorMessage}`
            })
            console.error(`Failed to copy file ${filePath} to Button${buttonNum}:`, error)
          }
        }

        // Copy DICOM folder if selected - copy entire folder as-is
        if (selectedDicomFolder) {
          try {
            const folderName = path.basename(selectedDicomFolder)
            const destinationPath = path.join(dicomPath, folderName)

            // Copy entire DICOM folder recursively
            await copyFolderRecursively(selectedDicomFolder, destinationPath)

            results.push({
              success: true,
              destinationPath,
              message: `Successfully copied DICOM folder ${folderName}`
            })

            console.log(`Copied DICOM folder: ${folderName} to ${destinationPath}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            results.push({
              success: false,
              error: `Failed to copy DICOM folder: ${errorMessage}`
            })
            console.error(`Failed to copy DICOM folder ${selectedDicomFolder}:`, error)
          }
        }

        return results
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error during import:', error)
        return [
          {
            success: false,
            error: `Import failed: ${errorMessage}`
          }
        ]
      }
    }
  )

  ipcMain.handle('build-unity', async (_, unityProjectPath: string) => {
    try {
      console.log(`Starting Unity build for project: ${unityProjectPath}`)

      // Verify Unity project path exists
      try {
        await fs.access(unityProjectPath)
      } catch {
        return {
          success: false,
          error: 'Unity project path does not exist'
        }
      }

      // Check if BuildScript.cs exists
      const buildScriptPath = path.join(unityProjectPath, 'Assets', 'Editor', 'BuildScript.cs')
      try {
        await fs.access(buildScriptPath)
      } catch {
        return {
          success: false,
          error:
            'BuildScript.cs not found in Assets/Editor folder. Please attach the build script first.'
        }
      }

      // Find Unity executable - try both Unity Hub and direct Unity paths
      const unityHubPath = 'C:/Program Files/Unity/Hub/Unity Hub.exe'
      const specificUnityPath = 'C:/Program Files/Unity/Hub/Editor/2022.3.62f1/Editor/Unity.exe'
      const fallbackUnityPaths = [
        'C:/Program Files/Unity/Hub/Editor/*/Editor/Unity.exe',
        'C:/Program Files/Unity/Editor/Unity.exe',
        'C:/Program Files (x86)/Unity/Editor/Unity.exe'
      ]

      let unityExecutable = ''
      let useUnityHub = false

      // First, check if Unity Hub is available (preferred method)
      try {
        await fs.access(unityHubPath)
        // Verify the specific Unity version exists for Hub
        await fs.access(specificUnityPath)
        unityExecutable = unityHubPath
        useUnityHub = true
        console.log(`Found Unity Hub: ${unityHubPath}`)
        console.log(`Unity version 2022.3.62f1 available for Hub: ${specificUnityPath}`)
      } catch {
        console.log(
          'Unity Hub not found or Unity version not available, trying direct Unity executable...'
        )

        // Fall back to direct Unity executable
        try {
          await fs.access(specificUnityPath)
          unityExecutable = specificUnityPath
          console.log(`Found specific Unity version 2022.3.62f1: ${specificUnityPath}`)
        } catch {
          console.log('Unity version 2022.3.62f1 not found, searching for other versions...')

          // Fall back to searching for any available version
          for (const unityPath of fallbackUnityPaths) {
            try {
              // For paths with wildcards, we need to find the actual path
              if (unityPath.includes('*')) {
                const execAsync = promisify(exec)

                try {
                  // Use Windows dir command to find Unity installations
                  const { stdout } = await execAsync(
                    `dir "${unityPath.replace('*', '')}" /b /ad 2>nul`
                  )
                  const versions = stdout
                    .trim()
                    .split('\n')
                    .filter((v) => v.trim())

                  if (versions.length > 0) {
                    // Try the first version found
                    const versionPath = unityPath.replace('*', versions[0].trim())
                    await fs.access(versionPath)
                    unityExecutable = versionPath
                    console.log(`Found fallback Unity version: ${versionPath}`)
                    break
                  }
                } catch {
                  continue
                }
              } else {
                await fs.access(unityPath)
                unityExecutable = unityPath
                console.log(`Found fallback Unity installation: ${unityPath}`)
                break
              }
            } catch {
              continue
            }
          }
        }
      }

      if (!unityExecutable) {
        return {
          success: false,
          error:
            'Unity executable not found. Please ensure Unity 2022.3.62f1 is installed, or any other Unity version as fallback.'
        }
      }

      console.log(`Using Unity executable: ${unityExecutable}`)

      // Execute Unity build command - different args for Unity Hub vs direct Unity
      let buildArgs: string[]

      if (useUnityHub) {
        // Unity Hub command: Unity Hub.exe -- --projectPath "path" --executeMethod BuildScript.BuildUWP --batchmode --quit --logFile "path"
        buildArgs = [
          '--',
          '--projectPath',
          unityProjectPath,
          '--executeMethod',
          'BuildScript.BuildUWP',
          '--batchmode',
          '--quit',
          '--logFile',
          path.join(unityProjectPath, 'build.log')
        ]
        console.log(`Using Unity Hub with args: ${buildArgs.join(' ')}`)
      } else {
        // Direct Unity executable
        buildArgs = [
          '-batchmode',
          '-quit',
          '-projectPath',
          unityProjectPath,
          '-executeMethod',
          'BuildScript.BuildUWP',
          '-logFile',
          path.join(unityProjectPath, 'build.log')
        ]
        console.log(`Using direct Unity executable with args: ${buildArgs.join(' ')}`)
      }

      return new Promise((resolve) => {
        console.log(`Starting Unity process...`)

        const unityProcess = spawn(unityExecutable, buildArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: process.platform === 'win32'
        })

        let stdout = ''
        let stderr = ''

        unityProcess.stdout?.on('data', (data) => {
          stdout += data.toString()
          console.log(`Unity stdout: ${data}`)
        })

        unityProcess.stderr?.on('data', (data) => {
          stderr += data.toString()
          console.log(`Unity stderr: ${data}`)
        })

        unityProcess.on('close', async (code) => {
          console.log(`Unity build process exited with code: ${code}`)

          // Check if build folder was created
          const buildPath = path.join(unityProjectPath, 'Build', 'UWP')
          let buildExists = false
          try {
            await fs.access(buildPath)
            buildExists = true
          } catch {
            buildExists = false
          }

          // Read build log if it exists
          let buildLog = ''
          try {
            const logPath = path.join(unityProjectPath, 'build.log')
            buildLog = await fs.readFile(logPath, 'utf8')
          } catch {
            buildLog = 'Build log not available'
          }

          if (code === 0 && buildExists) {
            resolve({
              success: true,
              buildPath,
              message: 'Unity build completed successfully',
              log: buildLog,
              stdout,
              stderr: stderr || undefined
            })
          } else {
            resolve({
              success: false,
              error: `Unity build failed with exit code: ${code}`,
              log: buildLog,
              stdout,
              stderr
            })
          }
        })

        unityProcess.on('error', (error) => {
          console.error('Unity build process error:', error)
          resolve({
            success: false,
            error: `Failed to start Unity build process: ${error.message}`
          })
        })
      })
    } catch (error) {
      console.error('Error during Unity build:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during build'
      }
    }
  })

  ipcMain.handle('clean-build-folder', async (_, unityProjectPath: string) => {
    try {
      console.log(`Attempting to delete build folder for project: ${unityProjectPath}`)

      // Verify Unity project path exists
      try {
        await fs.access(unityProjectPath)
      } catch {
        return {
          success: false,
          error: 'Unity project path does not exist'
        }
      }

      // Check if build folder exists
      const buildPath = path.join(unityProjectPath, 'Build')

      try {
        await fs.access(buildPath)
        console.log(`Build folder found at: ${buildPath}`)

        // Delete the build folder recursively
        await fs.rm(buildPath, { recursive: true, force: true })

        console.log(`Successfully deleted build folder: ${buildPath}`)
        return {
          success: true,
          message: 'Build folder deleted successfully',
          deletedPath: buildPath
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Build folder doesn't exist
          console.log(`Build folder does not exist at: ${buildPath}`)
          return {
            success: true,
            message: 'Nothing to delete',
            deletedPath: buildPath
          }
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Error deleting Unity build folder:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during build folder deletion'
      }
    }
  })

  // Build settings management
  ipcMain.handle(
    'save-build-settings',
    async (_, settings: { buildScript: string; buildCommandParameters: string }) => {
      try {
        console.log('Saving build settings...')

        // Create app data directory if it doesn't exist
        const appDataPath = path.join(
          process.env.APPDATA || process.env.HOME || '',
          'holovision-preprocesser'
        )
        await fs.mkdir(appDataPath, { recursive: true })

        const settingsPath = path.join(appDataPath, 'build-settings.json')
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')

        console.log(`Build settings saved to: ${settingsPath}`)
        return {
          success: true,
          message: 'Build settings saved successfully',
          path: settingsPath
        }
      } catch (error) {
        console.error('Error saving build settings:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error saving build settings'
        }
      }
    }
  )

  ipcMain.handle('load-build-settings', async () => {
    try {
      const appDataPath = path.join(
        process.env.APPDATA || process.env.HOME || '',
        'holovision-preprocesser'
      )
      const settingsPath = path.join(appDataPath, 'build-settings.json')

      try {
        const settingsData = await fs.readFile(settingsPath, 'utf8')
        const settings = JSON.parse(settingsData)
        console.log('Build settings loaded successfully')
        return {
          success: true,
          settings: {
            buildScript: settings.buildScript || '',
            buildCommandParameters: settings.buildCommandParameters || ''
          }
        }
      } catch {
        // File doesn't exist or is invalid, return default settings
        console.log('No existing build settings found, returning defaults')
        return {
          success: true,
          settings: {
            buildScript: `using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Reporting;
using System.IO;

public class BuildScript
{
    [MenuItem("Build/Build for HoloLens 2")]
    public static void BuildForHoloLens2()
    {
        BuildUWP();
    }
    
    public static void BuildUWP()
    {
        string[] scenes = { "Assets/Scenes/MainScene.unity" };
        string buildPath = "./Build/UWP";
        
        if (Directory.Exists(buildPath))
            Directory.Delete(buildPath, true);
        Directory.CreateDirectory(buildPath);
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = buildPath,
            target = BuildTarget.WSAPlayer,
            options = BuildOptions.None
        };
        
        BuildReport report = BuildPipeline.BuildPlayer(options);
        
        if (report.summary.result == BuildResult.Succeeded)
            Debug.Log("Build succeeded!");
        else
            Debug.LogError("Build failed!");
    }
}`,
            buildCommandParameters: `-batchmode -quit -projectPath "PROJECT_PATH" -executeMethod BuildScript.BuildUWP -logFile "PROJECT_PATH/build.log"`
          }
        }
      }
    } catch (error) {
      console.error('Error loading build settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading build settings'
      }
    }
  })

  ipcMain.handle(
    'update-build-script',
    async (_, unityProjectPath: string, buildScriptContent: string) => {
      try {
        console.log(`Updating build script for project: ${unityProjectPath}`)

        // Ensure Editor directory exists
        const editorPath = path.join(unityProjectPath, 'Assets', 'Editor')
        await fs.mkdir(editorPath, { recursive: true })

        // Write the build script
        const buildScriptPath = path.join(editorPath, 'BuildScript.cs')
        await fs.writeFile(buildScriptPath, buildScriptContent, 'utf8')

        console.log(`Build script updated successfully: ${buildScriptPath}`)
        return {
          success: true,
          path: buildScriptPath,
          message: 'Build script updated successfully'
        }
      } catch (error) {
        console.error('Error updating build script:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error updating build script'
        }
      }
    }
  )

  ipcMain.handle(
    'build-unity-with-settings',
    async (_, unityProjectPath: string, buildCommand: string) => {
      try {
        console.log(`Starting custom Unity build for project: ${unityProjectPath}`)
        console.log(`Build command: ${buildCommand}`)

        // Replace PROJECT_PATH placeholder in command
        const processedCommand = buildCommand.replace(/PROJECT_PATH/g, unityProjectPath)
        console.log(`Processed command: ${processedCommand}`)

        // Verify Unity project path exists
        try {
          await fs.access(unityProjectPath)
        } catch {
          return {
            success: false,
            error: 'Unity project path does not exist'
          }
        }

        // Find Unity executable (reuse existing logic)
        const unityHubPath =
          process.platform === 'win32'
            ? 'C:/Program Files/Unity/Hub/Unity Hub.exe'
            : '/Applications/Unity Hub.app/Contents/MacOS/Unity Hub'
        const specificUnityPath =
          process.platform === 'win32'
            ? 'C:/Program Files/Unity/Hub/Editor/2022.3.62f1/Editor/Unity.exe'
            : '/Applications/Unity/Hub/Editor/2022.3.62f1/Unity.app/Contents/MacOS/Unity'

        let unityExecutable = ''
        let useUnityHub = false

        // Check if Unity Hub is available
        try {
          await fs.access(unityHubPath)
          await fs.access(specificUnityPath)
          unityExecutable = unityHubPath
          useUnityHub = true
          console.log('Using Unity Hub')
        } catch {
          // Try direct Unity paths
          const fallbackPaths =
            process.platform === 'win32'
              ? [
                  'C:/Program Files/Unity/Editor/Unity.exe',
                  'C:/Program Files (x86)/Unity/Editor/Unity.exe'
                ]
              : ['/Applications/Unity/Unity.app/Contents/MacOS/Unity']

          for (const testPath of fallbackPaths) {
            try {
              await fs.access(testPath)
              unityExecutable = testPath
              console.log(`Using direct Unity executable: ${testPath}`)
              break
            } catch {
              continue
            }
          }
        }

        if (!unityExecutable) {
          return {
            success: false,
            error: 'Unity executable not found. Please ensure Unity is installed.'
          }
        }

        // Parse command arguments
        const args = processedCommand.split(' ').filter((arg) => arg.trim() !== '')

        // Execute build command
        return new Promise((resolve) => {
          console.log(`Starting Unity process with args: ${args.join(' ')}`)

          const unityProcess = spawn(unityExecutable, useUnityHub ? ['--', ...args] : args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32'
          })

          let stdout = ''
          let stderr = ''

          unityProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
            console.log(`Unity stdout: ${data}`)
          })

          unityProcess.stderr?.on('data', (data) => {
            stderr += data.toString()
            console.log(`Unity stderr: ${data}`)
          })

          unityProcess.on('close', async (code) => {
            console.log(`Unity build process exited with code: ${code}`)

            // Read build log if it exists
            let buildLog = ''
            try {
              const logPath = path.join(unityProjectPath, 'build.log')
              buildLog = await fs.readFile(logPath, 'utf8')
            } catch {
              buildLog = 'Build log not available'
            }

            if (code === 0) {
              resolve({
                success: true,
                message: 'Unity build completed successfully',
                log: buildLog,
                stdout,
                stderr: stderr || undefined
              })
            } else {
              resolve({
                success: false,
                error: `Unity build failed with exit code: ${code}`,
                log: buildLog,
                stdout,
                stderr
              })
            }
          })

          unityProcess.on('error', (error) => {
            console.error('Unity build process error:', error)
            resolve({
              success: false,
              error: `Failed to start Unity build process: ${error.message}`
            })
          })
        })
      } catch (error) {
        console.error('Error during custom Unity build:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during build'
        }
      }
    }
  )
}
