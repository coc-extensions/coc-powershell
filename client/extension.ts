/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { workspace, ExtensionContext, commands } from 'coc.nvim';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'coc.nvim';
import { Range } from 'vscode-languageserver-types';
import { getDefaultPowerShellPath, getPlatformDetails } from './platform';

const cocPowerShellRoot = path.join(__dirname, "..", "..");
const bundledModulesPath = path.join(cocPowerShellRoot, "PowerShellEditorServices");
const logPath = path.join(cocPowerShellRoot, "/.pses/logs/1234");

export function activate(context: ExtensionContext) {
	setTimeout(function () {
		const pwshPath = getDefaultPowerShellPath(getPlatformDetails())

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
			// Register the server for F# documents
			documentSelector: [{ scheme: 'file', language: 'ps1' }],
			synchronize: {
				// Synchronize the setting section 'powershell' to the server
				configurationSection: 'ps1',
				// Notify the server about file changes to PowerShell files contain in the workspace
				// TODO: is there a way to configure this via the language server protocol?
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

		// Push the disposable to the context's subscriptions so that the 
		// client can be deactivated on extension deactivation
		context.subscriptions.push(disposable);
		commands.registerCommand('powershell.command.goto', goto);
	}, 10000);
}

function goto(file: string, startLine: number, startColumn: number, _endLine: number, _endColumn: number) {
	let selection = Range.create(startLine, startColumn, startLine, startColumn);
	workspace.jumpTo(file, selection.start);
}
