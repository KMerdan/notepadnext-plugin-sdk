// SPDX-License-Identifier: GPL-3.0-or-later
const fs=require('node:fs');fs.mkdirSync('dist/media',{recursive:true});for(const name of fs.readdirSync('media'))fs.copyFileSync('media/'+name,'dist/media/'+name);
