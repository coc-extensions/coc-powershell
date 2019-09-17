/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

"use strict";

import fs = require("fs");
import path = require("path");
import { ensurePathExists, checkIfFileExists } from 'coc-utils'

export let PowerShellLanguageId = "powershell";

export interface IEditorServicesSessionDetails {
    status: string;
    reason: string;
    detail: string;
    powerShellVersion: string;
    channel: string;
    languageServicePort: number;
    debugServicePort: number;
    languageServicePipeName: string;
    debugServicePipeName: string;
}

export type IReadSessionFileCallback = (details: IEditorServicesSessionDetails) => void;
export type IWaitForSessionFileCallback = (details: IEditorServicesSessionDetails, error: string) => void;

const sessionsFolder = path.resolve(__dirname, "..", "..", "sessions/");
const sessionFilePathPrefix = path.resolve(sessionsFolder, "PSES-VSCode-" + process.env.VSCODE_PID);

// Create the sessions path if it doesn't exist already
ensurePathExists(sessionsFolder);

export function getSessionFilePath(uniqueId: number) {
    return `${sessionFilePathPrefix}-${uniqueId}`;
}

export function getDebugSessionFilePath() {
    return `${sessionFilePathPrefix}-Debug`;
}

export function writeSessionFile(sessionFilePath: string, sessionDetails: IEditorServicesSessionDetails) {
    ensurePathExists(sessionsFolder);

    const writeStream = fs.createWriteStream(sessionFilePath);
    writeStream.write(JSON.stringify(sessionDetails));
    writeStream.close();
}

export function waitForSessionFile(sessionFilePath: string, callback: IWaitForSessionFileCallback) {

    function innerTryFunc(remainingTries: number, delayMilliseconds: number) {
        if (remainingTries === 0) {
            callback(undefined, "Timed out waiting for session file to appear.");
        } else if (!checkIfFileExists(sessionFilePath)) {
            // Wait a bit and try again
            setTimeout(
                () => { innerTryFunc(remainingTries - 1, delayMilliseconds); },
                delayMilliseconds);
        } else {
            // Session file was found, load and return it
            callback(readSessionFile(sessionFilePath), undefined);
        }
    }

    // Try once every 2 seconds, 60 times - making two full minutes
    innerTryFunc(60, 2000);
}

export function readSessionFile(sessionFilePath: string): IEditorServicesSessionDetails {
    const fileContents = fs.readFileSync(sessionFilePath, "utf-8");
    return JSON.parse(fileContents);
}

export function deleteSessionFile(sessionFilePath: string) {
    try {
        fs.unlinkSync(sessionFilePath);
    } catch (e) {
        // TODO: Be more specific about what we're catching
    }
}

