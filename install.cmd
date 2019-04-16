@PowerShell -ExecutionPolicy Bypass -NoProfile -Command Invoke-Expression $('$args=@(^&{$args} %*);'+[String]::Join(';',(Get-Content '%~f0') -notmatch '^^@PowerShell.*EOF$')) & goto :EOF

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = "Stop"
$repo = "PowerShell/PowerShellEditorServices"
$file = "PowerShellEditorServices.zip"

$releases = "https://api.github.com/repos/$repo/releases"

Write-Host Determining latest release...
$tag = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].tag_name

$download = "https://github.com/$repo/releases/download/$tag/$file"
$zip = "pses.zip"

new-item -Name $dir -ItemType directory -Force
Write-Host Dowloading $tag
Invoke-WebRequest $download -Out $zip

Write-Host Extracting release files...
Expand-Archive $zip -Force

Remove-Item $zip -Force
Write-Host install completed.
