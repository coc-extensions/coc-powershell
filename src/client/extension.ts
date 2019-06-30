/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as crypto from "crypto";
import * as fs from 'fs';
import * as path from 'path';
import { commands, workspace, ExtensionContext, events } from 'coc.nvim';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'coc.nvim';
import { getDefaultPowerShellPath, getPlatformDetails } from './platform';
import { fileURLToPath } from './utils'
import * as settings from './settings';
import Shell from "node-powershell";

// Important paths.
const config = settings.load()
const cocPowerShellRoot = path.join(__dirname, "..", "..");
const bundledModulesPath = path.join(cocPowerShellRoot, "PowerShellEditorServices");
const logPath = path.join(cocPowerShellRoot, `/.pses/logs/${crypto.randomBytes(16).toString("hex")}-${process.pid}`);
const logger = workspace.createOutputChannel('powershell')

export async function activate(context: ExtensionContext) {

    let pwshPath = config.powerShellExePath
        ? config.powerShellExePath 
        : getDefaultPowerShellPath(getPlatformDetails())

    logger.appendLine("starting.")
    logger.appendLine(`pwshPath = ${pwshPath}`)
    logger.appendLine(`bundledModulesPath = ${bundledModulesPath}`)

	// If PowerShellEditorServices is not downloaded yet, run the install script to do so.
	if (!fs.existsSync(bundledModulesPath)) {
        let notification = workspace.createStatusBarItem(0, { progress: true})
        notification.text = "Downloading PowerShellEditorServices..."
        notification.show()
        
		const ps = new Shell({
			executionPolicy: 'Bypass',
			noProfile: true
		});

		ps.addCommand(path.join(cocPowerShellRoot, "src", "downloadPSES.ps1"));
        await ps.invoke()
            .catch(e => logger.appendLine("error downloading PSES: " + e))
            .finally(() => {
            notification.hide()
            notification.dispose()
        });

	}

	let serverOptions: ServerOptions = {
		command: pwshPath,
		args: [
			"-NoProfile",
			"-NonInteractive",
			path.join(bundledModulesPath, "/PowerShellEditorServices/Start-EditorServices.ps1"),
			"-HostName", "coc.vim",
			"-HostProfileId", "0",
			"-HostVersion", "2.0.0",
			"-LogPath", path.join(logPath, "log.txt"),
			"-LogLevel", "Diagnostic",
			"-BundledModulesPath", bundledModulesPath,
			"-Stdio",
			"-SessionDetailsPath", path.join(logPath, "session")],
		transport: TransportKind.stdio
	}

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
	let client = new LanguageClient('ps1', 'PowerShell Language Server', serverOptions, clientOptions);
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
	context.subscriptions.push(disposable, cmdExecFile);
}
