// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const {createTestHost}=require('@notepadnext/plugin-sdk/testing');
const manifest=require('./notepadnext-plugin.json');
test('native selection transform keeps Unicode and can dispose',async()=>{
 const host=createTestHost({pluginId:manifest.id,apiVersion:'0.2.0',text:'hello 😀中文',capabilities:manifest.capabilities.required});
 await host.activate(require('./dist/index.js'));await host.invoke(manifest.contributes.commands[0].id);
 assert.equal(host.getSnapshot().text,'HELLO 😀中文');await host.dispose();assert.equal(host.context.stopping.aborted,true);
});
