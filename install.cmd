@PowerShell -ExecutionPolicy Bypass -NoProfile -Command Invoke-Expression $('$args=@(^&{$args} %*);'+[String]::Join(';',(Get-Content '%~f0') -notmatch '^^@PowerShell.*EOF$')) & goto :EOF

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = "Stop"
$repo = "PowerShell/PowerShellEditorServices"
$file = "PowerShellEditorServices.zip"

$releases = "https://api.github.com/repos/$repo/releases"

Write-Host Determining latest release...
$tag = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].tag_name

$download = "https://github.com/$repo/releases/download/$tag/$file"

new-item -Name $dir -ItemType directory -Force
Write-Host Dowloading $tag
Invoke-WebRequest $download -Out $file
$file = Get-Item $file

Write-Host Extracting release files...

$shell = new-object -com shell.application
$zip = $shell.NameSpace($file.FullName)
foreach($item in $zip.items()) { $shell.Namespace($file.DirectoryName).copyhere($item) }

Remove-Item $file -Force
Write-Host install completed.
