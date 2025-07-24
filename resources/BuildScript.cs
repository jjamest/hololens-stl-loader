using UnityEditor;
using UnityEditor.Build.Reporting;
using System.Linq;
using System.IO;
using UnityEngine;

public class BuildScript
{
    public static void BuildUWP()
    {
        try
        {
            // Log Unity version and installation info
            Debug.Log($"Unity Version: {Application.unityVersion}");
            Debug.Log($"Unity Editor Path: {EditorApplication.applicationPath}");
            Debug.Log($"Project Path: {Application.dataPath}");

            // Check for common Unity installation issues
            ValidateUnityInstallation();

            // Get all enabled scenes from build settings, or find scenes in project
            string[] scenePaths = GetScenePaths();

            if (scenePaths.Length == 0)
            {
                Debug.LogError("No scenes found to build. Please add scenes to Build Settings or ensure scenes exist in the project.");
                EditorApplication.Exit(1);
                return;
            }

            Debug.Log($"Building with {scenePaths.Length} scenes: {string.Join(", ", scenePaths)}");

            // Ensure build directory exists
            string buildPath = "Build/UWP";
            if (Directory.Exists(buildPath))
            {
                Directory.Delete(buildPath, true);
            }
            Directory.CreateDirectory(buildPath);

            // Switch to WSA platform if not already
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WSAPlayer)
            {
                Debug.Log("Switching to WSA platform...");

                // Check if WSA build support is installed
                if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WSA, BuildTarget.WSAPlayer))
                {
                    Debug.LogError("WSA/UWP build support is not installed!");
                    Debug.LogError("Please install Universal Windows Platform build support via Unity Hub:");
                    Debug.LogError("1. Open Unity Hub");
                    Debug.LogError("2. Go to Installs tab");
                    Debug.LogError("3. Click the gear icon next to your Unity version");
                    Debug.LogError("4. Select 'Add Modules'");
                    Debug.LogError("5. Check 'Universal Windows Platform Build Support'");
                    EditorApplication.Exit(1);
                    return;
                }

                EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WSA, BuildTarget.WSAPlayer);
            }

            // Set platform-specific settings for UWP
            EditorUserBuildSettings.wsaUWPBuildType = WSAUWPBuildType.D3D;            // Define build options
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
            {
                scenes = scenePaths,
                locationPathName = buildPath,
                target = BuildTarget.WSAPlayer,
                options = BuildOptions.None
            };

            Debug.Log("Starting UWP build...");

            // Trigger the build
            BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"Build succeeded: {summary.totalSize} bytes");
                Debug.Log($"Build location: {summary.outputPath}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"Build failed: {summary.result}");
                Debug.LogError($"Build started at: {summary.buildStartedAt}");
                Debug.LogError($"Build ended at: {summary.buildEndedAt}");
                Debug.LogError($"Total time: {summary.totalTime}");
                Debug.LogError($"Total errors: {summary.totalErrors}");
                Debug.LogError($"Total warnings: {summary.totalWarnings}");

                // Log any build errors
                foreach (BuildStep step in report.steps)
                {
                    if (step.messages.Any(m => m.type == LogType.Error || m.type == LogType.Exception))
                    {
                        Debug.LogError($"Build Step: {step.name}");
                    }

                    foreach (BuildStepMessage message in step.messages)
                    {
                        if (message.type == LogType.Error || message.type == LogType.Exception)
                        {
                            Debug.LogError($"Build Error in {step.name}: {message.content}");
                        }
                        else if (message.type == LogType.Warning)
                        {
                            Debug.LogWarning($"Build Warning in {step.name}: {message.content}");
                        }
                    }
                }

                // Provide specific guidance for common issues
                if (summary.totalErrors == 0 && summary.result == BuildResult.Failed)
                {
                    Debug.LogError("Build failed without specific errors. This often indicates:");
                    Debug.LogError("1. Unity installation corruption (try reinstalling Unity)");
                    Debug.LogError("2. Missing build platform support (install UWP build support)");
                    Debug.LogError("3. Insufficient permissions or disk space");
                    Debug.LogError("4. Antivirus interference with Unity files");
                }

                EditorApplication.Exit(1);
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Build script exception: {e.Message}");
            Debug.LogError($"Stack trace: {e.StackTrace}");

            // Provide specific guidance based on the error
            if (e.Message.Contains("PackageManager") || e.Message.Contains("UnityPackageManager"))
            {
                Debug.LogError("Package Manager related error detected. Possible solutions:");
                Debug.LogError("1. Reinstall Unity Editor completely");
                Debug.LogError("2. Check if antivirus is blocking Unity files");
                Debug.LogError("3. Run Unity as administrator");
                Debug.LogError("4. Verify Unity installation integrity");
            }
            else if (e.Message.Contains("WSA") || e.Message.Contains("UWP"))
            {
                Debug.LogError("UWP/WSA build error detected. Possible solutions:");
                Debug.LogError("1. Install Universal Windows Platform build support via Unity Hub");
                Debug.LogError("2. Update Windows SDK");
                Debug.LogError("3. Check Windows Developer Mode is enabled");
            }

            EditorApplication.Exit(1);
        }
    }

    private static string[] GetScenePaths()
    {
        // First try to get scenes from build settings
        EditorBuildSettingsScene[] buildScenes = EditorBuildSettings.scenes;
        string[] enabledScenes = buildScenes
            .Where(scene => scene.enabled && !string.IsNullOrEmpty(scene.path))
            .Select(scene => scene.path)
            .ToArray();

        if (enabledScenes.Length > 0)
        {
            return enabledScenes;
        }

        // If no scenes in build settings, find all scenes in the project
        string[] allSceneGuids = AssetDatabase.FindAssets("t:Scene");
        string[] allScenePaths = allSceneGuids
            .Select(guid => AssetDatabase.GUIDToAssetPath(guid))
            .Where(path => !string.IsNullOrEmpty(path))
            .ToArray();

        if (allScenePaths.Length > 0)
        {
            Debug.LogWarning("No scenes found in Build Settings. Using all scenes found in project.");
            return allScenePaths;
        }

        return new string[0];
    }

    private static void ValidateUnityInstallation()
    {
        Debug.Log("Validating Unity installation...");

        // Check if we're in batch mode
        if (Application.isBatchMode)
        {
            Debug.Log("Running in batch mode");
        }

        // Log detailed installation paths
        string editorPath = EditorApplication.applicationPath;
        string dataPath = Path.GetDirectoryName(editorPath) + "/Data";
        string packageManagerPath = Path.Combine(dataPath, "Resources", "PackageManager", "Server", "UnityPackageManager.exe");

        Debug.Log($"Unity Editor Path: {editorPath}");
        Debug.Log($"Unity Data Path: {dataPath}");
        Debug.Log($"Expected PackageManager Path: {packageManagerPath}");
        Debug.Log($"PackageManager File Exists: {File.Exists(packageManagerPath)}");

        if (!File.Exists(packageManagerPath))
        {
            Debug.LogWarning("UnityPackageManager.exe not found at expected location.");
            Debug.LogWarning("This is normal when Unity works fine in UI but fails in batch mode.");
            Debug.LogWarning("The Package Manager may be initialized differently in batch mode.");
        }

        // Log platform settings
        Debug.Log($"Current Build Target: {EditorUserBuildSettings.activeBuildTarget}");
        Debug.Log($"Selected Build Target Group: {EditorUserBuildSettings.selectedBuildTargetGroup}");

        // Check WSA settings if available
        if (EditorUserBuildSettings.activeBuildTarget == BuildTarget.WSAPlayer ||
            EditorUserBuildSettings.selectedBuildTargetGroup == BuildTargetGroup.WSA)
        {
            Debug.Log($"WSA UWP Build Type: {EditorUserBuildSettings.wsaUWPBuildType}");
            Debug.Log($"WSA Target Family: {EditorUserBuildSettings.wsaTargetFamily}");
        }

        // Warn about Package Manager issues (common in corrupted installations)
        try
        {
            var packages = UnityEditor.PackageManager.PackageInfo.GetAllRegisteredPackages();
            Debug.Log($"Package Manager accessible - {packages.Length} packages registered");
        }
        catch (System.Exception e)
        {
            Debug.LogWarning($"Package Manager may not be fully functional: {e.Message}");
            Debug.LogWarning("This may indicate a corrupt Unity installation, but build may still work.");
            Debug.LogWarning("If build fails, consider reinstalling Unity.");
        }

        // Force refresh asset database to ensure everything is loaded
        try
        {
            AssetDatabase.Refresh();
            Debug.Log("Asset database refreshed successfully");
        }
        catch (System.Exception e)
        {
            Debug.LogWarning($"Asset database refresh failed: {e.Message}");
        }
    }
}