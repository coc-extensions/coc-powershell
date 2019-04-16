let s:vimscript_dir = expand('<sfile>:p:h')
let g:pses_dir      = resolve(expand(s:vimscript_dir . '/../PowerShellEditorServices/PowerShellEditorServices'))
let g:pses_script   = g:pses_dir . "/Start-EditorServices.ps1"

function! s:PSESSetup ()
    call coc#config("languageserver", {
            \   "pses": {
            \     "command": "powershell",
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

autocmd FileType ps1,psd1,psm1 call s:PSESSetup()
