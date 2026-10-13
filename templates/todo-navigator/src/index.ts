// SPDX-License-Identifier: GPL-3.0-or-later
import type {PluginContext,PluginError,Decoration,Range,EditorInfo} from '@notepadnext/plugin-sdk/native';
import type {CompatibleWebviewPanel,RestoredPanel} from '@notepadnext/plugin-sdk';
export async function activate(context:PluginContext) {
  let panel:CompatibleWebviewPanel|undefined,target:EditorInfo|undefined,decoration:Decoration|undefined,decorationDocument:string|undefined;
  let query='TODO',version=0,matches:Range[]=[],epoch=0,task:AbortController|undefined;
  async function refresh() {
    if(!panel||!target)return;const current=panel,origin=target,ticket=++epoch;task?.abort();task=new AbortController();const signal=AbortSignal.any([task.signal,context.stopping]);
    try {
      const info=await context.documents.getInfo(origin.documentId,{signal});
      const result=await context.search.findAll(info.documentId,info.version,{text:query,wholeWord:true,maxResults:200},{signal});
      if(ticket!==epoch||current!==panel)return;
      if(decorationDocument!==info.documentId){await decoration?.dispose();decoration=undefined;decorationDocument=undefined;}
      if(!decoration){const acquired=await context.decorations.create(info.documentId,{style:'highlight',color:'#007aff'},{signal});if(ticket!==epoch||current!==panel){await acquired.dispose();return;}decoration=acquired;decorationDocument=info.documentId;}
      await decoration.set(info.version,result.matches,{signal});if(ticket!==epoch)return;
      version=info.version;matches=result.matches;
      await current.postMessage({type:'results',document:info,editorId:origin.editorId,query,matches,complete:result.complete});
    }catch(error){if(signal.aborted||ticket!==epoch)return;const code=(error as PluginError).code;if(code===1001)return;if(code===1002){target=undefined;await decoration?.dispose();decoration=undefined;decorationDocument=undefined;}await current.postMessage({type:'error',message:(error as Error).message});}
  }
  async function open(origin:EditorInfo,restored?:RestoredPanel) {
    target=origin;
    const state=restored?.state as {query?:unknown}|undefined;if(typeof state?.query==='string'&&state.query.length>0&&state.query.length<=1024)query=state.query;
    if(!panel){
      panel=await context.webviews.createHtml({viewType:'__PLUGIN_ID__.todo',title:'TODO Navigator',enableScripts:true,resourceRoots:['dist/media']});
      const current=panel,script=await current.mapAsset('dist/media/panel.js');
      context.subscriptions.push(current.onEvent(async event=>{
        if(event.type==='closed'&&panel===current){panel=undefined;task?.abort();await decoration?.dispose();decoration=undefined;decorationDocument=undefined;return;}
        if(event.type!=='message')return;const message=event.payload as {type?:string;query?:string;index?:number};
        if(message.type==='ready')await refresh();
        if(message.type==='query'&&typeof message.query==='string'&&message.query.length>0&&message.query.length<=1024){query=message.query;await refresh();}
        if(message.type==='reveal'&&Number.isInteger(message.index)&&target&&matches[message.index!]){
          try{await context.editors.activate(target.editorId,version,{preserveFocus:true});await context.editors.revealRange(target.editorId,version,matches[message.index!]);}
          catch(error){if((error as PluginError).code===1001)await refresh();else throw error;}
        }
      }));
      await current.setDocument(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:13px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;margin:20px;color:CanvasText;background:Canvas}h1{font-size:20px;margin:0 0 16px}input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #8b8b90;border-radius:7px;background:Field;color:FieldText}button{display:block;width:100%;padding:10px 12px;margin:6px 0;text-align:left;border:1px solid #8b8b9040;border-radius:8px;background:ButtonFace;color:ButtonText;cursor:pointer}button:hover{border-color:#007aff}#status{color:GrayText;margin:12px 0}</style></head><body><h1>TODO Navigator</h1><label for="query">Find whole words</label><input id="query" maxlength="1024"><p id="status">Reading editor…</p><div id="results"></div><script src="${script}"></script></body></html>`);
    }
    await panel.reveal(true);await refresh();
  }
  context.subscriptions.push({dispose:async()=>{task?.abort();await decoration?.dispose();}});
  context.subscriptions.push(context.webviews.registerRestorer('__PLUGIN_ID__.todo',async restored=>{
    const saved=restored.state as {editorId?:unknown;documentId?:unknown}|undefined;
    let origin:EditorInfo|null=null;
    if(typeof saved?.editorId==='string'&&typeof saved.documentId==='string')try{await context.documents.getInfo(saved.documentId);origin={editorId:saved.editorId,documentId:saved.documentId,windowId:''};}catch{}
    origin??=await context.editors.getActive();if(origin)await open(origin,restored);
  }));
  context.subscriptions.push(await context.documents.watchNative(event=>{if(panel&&target&&event.document?.documentId===target.documentId&&['contentInvalidated','reset','closed'].includes(event.type))return refresh();}));
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.show',async invocation=>{if(invocation.editorId&&invocation.documentId)await open({editorId:invocation.editorId,documentId:invocation.documentId,windowId:invocation.windowId});}));
}
