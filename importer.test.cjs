// SPDX-License-Identifier: GPL-3.0-or-later
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {configurationDefinitions}=require('./compat/configuration.cjs'),{importExtension}=require('./import-vscode.cjs');
test('configuration contract validates defaults, bounds and overlapping keys without a host checkout',()=>{
  const definitions=configurationDefinitions({properties:{'hello.message':{type:'string',default:'Hi'},'hello.enabled':{type:'boolean'}}});
  assert.deepEqual(definitions.get('hello.message'),{type:'string',default:'Hi'});assert.deepEqual(definitions.get('hello.enabled'),{type:'boolean',default:false});
  for(const properties of [{'hello.message':{type:'string',default:42}},{hello:{type:'string'},'hello.child':{type:'string'}},{'hello.count':{type:'number',default:Infinity}},{'hello.message':{type:'string',enum:['Hi'],default:'Bye'}},{'hello.path':{type:'string',pattern:'.*'}}])assert.throws(()=>configurationDefinitions({properties}));
});
test('importer runs independently and preserves configuration without executing extension code',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'nnp-sdk-import-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const source=path.join(root,'source'),output=path.join(root,'package');await fs.mkdir(path.join(source,'out'),{recursive:true});
  const info={name:'hello',publisher:'demo',version:'1.0.0',engines:{vscode:'^1.80.0'},main:'./out/extension.js',contributes:{commands:[{command:'hello.open',title:'Hello'}],configuration:{properties:{'hello.message':{type:'string',default:'Hi'}}}}};
  await fs.writeFile(path.join(source,'package.json'),JSON.stringify(info));await fs.writeFile(path.join(source,'LICENSE'),'MIT');await fs.writeFile(path.join(source,'out/extension.js'),"throw new Error('Must not execute during import');");
  await importExtension(source,output,{capabilities:['configuration@1']});
  const metadata=JSON.parse(await fs.readFile(path.join(output,'notepadnext-plugin.json'),'utf8'));assert.equal(metadata.id,'demo.hello');assert.ok(metadata.capabilities.required.includes('configuration@1'));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(output,'dist/vscode-package.json'),'utf8')).contributes.configuration,info.contributes.configuration);
});
