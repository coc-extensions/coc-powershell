#
# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.
#

param(
    [string]$EditorServicesRepoPath = $null
)

#Requires -Modules @{ModuleName="InvokeBuild";ModuleVersion="3.0.0"}

# Grab package.json data which is used throughout the build.
$script:PackageJson = Get-Content -Raw $PSScriptRoot/package.json | ConvertFrom-Json
$script:IsPreviewExtension = $script:PackageJson.name -like "*preview*" -or $script:PackageJson.displayName -like "*preview*"
Write-Host "`n### Extension Version: $($script:PackageJson.version) Extension Name: $($script:PackageJson.name)`n" -ForegroundColor Green

#region Restore tasks

task Restore RestoreNodeModules, RestorePowerShellEditorServices, RestoreSnippets

task RestoreNodeModules {
    if(-not (Test-Path "$PSScriptRoot/node_modules")){
    Write-Host "`n### Restoring coc-powershell dependencies`n" -ForegroundColor Green

    # When in a CI build use the --loglevel=error parameter so that
    # package install warnings don't cause PowerShell to throw up
    $logLevelParam = if ($env:TF_BUILD) { "--loglevel=error" } else { "" }
    exec { & npm install $logLevelParam }
}
}

#endregion
#region Clean tasks

task Clean {
    Write-Host "`n### Cleaning coc-powershell`n" -ForegroundColor Green
    Remove-Item .\PowerShellEditorServices -Recurse -Force -ErrorAction Ignore
    Remove-Item .\Snippets -Recurse -Force -ErrorAction Ignore
    Remove-Item .\out -Recurse -Force -ErrorAction Ignore
    Remove-Item -Force -Recurse node_modules -ErrorAction Ignore
}

task CleanAll Clean

#endregion
#region Build tasks

task Build Restore, {
    Write-Host "`n### Building coc-powershell" -ForegroundColor Green
    exec { & npm run compile }
}

task RestoreSnippets {
    # If PowerShellEditorServices isn't downloaded, download the latest?
    # TODO
    if(-not (Test-Path "$PSScriptRoot/Snippets")){
    Write-Host Restoring Snippets...
    & "$PSScriptRoot/downloadSnippets.ps1"
    }
}

task RestorePowerShellEditorServices {
    # If PowerShellEditorServices isn't downloaded, download the latest?
    # TODO
    if(-not (Test-Path "$PSScriptRoot/PowerShellEditorServices")){
    Write-Host Restoring PowerShellEditorServices...
    & "$PSScriptRoot/downloadPSES.ps1"
    }
}

task BuildAll RestorePowerShellEditorServices, Build

#endregion
#
# The set of tasks for a release
task Release Clean, Build, Test
# The default task is to run the entire CI build
task . CleanAll, BuildAll
