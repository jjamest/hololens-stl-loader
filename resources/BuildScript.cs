using UnityEditor;
using UnityEditor.Build.Reporting;

public class BuildScript
{
    public static void BuildUWP()
    {
        // Define build options
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/MainScene.unity" },
            locationPathName = "Build/UWP",
            target = BuildTarget.WSAPlayer,
            options = BuildOptions.None
        };

        // Set platform-specific settings
        EditorUserBuildSettings.wsaSDK = "UWP";
        EditorUserBuildSettings.wsaBuildAndRunDeployTarget =
            BuildTargetGroup.WSA.ToString();
        EditorUserBuildSettings.wsaUWPBuildType = WSAUWPBuildType.D3D;
        EditorUserBuildSettings.wsaArchitecture = WSAArchitecture.ARM64;
        EditorUserBuildSettings.wsaSubtarget = WSASubtarget.D3D;

        // Trigger the build
        BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        BuildSummary summary = report.summary;

        if (summary.result == BuildResult.Succeeded)
            UnityEngine.Debug.Log("Build succeeded: " + summary.totalSize + " bytes");
        else
            UnityEngine.Debug.LogError("Build failed: " + summary.result);
    }
}