import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Core from '../backend/core.cjs';
import { createApp } from '../backend/server.mjs';
const data = JSON.parse(readFileSync(new URL('../data.json', import.meta.url)));
const env = { GROQ_API_KEY:'unit-test-placeholder', APP_ACCESS_TOKEN:'unit-test-code-16-characters', ALLOWED_ORIGINS:'https://example.github.io' };
const scenario = { goal:'flammability',fuel:'Solid',gravity:'Microgravity',oxygen:21,pressure:14.7,flow:null };
async function withApp(options, run) {
  const app = createApp(options); await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  try { await run('http://127.0.0.1:'+app.address().port); } finally { await new Promise(resolve=>app.close(resolve)); }
}
function request(base, body, token=env.APP_ACCESS_TOKEN, origin='https://example.github.io') {return fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Pyrox-Token':token,'Origin':origin},body:JSON.stringify(body)});}
test('all bundled source objects and table values are embedded unchanged in HTML',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const embedded=JSON.parse(html.match(/<script id="pyrox-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(embedded,data);assert.equal(data.STUDIES.length,20);assert.equal(data.sources.length,9);
  assert.equal(data.sources.reduce((n,s)=>n+(s.data.pages?.length||0),0),241);
  assert.equal(data.sources.filter(s=>s.data.sheets).reduce((n,s)=>n+s.data.sheets.reduce((m,sh)=>m+sh.rows.length,0),0),1355);
});
test('missing numeric values are not converted into observations',()=>{
  for(const v of [null,undefined,'','   ',false,'Not tracked'])assert.equal(Core.finite(v),false);
  assert.equal(Core.finite(0),true);assert.equal(Core.number('0'),0);
  assert.ok(data.BASS_TABLE_5_1.every(r=>r.source_page===65));
});
test('ranking responds to changed conditions and identifies lunar gaps',()=>{
  const bass=data.STUDIES.find(s=>s.id==='BASS-II');
  const match=Core.rank(data,bass,scenario),outside=Core.rank(data,bass,{...scenario,oxygen:30,gravity:'Lunar gravity'});
  assert.ok(match.score>outside.score);assert.ok(outside.gaps.some(g=>g.includes('lunar')));assert.ok(outside.gaps.some(g=>g.includes('outside')));
  const flex=Core.rank(data,data.STUDIES.find(s=>s.id==='FLEX'),{...scenario,fuel:'Liquid'});assert.ok(flex.gaps.some(g=>g.includes('plan')));
});
test('retrieval keeps real page and workbook locations; explicit scope is respected',()=>{
  const idx=Core.index(data), hits=Core.search(idx,'BASS-II PMMA flame spread',5,'bass_ii_summary');
  assert.ok(hits.length);assert.ok(hits.every(h=>h.sourceId==='bass_ii_summary'&&Number.isInteger(h.page)));
  const work=Core.search(idx,'resistance temperature',3,'same_wire_test');assert.ok(work.length);assert.ok(work.every(h=>h.sheet&&h.row));
  assert.deepEqual(Core.search(idx,'xyzunmatchedword123456789'),[]);
});
test('workbook plots do not mix secondary tables with the initial calibration table',()=>{
  const workbook=data.sources.find(s=>s.id==='same_wire_test').data;
  const fixture=workbook.sheets.find(s=>s.sheet_name==='Fixture');
  assert.equal(Core.calibrationRows(fixture).length,6);
  assert.deepEqual(Core.calibrationRows(fixture).map(r=>r.source_row),[2,3,4,5,6,7]);
  const mild=workbook.sheets.find(s=>s.sheet_name==='MildSteel2');assert.equal(Core.calibrationRows(mild).length,5);
  const cols=Core.numericColumns({...fixture,rows:[fixture.rows[0],...Core.calibrationRows(fixture)]});assert.ok(!cols.includes('H'));
});
test('missing configuration fails closed',async()=>{
  await withApp({env:{}},async base=>{assert.equal((await (await fetch(base+'/health')).json()).configured,false);assert.equal((await request(base,{question:'PMMA flame spread'},'', '')).status,503);});
});
test('wrong access codes and disallowed origins cannot reach Groq',async()=>{
  let calls=0;await withApp({env,fetchImpl:async()=>{calls++;throw Error('must not call');}},async base=>{
    assert.equal((await request(base,{question:'PMMA flame spread'},'wrong')).status,401);
    assert.equal((await request(base,{question:'PMMA flame spread'},env.APP_ACCESS_TOKEN,'https://untrusted.example')).status,403);
    assert.equal(calls,0);
  });
});
test('real request contract grounds answers in sources and keeps key server-side',async()=>{
  const fake=async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+env.GROQ_API_KEY);const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-20b');const context=JSON.parse(body.messages[1].content);assert.ok(context.evidence.length);assert.equal(context.scenario.oxygen,21);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'The excerpt describes PMMA flame spread [S1].',blindSpots:['Pressure is not established.'],nextSteps:['Inspect the cited source.']})}}]}));};
  await withApp({env,fetchImpl:fake},async base=>{const res=await request(base,{question:'BASS-II PMMA flame spread',scenario});assert.equal(res.status,200);const result=await res.json();assert.equal(result.mode,'groq');assert.equal(result.citations.length,1);assert.ok(result.citations[0].sourceId);assert.ok(!JSON.stringify(result).includes(env.GROQ_API_KEY));});
});
test('invented citation IDs are rejected',async()=>{
  const fake=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'Unsupported assertion [S999].'})}}]}));
  await withApp({env,fetchImpl:fake},async base=>{const response=await request(base,{question:'BASS-II PMMA flame spread'});assert.equal(response.status,502);assert.match((await response.json()).error,/citations/);});
});
test('global authenticated quota stops excess provider calls',async()=>{
  let calls=0;const fake=async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'Source-backed result [S1].'})}}]}));};
  await withApp({env:{...env,MAX_REQUESTS_PER_HOUR:'1'},fetchImpl:fake},async base=>{assert.equal((await request(base,{question:'BASS-II PMMA flame spread'})).status,200);assert.equal((await request(base,{question:'BASS-II PMMA flame spread'})).status,429);assert.equal(calls,1);});
});
test('invalid input and upstream errors return useful messages',async()=>{
  await withApp({env,fetchImpl:async()=>new Response('{}',{status:401})},async base=>{assert.equal((await request(base,{question:'x'})).status,400);const r=await request(base,{question:'BASS-II PMMA flame spread'});assert.equal(r.status,502);assert.match((await r.json()).error,/server API key/);});
});
