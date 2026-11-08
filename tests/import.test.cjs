const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function app(href='https://certifiedjimenez.github.io/drivelog/',navigator={}){
 const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{value:'',hidden:false,disabled:false,innerHTML:'',textContent:'',handlers:{},addEventListener(t,fn){this.handlers[t]=fn;},showModal(){this.open=true;},close(){this.open=false;},scrollIntoView(){},focus(){},select(){}}]));
 let navigation=null;
 const context=vm.createContext({crypto:require('node:crypto').webcrypto,console,URL,Blob,setTimeout(){},clearTimeout(){},document:{getElementById:id=>elements.get(id)},localStorage:{getItem(){throw Error('Should not read saved lessons');}},navigator,window:{location:{href,assign(url){navigation=url;}},addEventListener(){},scrollTo(){}}});
 vm.runInContext(fs.readFileSync(path.join(root,'vendor/lz-string.min.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
 return {run:code=>vm.runInContext(code,context),element:id=>elements.get(id),get navigation(){return navigation;}};
}
function lesson(){return {startedAt:'2026-11-08T10:00:00Z',endedAt:'2026-11-08T10:30:00Z',faults:[{category:'Junctions',fault:'Observation',type:'serious',time:'2026-11-08T10:10:00Z',location:{lat:51.5,lng:-0.1,accuracy:10,timestamp:'2026-11-08T10:10:00Z'}}]};}
function link(data){const u=new URL('https://certifiedjimenez.github.io/drivelog/');u.searchParams.set('lesson',JSON.stringify(data));return u.href;}
function record(a,type='minor'){a.run(`selected={category:'Control',fault:'Steering'};record('${type}')`);}
test('plain URL always shows a fresh marking sheet without saved/upload controls',()=>{
 const a=app();assert.equal(a.run('readOnly'),false);assert.equal(a.run('session.faults.length'),0);assert.equal(a.element('sheet').hidden,false);assert.equal(a.element('finish').hidden,false);assert.equal(a.element('finish').disabled,false);assert.equal(a.element('review').hidden,true);assert.equal(a.element('share').hidden,true);assert.doesNotMatch(html,/id="(?:history|upload|jsonFile|learner|finishDialog|export)"/);
 record(a);record(a,'serious');record(a,'dangerous');assert.equal(a.run('session.faults.length'),3);a.element('undo').onclick();assert.equal(a.run('session.faults.length'),2);
});
test('Finish redirects to the encoded read-only report and includes GPS',()=>{
 const a=app();a.run('latestPosition={timestamp:Date.now(),coords:{latitude:51.5,longitude:-0.1,accuracy:8}}');record(a,'serious');a.element('finish').onclick();
 assert.ok(a.navigation);const data=JSON.parse(new URL(a.navigation).searchParams.get('lesson'));assert.ok(data.endedAt);assert.equal(data.faults[0].location.lat,51.5);assert.equal(data.faults[0].type,'serious');
 const report=app(a.navigation);assert.equal(report.run('readOnly'),true);assert.equal(report.element('sheet').hidden,true);assert.equal(report.element('finish').hidden,true);assert.equal(report.element('undo').hidden,true);assert.equal(report.element('share').hidden,false);assert.equal(report.element('reviewTitle').textContent,'Results');assert.match(report.element('log').innerHTML,/51\.50000/);
 record(report);report.element('undo').onclick();report.element('finish').onclick();assert.equal(report.run('session.faults.length'),1);assert.equal(report.navigation,null);
 report.element('newLesson').onclick();assert.equal(report.navigation,'https://certifiedjimenez.github.io/drivelog/');
});
test('zero-fault lessons can finish and open as a report',()=>{const a=app();a.element('finish').onclick();const b=app(a.navigation);assert.equal(b.run('readOnly'),true);assert.equal(b.run('session.faults.length'),0);assert.equal(b.element('share').hidden,false);});
test('invalid query parameters never expose an editable sheet',()=>{
 for(const encoded of ['broken','',JSON.stringify({faults:[]}),JSON.stringify({...lesson(),faults:[{...lesson().faults[0],type:'__proto__'}]}),JSON.stringify({...lesson(),faults:[{...lesson().faults[0],location:{lat:91,lng:0,accuracy:5}}]}),'v1.invalid']){
  const u=new URL('https://certifiedjimenez.github.io/drivelog/');u.searchParams.set('lesson',encoded);const a=app(u.href);assert.equal(a.run('readOnly'),true);assert.equal(a.element('sheet').hidden,true);assert.equal(a.element('share').hidden,true);assert.equal(a.element('reviewTitle').textContent,'Test link unavailable');
 }
});
test('large reports compact the JSON inside the query and preserve every fault',()=>{
 const data=lesson();data.faults=Array.from({length:100},(_,i)=>({...data.faults[0],category:'Signs & signals / 道路',time:new Date(Date.parse(data.startedAt)+i*1000).toISOString(),location:{lat:51.5+i/10000,lng:-.1,accuracy:8}}));
 const a=app();const url=a.run(`createShareURL(${JSON.stringify(data)})`);assert.ok(new URL(url).searchParams.get('lesson').startsWith('v1.'));assert.ok(url.length<7000);
 const report=app(url);assert.equal(report.run('session.faults.length'),100);assert.equal(report.run('session.faults[99].category'),data.faults[99].category);assert.equal(report.run('session.faults[99].location.lat'),data.faults[99].location.lat);
});
test('native sharing and copy-link fallback work from a read-only report',async()=>{
 const calls=[];const a=app(link(lesson()),{share:async data=>calls.push(data)});await a.element('share').onclick();assert.equal(calls.length,1);const recipient=app(calls[0].url);assert.equal(recipient.run('readOnly'),true);assert.equal(recipient.run('session.faults[0].type'),'serious');
 let copied='';const b=app(link(lesson()),{clipboard:{writeText:async text=>{copied=text;}}});await b.element('share').onclick();assert.equal(b.element('shareDialog').open,true);await b.element('copyLink').onclick();assert.ok(new URL(copied).searchParams.has('lesson'));
 const c=app(link(lesson()),{share:async()=>{throw {name:'AbortError'};}});await c.element('share').onclick();assert.notEqual(c.element('shareDialog').open,true);
});

test('results summarise category, fault, severity, counts and every recorded time',()=>{
 const data=lesson();data.faults.push({...data.faults[0],time:'2026-11-08T10:12:03Z'});data.faults.push({...data.faults[0],fault:'Turning left',type:'minor'});
 const a=app(link(data));const summary=a.element('reviewBreakdown').innerHTML;
 assert.match(summary,/Junctions/);assert.match(summary,/Observation/);assert.match(summary,/Serious/);assert.match(summary,/<td>2<\/td>/);assert.match(summary,/Minor/);
 assert.match(summary,/datetime="2026-11-08T10:10:00Z"/);assert.match(summary,/datetime="2026-11-08T10:12:03Z"/);
 const timing=a.element('reviewTiming').innerHTML;assert.match(timing,/Started/);assert.match(timing,/Finished/);assert.match(timing,/30 min 0 sec/);
 const toolbar=html.slice(html.indexOf('<div class="toolbar">'),html.indexOf('<p id="instruction">'));assert.match(toolbar,/id="share"/);assert.match(toolbar,/id="newLesson"/);assert.match(toolbar,/id="undo"[^>]*>Undo Mark<\/button><button id="finish"/);assert.doesNotMatch(html,/<header>/);
 const empty=app(link({...lesson(),faults:[]}));assert.match(empty.element('reviewBreakdown').innerHTML,/No faults recorded/);
 const unsafe=lesson();unsafe.faults[0].category='<img src=x onerror=alert(1)>';const safe=app(link(unsafe));assert.doesNotMatch(safe.element('reviewBreakdown').innerHTML,/<img/);
});
