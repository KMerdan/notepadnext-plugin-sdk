// SPDX-License-Identifier: GPL-3.0-or-later
const api=acquireNotepadNextApi();
const saved=api.getState()||{},input=document.getElementById('query'),status=document.getElementById('status'),results=document.getElementById('results');
input.value=saved.query||'TODO';let state={...saved},scroll=saved.scroll||0,timer;
window.addEventListener('message',event=>{
 const value=event.data;if(value?.type==='error'){status.textContent=value.message;return;}if(value?.type!=='results')return;
 input.value=value.query;state={query:value.query,editorId:value.editorId,documentId:value.document.documentId,scroll:window.scrollY};api.setState(state);
 status.textContent=`${value.document.name} · ${value.matches.length} matches${value.complete?'':' · First 200 results'}`;results.replaceChildren();
 value.matches.forEach((range,index)=>{const button=document.createElement('button');button.textContent=`Line ${range.start.line+1}, column ${range.start.character+1}`;button.addEventListener('click',()=>api.postMessage({type:'reveal',index}));results.append(button);});
 if(scroll){window.scrollTo(0,scroll);scroll=0;}
});
input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{const query=input.value.trim();if(query){state.query=query;api.setState(state);api.postMessage({type:'query',query});}},150);});
window.addEventListener('scroll',()=>{state.scroll=window.scrollY;api.setState(state);},{passive:true});
api.postMessage({type:'ready'});
