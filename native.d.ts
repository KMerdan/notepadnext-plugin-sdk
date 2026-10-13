/** Native editor API 0.3. Declare engines.api: ^0.3.0. */
import type { BasePluginContext as BaseContext, DocumentInfo as BaseInfo, TextSnapshot, TextEdit, Position, Disposable } from './base';
export type { Position, TextEdit, Disposable } from './base';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface CallOptions { signal?: AbortSignal; timeout?: number; }
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
  'edit.lines.duplicate': {target: CoreTarget};
  'edit.lines.move': {target: CoreTarget; direction: 'up' | 'down'};
  'edit.lines.join': {target: CoreTarget}; 'edit.lines.split': {target: CoreTarget};
  'edit.lines.reverse': {target: CoreTarget};
  'edit.comment.add': {target: CoreTarget}; 'edit.comment.remove': {target: CoreTarget};
  'edit.indent.increase': {target: CoreTarget}; 'edit.indent.decrease': {target: CoreTarget};
  'view.fold.level': {target: CoreTarget; level: 1|2|3|4|5|6|7|8|9; folded: boolean};
}
export interface NativeLimits {maxRangeUtf8Bytes:262144;maxPositionLineUtf8Bytes:262144;maxSearchUtf8Bytes:2097152;maxSearchResults:1000;maxSubscriptions:64;maxDecorationStylesPerOwner:8;maxDecorationRanges:1024;}
export interface RangeRead {documentId:string;version:number;range:Range;text:string;positionEncoding:'utf-16';}
export interface NativeDocumentEvent {subscriptionId:string;eventSeq:number;type:'opened'|'closed'|'activeChanged'|'contentInvalidated'|'metadataChanged'|'reset'|'selectionChanged'|'saved'|'reloaded'|'bookmarksChanged';document:DocumentInfo|null;editorId?:string;selection?:SelectionState;reason?:string;}
export interface NativeWatch extends Disposable {documents:DocumentInfo[];editors:EditorInfo[];eventSeq:number;}
export interface SelectionWatch extends Disposable {selection:SelectionState;eventSeq:number;}
export interface FileOperationResult {status:'completed'|'cancelled'|'skipped';document:DocumentInfo|null;reason?:string;}
export interface SearchQuery {text:string;matchCase?:boolean;wholeWord?:boolean;range?:Range;maxResults?:number;cursor?:Position;}
export interface SearchResult {documentId:string;version:number;matches:Range[];count:number;complete:boolean;next:Position|null;}
export interface BookmarkState {documentId:string;version:number;lines:number[];}
export interface Decoration extends Disposable {readonly resourceId:string;set(expectedVersion:number,ranges:Range[],options?:CallOptions):Promise<void>;}
export interface CoreCommandInfo {id: keyof CoreCommandMap; title: string; requiredCapabilities: string[]; effect: 'document' | 'view'; selectionSemantics: string; createsUndoStep: boolean;}
export interface HostInfo {
  product: 'Notepad Next ++'; applicationVersion: string; apiVersion: string; platform: 'macos' | 'windows' | 'linux'; capabilities: readonly string[];
  limits: Readonly<{maxSnapshotUtf8Bytes: number; maxEditsPerTransaction: 256; maxPanelStateBytes: 65536}>;
  supports(capability: string): boolean;
  /** API 0.3 only. Bounded native service limits. */
  getNativeLimits(options?:CallOptions):Promise<NativeLimits>;
}
export interface PluginContext extends Omit<BaseContext, 'commands' | 'documents'> {
  readonly stopping: AbortSignal;
  readonly host: HostInfo;
  readonly log: { debug(message:string,details?:Json):void; info(message:string,details?:Json):void; warn(message:string,details?:Json):void; error(message:string,details?:Json):void; };
  readonly commands: {register(id:string,callback:(invocation:CommandInvocation)=>unknown|Promise<unknown>):Promise<Disposable>};
  readonly documents: Omit<BaseContext['documents'], 'applyEdits'> & {
    list(options?:CallOptions):Promise<DocumentInfo[]>;
    getInfo(id:string,options?:CallOptions):Promise<DocumentInfo>;
    readRange(id:string,expectedVersion:number,range:Range,options?:CallOptions & {maxBytes?:number}):Promise<RangeRead>;
    watchNative(listener:(event:NativeDocumentEvent)=>void|Promise<void>):Promise<NativeWatch>;
    convertLineEndings(id:string,expectedVersion:number,lineEnding:'lf'|'crlf'|'cr',options?:CallOptions):Promise<DocumentInfo>;
    applyEdits(id:string,expectedVersion:number,edits:TextEdit[],options?:EditOptions):Promise<{version:number}>;
  };
  readonly editors: {
    getActive(options?:CallOptions):Promise<EditorInfo|null>;
    capture(invocation:CommandInvocation,options?:CallOptions):Promise<EditorCapture>;
    getSelections(id:string,options?:CallOptions):Promise<SelectionState>;
    watchSelections(id:string,listener:(event:NativeDocumentEvent)=>void|Promise<void>):Promise<SelectionWatch>;
    activate(id:string,expectedDocumentVersion:number,options?:CallOptions & {preserveFocus?:boolean}):Promise<EditorInfo>;
    revealRange(id:string,expectedDocumentVersion:number,range:Range,options?:CallOptions):Promise<EditorInfo>;
    getOptions(id:string,options?:CallOptions):Promise<{editorId:string;tabWidth:number;indentWidth:number;useTabs:boolean}>;
    /** Sets stream selections only. Virtual space is rejected; all ranges preflight before mutation. */
    setSelections(id:string,expectedDocumentVersion:number,expectedRevision:number,selections:Selection[],mainIndex:number):Promise<SelectionState>;
  };
  readonly core: {list():Promise<CoreCommandInfo[]>; execute<K extends keyof CoreCommandMap>(id:K,request:CoreCommandMap[K],options?:CallOptions):Promise<{version:number}>};
  readonly files: {
    create(options?:{text?:string;languageId?:string;activate?:boolean},callOptions?:CallOptions):Promise<FileOperationResult>;
    open(uri:string,options?:{activate?:boolean},callOptions?:CallOptions):Promise<FileOperationResult>;
    save(id:string,expectedVersion:number,options?:CallOptions):Promise<FileOperationResult>;
    saveAs(id:string,expectedVersion:number,uri?:string,options?:CallOptions):Promise<FileOperationResult>;
    close(id:string,expectedVersion:number,policy?:'prompt'|'ifClean',options?:CallOptions):Promise<FileOperationResult>;
  };
  readonly search: {findAll(id:string,expectedVersion:number,query:SearchQuery,options?:CallOptions):Promise<SearchResult>;count(id:string,expectedVersion:number,query:SearchQuery,options?:CallOptions):Promise<SearchResult>};
  readonly languages: {list(options?:CallOptions):Promise<Array<{id:string;name:string}>>;getKeywords(id:string,options?:CallOptions):Promise<string[]>;set(id:string,expectedVersion:number,languageId:string,options?:CallOptions):Promise<DocumentInfo>};
  readonly bookmarks: {list(id:string,options?:CallOptions):Promise<BookmarkState>;set(id:string,expectedVersion:number,lines:number[],marked:boolean,options?:CallOptions):Promise<BookmarkState>};
  readonly decorations: {create(id:string,options:{style:'highlight'|'underline';color:string},callOptions?:CallOptions):Promise<Decoration>};
  readonly webviews: BaseContext['webviews'] & {
    /** Qt >=6.6, webviews@1 + webviews.html@1. Host allocates the ID, default dock is right. */
    createHtml(options:{viewType:string;title:string;enableScripts:boolean;resourceRoots?:string[]},listener?:Parameters<BaseContext['webviews']['createCompatible']>[1]):ReturnType<BaseContext['webviews']['createCompatible']>;
  };
}
export interface PluginModule {activate(context:PluginContext):void|Promise<void>;deactivate?():void|Promise<void>;}
/** Main-world bridge supplied to full HTML/service panels; JSON state is bounded to 64 KiB. */
export interface PanelApi {postMessage(message:Json):void;getState():Json|undefined;setState(state:Json|undefined):Json|undefined;}
