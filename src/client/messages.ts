/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

// The collection of custom messages that coc-powershell will send to/receive from PowerShell Editor Services

export const EvaluateRequestMessage = "evaluate";
export interface IEvaluateRequestArguments {
    expression: string;
}
export const GetHelpRequestMessage = "powerShell/showHelp";
