let s:vimscript_dir = expand('<sfile>:p:h')
let g:pses_dir      = resolve(expand(s:vimscript_dir . '/../PowerShellEditorServices/PowerShellEditorServices'))
let g:pses_script   = g:pses_dir . "/Start-EditorServices.ps1"

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

" Let the user specify the log directory for PSES.
" If the user doesn't specify a location, use the root of vov-pses in a .pses
" directory.
if(!exists("g:pses_logs_dir"))
    let g:pses_logs_dir      = resolve(expand(s:vimscript_dir . '/../.pses/logs/' . strftime('%Y%m%d') . '-' . getpid()))
endif

if(!exists("g:pses_powershell_executable"))
    let g:pses_powershell_executable = "powershell"
    if(executable("pwsh"))
        let g:pses_powershell_executable = "pwsh"
    endif
endif

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

function! g:SwitchPowerShellExecutable (...)
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

    let g:pses_powershell_executable = s:choice
    call coc#client#restart_all()
endfunction

function! s:PSESSetup ()
    call coc#config("languageserver", {
            \   "pses": {
            \     "command": g:pses_powershell_executable,
            \     "filetypes": ["ps1", "psm1", "psd1"],
            \     "rootPatterns": [".pses/", ".vim/", ".git/", ".hg/"],
            \     "trace.server": "verbose",
            \     "cwd": ".",
            \     "args": [
            \       "-NoProfile", "-NonInteractive",
            \       g:pses_script,
            \       "-HostName", "coc.vim",
            \       "-HostProfileId", "0",
            \       "-HostVersion", "2.0.0",
            \       "-LogPath", g:pses_logs_dir . "/log.txt",
            \       "-LogLevel", "Diagnostic",
            \       "-FeatureFlags", "[]",
            \       "-BundledModulesPath", g:pses_dir . "/../",
            \       "-Stdio",
            \       "-SessionDetailsPath", g:pses_logs_dir . "/session"
            \     ]
            \    }
            \  }
            \)
endfunction

" Set the file type to ps1 for ps1, psm1, and psd1
" 'ps1' is what vim-polyglot uses for styling
if(&filetype == "")
    autocmd BufNewFile,BufRead *.ps*1 set filetype=ps1
endif

autocmd FileType ps1,psd1,psm1 call s:PSESSetup()
