/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

// The collection of custom messages that coc-powershell will send to/receive from PowerShell Editor Services

import { RequestType } from 'vscode-jsonrpc';

export const EvaluateRequestType = new RequestType<IEvaluateRequestArguments, void, void, void>("evaluate");
export interface IEvaluateRequestArguments {
    expression: string;
}
