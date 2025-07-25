using UnityEditor;
using UnityEditor.Build.Reporting;
using System.Linq;
using System.IO;
using UnityEngine;
using System;

public class BuildScript
{
    // Build output directory
    private static readonly string BuildPath = "./build/HoloLens2";
    
    [MenuItem("Build/Build for HoloLens 2")]
    public static void BuildForHoloLens2()
    {
        PerformBuild();
    }
    
    static void PerformBuild()
    {
        Debug.Log("Starting HoloLens 2 build process...");
        
        try
        {
            // Configure player settings for HoloLens 2
            ConfigurePlayerSettings();
            
            // Define the main scene
            string[] scenes = { "Assets/Scenes/MainScene.unity" };
            
            Debug.Log($"Building scene: {scenes[0]}");
            
            // Ensure build directory exists
            if (Directory.Exists(BuildPath))
            {
                Directory.Delete(BuildPath, true);
            }
            Directory.CreateDirectory(BuildPath);
            
            // Configure build player options
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = BuildPath,
                target = BuildTarget.WSAPlayer,
                options = BuildOptions.None
            };
            
            Debug.Log($"Building to: {BuildPath}");
            Debug.Log($"Building scene: {scenes[0]}");
            
            // Perform the build
            BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            BuildSummary summary = report.summary;
            
            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"Build succeeded! Size: {summary.totalSize} bytes");
                Debug.Log($"Build completed in: {summary.totalTime}");
                Debug.Log($"Output: {BuildPath}");
            }
            else
            {
                Debug.LogError($"Build failed with result: {summary.result}");
                
                // Log build errors
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
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Build failed with exception: {e.Message}");
            Debug.LogError($"Stack trace: {e.StackTrace}");
        }
    }
    
    private static void ConfigurePlayerSettings()
    {
        Debug.Log("Configuring player settings for HoloLens 2...");
        
        // Basic UWP settings
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.WSA, ScriptingImplementation.IL2CPP);
        PlayerSettings.WSA.SetTargetDeviceFamily(WSATargetDeviceFamily.Holographic);
        PlayerSettings.WSA.SetUWPCapability(PlayerSettings.WSACapability.InternetClient, true);
        PlayerSettings.WSA.SetUWPCapability(PlayerSettings.WSACapability.WebCam, true);
        PlayerSettings.WSA.SetUWPCapability(PlayerSettings.WSACapability.Microphone, true);
        PlayerSettings.WSA.SetUWPCapability(PlayerSettings.WSACapability.SpatialPerception, true);
        PlayerSettings.WSA.SetUWPCapability(PlayerSettings.WSACapability.GazeInput, true);
        
        // Architecture settings for HoloLens 2
        PlayerSettings.SetArchitecture(BuildTargetGroup.WSA, 1); // ARM64
        
        // Graphics and rendering
        PlayerSettings.colorSpace = ColorSpace.Linear;
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WSAPlayer, new UnityEngine.Rendering.GraphicsDeviceType[] { 
            UnityEngine.Rendering.GraphicsDeviceType.Direct3D11 
        });
        
        // XR Settings - Enable Windows Mixed Reality
        PlayerSettings.virtualRealitySupported = true;
        
        // Package name and version
        if (string.IsNullOrEmpty(PlayerSettings.applicationIdentifier))
        {
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.WSA, "com.yourcompany.holovision");
        }
        
        Debug.Log("Player settings configured successfully.");
    }
}