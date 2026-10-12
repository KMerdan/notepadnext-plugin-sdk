/** Native host API 0.2. Use engines.api: ^0.2.0; legacy 0.1 types live at the package root. */
import type { PluginContext as LegacyContext, DocumentInfo as BaseInfo, TextSnapshot, TextEdit, Position, Disposable } from './index';
export type { Position, TextEdit, Disposable } from './index';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface CallOptions { signal?: AbortSignal; }
export interface PluginError extends Error { code: number; kind: string; data?: Json; outcome?: 'notCommitted' | 'unknown'; }
export interface Range { start: Position; end: Position; }
export interface DocumentInfo extends BaseInfo {
  name: string; lineEnding: 'lf' | 'crlf' | 'cr'; encoding: 'utf-8' | 'utf-16le' | 'utf-16be' | 'unknown';
  bom: boolean; byteLength: number; lineCount: number;
}
export interface EditorInfo { editorId: string; documentId: string; windowId: string; }
export interface Selection { range: Range; anchor: Position; caret: Position; anchorVirtualSpace: number; caretVirtualSpace: number; }
export interface SelectionState {
  editorId: string; documentId: string; documentVersion: number; revision: number;
  mode: 'stream' | 'rectangle' | 'thin' | 'lines'; mainIndex: number; selections: Selection[];
}
export interface CommandInvocation { commandId: string; windowId: string; editorId: string | null; documentId: string | null; args: readonly Json[]; }
export interface EditorCapture { editor: EditorInfo; document: DocumentInfo; snapshot: TextSnapshot & DocumentInfo; selection: SelectionState; selectedText: string[]; }
export interface SelectionGuard { editorId: string; revision: number; }
export interface EditOptions extends CallOptions { selectionGuard?: SelectionGuard; }
export interface CoreTarget { editorId: string; documentId: string; expectedVersion: number; selectionRevision?: number; }
export interface CoreCommandMap {
  'edit.undo': {target: CoreTarget}; 'edit.redo': {target: CoreTarget};
  'edit.case.upper': {target: CoreTarget}; 'edit.case.lower': {target: CoreTarget};
  'edit.comment.toggle': {target: CoreTarget};
  'edit.lines.deduplicate': {target: CoreTarget; consecutiveOnly?: boolean};
  'edit.lines.sort': {target: CoreTarget; order: 'ascending' | 'descending'; compare: 'caseSensitive' | 'caseInsensitive' | 'length'};
  'view.fold.all': {target: CoreTarget; folded: boolean};
}
export interface CoreCommandInfo {id: keyof CoreCommandMap; title: string; requiredCapabilities: string[]; effect: 'document' | 'view'; selectionSemantics: string; createsUndoStep: boolean;}
export interface HostInfo {
  product: 'Notepad Next ++'; applicationVersion: string; apiVersion: string; platform: 'macos' | 'windows' | 'linux'; capabilities: readonly string[];
  limits: Readonly<{maxSnapshotUtf8Bytes: number; maxEditsPerTransaction: 256; maxPanelStateBytes: 65536}>;
  supports(capability: string): boolean;
}
export interface PluginContext extends Omit<LegacyContext, 'commands' | 'documents'> {
  readonly stopping: AbortSignal;
  readonly host: HostInfo;
  readonly log: { debug(message:string,details?:Json):void; info(message:string,details?:Json):void; warn(message:string,details?:Json):void; error(message:string,details?:Json):void; };
  readonly commands: {register(id:string,callback:(invocation:CommandInvocation)=>unknown|Promise<unknown>):Promise<Disposable>};
  readonly documents: Omit<LegacyContext['documents'], 'applyEdits'> & {
    list(options?:CallOptions):Promise<DocumentInfo[]>;
    getInfo(id:string,options?:CallOptions):Promise<DocumentInfo>;
    applyEdits(id:string,expectedVersion:number,edits:TextEdit[],options?:EditOptions):Promise<{version:number}>;
  };
  readonly editors: {
    getActive(options?:CallOptions):Promise<EditorInfo|null>;
    capture(invocation:CommandInvocation,options?:CallOptions):Promise<EditorCapture>;
    getSelections(id:string,options?:CallOptions):Promise<SelectionState>;
    /** Sets stream selections only. Virtual space is rejected; all ranges preflight before mutation. */
    setSelections(id:string,expectedDocumentVersion:number,expectedRevision:number,selections:Selection[],mainIndex:number):Promise<SelectionState>;
  };
  readonly core: {list():Promise<CoreCommandInfo[]>; execute<K extends keyof CoreCommandMap>(id:K,request:CoreCommandMap[K],options?:CallOptions):Promise<{version:number}>};
  readonly webviews: LegacyContext['webviews'] & {
    /** Qt >=6.6, webviews@1 + webviews.html@1. Host allocates the ID, default dock is right. */
    createHtml(options:{viewType:string;title:string;enableScripts:boolean;resourceRoots?:string[]},listener?:Parameters<LegacyContext['webviews']['createCompatible']>[1]):ReturnType<LegacyContext['webviews']['createCompatible']>;
  };
}
export interface PluginModule {activate(context:PluginContext):void|Promise<void>;deactivate?():void|Promise<void>;}
/** Main-world bridge supplied to full HTML/service panels; JSON state is bounded to 64 KiB. */
export interface PanelApi {postMessage(message:Json):void;getState():Json|undefined;setState(state:Json|undefined):Json|undefined;}
