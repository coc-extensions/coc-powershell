/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import {
    languages,
    DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider,
    LanguageClient, 
    workspace} from "coc.nvim"
import {
    TextDocument,
    TextEdit,
    FormattingOptions,
    TextDocumentIdentifier,
    Range } from "vscode-languageserver-types";
import { 
    Logger,
    CancellationToken, 
    Disposable } from "vscode-jsonrpc";
import {
    DocumentRangeFormattingParams,
    DocumentRangeFormattingRequest,
    DocumentSelector } from "vscode-languageserver-protocol";

class DocumentLocker {
    // tslint:disable-next-line:ban-types
    private lockedDocuments: any;

    constructor() {
        this.lockedDocuments = new Object();
    }

    public isLocked(document: TextDocument): boolean {
        return this.isLockedInternal(this.getKey(document));
    }

    public lock(document: TextDocument, unlockWhenDone?: Thenable<any>): void {
        this.lockInternal(this.getKey(document), unlockWhenDone);
    }

    public unlock(document: TextDocument): void {
        this.unlockInternal(this.getKey(document));
    }

    public unlockAll(): void {
        Object.keys(this.lockedDocuments).slice().forEach((documentKey) => this.unlockInternal(documentKey));
    }

    private getKey(document: TextDocument): string {
        return document.uri.toString();
    }

    private lockInternal(documentKey: string, unlockWhenDone?: Thenable<any>): void {
        if (!this.isLockedInternal(documentKey)) {
            this.lockedDocuments[documentKey] = true;
        }

        if (unlockWhenDone !== undefined) {
            unlockWhenDone.then(() => this.unlockInternal(documentKey));
        }
    }

    private unlockInternal(documentKey: string): void {
        if (this.isLockedInternal(documentKey)) {
            delete this.lockedDocuments[documentKey];
        }
    }

    private isLockedInternal(documentKey: string): boolean {
        return this.lockedDocuments.hasOwnProperty(documentKey);
    }
}

class PSDocumentFormattingEditProvider implements
    DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider {

    private static documentLocker = new DocumentLocker();
    private static statusBarTracker: any = new Object();

    private static showStatusBar(document: TextDocument, hideWhenDone: Thenable<any>): void {
        const statusBar =
            workspace.createStatusBarItem(0, { progress: true});
            statusBar.text = "Formatting PowerShell document"
            statusBar.show()
        this.statusBarTracker[document.uri.toString()] = statusBar;
        hideWhenDone.then(() => {
            this.disposeStatusBar(document.uri.toString());
        });
    }

    private static disposeStatusBar(documentUri: string) {
        if (this.statusBarTracker.hasOwnProperty(documentUri)) {
            this.statusBarTracker[documentUri].hide();
            this.statusBarTracker[documentUri].dispose();
            delete this.statusBarTracker[documentUri];
        }
    }

    private static disposeAllStatusBars() {
        Object.keys(this.statusBarTracker).slice().forEach((key) => this.disposeStatusBar(key));
    }

    private languageClient: LanguageClient;

    private get emptyPromise(): Promise<TextEdit[]> {
        return Promise.resolve([]);
    }

    constructor(private logger: Logger) {
    }

    public setLanguageClient(languageClient: LanguageClient): void {
        this.languageClient = languageClient;

        // setLanguageClient is called while restarting a session,
        // so this makes sure we clean up the document locker and
        // any residual status bars
        PSDocumentFormattingEditProvider.documentLocker.unlockAll();
        PSDocumentFormattingEditProvider.disposeAllStatusBars();
    }

    public provideDocumentFormattingEdits(
        document: TextDocument,
        options: FormattingOptions,
        token: CancellationToken): TextEdit[] | Thenable<TextEdit[]> {

        // this.logger.log(`Formatting entire document - ${document.uri}...`);
        return this.sendDocumentFormatRequest(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
        options: FormattingOptions,
        token: CancellationToken): TextEdit[] | Thenable<TextEdit[]> {

        // this.logger.log(`Formatting document range ${JSON.stringify(range)} - ${document.uri}...`);
        return this.sendDocumentFormatRequest(document, range, options, token);
    }

    private sendDocumentFormatRequest(
        document: TextDocument,
        range: Range,
        options: FormattingOptions,
        token: CancellationToken): TextEdit[] | Thenable<TextEdit[]> {

        // const editor: TextEditor = this.getEditor(document);
        // if (editor === undefined) {
        //     return this.emptyPromise;
        // }

        // Check if the document is already being formatted.
        // If so, then ignore the formatting request.
        if (this.isDocumentLocked(document)) {
            return this.emptyPromise;
        }

        // somehow range object gets serialized to an array of Position objects,
        // so we need to use the object literal syntax to initialize it.
        let rangeParam = null;
        if (range != null) {
            rangeParam = {
                start: {
                    line: range.start.line,
                    character: range.start.character,
                },
                end: {
                    line: range.end.line,
                    character: range.end.character,
                },
            };
        }

        const requestParams: DocumentRangeFormattingParams = {
            textDocument: TextDocumentIdentifier.create(document.uri.toString()),
            range: rangeParam,
            options: options,
        };

        const formattingStartTime = new Date().valueOf();
        function getFormattingDuration() {
            return ((new Date().valueOf()) - formattingStartTime) / 1000;
        }

        const textEdits = this.languageClient.sendRequest(
            DocumentRangeFormattingRequest.type,
            requestParams);
        this.lockDocument(document, textEdits);
        PSDocumentFormattingEditProvider.showStatusBar(document, textEdits);

        return this.logAndReturnTextEdits(textEdits, getFormattingDuration);
    }

    // There is something about having this code in the calling method that causes a TS compile error.
    // It causes the following error:
    // Type 'import("C:/Users/Keith/GitHub/rkeithhill/vscode-powershell/node_modules/vscode-languageserver-typ...'
    // is not assignable to type ''vscode'.TextEdit'. Property 'newEol' is missing in type 'TextEdit'.
    private logAndReturnTextEdits(
        textEdits: any,
        getFormattingDuration: () => number): TextEdit[] | Thenable<TextEdit[]> {

        return textEdits.then((edits: any) => {
            // this.logger.log(`Document formatting finished in ${getFormattingDuration()}s`);
            return edits;
        }, (err: any) => {
            // this.logger.log(`Document formatting failed in ${getFormattingDuration()}: ${err}`);
        });
    }

    // private getEditor(document: TextDocument): Object {
    //     return Window.;
    // }

    private isDocumentLocked(document: TextDocument): boolean {
        return PSDocumentFormattingEditProvider.documentLocker.isLocked(document);
    }

    private lockDocument(document: TextDocument, unlockWhenDone: Thenable<any>): void {
        PSDocumentFormattingEditProvider.documentLocker.lock(document, unlockWhenDone);
    }

    private getEditorSettings(): FormattingOptions {
        // Writing the editor options allows string or strong types going in, but always
        // resolves to an appropriate value on read.
        // const opts = await workspace.getFormatOptions()
        return {
            insertSpaces: true,//opts.insertSpaces as boolean,
            tabSize: 4//opts.tabSize as number,
        };
    }
}

export class DocumentFormatterFeature {
    private formattingEditProvider: Disposable;
    private rangeFormattingEditProvider: Disposable;
    private languageClient: LanguageClient;
    private documentFormattingEditProvider: PSDocumentFormattingEditProvider;

    constructor(private logger: Logger, documentSelector: DocumentSelector) {
        this.documentFormattingEditProvider = new PSDocumentFormattingEditProvider(logger);
        this.formattingEditProvider = languages.registerDocumentFormatProvider(
            documentSelector,
            this.documentFormattingEditProvider);
        this.rangeFormattingEditProvider = languages.registerDocumentRangeFormatProvider(
            documentSelector,
            this.documentFormattingEditProvider);
    }

    public dispose(): any {
        this.formattingEditProvider.dispose();
        this.rangeFormattingEditProvider.dispose();
    }

    public setLanguageClient(languageclient: LanguageClient): void {
        this.languageClient = languageclient;
        this.documentFormattingEditProvider.setLanguageClient(languageclient);
    }
}