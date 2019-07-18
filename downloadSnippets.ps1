#!/usr/bin/env pwsh

Write-Host Starting download of Snippets from vscode-powershell
if (!$IsCoreCLR) {
    # We only need to do this in Windows PowerShell.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

# Fail on anything
$ErrorActionPreference = "Stop"
# Progress doesn't display properly in vim
$ProgressPreference = "SilentlyContinue"

Push-Location $PSScriptRoot

$download = "https://raw.githubusercontent.com/PowerShell/vscode-powershell/master/snippets/PowerShell.json"

$dir = "$PSScriptRoot/Snippets/"

$null = New-Item -Path $dir -ItemType Directory -Force
Invoke-WebRequest $download -OutFile "$dir\PowerShell.json"

Pop-Location

Write-Host Completed downloading Snippets.
