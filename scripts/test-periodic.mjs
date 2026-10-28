import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, periodicVisual, wantsPeriodicTable } from '../server/periodic-core.mjs';
import { runTutor } from '../server/tutor-core.mjs';
test('all 118 elements have unique symbols and positions, with correct period boundaries', () => {
  assert.equal(ELEMENTS.length, 118);
  assert.equal(new Set(ELEMENTS.map(e => e.symbol)).size, 118);
  assert.equal(new Set(ELEMENTS.map(e => `${e.period}:${e.column}`)).size, 118);
  for (const [z, symbol, name, period, column] of [[1,'H','Hidrógeno',1,1],[2,'He','Helio',1,18],[26,'Fe','Hierro',4,8],[57,'La','Lantano',8,3],[71,'Lu','Lutecio',8,17],[72,'Hf','Hafnio',6,4],[79,'Au','Oro',6,11],[89,'Ac','Actinio',9,3],[103,'Lr','Lawrencio',9,17],[104,'Rf','Rutherfordio',7,4],[118,'Og','Oganesón',7,18]]) assert.deepEqual(ELEMENTS[z-1], {z,symbol,name,period,column});
});
test('visual includes every name, number and symbol, no generated image or overlapping cells', () => {
  const v = periodicVisual();
  assert.equal(v.shapes.filter(s => s.s === 'rect').length,118);
  assert.equal(v.illustration, undefined);
  for (const e of ELEMENTS) for (const label of [e.symbol,e.name,String(e.z)]) assert.ok(v.shapes.some(s => s.s === 'text' && s.text === label));
  for (const s of v.shapes) { assert.ok(s.x >= 0 && s.x < 100); assert.ok(s.y >= 0 && s.y < 72); }
});
test('complete-with-names follow-up uses recent context but unrelated topics and photos do not', () => {
  const history = [{content:'Dibújame la tabla periódica'},{content:'Tabla periódica de los elementos'}];
  assert.ok(wantsPeriodicTable({action:'help',message:'pero completa y con sus nombres',history}));
  assert.ok(!wantsPeriodicTable({action:'help',message:'Ahora dibuja un león',history}));
  assert.ok(!wantsPeriodicTable({action:'read',message:'tabla periódica',history}));
});
test('full tutor response replaces an inaccurate model sketch without the age shape cap or image generation', async () => {
  const result = await runTutor({ageBand:'7-9',message:'dibújame la tabla periódica completa',history:[],pictures:true}, {OPENAI_API_KEY:'test'}, async () => Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply:'Solo dos elementos',visual:{type:'sketch',title:'Incorrecto',illustration:'periodic table',shapes:[]}})}]}]}));
  assert.equal(result.visual.shapes.filter(s=>s.s==='rect').length,118);
  assert.match(result.reply,/118 elementos/);
  assert.equal(result.picture,null);
  assert.equal(result.visual.illustration,undefined);
});
