/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';
import { commands, workspace, ExtensionContext, events } from 'coc.nvim';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, StreamInfo } from 'coc.nvim';
import { fileURLToPath, getPlatformDetails } from 'coc-utils'
import settings = require("./settings");
import * as process from './process';
import { EvaluateRequestMessage, IEvaluateRequestArguments } from "./messages";
import { PowerShellExeFinder, IPowerShellExeDetails } from './platform';

async function getSelectedTextToExecute(mode: string): Promise<string> {
    let doc = workspace.getDocument(workspace.bufnr);
    if (!doc) return "";

    if (mode === 'n') {
        // get whole line.
        let range = await workspace.getCursorPosition();
        if (range) return doc.getline(range.line);
    } else {
        let range = await workspace.getSelectedRange(mode, doc);
        if (range) return doc.textDocument.getText(range);
    }

    return "";
}

function startREPLProc(context: ExtensionContext, config: settings.ISettings, pwshPath: string, title: string) { 
    return async () => {
        let proc = new process.PowerShellProcess(config, pwshPath, title) 
        let sessionDetails = await proc.start()
        let socket = net.connect(sessionDetails.languageServicePipeName);
        let streamInfo = () => new Promise<StreamInfo>((resolve, __) => {
            socket.on(
                "connect",
                () => {
                    proc.log.appendLine("Language service connected.");
                    resolve({writer: socket, reader: socket});
                });
        });


        // Options to control the language client
        let clientOptions: LanguageClientOptions = {
            // Register the server for powershell documents
            documentSelector: [{ scheme: 'file', language: 'ps1' }],
            synchronize: {
                // Synchronize the setting section 'powershell' to the server
                configurationSection: 'powershell',
                // Notify the server about file changes to PowerShell files contain in the workspace
                fileEvents: [
                    workspace.createFileSystemWatcher('**/*.ps1'),
                    workspace.createFileSystemWatcher('**/*.psd1'),
                    workspace.createFileSystemWatcher('**/*.psm1')
                ]
            }
        }

        // Create the language client and start the client.
        let client = new LanguageClient('ps1', 'PowerShell Language Server', streamInfo, clientOptions);
        let disposable = client.start();

        let doEval = async function(mode: string) {
            let document = await workspace.document
            if (!document || document.filetype !== 'ps1') {
                return
            }

            const content = await getSelectedTextToExecute(mode);

            const evaluateArgs: IEvaluateRequestArguments = {
                expression: content,
            }
            client.sendRequest(EvaluateRequestMessage, evaluateArgs)

            await proc.showTerminalIfVisible();
        }


        let cmdEvalLine = commands.registerCommand("powershell.evaluateLine", async () => doEval('n'));
        let cmdEvalSelection = commands.registerCommand("powershell.evaluateSelection", async () => doEval('v'));
        let cmdExecFile = commands.registerCommand("powershell.execute", async (...args: any[]) => {
            let document = await workspace.document
            if (!document || document.filetype !== 'ps1') {
                return;
            }

            if(document.schema === "untitled") {
                workspace.showMessage(
                    "Can't run file because it's an in-memory file. Save the contents to a file and try again.",
                    'error');
                return;
            }

            let argStrs = args
                ? args.map(x => `${x}`)
                : []

            let filePath = fileURLToPath(document.uri)
            proc.log.appendLine(`executing: ${filePath}`)

            // Escape single quotes by adding a second single quote.
            if(filePath.indexOf('\'') !== -1) {
                filePath = filePath.replace(/'/, '\'\'')
            }

            // workaround until document.dirty works
            if (Number.parseInt(await workspace.nvim.commandOutput("echo &modified"))) {
                if(! await workspace.showPrompt("Your file will be saved first before it runs. Is that ok?")) {
                    return;
                }
                // workaround until document.textDocument.save() is supported.
                await workspace.nvim.command('w');
            }

            const evaluateArgs: IEvaluateRequestArguments = {
                expression: `& '${filePath}'`,
            };
            await client.sendRequest(EvaluateRequestMessage, evaluateArgs);
            await proc.showTerminalIfVisible();
        })

        // Push the disposable to the context's subscriptions so that the 
        // client can be deactivated on extension deactivation
        context.subscriptions.push(disposable, cmdExecFile, cmdEvalLine, cmdEvalSelection);

        return proc.onExited
    }
}

export async function activate(context: ExtensionContext) {

    let config = settings.load()

    const powershellExeFinder = new PowerShellExeFinder(
        getPlatformDetails(),
        config.powerShellAdditionalExePaths);

    let pwshPath = config.powerShellExePath;

    try {
        if (config.powerShellDefaultVersion) {
            for (const details of powershellExeFinder.enumeratePowerShellInstallations()) {
                // Need to compare names case-insensitively, from https://stackoverflow.com/a/2140723
                const wantedName = config.powerShellDefaultVersion;
                if (wantedName.localeCompare(details.displayName, undefined, { sensitivity: "accent" }) === 0) {
                    pwshPath = details.exePath;
                    break;
                }
            }
        }

        pwshPath = pwshPath ||
            powershellExeFinder.getFirstAvailablePowerShellInstallation().exePath;

    } catch (e) {
        this.log.writeError(`Error occurred while searching for a PowerShell executable:\n${e}`);
        return;
    }

    // Status bar entry showing PS version
    let versionBarItem = workspace.createStatusBarItem(0, {progress: false})
    versionBarItem.text = pwshPath.indexOf("powershell.exe") >= 0
        ? "PS-Desktop"
        : "PS-Core"
    versionBarItem.show()

    events.on('BufEnter', async () => {
        let document = await workspace.document
        if (!document) {
            versionBarItem.hide()
            return
        }

        if (document.filetype === 'ps1') {
            versionBarItem.show()
        } else {
            versionBarItem.hide()
        }
    })

    let fnproc = startREPLProc(context, config, pwshPath, "PowerShell REPL")

    let daemon = async function() {
        let onExit = await fnproc()
        onExit(async () => { await daemon() })
    }

    await daemon()
}
