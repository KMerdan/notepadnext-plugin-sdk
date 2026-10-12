// SPDX-License-Identifier: GPL-3.0-or-later
import type {PluginContext,CommandInvocation,PluginError} from '@notepadnext/plugin-sdk/native';
export async function activate(context:PluginContext) {
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.uppercase',async invocation=>{
    if(!invocation.editorId)return;
    const capture=await context.editors.capture(invocation,{signal:context.stopping});
    if(capture.selection.mode!=='stream'||capture.selection.selections.some(s=>s.anchorVirtualSpace||s.caretVirtualSpace)){
      await context.window.showMessage('info','Choose normal text selections first.');return;
    }
    const edits=capture.selection.selections.map((selection,index)=>({range:selection.range,text:capture.selectedText[index].toUpperCase()})).filter((edit,index)=>edit.text!==capture.selectedText[index]);
    if(!edits.length)return;
    try {await context.documents.applyEdits(capture.document.documentId,capture.document.version,edits,{selectionGuard:{editorId:capture.editor.editorId,revision:capture.selection.revision}});}
    catch(error){if([1001,1011].includes((error as PluginError).code)){await context.window.showMessage('info','The document or selection changed. Run the command again.');return;}throw error;}
  }));
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.deduplicate',async (invocation:CommandInvocation)=>{
    if(!invocation.editorId)return;
    const capture=await context.editors.capture(invocation);
    await context.core.execute('edit.lines.deduplicate',{target:{editorId:capture.editor.editorId,documentId:capture.document.documentId,expectedVersion:capture.document.version,selectionRevision:capture.selection.revision}});
  }));
}
