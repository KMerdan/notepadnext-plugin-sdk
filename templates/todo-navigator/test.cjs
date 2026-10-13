// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const manifest=require('./notepadnext-plugin.json');
test('navigator composes native search, owned decorations and versioned reveal',async()=>{
 const commands=new Map(),calls=[],subscriptions=[],messages=[];let listener,disposed=0;
 const range={start:{line:1,character:0},end:{line:1,character:4}};
 const panel={panelId:'panel',async mapAsset(){return 'nnp-plugin://test/panel/asset/panel.js';},async setDocument(html){assert.match(html,/TODO Navigator/);assert.doesNotMatch(html,/<script>[^<]/);},async reveal(){},async postMessage(value){messages.push(value);return true;},onEvent(callback){listener=callback;return {dispose(){}};},async dispose(){}};
 const context={stopping:new AbortController().signal,subscriptions,commands:{async register(id,callback){commands.set(id,callback);return {dispose(){}};}},documents:{async watchNative(){return {dispose(){}};},async getInfo(){return {documentId:'doc',version:7,name:'draft.txt'};}},editors:{async activate(...args){calls.push(['activate',...args]);},async revealRange(...args){calls.push(['reveal',...args]);}},search:{async findAll(id,version,query){calls.push(['search',id,version,query]);return {matches:[range],complete:true};}},decorations:{async create(id,style){calls.push(['create',id,style]);return {async set(version,ranges){calls.push(['set',version,ranges]);},async dispose(){++disposed;}};}},webviews:{registerRestorer(){return {dispose(){}};},async createHtml(){return panel;}}};
 await require('./dist/index.js').activate(context);await commands.get(manifest.contributes.commands[0].id)({editorId:'editor',documentId:'doc',windowId:'window'});
 assert.deepEqual(calls[0],['search','doc',7,{text:'TODO',wholeWord:true,maxResults:200}]);assert.deepEqual(calls.find(c=>c[0]==='set'),['set',7,[range]]);assert.equal(messages.at(-1).document.name,'draft.txt');
 await listener({type:'message',payload:{type:'reveal',index:0}});assert.deepEqual(calls.at(-1),['reveal','editor',7,range]);
 await listener({type:'closed'});assert.equal(disposed,1);for(const item of subscriptions.reverse())await item.dispose();
});
