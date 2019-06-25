if exists('s:loaded_ftplugin')
  finish
endif
let s:loaded_ftplugin = 1
let s:vimscript_dir = expand('<sfile>:p:h')
" function! s:PSESSetup ()
"     let g:pses_dir      = resolve(expand(s:vimscript_dir . '/../PowerShellEditorServices/PowerShellEditorServices'))
"     let g:pses_script   = g:pses_dir . "/Start-EditorServices.ps1"

"     " Let the user specify the log directory for PSES.
"     " If the user doesn't specify a location, use the root of coc-powershell in a .pses
"     " directory.
"     if(!exists("g:pses_logs_dir"))
"         let g:pses_logs_dir      = resolve(expand(s:vimscript_dir . '/../.pses/logs/' . strftime('%Y%m%d') . '-' . getpid()))
"     endif

"     if(!exists("g:pses_powershell_executable"))
"         let g:pses_powershell_executable = "powershell"
"         if(executable("pwsh"))
"             let g:pses_powershell_executable = "pwsh"
"         endif
"     endif

"     call coc#config("languageserver", {
"             \   "pses": {
"             \     "command": g:pses_powershell_executable,
"             \     "filetypes": ["ps1", "psm1", "psd1"],
"             \     "rootPatterns": [".pses/", ".vim/", ".git/", ".hg/"],
"             \     "trace.server": "verbose",
"             \     "cwd": ".",
"             \     "args": [
"             \       "-NoProfile", "-NonInteractive",
"             \       g:pses_script,
"             \       "-HostName", "coc.vim",
"             \       "-HostProfileId", "0",
"             \       "-HostVersion", "2.0.0",
"             \       "-LogPath", g:pses_logs_dir . "/log.txt",
"             \       "-LogLevel", "Diagnostic",
"             \       "-FeatureFlags", "[]",
"             \       "-BundledModulesPath", g:pses_dir . "/../",
"             \       "-Stdio",
"             \       "-SessionDetailsPath", g:pses_logs_dir . "/session"
"             \     ]
"             \    }
"             \  }
"             \)
" endfunction

" call s:PSESSetup()
" set rtp+=resolve(expand(s:vimscript_dir . '/../package.json'))
