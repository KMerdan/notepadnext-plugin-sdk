// SPDX-License-Identifier: GPL-3.0-or-later
const test=require('node:test'),assert=require('node:assert/strict');
const {createTestHost}=require('@notepadnext/plugin-sdk/testing');const manifest=require('./notepadnext-plugin.json');
test('inspector renders escaped Unicode from a bounded read and disposes subscriptions',async()=>{
 const host=createTestHost({pluginId:manifest.id,apiVersion:'0.3.0',text:'Hello 😀中 <script>not code</script>',capabilities:manifest.capabilities.required});
 await host.activate(require('./dist/index.js'));await host.invoke(manifest.contributes.commands[0].id);
 const panel=[...host.panels.values()][0];assert.match(panel.html,/Hello 😀中 &lt;script&gt;/);assert.doesNotMatch(panel.html,/<script>/);assert.equal(host.context.host.apiVersion,'0.3.0');await host.dispose();assert.equal(host.panels.size,0);
});
