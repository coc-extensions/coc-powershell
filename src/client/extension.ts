/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as crypto from "crypto";
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { commands, workspace, ExtensionContext, events } from 'coc.nvim';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, StreamInfo } from 'coc.nvim';
import { fileURLToPath } from './utils'
import { getDefaultPowerShellPath, getPlatformDetails } from './platform';
import settings = require("./settings");
import * as process from './process';

async function getCurrentSelection(mode: string) {
    let doc = await workspace.document

    if (mode === "v" || mode === "V") {
        let [from, _ ] = await doc.buffer.mark("<")
        let [to, __  ] = await doc.buffer.mark(">")
        let result: string[] = []
        for(let i = from; i <= to; ++i)
        {
            result.push(doc.getline(i - 1))
        }
        return result
    }
    else if (mode === "n") {
        let line = await workspace.nvim.call('line', '.')
        return [doc.getline(line - 1)]
    }
    else if (mode === "i") {
        // TODO what to do in insert mode?
    }
    else if (mode === "t") {
        //TODO what to do in terminal mode?
    }

    return []
}

export async function activate(context: ExtensionContext) {

    let config = settings.load()
    let pwshPath = config.powerShellExePath
        ? this.config.powerShellExePath 
        : getDefaultPowerShellPath(getPlatformDetails())

    let proc = new process.PowerShellProcess(config, pwshPath, "PowerShell REPL")

    let sessionDetails = await proc.start()
    let socket = net.connect(sessionDetails.languageServicePipeName);
    let streamInfo = () => new Promise<StreamInfo>((resolve, reject) => {
        socket.on(
            "connect",
            () => {
                proc.log.appendLine("Language service connected.");
                resolve({writer: socket, reader: socket});
            });
    });

	workspace.addRootPatterns('ps1', ['*.ps1', '*.psd1', '*.psm1', '.vim', '.git', '.hg'])

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

    let doEval = async function(mode: string) {
        let document = await workspace.document
        if (!document || document.filetype !== 'ps1') {
            return
        }

        for(let line of await getCurrentSelection(mode))
        {
            proc.eval(line)
        }
    }


    let cmdEvalLine = commands.registerCommand("powershell.evaluateLine", async () => doEval('n'));
    let cmdEvalSelection = commands.registerCommand("powershell.evaluateSelection", async () => doEval('v'));
    let cmdExecFile = commands.registerCommand("powershell.execute", async (...args: any[]) => {
        let document = await workspace.document
        if (!document || document.filetype !== 'ps1') {
            return
        }

        let argStrs = args
            ? args.map(x => `${x}`)
            : []

        let filePath = fileURLToPath(document.uri)
        logger.appendLine(`executing: ${filePath}`)

        await workspace.createTerminal({
            name: `PowerShell: ${filePath}`,
            shellPath: pwshPath,
            shellArgs: ['-NoProfile', filePath].concat(argStrs)
        })

    })

	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable, cmdExecFile, cmdEvalLine, cmdEvalSelection);
}
