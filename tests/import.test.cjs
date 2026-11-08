const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function app() {
  const elements = new Map(), storage = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {value:'',hidden:false,disabled:false,innerHTML:'',textContent:'',handlers:{},files:[],addEventListener(t,fn){this.handlers[t]=fn;},showModal(){this.open=true;},close(){this.open=false;},scrollIntoView(){},click(){}});
    return elements.get(id);
  };
  const context = vm.createContext({crypto:require('node:crypto').webcrypto,console,URL,Blob,setTimeout(){},clearTimeout(){},document:{getElementById:element},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},navigator:{},window:{addEventListener(){},scrollTo(){}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  return {run:code=>vm.runInContext(code,context),element,storage};
}
function lesson() {
  return {id:'old-export',learner:'Legacy name',startedAt:'2026-11-08T10:00:00Z',endedAt:'2026-11-08T10:30:00Z',faults:[{id:'fault-1',category:'Junctions',fault:'Observation',type:'serious',time:'2026-11-08T10:10:00Z',location:{lat:51.5,lng:-0.1,accuracy:10,timestamp:'2026-11-08T10:10:00Z'}}]};
}
test('upload opens old exports read-only and preserves the active lesson',async()=>{
 const a=app();a.run("selected={category:'Control',fault:'Steering'};record('minor')");
 const before=JSON.parse(a.storage.get('drivelog-lessons-v1'));
 a.element('jsonFile').files=[{size:1000,text:async()=>JSON.stringify(lesson())}];
 await a.element('jsonFile').handlers.change();
 assert.equal(a.run('readOnly'),true);assert.equal(a.element('sheet').hidden,true);assert.equal(a.element('undo').disabled,true);assert.equal(a.element('finish').hidden,true);assert.equal(a.element('reviewTitle').textContent,'Read-only lesson');
 assert.equal(a.run('session.faults[0].location.lat'),51.5);assert.equal(a.element('reviewText').textContent.includes('Legacy name'),false);
 a.run("selected={category:'Control',fault:'Gears'};record('dangerous')");a.element('undo').onclick();a.element('confirmFinish').onclick();a.element('newLesson').onclick();
 assert.equal(a.run('session.faults.length'),1);assert.equal(a.run('session.faults[0].type'),'serious');
 a.run('persist()');assert.deepEqual(JSON.parse(a.storage.get('drivelog-lessons-v1')),before);
 a.run(`openImportedLesson(parseLessonJSON(${JSON.stringify(JSON.stringify({...lesson(),faults:[]}))}))`);
 a.element('closeImport').onclick();assert.equal(a.run('readOnly'),false);assert.equal(a.run('session.faults[0].type'),'minor');assert.equal(a.run('lessons.length'),1);
});
test('rejects malformed files without replacing the current view',async()=>{
 const a=app();
 for(const value of ['not json',JSON.stringify({faults:[]}),JSON.stringify({...lesson(),faults:[{...lesson().faults[0],type:'__proto__'}]}),JSON.stringify({...lesson(),faults:[{...lesson().faults[0],location:{lat:91,lng:0,accuracy:5}}]})]){
  a.element('jsonFile').files=[{size:value.length,text:async()=>value}];await a.element('jsonFile').handlers.change();assert.equal(a.run('readOnly'),false);assert.equal(a.run('session'),null);assert.equal(a.element('jsonFile').value,'');
 }
});
test('new recordings have no learner field and imports with no GPS work',()=>{
 const a=app();a.run("selected={category:'Control',fault:'Steering'};record('minor')");assert.equal(a.run("Object.hasOwn(session,'learner')"),false);
 const data=lesson();data.endedAt=null;data.faults[0].location=null;
 a.run(`openImportedLesson(parseLessonJSON(${JSON.stringify(JSON.stringify(data))}))`);
 assert.equal(a.run('session.faults[0].location'),null);assert.equal(a.element('review').hidden,false);assert.match(a.element('reviewText').textContent,/In progress snapshot/);
});
