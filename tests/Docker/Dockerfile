# Dockerfile creates two system users (vim, nvim)
#
# vim user:
# * configured for vim with /home/vim/.vimrc
# * vim-plug installed into /home/.vim/
#
# nvim user:
# * configured for neovim with /home/nvim/.config/nvim/init.vim
# * vim-plug installed into /home/nvim/.local/share/nvim/
#
# Plugins enabled by default:
# * neoclide/coc.nvim
# * bling/vim-airline
# * sheerun/vim-polyglot
# * coc-powershell (coc.nvim plugin)
#
# Both vim and neovim configurations are set with pwsh as default shell.
#
# Default container user is root with /tmp as WORKDIR.
#
# To test with neovim run:
# runuser -l nvim -c 'nvim test.ps1'
#
# To test with vim run:
# runuser -l vim -c 'vim test.ps1'
#
# You can also switch into each user by running:
#
# su - nvim
# su - vim

FROM mcr.microsoft.com/powershell:latest
ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /tmp

# Install base packages
RUN apt-get update -qq
RUN apt-get install wget vim git curl software-properties-common -y

# Install neovim
RUN add-apt-repository ppa:neovim-ppa/stable
RUN apt-get update -qq
RUN apt-get install neovim -y

# Install nodejs
RUN bash -c 'bash <(curl -sL install-node.now.sh/lts) --yes'

# Create paswordless vim and nvim users
RUN adduser --disabled-password --gecos "" vim
RUN adduser --disabled-password --gecos "" nvim

# Configure vim as vim user.
USER vim
WORKDIR /home/vim

RUN curl -sfLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

RUN echo "call plug#begin('~/.vim/plugged')\n\
Plug 'neoclide/coc.nvim', {'branch': 'release'}\n\
Plug 'bling/vim-airline'\n\
Plug 'sheerun/vim-polyglot'\n\
call plug#end()\n\
autocmd FileType ps1 setlocal shell=pwsh" >> ~/.vimrc

RUN vim +PlugInstall +qall
RUN vim -c 'CocInstall -sync coc-powershell|q'

RUN rm -rf /tmp/coc-nvim*


# Configure nvim as nvim user.
USER nvim
WORKDIR /home/nvim

RUN curl -fLo ~/.local/share/nvim/site/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

RUN mkdir -p ~/.config/nvim

RUN echo "call plug#begin('~/.local/share/nvim/plugged')\n\
Plug 'neoclide/coc.nvim', {'branch': 'release'}\n\
Plug 'bling/vim-airline'\n\
Plug 'sheerun/vim-polyglot'\n\
call plug#end()\n\
autocmd FileType ps1 setlocal shell=pwsh" >> ~/.config/nvim/init.vim

RUN nvim +PlugInstall +qall
RUN nvim -c 'CocInstall -sync coc-powershell|q'

USER root
RUN usermod -s /usr/bin/pwsh vim
RUN usermod -s /usr/bin/pwsh nvim

RUN rm -rf /tmp/*
WORKDIR /tmp

CMD ["/usr/bin/pwsh"]
