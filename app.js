'use strict';
const groups = [
 ['Eyesight',['Eyesight test']],
 ['Show me / Tell me',['Show me / Tell me']],
 ['Control',['Accelerator','Clutch','Gears','Footbrake','Parking brake','Steering','Precautions','Ancillary controls']],
 ['Move off',['Safety','Control']],
 ['Use of mirrors',['Signalling','Change direction','Change speed']],
 ['Signals',['Necessary','Correctly','Timed']],
 ['Junctions',['Approach speed','Observation','Turning right','Turning left','Cutting corners']],
 ['Judgement',['Overtaking','Meeting','Crossing']],
 ['Positioning',['Normal driving','Lane discipline']],
 ['Progress',['Appropriate speed','Undue hesitation']],
 ['Response to signs / signals',['Traffic signs','Road markings','Traffic lights','Traffic controllers','Other road users']],
 ['Road awareness',['Clearance','Following distance','Use of speed','Pedestrian crossings','Position / normal stop','Awareness planning']],
 ['Controlled stop',['Controlled stop']],
 ['Reverse / Right',['Control','Observation']],
 ['Reverse park (road)',['Control','Observation']],
 ['Reverse park (car park)',['Control','Observation']],
 ['Forward park',['Control','Observation']]
];
const $ = id => document.getElementById(id);
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={minor:'Minor',serious:'Serious',dangerous:'Dangerous'};
const colors={minor:'#a16a0b',serious:'#ba5116',dangerous:'#b52c39'};
let readOnly=false;
let session=null, selected=null, latestPosition=null, watch=null, gpsState='idle', map=null, markers=null, toastTimer;
function notify(message){$('message').textContent=message;$('message').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('message').hidden=true,5000);}
function createSession(){session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),endedAt:null,faults:[]};return session;}
function counts(){return ['minor','serious','dangerous'].map(type=>({type,count:session?.faults.filter(f=>f.type===type).length||0}));}
function render(){
 const ended=readOnly;
 $('counts').innerHTML=counts().map(({type,count})=>`<span class="${type}-text"><strong>${count}</strong>${labels[type]}</span>`).join('');
 $('reviewTitle').textContent='Results';
 $('newLesson').hidden=!readOnly;
 $('undo').hidden=readOnly;
 $('gps').hidden=ended;
 $('sheet').hidden=ended;
 $('instruction').hidden=ended;
 $('review').hidden=!ended;
 $('layoutControl').hidden=readOnly;
 $('finish').hidden=ended;
 $('finish').disabled=!session;
 $('undo').disabled=ended||!session?.faults.length;
 $('total').textContent=session?.faults.length||0;
 $('share').hidden=!readOnly||!session;
 $('sheet').innerHTML=groups.map(([category, faults], gi)=>`<section class="group"><h2>${escapeHTML(category)}</h2>${faults.map((fault,fi)=>{const records=session?.faults.filter(f=>f.category===category&&f.fault===fault)||[];const tally=['minor','serious','dangerous'].map(t=>{const n=records.filter(f=>f.type===t).length;return n?`<span class="${t}-text">${n} ${labels[t]}</span>`:'';}).filter(Boolean).join(' · ');return `<button class="fault" data-group="${gi}" data-fault="${fi}"><span>${escapeHTML(fault)}</span><span class="tally">${tally||'<span class="plus">＋</span>'}</span></button>`;}).join('')}</section>`).join('');
 const faults=session?.faults||[];
 $('log').innerHTML=faults.length?faults.map((f,i)=>`<li class="log-item"><span class="number" style="color:${colors[f.type]}">${i+1}</span><div class="body"><strong>${escapeHTML(f.category)} · ${escapeHTML(f.fault)}</strong><p><span class="${f.type}-text">${labels[f.type]}</span> · ${new Date(f.time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}<br>${f.location?`<a href="https://www.openstreetmap.org/?mlat=${f.location.lat}&mlon=${f.location.lng}#map=18/${f.location.lat}/${f.location.lng}" target="_blank" rel="noreferrer">${f.location.lat.toFixed(5)}, ${f.location.lng.toFixed(5)} ↗</a> · accuracy ±${Math.round(f.location.accuracy)} m`:f.gpsPending?'Getting location…':'No GPS location recorded'}</p></div></li>`).reverse().join(''):'<li class="empty">No faults recorded yet.</li>';
 renderReview(faults);
 updateMap();
}
function renderReview(faults){
 $('reviewTiming').innerHTML='';$('reviewBreakdown').innerHTML='';
 if(!readOnly||!session)return;
 const time=value=>new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const start=new Date(session.startedAt),end=session.endedAt?new Date(session.endedAt):null;
 const seconds=end?Math.max(0,Math.round((end-start)/1000)):null;
 const duration=seconds===null?'In progress snapshot':`${Math.floor(seconds/60)} min ${seconds%60} sec`;
 const located=faults.filter(f=>f.location).length;
 $('reviewText').textContent=`${start.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${faults.length} ${faults.length===1?'fault':'faults'} recorded · ${located} with GPS locations`;
 $('reviewTiming').innerHTML=[['Started',time(session.startedAt)],['Finished',end?time(session.endedAt):'Not finished'],['Duration',duration]].map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
 const rows=new Map();
 faults.forEach(f=>{
  const key=JSON.stringify([f.category,f.fault,f.type]);
  if(!rows.has(key))rows.set(key,{category:f.category,fault:f.fault,type:f.type,times:[]});
  rows.get(key).times.push(f.time);
 });
 $('reviewBreakdown').innerHTML='<h3>Faults by category</h3>'+(rows.size?`<div class="summary-scroll"><table class="summary-table"><thead><tr><th scope="col">Category</th><th scope="col">Fault</th><th scope="col">Severity</th><th scope="col">Count</th><th scope="col">Recorded at</th></tr></thead><tbody>${[...rows.values()].map(row=>`<tr><td>${escapeHTML(row.category)}</td><td>${escapeHTML(row.fault)}</td><td><span class="severity-label ${row.type}-text">${labels[row.type]}</span></td><td>${row.times.length}</td><td class="recorded-times">${row.times.map(t=>`<time datetime="${escapeHTML(t)}">${time(t)}</time>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No faults recorded.</p>');
}
function initMap(){if(!window.L){$('map').textContent='Map could not load. GPS coordinates are still saved in the fault log.';return;} map=L.map('map').setView([54,-2],5);markers=L.featureGroup().addTo(map);const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19,referrerPolicy:'strict-origin'}).addTo(map);let tileFailures=0;tiles.on('tileerror',()=>{if(++tileFailures>3)$('mapInfo').textContent='Map tiles unavailable. GPS coordinates remain in the fault log.';});}
function updateMap(){if(!map)return;markers.clearLayers();const faults=session?.faults||[];faults.forEach((f,i)=>{if(!f.location)return;L.marker([f.location.lat,f.location.lng],{icon:L.divIcon({className:'fault-pin',html:`<span style="background:${colors[f.type]};width:100%;height:100%;border-radius:50%;display:grid;place-items:center">${i+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(markers).bindPopup(`<b>${i+1}. ${escapeHTML(f.category)}</b><br>${escapeHTML(f.fault)} · ${labels[f.type]}<br>${new Date(f.time).toLocaleTimeString('en-GB')}<br>GPS accuracy ±${Math.round(f.location.accuracy)} m`);});if(markers.getLayers().length)map.fitBounds(markers.getBounds(),{padding:[35,35],maxZoom:16});else if(latestPosition)map.setView([latestPosition.coords.latitude,latestPosition.coords.longitude],15);else map.setView([54,-2],5);}
function gpsStatus(){if(gpsState==='denied')$('gps').textContent='GPS permission denied. Faults are saved without location. Allow location in browser settings to map them.';else if(latestPosition&&Date.now()-latestPosition.timestamp<20000)$('gps').textContent=`GPS ready · accuracy ±${Math.round(latestPosition.coords.accuracy)} m`;else if(gpsState==='waiting')$('gps').textContent='Waiting for GPS… Faults can still be recorded.';else if(gpsState==='error')$('gps').textContent='GPS unavailable. Faults are saved without location.';}
function startGPS(){if(!navigator.geolocation){gpsState='error';gpsStatus();return;}if(watch!==null||gpsState==='denied')return;gpsState='waiting';gpsStatus();watch=navigator.geolocation.watchPosition(p=>{latestPosition=p;gpsState='ready';gpsStatus();},e=>{gpsState=e.code===1?'denied':'error';gpsStatus();},{enableHighAccuracy:true,maximumAge:0,timeout:12000});}
function stopGPS(){if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;}
function validPosition(p,time){return p&&Number.isFinite(p.coords.latitude)&&Number.isFinite(p.coords.longitude)&&Math.abs(p.timestamp-time)<=15000;}
function assignLocation(f,p){f.location={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:new Date(p.timestamp).toISOString()};f.gpsPending=false;render();}
function record(type){if(readOnly||!selected||session?.endedAt)return;const active=session||createSession();const now=Date.now();const f={id:crypto.randomUUID(),category:selected.category,fault:selected.fault,type,time:new Date(now).toISOString(),location:null,gpsPending:false};active.faults.push(f);
 if(validPosition(latestPosition,now))assignLocation(f,latestPosition);
 else if(navigator.geolocation&&gpsState!=='denied'){f.gpsPending=true;navigator.geolocation.getCurrentPosition(p=>{if(!active.faults.includes(f))return;if(validPosition(p,now))assignLocation(f,p);else{f.gpsPending=false;render();}},()=>{f.gpsPending=false;render();},{enableHighAccuracy:true,maximumAge:0,timeout:10000});}
 $('typeDialog').close();selected=null;render();notify(`${labels[type]} recorded`);
}
$('sheet').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(readOnly||!b||session?.endedAt)return;const [category,faults]=groups[Number(b.dataset.group)];selected={category,fault:faults[Number(b.dataset.fault)]};$('selectedFault').textContent=category===selected.fault?category:`${category} · ${selected.fault}`;$('typeDialog').showModal();startGPS();});
$('typeDialog').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)record(b.dataset.type);});
$('cancel').onclick=()=>$('typeDialog').close();
$('undo').onclick=()=>{if(readOnly||!session||session.endedAt)return;session.faults.pop();render();notify('Last fault removed');};
$('finish').onclick=()=>{
 if(readOnly||!session)return;
 const finished={...session,endedAt:new Date().toISOString()};
 try{const url=createShareURL(finished);stopGPS();window.location.assign(url);}
 catch(error){notify(error.message);}
};
$('newLesson').onclick=()=>{const url=new URL(window.location.href);url.search='';url.hash='';window.location.assign(url.href);};
// Validate the report supplied in the URL before rendering it.
function parseLessonJSON(text){
 const data=JSON.parse(text);
 const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 const validText=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200;
 if(!data||typeof data!=='object'||Array.isArray(data)||!validDate(data.startedAt)||!Array.isArray(data.faults)||data.faults.length>10000)throw new Error('Invalid test report.');
 if(data.endedAt!=null&&(!validDate(data.endedAt)||Date.parse(data.endedAt)<Date.parse(data.startedAt)))throw new Error('The test end time is invalid.');
 const faults=data.faults.map((f,i)=>{
  if(!f||!validText(f.category)||!validText(f.fault)||!['minor','serious','dangerous'].includes(f.type)||!validDate(f.time))throw new Error(`Fault ${i+1} has invalid details.`);
  let location=null;
  if(f.location!=null){const l=f.location;
   if(!Number.isFinite(l.lat)||Math.abs(l.lat)>90||!Number.isFinite(l.lng)||Math.abs(l.lng)>180||!Number.isFinite(l.accuracy)||l.accuracy<0||(l.timestamp!=null&&!validDate(l.timestamp)))throw new Error(`Fault ${i+1} has invalid GPS data.`);
   location={lat:l.lat,lng:l.lng,accuracy:l.accuracy,...(l.timestamp?{timestamp:l.timestamp}:{})};
  }
  return {id:crypto.randomUUID(),category:f.category,fault:f.fault,type:f.type,time:f.time,location,gpsPending:false};
 });
 return {id:crypto.randomUUID(),startedAt:data.startedAt,endedAt:data.endedAt||null,faults};
}
function openReadOnlyLesson(data){
 stopGPS();latestPosition=null;selected=null;$('typeDialog').close();readOnly=true;session=data;render();
}
// The URL carries a snapshot of the JSON itself; no server-side record is created.
const maxSharedURLLength=7000;
function sharedLessonData(data){
 return {startedAt:data.startedAt,endedAt:data.endedAt||null,faults:data.faults.map(f=>({category:f.category,fault:f.fault,type:f.type,time:f.time,location:f.location||null}))};
}
function encodeLessonValue(data){
 // Compress the JSON, then use the Base64URL alphabet: no +, / or padding.
 return 'v2.'+LZString.compressToBase64(JSON.stringify(sharedLessonData(data))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeLessonValue(value){
 if(value.startsWith('v2.')){
  const token=value.slice(3);
  if(!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Invalid test encoding.');
  const base64=token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4);
  return LZString.decompressFromBase64(base64);
 }
 // Continue opening links shared by earlier versions.
 if(value.startsWith('v1.'))return LZString.decompressFromEncodedURIComponent(value.slice(3));
 return value;
}
function createShareURL(data){
 const url=new URL(window.location.href);url.search='';url.hash='';
 url.searchParams.set('lesson',encodeLessonValue(data));
 if(url.href.length>maxSharedURLLength)throw new Error('This test is too large for a reliable share link. The sheet is still available here.');
 return url.href;
}
function showShareLink(url){$('shareLink').value=url;$('shareDialog').showModal();}
$('share').onclick=async()=>{
 if(!session)return;
 let url;try{url=createShareURL(session);}catch(error){notify(error.message);return;}
 // Call share during this tap, without asynchronous encoding losing user activation.
 if(navigator.share){
  try{await navigator.share({title:'Driving Test Results',url});return;}
  catch(error){if(error.name==='AbortError')return;}
 }
 showShareLink(url);
};
$('copyLink').onclick=async()=>{
 try{await navigator.clipboard.writeText($('shareLink').value);notify('Test link copied.');$('shareDialog').close();}
 catch{$('shareLink').focus();$('shareLink').select();notify('Select and copy the test link above.');}
};
$('closeShare').onclick=()=>$('shareDialog').close();
function loadSharedLesson(){
 const url=new URL(window.location.href);if(!url.searchParams.has('lesson'))return false;
 readOnly=true;
 try{
  if(url.href.length>maxSharedURLLength)throw new Error('Test link is too large.');
  const text=decodeLessonValue(url.searchParams.get('lesson'));
  if(typeof text!=='string'||text.length>2*1024*1024)throw new Error('Invalid test data.');
  openReadOnlyLesson(parseLessonJSON(text));
 }
 catch{
  session=null;render();$('reviewTitle').textContent='Test link unavailable';
  $('reviewText').textContent='This link is invalid or incomplete. Ask for a new test link.';
 }
 return true;
}
function setLayout(mode,save=false){
 const layout=mode==='list'?'list':'grid';
 $('sheet').dataset.layout=layout;
 $('layoutToggle').textContent=layout==='grid'?'Switch to List':'Switch to Grid';
 if(save){
  try{
   const path=new URL('.',window.location.href).pathname;
   document.cookie=`drivelog-layout=${layout}; Max-Age=31536000; Path=${path}; SameSite=Lax${new URL(window.location.href).protocol==='https:'?'; Secure':''}`;
  }catch{notify('Layout changed. Your browser could not save the preference.');}
 }
}
let preferredLayout='grid';
try{const value=document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('drivelog-layout='))?.slice('drivelog-layout='.length);if(value==='list')preferredLayout='list';}catch{}
setLayout(preferredLayout);
$('layoutToggle').onclick=()=>setLayout($('sheet').dataset.layout==='grid'?'list':'grid',true);
initMap();
if(!loadSharedLesson()){createSession();render();}
window.addEventListener('pagehide',stopGPS);
