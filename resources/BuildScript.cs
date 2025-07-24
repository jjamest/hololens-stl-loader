using UnityEditor;
using UnityEditor.Build.Reporting;
using System.Linq;
using System.IO;
using UnityEngine;

public class BuildScript
{
    static void PerformBuild()
    {
        string[] scenes = { "Assets/Scenes/MainScene.unity" };
        BuildPipeline.BuildPlayer(scenes, "./build/holovision.arm64", BuildTarget.UWP, BuildOptions.None);
    }
}