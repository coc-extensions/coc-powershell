let s:is_win         = has('win32') || has('win64')
let s:is_mac = !s:is_win && !has('win32unix')
    \ && (has('mac') || has('macunix') || has('gui_macvim') ||
    \   (!isdirectory('/proc') && executable('sw_vers')))

let s:linuxExe        = { "versionName": "PowerShell Core", "executablePath": "/usr/bin/pwsh" }
let s:linuxPreviewExe = { "versionName": "PowerShell Core Preview", "executablePath": "/usr/bin/pwsh-preview" }
let s:snapExe         = { "versionName": "PowerShell Core Snap", "executablePath": "/snap/bin/pwsh" }
let s:snapPreviewExe  = { "versionName": "PowerShell Core Preview Snap", "executablePath": "/snap/bin/pwsh-preview" }
let s:macOSExe        = { "versionName": "PowerShell Core", "executablePath": "/usr/local/bin/pwsh" }
let s:macOSPreviewExe = { "versionName": "PowerShell Core Preview", "executablePath": "/usr/local/bin/pwsh-preview" }

function! s:getAvailablePowerShellExecutables ()
    let paths = []
    if(s:is_win)
        call add(paths, {
            versionName: "Windows PowerShell",
            executablePath: "C:\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"

        })
        
        let psCoreInstallPath = "C:\\System32\\PowerShell\\"
        if(isdirectory(psCoreInstallPath))
            let psCoreExePaths = split(glob(psCoreInstallPath . "**\\pwsh.exe"), "\n")
            if(!empty(psCoreExePaths))
                call add(paths, {
                    versionName: "PowerShell Core",
                    executablePath: psCoreExePaths[0]
                })
            endif
        endif

        return paths
    endif

    " macOS and Linux
    let powershellExecutables = [ s:linuxExe, s:linuxPreviewExe, s:snapExe, s:snapPreviewExe ]
    if(s:is_mac)
        let powershellExecutables = [ s:macOSExe, s:macOSPreviewExe ]
    endif

    for powershellExecutable in powershellExecutables
        if(filereadable(powershellExecutable.executablePath))
            call add(paths, powershellExecutable)
        endif
    endfor

    return paths
endfunction

function! coc#powershell#utils#switch_powershell_executable (...)
    let s:choice = ""
    if(!exists("a:1"))
        let powershellExecutables = s:getAvailablePowerShellExecutables()
        let index = 1
        let choiceStr = ""
        while(index <= len(powershellExecutables))
            let choiceStr = choiceStr . index . " " . powershellExecutables[index - 1].versionName
            if(index != len(powershellExecutables))
                let choiceStr = choiceStr . "\n"
            endif
            let index = index + 1
        endwhile
        let s:choice = powershellExecutables[confirm("Which PowerShell executable would you like to use?", choiceStr) - 1].executablePath
    else
        let s:choice = a:1
    endif

    if(!executable(s:choice))
        throw "Executable not found: " . s:choice
    endif

    if(g:pses_powershell_executable == s:choice)
        echo "PowerShell executable already set to: " . s:choice
    else
        let g:pses_powershell_executable = s:choice

        echo "Restarting coc client to apply change..."
        call coc#client#restart_all()
    endif
endfunction
