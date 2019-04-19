let s:root           = expand('<sfile>:h:h:h')
let s:is_win         = has('win32') || has('win64')
let s:is_mac         = !s:is_win && !has('win32unix')
      \ && (has('mac') || has('macunix') || has('gui_macvim') ||
      \   (!isdirectory('/proc') && executable('sw_vers')))
let s:is_vim         = !has('nvim')
let s:install_script = s:root.'/install.ps1'

function! coc#powershell#install(options)
    if(exists('a:options.flags'))
        let s:flags = a:options.flags
    else
	let s:flags = ''
    endif
    if(exists('a:options.powershellExecutable'))
        let s:powershell_executable = a:options.powershellExecutable
    else
        if(s:is_mac)
            let s:powershell_executable = 'pwsh'
        endif

        if(s:is_win)
            let s:powershell_executable = "powershell"
            if(executable("pwsh"))
                let s:powershell_executable = "pwsh"
            endif
        endif
    endif
    let cwd = getcwd()
    exe 'lcd '.s:root
    exe '!'.s:powershell_executable.' '.s:install_script.' '.s:flags
    exe 'lcd '.cwd
endfunction
