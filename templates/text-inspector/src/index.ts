// SPDX-License-Identifier: GPL-3.0-or-later
import type {PluginContext,PluginError,Range,Disposable} from '@notepadnext/plugin-sdk/native';
import type {WebviewPanel} from '@notepadnext/plugin-sdk';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function activate(context:PluginContext) {
  let panel:WebviewPanel|undefined,target:string|undefined,selectionWatch:Disposable|undefined,epoch=0,task:AbortController|undefined;
  async function refresh() {
    if(!panel||!target)return;const current=panel,editorId=target,ticket=++epoch;task?.abort();task=new AbortController();
    const signal=AbortSignal.any([task.signal,context.stopping]);
    try {
      const selection=await context.editors.getSelections(editorId,{signal});
      const info=await context.documents.getInfo(selection.documentId,{signal});
      const item=selection.selections[selection.mainIndex];if(!item)return;
      let range:Range={start:item.range.start,end:item.range.end};let clipped=false;
      if(range.end.line>range.start.line){range={start:range.start,end:{line:range.start.line+1,character:0}};clipped=true;}
      if(range.end.line===range.start.line&&range.end.character-range.start.character>4096){range={start:range.start,end:{line:range.start.line,character:range.start.character+4096}};clipped=true;}
      let text:string;
      try{text=(await context.documents.readRange(info.documentId,selection.documentVersion,range,{signal,maxBytes:16384})).text;}
      catch(error){if((error as PluginError).code!==-32602||!clipped||range.start.line!==range.end.line)throw error;range={start:range.start,end:{line:range.end.line,character:range.end.character-1}};text=(await context.documents.readRange(info.documentId,selection.documentVersion,range,{signal,maxBytes:16384})).text;}
      if(ticket!==epoch||current!==panel)return;
      const options=await context.editors.getOptions(editorId,{signal});
      await current.setHtml(`<main><h1>Text Inspector</h1><p>${escape(info.name)} · ${selection.selections.length} selections · ${escape(selection.mode)}</p><p>Line ${range.start.line+1}, UTF-16 column ${range.start.character+1} · ${escape(info.lineEnding.toUpperCase())} · ${escape(info.encoding)}</p><p>Tab width ${options.tabWidth} · ${options.useTabs?'Tabs':'Spaces'}${clipped?' · First selected line / bounded excerpt':''}</p><pre style="white-space:pre-wrap">${escape(text)}</pre><p>Use Plugins → Reveal inspected selection to locate it.</p></main>`,{documentId:info.documentId,version:selection.documentVersion});
    }catch(error){if(signal.aborted||ticket!==epoch)return;const code=(error as PluginError).code;if(code===1001)return;if(code===1002){target=undefined;await current.setHtml('<h1>Text Inspector</h1><p>The inspected document was closed.</p>',{documentId:null,version:null});return;}await current.setHtml(`<h1>Text Inspector</h1><p>${code===1008?'This selection exceeds the local read budget. Choose a smaller range.':escape((error as Error).message)}</p>`,{documentId:null,version:null});}
  }
  async function open(editorId:string) {
    target=editorId;await selectionWatch?.dispose();selectionWatch=await context.editors.watchSelections(editorId,()=>refresh());
    if(!panel){panel=await context.webviews.create('__PLUGIN_ID__.inspector','Text Inspector');const current=panel;context.subscriptions.push(current.onEvent(event=>{if(event.type==='closed'&&panel===current){panel=undefined;task?.abort();void selectionWatch?.dispose();selectionWatch=undefined;}}));}
    await panel.reveal(true);await refresh();
  }
  context.subscriptions.push({dispose:async()=>{task?.abort();await selectionWatch?.dispose();}});
  context.subscriptions.push(context.webviews.registerRestorer('__PLUGIN_ID__.inspector',async()=>{const editor=await context.editors.getActive();if(editor)await open(editor.editorId);}));
  context.subscriptions.push(await context.documents.watchNative(event=>{if(panel&&event.type!=='activeChanged')return refresh();}));
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.show',async invocation=>{if(invocation.editorId)await open(invocation.editorId);}));
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.reveal',async()=>{if(!target)return;const state=await context.editors.getSelections(target);await context.editors.revealRange(target,state.documentVersion,state.selections[state.mainIndex].range);}));
}
