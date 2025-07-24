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

                // Log any build errors
                foreach (BuildStep step in report.steps)
                {
                    foreach (BuildStepMessage message in step.messages)
                    {
                        if (message.type == LogType.Error || message.type == LogType.Exception)
                        {
                            Debug.LogError($"Build Error: {message.content}");
                        }
                    }
                }

                EditorApplication.Exit(1);
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Build script exception: {e.Message}");
            Debug.LogError($"Stack trace: {e.StackTrace}");
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
}