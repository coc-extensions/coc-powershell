#!/usr/bin/env pwsh

if (!$IsCoreCLR) {
    # We only need to do this in Windows PowerShell.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

# Fail on anything
$ErrorActionPreference = "Stop"
# Progress doesn't display properly in vim
$ProgressPreference = "SilentlyContinue"

$repo = "PowerShell/PowerShellEditorServices"
$file = "PowerShellEditorServices.zip"

$releases = "https://api.github.com/repos/$repo/releases"

Write-Host Determining latest release...
$tag = (Invoke-RestMethod $releases)[0].tag_name

$download = "https://github.com/$repo/releases/download/$tag/$file"
$zip = "pses.zip"

$null = New-Item -Name $dir -ItemType Directory -Force
Write-Host Downloading $tag
Invoke-WebRequest $download -OutFile $zip

Write-Host Extracting release files...
Microsoft.PowerShell.Archive\Expand-Archive $zip $pwd -Force

Remove-Item $zip -Force
Write-Host install completed.
