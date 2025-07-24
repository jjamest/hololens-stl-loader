import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { STLLoader } from 'three-stdlib'
import { BufferGeometry } from 'three'
import * as dicomParser from 'dicom-parser'
import { PNG } from 'pngjs'

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

// Function to convert DICOM file to PNG
const convertDicomToPng = async (dicomFilePath: string): Promise<string> => {
  try {
    // Read DICOM file
    const dicomData = await fs.readFile(dicomFilePath)

    // Parse DICOM data
    const dataSet = dicomParser.parseDicom(dicomData)

    // Extract pixel data
    const pixelDataElement = dataSet.elements.x7fe00010
    if (!pixelDataElement) {
      throw new Error('No pixel data found in DICOM file')
    }

    // Get image dimensions
    const rows = dataSet.uint16('x00280010') || 512 // Default to 512 if not found
    const columns = dataSet.uint16('x00280011') || 512 // Default to 512 if not found
    const bitsAllocated = dataSet.uint16('x00280100') || 16

    // Extract pixel data
    let pixelData: Uint16Array | Uint8Array
    if (bitsAllocated === 16) {
      pixelData = new Uint16Array(
        dicomData.buffer,
        pixelDataElement.dataOffset,
        pixelDataElement.length / 2
      )
    } else {
      pixelData = new Uint8Array(
        dicomData.buffer,
        pixelDataElement.dataOffset,
        pixelDataElement.length
      )
    }

    // Create PNG
    const png = new PNG({ width: columns, height: rows })

    // Find min and max values for proper scaling
    let minValue = Infinity
    let maxValue = -Infinity

    for (let i = 0; i < pixelData.length; i++) {
      const value = pixelData[i]
      if (value < minValue) minValue = value
      if (value > maxValue) maxValue = value
    }

    const valueRange = maxValue - minValue

    // Convert pixel data to PNG format (8-bit RGBA)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const idx = (rows * y + x) << 2
        const pixelIdx = y * columns + x

        let pixelValue: number
        const rawValue = pixelData[pixelIdx] || 0

        // Normalize to 0-255 range
        if (valueRange > 0) {
          pixelValue = Math.round(((rawValue - minValue) / valueRange) * 255)
        } else {
          pixelValue = 128 // Default gray if all values are the same
        }

        // Clamp to valid range
        pixelValue = Math.max(0, Math.min(255, pixelValue))

        // Set RGB values (grayscale)
        png.data[idx] = pixelValue // Red
        png.data[idx + 1] = pixelValue // Green
        png.data[idx + 2] = pixelValue // Blue
        png.data[idx + 3] = 255 // Alpha
      }
    }

    // Create output file path
    const pngFilePath = dicomFilePath.replace(/\.dcm$/i, '.png')

    // Write PNG file
    const buffer = PNG.sync.write(png)
    await fs.writeFile(pngFilePath, buffer)

    console.log(
      `Converted DICOM to PNG: ${path.basename(dicomFilePath)} -> ${path.basename(pngFilePath)}`
    )
    return pngFilePath
  } catch (error) {
    console.error(`Failed to convert DICOM file ${dicomFilePath}:`, error)
    throw error
  }
}

// Helper function to copy only PNG files from DICOM folder
async function copyPngFilesFromFolder(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await copyPngFilesFromFolder(sourcePath, destinationPath)
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      // Only copy PNG files (converted DICOM files)
      await fs.copyFile(sourcePath, destinationPath)
      console.log(`Copied PNG file: ${entry.name}`)
    }
    // Skip .dcm files and other non-PNG files
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

    try {
      // Find all .dcm files in the selected folder
      const files = await fs.readdir(selectedFolder, { withFileTypes: true })
      const dicomFiles = files
        .filter((file) => file.isFile() && file.name.toLowerCase().endsWith('.dcm'))
        .map((file) => path.join(selectedFolder, file.name))

      console.log(`Found ${dicomFiles.length} DICOM files to convert`)

      // Convert each DICOM file to PNG
      const convertedFiles: string[] = []
      for (const dicomFile of dicomFiles) {
        try {
          const pngFile = await convertDicomToPng(dicomFile)
          convertedFiles.push(pngFile)
        } catch (error) {
          console.error(`Failed to convert ${path.basename(dicomFile)}:`, error)
          // Continue with other files even if one fails
        }
      }

      console.log(
        `Successfully converted ${convertedFiles.length} out of ${dicomFiles.length} DICOM files`
      )
      return selectedFolder
    } catch (error) {
      console.error('Error processing DICOM folder:', error)
      return selectedFolder // Return the folder path even if conversion fails
    }
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
    async (_, selectedFiles: string[], selectedDicomFolder: string, unityProjectPath: string) => {
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

        // Copy selected files to Models folder
        for (const filePath of selectedFiles) {
          try {
            const fileName = path.basename(filePath)
            const destinationPath = path.join(modelsPath, fileName)

            await fs.copyFile(filePath, destinationPath)

            results.push({
              success: true,
              destinationPath,
              message: `Successfully copied ${fileName}`
            })

            console.log(`Copied file: ${fileName} to ${destinationPath}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            results.push({
              success: false,
              error: `Failed to copy ${path.basename(filePath)}: ${errorMessage}`
            })
            console.error(`Failed to copy file ${filePath}:`, error)
          }
        }

        // Copy DICOM folder if selected - but only PNG files
        if (selectedDicomFolder) {
          try {
            const folderName = path.basename(selectedDicomFolder)
            const destinationPath = path.join(dicomPath, folderName)

            // Copy only PNG files from DICOM folder
            await copyPngFilesFromFolder(selectedDicomFolder, destinationPath)

            results.push({
              success: true,
              destinationPath,
              message: `Successfully copied PNG files from DICOM folder ${folderName}`
            })

            console.log(`Copied PNG files from DICOM folder: ${folderName} to ${destinationPath}`)
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
}
