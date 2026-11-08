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
const key='drivelog-lessons-v1';
let readOnly=false, previousSession=null;
let lessons=[], session=null, selected=null, latestPosition=null, watch=null, gpsState='idle', map=null, markers=null, toastTimer;
try { const saved=JSON.parse(localStorage.getItem(key)||'{}'); lessons=Array.isArray(saved.lessons)?saved.lessons.filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.faults)):[]; session=lessons.find(s=>s.id===saved.activeId)||lessons[0]||null; } catch { notify('Saved data could not be read. New records can still be exported.'); }
function notify(message){$('message').textContent=message;$('message').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('message').hidden=true,3500);}
function persist(){try {localStorage.setItem(key,JSON.stringify({activeId:(readOnly?previousSession:session)?.id,lessons}));}catch {notify('Browser storage is unavailable or full. Download your lesson to keep it.');}}
function createSession(){session={id:crypto.randomUUID(),startedAt:new Date().toISOString(),endedAt:null,faults:[]};lessons.unshift(session);persist();return session;}
function counts(){return ['minor','serious','dangerous'].map(type=>({type,count:session?.faults.filter(f=>f.type===type).length||0}));}
function render(){
 const ended=!!session?.endedAt||readOnly;
 $('counts').innerHTML=counts().map(({type,count})=>`<span class="${type}-text"><strong>${count}</strong>${labels[type]}</span>`).join('');
 $('reviewTitle').textContent=readOnly?'Read-only lesson':'Lesson finished';
 $('newLesson').hidden=readOnly;
 $('closeImport').hidden=!readOnly;
 $('gps').hidden=ended;
 $('sheet').hidden=ended;
 $('instruction').hidden=ended;
 $('review').hidden=!ended;
 $('finish').hidden=ended;
 $('finish').disabled=!session;
 $('undo').disabled=ended||!session?.faults.length;
 $('total').textContent=session?.faults.length||0;
 $('share').disabled=!session;
 $('sheet').innerHTML=groups.map(([category, faults], gi)=>`<section class="group"><h2>${escapeHTML(category)}</h2>${faults.map((fault,fi)=>{const records=session?.faults.filter(f=>f.category===category&&f.fault===fault)||[];const tally=['minor','serious','dangerous'].map(t=>{const n=records.filter(f=>f.type===t).length;return n?`<span class="${t}-text">${n} ${labels[t]}</span>`:'';}).filter(Boolean).join(' · ');return `<button class="fault" data-group="${gi}" data-fault="${fi}"><span>${escapeHTML(fault)}</span><span class="tally">${tally||'<span class="plus">＋</span>'}</span></button>`;}).join('')}</section>`).join('');
 const faults=session?.faults||[];
 $('log').innerHTML=faults.length?faults.map((f,i)=>`<li class="log-item"><span class="number" style="color:${colors[f.type]}">${i+1}</span><div class="body"><strong>${escapeHTML(f.category)} · ${escapeHTML(f.fault)}</strong><p><span class="${f.type}-text">${labels[f.type]}</span> · ${new Date(f.time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}<br>${f.location?`<a href="https://www.openstreetmap.org/?mlat=${f.location.lat}&mlon=${f.location.lng}#map=18/${f.location.lat}/${f.location.lng}" target="_blank" rel="noreferrer">${f.location.lat.toFixed(5)}, ${f.location.lng.toFixed(5)} ↗</a> · accuracy ±${Math.round(f.location.accuracy)} m`:f.gpsPending?'Getting location…':'No GPS location recorded'}</p></div></li>`).reverse().join(''):'<li class="empty">No faults recorded yet.</li>';
 if(ended){const located=faults.filter(f=>f.location).length;$('reviewText').textContent=`${new Date(session.startedAt).toLocaleString('en-GB')} · ${session.endedAt?Math.max(1,Math.round((Date.parse(session.endedAt)-Date.parse(session.startedAt))/60000))+' min.':'In progress snapshot.'} ${faults.length} faults recorded; ${located} with GPS locations. Select a pin on the map to review the fault.`;}
 updateMap();
}
function initMap(){if(!window.L){$('map').textContent='Map could not load. GPS coordinates are still saved in the fault log.';return;} map=L.map('map').setView([54,-2],5);markers=L.featureGroup().addTo(map);const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);let tileFailures=0;tiles.on('tileerror',()=>{if(++tileFailures>3)$('mapInfo').textContent='Map tiles unavailable. GPS coordinates remain in the fault log.';});}
function updateMap(){if(!map)return;markers.clearLayers();const faults=session?.faults||[];faults.forEach((f,i)=>{if(!f.location)return;L.marker([f.location.lat,f.location.lng],{icon:L.divIcon({className:'fault-pin',html:`<span style="background:${colors[f.type]};width:100%;height:100%;border-radius:50%;display:grid;place-items:center">${i+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(markers).bindPopup(`<b>${i+1}. ${escapeHTML(f.category)}</b><br>${escapeHTML(f.fault)} · ${labels[f.type]}<br>${new Date(f.time).toLocaleTimeString('en-GB')}<br>GPS accuracy ±${Math.round(f.location.accuracy)} m`);});if(markers.getLayers().length)map.fitBounds(markers.getBounds(),{padding:[35,35],maxZoom:16});else if(latestPosition)map.setView([latestPosition.coords.latitude,latestPosition.coords.longitude],15);else map.setView([54,-2],5);}
function gpsStatus(){if(gpsState==='denied')$('gps').textContent='GPS permission denied. Faults are saved without location. Allow location in browser settings to map them.';else if(latestPosition&&Date.now()-latestPosition.timestamp<20000)$('gps').textContent=`GPS ready · accuracy ±${Math.round(latestPosition.coords.accuracy)} m`;else if(gpsState==='waiting')$('gps').textContent='Waiting for GPS… Faults can still be recorded.';else if(gpsState==='error')$('gps').textContent='GPS unavailable. Faults are saved without location.';}
function startGPS(){if(!navigator.geolocation){gpsState='error';gpsStatus();return;}if(watch!==null||gpsState==='denied')return;gpsState='waiting';gpsStatus();watch=navigator.geolocation.watchPosition(p=>{latestPosition=p;gpsState='ready';gpsStatus();},e=>{gpsState=e.code===1?'denied':'error';gpsStatus();},{enableHighAccuracy:true,maximumAge:0,timeout:12000});}
function stopGPS(){if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;}
function validPosition(p,time){return p&&Number.isFinite(p.coords.latitude)&&Number.isFinite(p.coords.longitude)&&Math.abs(p.timestamp-time)<=15000;}
function assignLocation(f,p){f.location={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:new Date(p.timestamp).toISOString()};f.gpsPending=false;persist();render();}
function record(type){if(readOnly||!selected||session?.endedAt)return;const active=session||createSession();const now=Date.now();const f={id:crypto.randomUUID(),category:selected.category,fault:selected.fault,type,time:new Date(now).toISOString(),location:null,gpsPending:false};active.faults.push(f);
 if(validPosition(latestPosition,now))assignLocation(f,latestPosition);
 else if(navigator.geolocation&&gpsState!=='denied'){f.gpsPending=true;navigator.geolocation.getCurrentPosition(p=>{if(!active.faults.includes(f))return;if(validPosition(p,now))assignLocation(f,p);else{f.gpsPending=false;persist();render();}},()=>{f.gpsPending=false;persist();render();},{enableHighAccuracy:true,maximumAge:0,timeout:10000});}
 $('typeDialog').close();selected=null;persist();render();notify(`${labels[type]} recorded`);
}
$('sheet').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(readOnly||!b||session?.endedAt)return;const [category,faults]=groups[Number(b.dataset.group)];selected={category,fault:faults[Number(b.dataset.fault)]};$('selectedFault').textContent=category===selected.fault?category:`${category} · ${selected.fault}`;$('typeDialog').showModal();startGPS();});
$('typeDialog').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)record(b.dataset.type);});
$('cancel').onclick=()=>$('typeDialog').close();
$('undo').onclick=()=>{if(readOnly||!session||session.endedAt)return;session.faults.pop();persist();render();notify('Last fault removed');};
$('finish').onclick=()=>{if(!readOnly&&session)$('finishDialog').showModal();};
$('cancelFinish').onclick=()=>$('finishDialog').close();
$('confirmFinish').onclick=()=>{if(readOnly||!session)return;session.endedAt=new Date().toISOString();stopGPS();persist();render();$('finishDialog').close();$('review').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>map?.invalidateSize(),100);};
$('newLesson').onclick=()=>{if(readOnly)return;stopGPS();latestPosition=null;gpsState='idle';session=null;createSession();$('gps').textContent='Location is requested when you record a fault.';render();window.scrollTo({top:0,behavior:'smooth'});};
$('history').onclick=()=>{$('historyList').innerHTML=lessons.length?lessons.map(s=>`<button class="history-entry" data-id="${escapeHTML(s.id)}">Lesson<small>${new Date(s.startedAt).toLocaleString('en-GB')} · ${s.faults.length} faults · ${s.endedAt?'Finished':'In progress'}</small></button>`).join(''):'<p>No saved lessons yet.</p>';$('historyDialog').showModal();};
$('historyList').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;stopGPS();clearSharedQuery();readOnly=false;previousSession=null;latestPosition=null;session=lessons.find(s=>s.id===b.dataset.id);persist();render();$('historyDialog').close();};
$('closeHistory').onclick=()=>$('historyDialog').close();
$('export').onclick=()=>{if(!session)return;const data={...session,faults:session.faults.map(f=>({...f,gpsPending:false})),source:'DVSA DL25 categories; independent practice record'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`driving-lesson-${session.startedAt.slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
// Imported lessons are temporary views. They never replace saved lesson data.
function parseLessonJSON(text){
 const data=JSON.parse(text);
 const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 const validText=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200;
 if(!data||typeof data!=='object'||Array.isArray(data)||!validDate(data.startedAt)||!Array.isArray(data.faults)||data.faults.length>10000)throw new Error('Choose a driving lesson JSON exported by this app.');
 if(data.endedAt!=null&&(!validDate(data.endedAt)||Date.parse(data.endedAt)<Date.parse(data.startedAt)))throw new Error('The lesson end time is invalid.');
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
function openImportedLesson(data){
 if(!readOnly)previousSession=session;
 stopGPS();latestPosition=null;selected=null;$('typeDialog').close();$('finishDialog').close();readOnly=true;session=data;render();
 $('review').scrollIntoView({behavior:'smooth',block:'start'});
}
$('upload').onclick=()=>$('jsonFile').click();
$('jsonFile').addEventListener('change',async()=>{
 const file=$('jsonFile').files[0];if(!file)return;
 try{if(file.size>5*1024*1024)throw new Error('Choose a JSON file smaller than 5 MB.');openImportedLesson(parseLessonJSON(await file.text()));notify('JSON opened in read-only mode.');}
 catch(error){notify(error instanceof SyntaxError?'This file is not valid JSON.':error.message||'Could not open this lesson.');}
 finally{$('jsonFile').value='';}
});
$('closeImport').onclick=()=>{if(!readOnly)return;clearSharedQuery();session=previousSession;previousSession=null;readOnly=false;gpsState='idle';$('gps').textContent='Location is requested when you record a fault.';render();window.scrollTo({top:0,behavior:'smooth'});};
// The URL carries a snapshot of the JSON itself; no server-side record is created.
const maxSharedURLLength=7000;
function sharedLessonData(data){
 return {startedAt:data.startedAt,endedAt:data.endedAt||null,faults:data.faults.map(f=>({category:f.category,fault:f.fault,type:f.type,time:f.time,location:f.location||null}))};
}
function createShareURL(data){
 const url=new URL(window.location.href);url.search='';url.hash='';
 url.searchParams.set('lesson',JSON.stringify(sharedLessonData(data)));
 if(url.href.length>maxSharedURLLength)throw new Error('This lesson is too large for a reliable share link. Finish the lesson and use Download lesson instead.');
 return url.href;
}
function clearSharedQuery(){
 const url=new URL(window.location.href);
 if(url.searchParams.has('lesson')){url.searchParams.delete('lesson');window.history.replaceState(null,'',url.href);}
}
function showShareLink(url){$('shareLink').value=url;$('shareDialog').showModal();}
$('share').onclick=async()=>{
 if(!session)return;
 let url;try{url=createShareURL(session);}catch(error){notify(error.message);return;}
 // Call share during this tap, without asynchronous encoding losing user activation.
 if(navigator.share){
  try{await navigator.share({title:'Driving lesson',url});return;}
  catch(error){if(error.name==='AbortError')return;}
 }
 showShareLink(url);
};
$('copyLink').onclick=async()=>{
 try{await navigator.clipboard.writeText($('shareLink').value);notify('Lesson link copied.');$('shareDialog').close();}
 catch{$('shareLink').focus();$('shareLink').select();notify('Select and copy the lesson link above.');}
};
$('closeShare').onclick=()=>$('shareDialog').close();
function loadSharedLesson(){
 const url=new URL(window.location.href);if(!url.searchParams.has('lesson'))return;
 try{
  if(url.href.length>maxSharedURLLength)throw new Error('This lesson link is too large. Use Upload JSON instead.');
  const text=url.searchParams.get('lesson');
  openImportedLesson(parseLessonJSON(text));
 }
 catch{notify('This lesson link is invalid or incomplete. Ask for a new link or upload the JSON file.');}
}
// A pending location request cannot survive a page reload.
lessons.forEach(s=>s.faults.forEach(f=>{f.gpsPending=false;}));
initMap();render();loadSharedLesson();
window.addEventListener('pagehide',()=>{persist();stopGPS();});
