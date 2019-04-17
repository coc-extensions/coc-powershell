let s:root           = expand('<sfile>:h:h:h')
let s:is_win         = has('win32') || has('win64')
let s:is_vim         = !has('nvim')
let s:install_script = s:root.'/'.(s:is_win ? 'install.cmd' : 'install.ps1')

function! coc#pses#install()
    let cwd = getcwd()
    exe 'lcd '.s:root
    exe '!'.s:install_script
    exe 'lcd '.cwd
endfunction

