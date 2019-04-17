let s:vimscript_dir = expand('<sfile>:p:h')
let g:pses_dir      = resolve(expand(s:vimscript_dir . '/../PowerShellEditorServices/PowerShellEditorServices'))
let g:pses_script   = g:pses_dir . "/Start-EditorServices.ps1"

if(!exists("g:pses_powershell_executable"))
    let g:pses_powershell_executable = "powershell"
    if(executable("pwsh"))
        let g:pses_powershell_executable = "pwsh"
    endif
endif

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
            \       "-LogPath", ".pses/log.txt",
            \       "-LogLevel", "Diagnostic",
            \       "-FeatureFlags", "[]",
            \       "-BundledModulesPath", g:pses_dir . "/../",
            \       "-Stdio",
            \       "-SessionDetailsPath", ".pses/session"
            \     ]
            \    }
            \  }
            \)
endfunction

function! coc#pses#install()
    execute "!../install.ps1"
endfunction

" Set the file type to ps1 for ps1, psm1, and psd1
" 'ps1' is what vim-polyglot uses for styling
if(&filetype == "")
    autocmd BufNewFile,BufRead *.ps*1 set filetype=ps1
endif

autocmd FileType ps1,psd1,psm1 call s:PSESSetup()
