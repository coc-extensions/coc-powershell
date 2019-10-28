/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import fs = require("fs");
import path = require("path");
import vscode = require("coc.nvim");
import Settings = require("./settings");
import utils = require("./utils");
import crypto = require("crypto");
import { isWindowsOS } from 'coc-utils'

export class PowerShellProcess {
    public static escapeSingleQuotes(pspath: string): string {
        return pspath.replace(new RegExp("'", "g"), "''");
    }

    public onExited: vscode.Event<void>;
    private onExitedEmitter = new vscode.Emitter<void>();

    private consoleTerminal: vscode.Terminal = undefined;
    private consoleCloseSubscription: vscode.Disposable;
    private sessionFilePath: string
    private sessionDetails: utils.IEditorServicesSessionDetails;

    public log = vscode.workspace.createOutputChannel('powershell')
    private cocPowerShellRoot = path.join(__dirname, "..", "..");
    private bundledModulesPath = path.join(this.cocPowerShellRoot, "PowerShellEditorServices");

    constructor(
        private config: Settings.ISettings,
        private pwshPath: string,
        private title: string) {

        this.onExited = this.onExitedEmitter.event;
    }

    public async start(): Promise<utils.IEditorServicesSessionDetails> {

        // If PowerShellEditorServices is not downloaded yet, run the install script to do so.
        if (!fs.existsSync(this.bundledModulesPath)) {
            const errMessage = "[Error] PowerShell Editor Services not found. Package is not in the correct format."
            this.log.appendLine(errMessage);
            throw errMessage;
        }

        this.log.appendLine("starting.")
        this.log.appendLine(`pwshPath = ${this.pwshPath}`)
        this.log.appendLine(`bundledModulesPath = ${this.bundledModulesPath}`)

        let logDir = path.join(this.cocPowerShellRoot, `/.pses/logs/${crypto.randomBytes(16).toString("hex")}-${process.pid}`)
        this.sessionFilePath = path.join(logDir, "session")

        // Make sure no old session file exists
        utils.deleteSessionFile(this.sessionFilePath);

        let powerShellArgs: string[] = []

        // Only add ExecutionPolicy param on Windows
        if (isWindowsOS()) {
            powerShellArgs.push("-ExecutionPolicy", "Bypass");
        }

        powerShellArgs.push(
            "-NoProfile",
            "-NonInteractive",
            path.join(this.bundledModulesPath, "/PowerShellEditorServices/Start-EditorServices.ps1"),
            "-HostName", "coc.vim",
            "-HostProfileId", "coc.vim",
            "-HostVersion", "2.0.0",
            "-LogPath", path.join(logDir, "log.txt"),
            "-LogLevel", this.config.developer.editorServicesLogLevel || "Normal",
            "-BundledModulesPath", this.bundledModulesPath,
            "-EnableConsoleRepl",
            "-SessionDetailsPath", this.sessionFilePath)

        this.consoleTerminal = await vscode.workspace.createTerminal({
            name: this.title,
            shellPath: this.pwshPath,
            shellArgs: powerShellArgs
        })

        if (!this.config.integratedConsole.showOnStartup) {
            this.consoleTerminal.hide();
        }

        await new Promise((resolve, reject) => {
            // Start the language client
            utils.waitForSessionFile(
                this.sessionFilePath,
                (sessionDetails, error) => {
                    // Clean up the session file
                    utils.deleteSessionFile(this.sessionFilePath);

                    if (error) {
                        reject(error);
                    } else {
                        this.sessionDetails = sessionDetails;
                        resolve(this.sessionDetails);
                    }
            });
        })

        this.consoleCloseSubscription =
            vscode.workspace.onDidCloseTerminal(
                (terminal) => {
                    if (terminal === this.consoleTerminal) {
                        this.log.appendLine("powershell.exe terminated or terminal UI was closed");
                        this.onExitedEmitter.fire();
                    }
                }, this);

        this.consoleTerminal.processId.then(
            (pid) => { this.log.appendLine(`powershell.exe started, pid: ${pid}`); });

        return this.sessionDetails
    }

    public async showTerminalIfNotVisible() {
        if (this.consoleTerminal) {
            const winid: number = await vscode.workspace.nvim.eval(`bufwinid(${this.consoleTerminal.bufnr})`) as number;

          // show terminal if hidded when running F5/F8
            if (winid == -1) {
                this.consoleTerminal.show();
            }

            // this will move cursor to consol after F5/F8 if focusConsoleOnExecute is true
            if (this.config.integratedConsole.focusConsoleOnExecute) {
               this.consoleTerminal.show();
            }
        }
    }
    
    public async showTerminal() {this.consoleTerminal.show();}
    public async hideTerminal() {this.consoleTerminal.hide();}
    public async toggleTerminal() {
            const winid: number = await vscode.workspace.nvim.eval(`bufwinid(${this.consoleTerminal.bufnr})`) as number;
            if (winid == -1) {
                this.consoleTerminal.show();
            } else { this.consoleTerminal.hide(); }
    } 




    public  dispose() {

        // Clean up the session file
        utils.deleteSessionFile(this.sessionFilePath);

        if (this.consoleCloseSubscription) {
            this.consoleCloseSubscription.dispose();
            this.consoleCloseSubscription = undefined;
        }

        if (this.consoleTerminal) {
            this.log.appendLine("Terminating PowerShell process...");
            this.consoleTerminal.dispose();
            this.consoleTerminal = undefined;
        }
    }
}
