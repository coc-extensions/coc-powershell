let s:root           = expand('<sfile>:h:h:h')
let s:is_win         = has('win32') || has('win64')
let s:is_mac         = !s:is_win && !has('win32unix')
      \ && (has('mac') || has('macunix') || has('gui_macvim') ||
      \   (!isdirectory('/proc') && executable('sw_vers')))
let s:is_vim         = !has('nvim')
if(!exists("g:coc_powershell_prerelease"))
    let g:coc_powershell_prerelease  = ''
endif

let s:install_script = s:root.'/install.ps1 '.g:coc_powershell_prerelease

if(s:is_mac)
    let s:install_script = 'pwsh '.s:install_script
endif

if(s:is_win)
    let s:powershell_executable = "powershell"
    if(executable("pwsh"))
        let s:powershell_executable = "pwsh"
    endif

    let s:install_script = s:powershell_executable.' '.s:install_script
endif

function! coc#powershell#install()
    let cwd = getcwd()
    exe 'lcd '.s:root
    exe '!'.s:install_script
    exe 'lcd '.cwd
endfunction
