let s:root           = expand('<sfile>:h:h:h')
let s:is_win         = has('win32') || has('win64')
let s:is_mac         = !s:is_win && !has('win32unix')
    \ && (has('mac') || has('macunix') || has('gui_macvim') ||
    \   (!isdirectory('/proc') && executable('sw_vers')))
let s:is_vim         = !has('nvim')
let s:install_script = s:root.'/install.ps1'

function! coc#powershell#install(...)
    let s:flags = ''
    if(exists('a:1'))
        let paramType = type(a:1)
        " Type 1 seems to be a string...
        if(paramType == 1)
            if(a:1 == 'preview')
                let s:flags = '-AllowPreRelease'
            endif
        " Type 4 is a dictionary...
        elseif(s:paramType == 4)
            if(exists('a:1.preview') && a:1.preview)
                let s:flags = '-AllowPreRelease'
            endif
        endif
    endif
    let s:powershell_executable = 'pwsh'
    if(exists('a:1.powershellExecutable'))
        let s:powershell_executable = a:1.powershellExecutable
    else
        if(s:is_win)
            let s:powershell_executable = "powershell"
            if(executable("pwsh"))
                let s:powershell_executable = "pwsh"
            endif
        endif
    endif
    let cwd = getcwd()
    exe 'lcd '.s:root
    exe '!'.s:powershell_executable.' -NoProfile -ExecutionPolicy Bypass -File '.s:install_script.' '.s:flags
    exe 'lcd '.cwd
endfunction
