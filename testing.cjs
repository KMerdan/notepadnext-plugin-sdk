// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {randomUUID}=require('node:crypto'),{isDeepStrictEqual}=require('node:util');
function createTestHost({pluginId='tests.plugin',capabilities=[],text='',document={},apiVersion='0.3.0',onRender=()=>{}}={}) {
  const stopping=new AbortController();let selectionRevision=1;
  let active=false,closed=false,plugin,sequence=0,buffer=text;
  let info={documentId:'test-document',uri:'file:///test/example.md',languageId:'markdown',version:1,isDirty:true,isReadonly:false,...document};
  const nativeWatches=new Set(),selectionWatches=new Set();
  const commands=new Map(),watches=new Set(),resources=new Set(),panels=new Map(),messages=[],restorers=new Map();
  const nativeInfo=()=>({name:'example.md',encoding:'utf-8',bom:false,lineEnding:buffer.includes('\r\n')?'crlf':buffer.includes('\r')?'cr':'lf',...info,byteLength:Buffer.byteLength(buffer),lineCount:buffer.split(/\r\n|\n|\r/).length});
  const snapshot=()=>({...info,text:buffer,positionEncoding:'utf-16'});
  const assertOpen=()=>{if(closed)throw new Error('Test host is disposed.');};
  function own(dispose) {
    let disposed=false;
    const handle={async dispose(){if(disposed)return;disposed=true;resources.delete(handle);await dispose();}};
    resources.add(handle);return handle;
  }
  const unsupported=feature=>{throw new Error(feature+' is not implemented by the SDK test host. Verify it in NotepadNext.');};
  function store() {
    const values=new Map();
    return {async get(key){return values.has(key)?structuredClone(values.get(key)):null;},
      async update(key,value){assertOpen();if(!active)throw new Error('Write from a command after activation.');if(value===undefined)values.delete(key);else values.set(key,structuredClone(value));},
      async compareExchange(key,expected,value){const actual=values.has(key)?values.get(key):null;if(!isDeepStrictEqual(actual,expected))throw new Error('Configuration/storage conflict.');await this.update(key,value);}
    };
  }
  const selectionState=()=>{const lines=buffer.split(/\r\n|\r|\n/),start={line:0,character:0},end={line:lines.length-1,character:lines.at(-1).length};return {editorId:'test-editor',documentId:info.documentId,documentVersion:info.version,revision:selectionRevision,mode:'stream',mainIndex:0,selections:[{range:{start,end},anchor:start,caret:end,anchorVirtualSpace:0,caretVirtualSpace:0}]};};
  function offset(position){let start=0,line=0;const expression=/\r\n|\r|\n/g;let match;while(line<position.line&&(match=expression.exec(buffer))){start=match.index+match[0].length;++line;}if(line!==position.line)throw new Error('Invalid position');expression.lastIndex=start;const next=expression.exec(buffer);const end=next?next.index:buffer.length;const result=start+position.character;if(position.character<0||result>end||(result>start&&buffer.charCodeAt(result-1)>=0xd800&&buffer.charCodeAt(result-1)<=0xdbff))throw new Error('Invalid UTF-16 position');return result;}
  const context={
    pluginId,sessionId:randomUUID(),generation:1,subscriptions:[],stopping:stopping.signal,host:{product:'Notepad Next ++',applicationVersion:'0.15.0',apiVersion,platform:process.platform==='darwin'?'macos':process.platform==='win32'?'windows':'linux',capabilities:Object.freeze([...capabilities]),limits:{maxSnapshotUtf8Bytes:2097152,maxEditsPerTransaction:256,maxPanelStateBytes:65536},getNativeLimits:async()=>({maxRangeUtf8Bytes:262144,maxPositionLineUtf8Bytes:262144,maxSearchUtf8Bytes:2097152,maxSearchResults:1000,maxSubscriptions:64,maxDecorationStylesPerOwner:8,maxDecorationRanges:1024}),supports:cap=>capabilities.includes(cap)},log:console,capabilities:Object.freeze([...capabilities]),
    commands:{async register(id,callback){assertOpen();if(commands.has(id))throw new Error('Command already registered: '+id);commands.set(id,callback);return own(()=>commands.delete(id));}},
    window:{async showMessage(severity,message,items=[]){assertOpen();if(!active)throw new Error('Show messages from a command after activation.');messages.push({severity,message,items:[...items]});return items[0];}},
    documents:{
      async readRange(id,version,range,options={}){assertOpen();if(id!==info.documentId||version!==info.version)throw Object.assign(new Error('VersionConflict'),{code:1001});const start=offset(range.start),end=offset(range.end);if(end<start)throw new Error('Reversed range');const text=buffer.slice(start,end);if(Buffer.byteLength(text)>(options.maxBytes??262144))throw Object.assign(new Error('ContentTooLarge'),{code:1008});return {documentId:id,version,range,text,positionEncoding:'utf-16'};},
      async watchNative(listener){nativeWatches.add(listener);return Object.assign(own(()=>nativeWatches.delete(listener)),{documents:[nativeInfo()],editors:[{editorId:'test-editor',documentId:info.documentId,windowId:'test-window'}],eventSeq:sequence});},
      async convertLineEndings(){return unsupported('documents.convertLineEndings');},
      async getActive(){assertOpen();return {...info};},async list(){return [nativeInfo()];},async getInfo(id){if(id!==info.documentId)throw new Error('Unknown document.');return nativeInfo();},
      async getSnapshot(id){assertOpen();if(id!==info.documentId)throw new Error('Unknown document.');return snapshot();},
      async watch(listener){assertOpen();watches.add(listener);return Object.assign(own(()=>watches.delete(listener)),{document:{...info},eventSeq:sequence});},
      async watchAll(){return unsupported('documents.watchAll');},
      async applyEdits(id,version,edits,options={}){
        assertOpen();if(!active)throw new Error('Write after activation.');
        if(id!==info.documentId||version!==info.version)throw Object.assign(new Error('VersionConflict'),{code:1001});
        if(options.selectionGuard&&(options.selectionGuard.editorId!=='test-editor'||options.selectionGuard.revision!==selectionRevision))throw Object.assign(new Error('SelectionConflict'),{code:1011});
        const offset=position=>{const lines=buffer.split('\n');if(position.line>=lines.length||position.character>lines[position.line].replace(/\r$/,'').length)throw new Error('Invalid position');return lines.slice(0,position.line).reduce((n,line)=>n+line.length+1,0)+position.character;};
        const prepared=edits.map(edit=>({start:offset(edit.range.start),end:offset(edit.range.end),text:edit.text})).sort((a,b)=>a.start-b.start);
        for(let n=0;n<prepared.length;n++)if(prepared[n].end<prepared[n].start||(n&&prepared[n].start<=prepared[n-1].end))throw new Error('Overlapping edits');
        for(const edit of prepared.reverse())buffer=buffer.slice(0,edit.start)+edit.text+buffer.slice(edit.end);
        info={...info,version:info.version+1,isDirty:true};++selectionRevision;return {version:info.version};
      }
    },
    editors:{async watchSelections(id,listener){if(id!=='test-editor')throw new Error('Unknown editor');selectionWatches.add(listener);return Object.assign(own(()=>selectionWatches.delete(listener)),{selection:selectionState(),eventSeq:sequence});},async getOptions(){return {editorId:'test-editor',tabWidth:4,indentWidth:4,useTabs:false};},async activate(){return unsupported('editors.activate');},async revealRange(){return unsupported('editors.revealRange');},async getActive(){return {editorId:'test-editor',documentId:info.documentId,windowId:'test-window'};},async getSelections(){assertOpen();return selectionState();},async setSelections(){return unsupported('editors.setSelections');},async capture(invocation){assertOpen();if(invocation.editorId!=='test-editor'||invocation.documentId!==info.documentId)throw new Error('Unknown editor.');
      const lines=buffer.split('\n'),end={line:lines.length-1,character:lines.at(-1).replace(/\r$/,'').length},start={line:0,character:0};
      return {editor:{editorId:'test-editor',documentId:info.documentId,windowId:'test-window'},document:nativeInfo(),snapshot:{...snapshot(),...nativeInfo()},selectedText:[buffer],selection:{editorId:'test-editor',documentId:info.documentId,documentVersion:info.version,revision:selectionRevision,mode:'stream',mainIndex:0,selections:[{range:{start,end},anchor:start,caret:end,anchorVirtualSpace:0,caretVirtualSpace:0}]}};
    }},core:{async list(){return unsupported('core.list');},async execute(){return unsupported('core.execute');}},
    webviews:{
      registerRestorer(type,callback){restorers.set(type,callback);return {dispose:()=>restorers.delete(type)};},
      owner:'test-host',
      async create(viewType,title) {
        assertOpen();if(!active)throw new Error('Open panels from a command after activation.');
        const panelId=randomUUID(),listeners=new Set(),panel=Object.assign(own(()=>{
          panels.delete(panelId);for(const listener of [...listeners])listener({panelId,type:'closed'});listeners.clear();
        }),{
          panelId,viewType,title,html:'',visible:false,renderContext:null,messages:[],
          async reveal(){assertOpen();if(!panels.has(panelId))throw new Error('Panel is closed.');panel.visible=true;},
          async setHtml(html,renderContext){
            assertOpen();if(!panels.has(panelId))throw new Error('Panel is closed.');
            if(renderContext.documentId!==null&&(renderContext.documentId!==info.documentId||renderContext.version!==info.version))throw Object.assign(new Error('Stale document render.'),{code:1002});
            panel.html=html;panel.renderContext={...renderContext};onRender(panel);
          },
          async postMessage(message){panel.messages.push(structuredClone(message));return true;},
          async mapResource(){return unsupported('webviews.mapResource');},
          onEvent(listener){listeners.add(listener);return {dispose(){listeners.delete(listener);}};}
        });
        panels.set(panelId,panel);return panel;
      },
      async createHtml(){return unsupported('webviews.createHtml');},
      async createCompatible(){return unsupported('webviews.createCompatible');}
    },storage:store(),configuration:store()
  };
  const host={context,panels,messages,getSnapshot:snapshot,
    async activate(module){assertOpen();if(plugin)throw new Error('Test host has already activated a plugin.');plugin=module;await plugin.activate(context);active=true;},
    async invoke(id,...args){assertOpen();if(!active)throw new Error('Plugin is not active.');if(!commands.has(id))throw new Error('Command is not registered: '+id);return commands.get(id)({commandId:id,windowId:'test-window',editorId:'test-editor',documentId:info.documentId,args});},
    setDocument(value,metadata={}) {
      assertOpen();buffer=value;info={...info,...metadata,version:info.version+1,isDirty:true};
      const event={subscriptionId:'test-watch',eventSeq:++sequence,type:'contentInvalidated',document:{...info}};
      for(const listener of [...watches])listener(event);
      for(const listener of [...nativeWatches])listener({...event,document:nativeInfo()});
    },
    async dispose() {
      if(closed)return;stopping.abort();
      let failure;
      try{await plugin?.deactivate?.();}catch(error){failure=error;}
      active=false;
      for(const item of [...new Set([...context.subscriptions.splice(0),...resources])].reverse())try{await item.dispose();}catch(error){failure??=error;}
      commands.clear();watches.clear();nativeWatches.clear();selectionWatches.clear();closed=true;
      if(failure)throw failure;
    }
  };
  return host;
}
module.exports={createTestHost};
