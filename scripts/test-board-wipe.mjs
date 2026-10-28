import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/board-wipe.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
test('irregular paths change with the seed and visit every contact row exactly once', () => {
  for (const height of [44,180,468,1800]) {
    const a=exports.createWipePlan(600,height,.123),b=exports.createWipePlan(600,height,.845);
    assert.equal(a.rows.length,exports.wipeRows(height));
    assert.equal(new Set(a.rows).size,a.rows.length);
    if(a.rows.length>2) assert.notEqual(a.rows.join(','),b.rows.join(','));
    assert.equal(a.legs[0].start,0);assert.equal(a.legs.at(-1).end,1);
    for(let i=1;i<a.legs.length;i++) assert.deepEqual(a.legs[i-1].b,a.legs[i].a);
    for(let row=0;row<a.rows.length;row++) {
      const leg=a.legs[a.rows.indexOf(row)*2];
      assert.equal(Math.min(leg.a.x,leg.b.x),0);assert.equal(Math.max(leg.a.x,leg.b.x),504);
      assert.equal(leg.a.y,leg.b.y);
    }
  }
});
test('only reached contact footprints erase; diagonal movement stays continuous and bounded', () => {
  const plan=exports.createWipePlan(600,480,.332);
  for(const leg of plan.legs) {
    assert.equal(exports.contactPolygon(leg.start,leg),'');
    const p=(leg.start+leg.end)/2,point=exports.eraserOnPlan(p,plan.legs);
    assert.ok(Math.abs(point.x-(leg.a.x+leg.b.x)/2)<.0001);
    assert.ok(Math.abs(point.y-(leg.a.y+leg.b.y)/2)<.0001);
    const polygon=exports.contactPolygon(p,leg).split(' ').map(p=>p.split(',').map(Number));
    for(const [x,y]of polygon){assert.ok(x>=0&&x<=600);assert.ok(y>=0&&y<=480);}
    assert.ok(polygon.some(([x,y])=>Math.abs(x-point.x)<.001||Math.abs(y-point.y)<.001));
  }
});
test('covering passes leave no unvisited pixels and duration stays bounded',()=>{
 for(const height of [20,44,180,468,1800]) {
  const plan=exports.createWipePlan(600,height,.2);
  const passes=plan.legs.filter((_,i)=>i%2===0).sort((a,b)=>a.a.y-b.a.y);
  let bottom=0;for(const leg of passes){assert.ok(leg.a.y<=bottom);bottom=Math.min(height,leg.a.y+44);}
  assert.equal(bottom,height);
 }
 assert.ok(exports.eraseDuration(1200,10000)<=15000);
});
