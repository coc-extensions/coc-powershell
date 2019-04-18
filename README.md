# coc-powershell

A vim plugin powered by
[PowerShellEditorService](https://github.com/PowerShell/PowerShellEditorServices) and 
[coc.nvim](https://github.com/neoclide/coc.nvim)
to provide a rich PowerShell editing experience.

Features include:
* Intellisense/Completions
* Go to definition
* [PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer) integration
* and much more!

## Prerequisites

1. vim/neovim
1. [PowerShell Core](https://github.com/powershell/powershell) or Windows PowerShell

## Installation

### (Recommended) Install with a plugin manager like [vim-plug](https://github.com/junegunn/vim-plug):

1. Add this to your `vimrc`/`Init.vim`
```vimL

Plug 'yatli/coc-pses', {'do': { -> coc#pses#install()} }
...
Plug 'neoclide/coc.nvim', {'tag': '*', 'do': { -> coc#util#install()}} 
```
2. Reload vim.
1. Run the vim command: `:PlugInstall`.

## TODO
- [x] pwsh core support
- [x] xplat support
- [ ] REPL?

## Recommended plugins

[vim-polyglot](https://github.com/sheerun/vim-polyglot) for syntax highlighting 🎨
