// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('node:fs'),path=require('node:path'),{fileURLToPath}=require('node:url');
const {startLocalService}=require('./local-service.cjs');
exports.activate=async context=>{
  let service,panel,revision=0,document=null,refreshTimer;
  context.subscriptions.push({dispose(){clearTimeout(refreshTimer);++revision;}});
  const refresh=async()=>{
    const ticket=++revision,source=await context.previews.getSource();
    let snapshot=null;
    if(source)try{snapshot=await context.documents.getSnapshot(source.documentId);}catch(error){
      if(![1008,1009].includes(error.code))throw error;
      snapshot={...source,text:'<!doctype html><html><body><p role="alert">'+(error.code===1008?'This document exceeds the preview size limit.':'This document cannot be previewed as Unicode text.')+'</p></body></html>'};
    }
    if(ticket!==revision||context.stopping?.aborted)return;
    document=snapshot;
    if(panel)await panel.reloadSource({documentId:document?.documentId??null,version:document?.version??null});
  };
  const open=async()=>{
    if(panel){await panel.reveal(true);return;}
    await refresh();
    if(!service)service=await startLocalService(context,async(request,response,file)=>{
      if(request.method!=='GET'){response.writeHead(405);response.end();return;}
      if(file==='api/document'){response.setHeader('Content-Type','application/json; charset=utf-8');response.end(JSON.stringify(document));return;}
      if(file==='index.html'){response.setHeader('Content-Type','text/html; charset=utf-8');response.end(document?.text??'<!doctype html><html><body></body></html>');return;}
      // Relative CSS, JS and images belong to this source document's directory.
      // Canonical paths keep traversal and symlinks outside that directory out.
      if(document?.uri?.startsWith('file:'))try{
        const root=fs.realpathSync(path.dirname(fileURLToPath(document.uri))),candidate=fs.realpathSync(path.resolve(root,decodeURIComponent(file)));
        const types={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
        const mime=types[path.extname(candidate).toLowerCase()];
        if(candidate.startsWith(root+path.sep)&&mime&&fs.statSync(candidate).isFile()&&fs.statSync(candidate).size<=16*1024*1024){response.setHeader('Content-Type',mime);response.end(fs.readFileSync(candidate));return;}
      }catch{ /* Missing or escaping relative files remain unavailable. */ }
      response.writeHead(404);response.end();
    });
    const current=await context.webviews.createService({viewType:'html-preview',title:'HTML Preview',endpoint:service.endpoint,nonce:service.nonce});panel=current;context.subscriptions.push(current);
    context.subscriptions.push(current.onEvent(event=>{
      if(event.type==='closed'&&panel===current){panel=undefined;++revision;}
      if(event.type==='sourceChanged'&&panel===current)void refresh().catch(error=>{if(![1001,1002,1004].includes(error.code))console.warn(error);});
    }));await current.reveal(true);
  };
  context.subscriptions.push(await context.documents.watch(event=>{
    if(panel&&(event.type==='contentInvalidated'||event.type==='reset')){clearTimeout(refreshTimer);++revision;refreshTimer=setTimeout(()=>void refresh().catch(error=>{if(![1001,1002,1004].includes(error.code))console.warn(error);}),150);}
  }));
  context.subscriptions.push(context.webviews.registerRestorer('html-preview',open));
  context.subscriptions.push(await context.commands.register('__PLUGIN_ID__.open',open));
};
