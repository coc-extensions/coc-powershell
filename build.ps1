param(
    # Runs the watch npm command instead.
    [Parameter()]
    [switch]
    $Watch
)

if (!(Get-Command npm)) {
    throw "You must install Node.js & npm."
}

npm install

if ($Watch.IsPresent) {
    npm run watch
} else {
    npm run compile
}
