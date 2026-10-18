const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/words.js','utf8'),ctx);const src=fs.readFileSync(__dirname+'/app.js','utf8');vm.runInContext(src.slice(0,src.indexOf('const $=')),ctx);
assert.equal(ctx.window.WORDS.length,48);assert.equal(new Set(ctx.window.WORDS.map(w=>w.id)).size,48);for(const w of ctx.window.WORDS)for(const k of ['id','term','zh','en','example','exampleZh','category'])assert.ok(w[k]);
const s=(p,g,n=100000)=>ctx.schedule(p,g,n);
assert.equal(s(null,'again').due,700000);assert.equal(s(null,'good').interval,1);assert.equal(s(null,'easy').interval,4);assert.equal(s({interval:4,reviews:2,lapses:0},'good').interval,10);assert.equal(s(null,'again').lapses,1);
const valid={version:1,cards:{w001:s(null,'good')},days:{'2026-10-17':1}};assert.doesNotThrow(()=>ctx.validate(valid));for(const bad of [{}, {...valid,version:2},{...valid,cards:{unknown:s(null,'good')}},{...valid,days:{x:1}},{...valid,cards:{w001:{...s(null,'good'),due:-1}}}])assert.throws(()=>ctx.validate(bad));
console.log('PASS: 48 complete unique cards; scheduling, lapses and backup validation.');
