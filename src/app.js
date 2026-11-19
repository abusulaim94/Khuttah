import {normaliseState, createBackup, parseBackup, MAX_BACKUP_BYTES} from './storage.js';
import {createDraftController} from './drafts.js';
import {clearLegacyDemoData} from './cleanup.js';
import {createCloudController} from './supabase.js';
import {cleanTagNames, tagScopeOf, changeTag, sortItems, upcomingDeadlines, workCategories, workColors, moveWorkNote, changeBookSubject, noteDateLabel, initialQuranStudents, ensureQuranRoster} from './workspace.js';
import {createNoteEditor} from './editor.js';
import {installBookDragging} from './book-drag.js';
import {publicHolidays, holidayRegions, holidayYears, defaultHolidayRegion} from './holidays.js';
import {getTheme, setTheme, themeOptions} from './theme.js';
import {defaultClassFee, summariseQuranMonth} from './quran.js';
let noteEditor=null;

const drafts=createDraftController();
const cloud=createCloudController();
let undoAction=null;
let recoverySource=null;
let syncStatus='Menyemak penyelarasan awan…';
let syncError='';
let syncBusy=false;
let authMode='signin';
let deferredInstallPrompt=null;
let installDismissed=false;
const paths = {
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 pin:'<path d="m16 3 5 5-4 1-3 5-1 3-6-6 3-1 5-3zM7 17l-4 4"/>',
 note:'<path d="M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8M8 12h8"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
 logo:'<path d="M12.2 2.75 13.75 4.3 12.2 5.85 10.65 4.3Z" fill="currentColor" stroke="none"/><path d="M6.2 9.8C8.8 6.8 13.8 7.2 17.8 8.9 11.2 10.6 6.6 14.2 9.4 18.6 12 21 16.8 20.4 18.8 17.2" stroke-width="2.2"/>', home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', task:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>', project:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 book:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14"/>', research:'<path d="M9 3h6m-5 0v7l-6 8a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-8V3M7 15h10"/>', bell:'<path d="M18 8a6 6 0 0 0-12 0c0 6-3 6-3 8h18c0-2-3-2-3-8m-8 12a2 2 0 0 0 4 0"/>', settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.7 2.3-2 .9L5 5 3 8l1.7 1.7v2.6L3 14l2 3 2.3-.8 2 .9.7 2.9h4l.7-2.9 2-.9 2.3.8 2-3-1.7-1.7V9.7L21 8l-2-3-2.3 1.2-2-.9L14 3z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>', arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', prev:'<path d="m15 6-6 6 6 6"/>', next:'<path d="m9 6 6 6-6 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';
const modules = {
 Overview:['Ringkasan','home'], Planner:['Perancang','calendar'], Events:['Acara','calendar'],
 Tasks:['Tugasan','task'], Reminders:['Peringatan','bell'], Knowledge:['Bacaan & Kajian','book'],
 Notes:['Nota','note'], Master:['Master','book'], PhD:['PhD','book'],
 Works:['Karya Abu Sulaim','book'], Ideas:['Khawatir','note'], Copywriting:['Copywriting','note'],
 QuranClass:['Kelas Al-Quran','book'], Settings:['Tetapan','settings'], Group:['Kumpulan','project']
};
const primaryPages=['Overview','Planner','Tasks','Events','Reminders','Notes','Ideas','Copywriting'];
const bottomPages=['Overview','Planner','Tasks','Notes'];
const secondaryPages=['Knowledge','Master','PhD'];
const defaultTags={Notes:[],Knowledge:[],Events:[],Works:[],Ideas:[],Copywriting:[]};
const tagSelection={Notes:'',Events:'',Knowledge:'',Works:'',Ideas:'',Copywriting:''};
const pageDomains={};
let holidayRegion=defaultHolidayRegion;
try{const value=localStorage.getItem('khuttah-holiday-region-v1');if(Object.hasOwn(holidayRegions,value))holidayRegion=value;}catch{}
let workPurpose='',workArchived=false,ideasArchived=false,copywritingArchived=false,selectedWorkBook='',bookSubjectFilter='',taskDates='all';
let quickWorkDrafts={};
try{const value=JSON.parse(localStorage.getItem('khuttah-book-capture-v1')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))quickWorkDrafts=value;}catch{}
let sorting={};
try { const value=JSON.parse(localStorage.getItem('khuttah-sorting-v1')||'{}'); if(value&&typeof value==='object'&&!Array.isArray(value)) sorting=value; } catch {}
const chapterNames=['Pengenalan','Sorotan Literatur','Metodologi','Dapatan','Perbincangan dan Kesimpulan'];
const selectedChapter={Master:1,PhD:1};
let selectedSubfolder='';
const isThesis=scope=>Object.hasOwn(selectedChapter,scope);
const defaultDomains = ['Peribadi','Uthmani','KPAZ'];
const priorities={high:'Penting',low:'Kurang penting',normal:'Biasa'};
const taskPriority=item=>Object.hasOwn(priorities,item.priority)?item.priority:'normal';
const types = {task:'Tugasan',event:'Acara',reminder:'Peringatan'};
const recordDateLabels={task:'Tarikh tugasan',event:'Tarikh acara',reminder:'Tarikh akhir'};
const views = {Month:'Bulan',Week:'Minggu',Day:'Hari'};
const statuses = {Open:'Belum selesai',Completed:'Selesai',All:'Semua'};
const today = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
let quranMonth=today.slice(0,7),quranFilter='all';
const periods = {today:'Hari ini',week:'Minggu ini',next:'Minggu depan',month:'Bulan ini'};
const key = 'khuttah-prototype-v2';
function emptyState() {
 return normaliseState({records:[],domains:[...defaultDomains],projects:[],notes:[],tags:structuredClone(defaultTags),subfolders:[],quranStudents:initialQuranStudents(),groupLayoutVersion:1,demoCleanupVersion:1,quranSeedVersion:1});
}
let storageOK = true;
let needsGroupMigration = false;
let demoCleanupVersion = 1;
let quranSeedVersion = 1;
let {records,domains,projects,notes,tags,subfolders,library,quranStudents} = emptyState();
let rawSaved=null;
try {
 rawSaved=localStorage.getItem(key);
 const saved = JSON.parse(rawSaved ?? 'null');
 const legacy = saved ? null : JSON.parse(localStorage.getItem('khuttah-prototype-v1') ?? 'null');
 if (saved) {
  const validated=normaliseState({...saved,tags:{...defaultTags,...saved.tags}});
  ({records,domains,projects,notes,tags,subfolders,library,quranStudents} = validated);
  needsGroupMigration=saved.groupLayoutVersion!==1;
  demoCleanupVersion=saved.demoCleanupVersion===1?1:0;
  quranSeedVersion=saved.quranSeedVersion===1?1:0;
 }
 if (Array.isArray(legacy)) {
  demoCleanupVersion=0;
  quranSeedVersion=0;
  const legacyRecords=legacy.map(item=>{
   const previous=item.domain==="Az-Zahra'"?'KPAZ':item.domain;
   return {...item,domain:defaultDomains.includes(previous)?previous:previous?'Peribadi':''};
  });
  ({records,domains,projects,notes,tags,subfolders,library,quranStudents}=normaliseState({...currentState(),records:legacyRecords}));
 }
} catch {
 storageOK=false;
 recoverySource=rawSaved;
}
// Preserve existing entries when adopting the new group name and order.
const groupName=name=>name==="Az-Zahra'"?'KPAZ':name;
function migrateGroupNames(state) {
 ensureQuranRoster(state);
 if (state.groupLayoutVersion===1) return state;
 const renamed=[...new Set(state.domains.map(groupName))];
 state.domains=[...defaultDomains.filter(name=>renamed.includes(name)),...renamed.filter(name=>!defaultDomains.includes(name))];
 for (const item of [...state.records,...state.projects,...state.notes]) item.domain=groupName(item.domain);
 for (const item of state.subfolders) item.folder=groupName(item.folder);
 state.subfolders=state.subfolders.filter((item,index,list)=>list.findIndex(other=>other.folder===item.folder&&other.name===item.name)===index);
 state.groupLayoutVersion=1;
 return state;
}
({records,domains,projects,notes,tags,subfolders,library,quranStudents,quranSeedVersion}=migrateGroupNames({...currentState(),groupLayoutVersion:needsGroupMigration?0:1,quranSeedVersion}));
const cleanedState=clearLegacyDemoData(currentState(),{draftKeys:drafts.keys()});
if (demoCleanupVersion!==1&&rawSaved&&!recoverySource) {
 try { if (!localStorage.getItem('khuttah-before-demo-cleanup-v1')) localStorage.setItem('khuttah-before-demo-cleanup-v1',rawSaved); } catch {}
}
({records,domains,projects,notes,tags,subfolders,library,quranStudents,demoCleanupVersion,quranSeedVersion}=cleanedState);
if (!recoverySource) {
 try { localStorage.setItem(key,JSON.stringify(currentState())); }
 catch { storageOK=false; }
}
let page='Overview', domain='', view='Month', focus=today, period='week', taskFilter='Open', settingsTab='Domains', toastTimer;
const $ = id => document.getElementById(id);
const html = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateOf = iso => new Date(iso+'T12:00:00Z');
const isoOf = date => date.toISOString().slice(0,10);
const add = (iso,n) => { const date=dateOf(iso); date.setUTCDate(date.getUTCDate()+n); return isoOf(date); };
const weekStart = iso => add(iso,-dateOf(iso).getUTCDay());
const monthStart = iso => iso.slice(0,7)+'-01';
function monthEnd(iso) {
 const date=dateOf(monthStart(iso));
 date.setUTCMonth(date.getUTCMonth()+1,0);
 return isoOf(date);
}
const dateLabel = (iso,options) => new Intl.DateTimeFormat('ms-MY',{...options,timeZone:'UTC'}).format(dateOf(iso));
const shortDate = iso => dateLabel(iso,{day:'numeric',month:'short'});
const dayShortDate = iso => dateLabel(iso,{weekday:'short',day:'numeric',month:'short'});
const fullDate = iso => dateLabel(iso,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const visible = entries => entries.filter(item=>page==='Overview'||!domain||item.domain===domain);
const domainName = value => value || 'Tanpa kumpulan';
const badge = label => '<span class="badge">'+html(label)+'</span>';
const button = (label, attrs, symbol='',classes='') => '<button type="button" class="btn '+classes+'" '+attrs+'>'+(symbol?icon(symbol):'')+label+'</button>';
const blank = text => '<p class="empty">'+text+'</p>';
function currentState() { return {records,domains,projects,notes,tags,subfolders,library,quranStudents,groupLayoutVersion:1,demoCleanupVersion,quranSeedVersion}; }
function notify(message,action=null) {
 $('toast').textContent=message;
 undoAction=action;
 if (action) $('toast').insertAdjacentHTML('beforeend',button('Buat asal','data-undo','','ghost'));
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{ $('toast').textContent=''; undoAction=null; },action?12000:4000);
}
function save(message,action=null) {
 try {
  if (recoverySource) throw new Error('Data asal menunggu pemulihan.');
  localStorage.setItem(key,JSON.stringify(currentState()));
  storageOK=true;
 }
 catch { storageOK=false; }
 cloud.markPendingSync();
 render();
 notify(message+(storageOK?'':' · Perubahan tersedia dalam sesi ini sahaja.'),action);
 if (!recoverySource&&cloud.getSession()) void pushToCloud();
}
function isStandaloneApp() {
 return Boolean(window.matchMedia?.('(display-mode: standalone)').matches||window.navigator?.standalone);
}
function renderInstallBanner() {
 const banner=$('install-banner');
 if (!banner) return;
 if (isStandaloneApp()||installDismissed) {
  banner.hidden=true;
  banner.innerHTML='';
  return;
 }
 const host=window.location?.hostname||'abusulaim94.github.io';
 banner.hidden=false;
 banner.innerHTML='<div class="install-banner-card"><div class="install-banner-main"><div class="logo install-logo">'+icon('logo')+'</div><div class="install-banner-text"><strong>Install KHUTTAH</strong><span>'+html(host)+'</span></div></div><div class="install-banner-actions"><button type="button" class="install-cta" data-install-app>Install</button><button type="button" class="install-dismiss" data-dismiss-install aria-label="Tutup makluman pemasangan">'+icon('close')+'</button></div></div>';
}
function installHelpDialog() {
 openDialog('Pasang aplikasi KHUTTAH','<div class="dialog-body"><p>Pasang KHUTTAH ke skrin utama supaya ia dibuka penuh seperti aplikasi sebenar:</p><p class="small"><strong>Android (Chrome / Edge):</strong> Ketik ikon menu <strong>⋮</strong> di penjuru kanan atas pelayar, kemudian pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</p><p class="small"><strong>iPhone / iPad (Safari):</strong> Ketik ikon <strong>Kongsi (Share)</strong> di bahagian bawah pelayar, kemudian pilih <strong>Add to Home Screen</strong>.</p><div class="dialog-actions">'+button('Faham','data-close','','primary')+'</div></div>');
}
async function triggerInstall() {
 if (deferredInstallPrompt) {
  const promptEvent=deferredInstallPrompt;
  deferredInstallPrompt=null;
  try {
   await promptEvent.prompt();
   const choice=await promptEvent.userChoice;
   if (choice?.outcome==='accepted') {
    installDismissed=true;
    renderInstallBanner();
    notify('Aplikasi KHUTTAH sedang dipasang');
   }
  } catch {}
  return;
 }
 installHelpDialog();
}
function renderAuthGate(errorMessage='',infoMessage='') {
 if ($('modal').open) $('modal').close();
 renderInstallBanner();
 $('app-layout').hidden=true;
 $('bottom-nav').hidden=true;
 $('bottom-nav').innerHTML='';
 $('sidebar').innerHTML='';
 $('crumb').textContent='';
 $('actions').innerHTML='';
 $('main').innerHTML='';
 $('auth-gate').hidden=false;
 const signup=authMode==='signup';
 const modeSwitch='<div class="segments auth-tabs" aria-label="Mod akaun"><button type="button" data-auth-mode="signin" class="'+(signup?'':'active')+'" aria-pressed="'+(!signup)+'">Log masuk</button><button type="button" data-auth-mode="signup" class="'+(signup?'active':'')+'" aria-pressed="'+signup+'">Daftar akaun</button></div>';
 $('auth-gate').innerHTML='<section class="auth-card panel"><div class="brand"><div class="logo">'+icon('logo')+'</div><div><strong>KHUTTAH</strong><small>Ruang kerja peribadi</small></div></div>'+modeSwitch+'<h1>'+(signup?'Daftar akaun':'Log masuk')+'</h1><p class="muted small">'+(signup?'Cipta akaun peribadi anda untuk menyelaraskan tugasan dan nota merentas peranti.':'Ruang kerja ini dilindungi. Log masuk untuk mengakses dan menyelaraskan data anda antara telefon dan komputer.')+'</p><form id="login-form" class="dialog-body auth-form"><label>Emel<input type="email" name="email" autocomplete="email" required autofocus></label><label>Kata laluan<input type="password" name="password" autocomplete="'+(signup?'new-password':'current-password')+'" minlength="6" required></label><p id="auth-info" class="small auth-info" role="status">'+html(infoMessage)+'</p><p id="auth-error" class="small" role="alert">'+html(errorMessage)+'</p><button class="btn primary auth-submit" id="auth-submit" type="submit">'+(signup?'Daftar akaun':'Log masuk')+'</button></form></section>';
 const form=$('login-form');
 form.elements.email.focus();
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const submit=$('auth-submit');
  const errorNode=$('auth-error');
  const infoNode=$('auth-info');
  submit.disabled=true;
  submit.textContent=signup?'Sedang mendaftar…':'Sedang log masuk…';
  errorNode.textContent='';
  infoNode.textContent='';
  try {
   if (signup) {
    const result=await cloud.signUp(form.elements.email.value,form.elements.password.value);
    if (result.confirmationRequired) {
     authMode='signin';
     renderAuthGate('','Akaun dicipta! Sila sahkan pautan dalam emel anda (atau sahkan pengguna di papan pemuka Supabase), kemudian log masuk.');
     return;
    }
   } else {
    await cloud.signIn(form.elements.email.value,form.elements.password.value);
   }
   syncStatus='Menyelaraskan data awan…';
   syncError='';
   render();
   await syncWithCloud({notifyOnDone:true});
  } catch (error) {
   if (!form.isConnected) return;
   errorNode.textContent=error.message;
   submit.disabled=false;
   submit.textContent=signup?'Daftar akaun':'Log masuk';
  }
 });
}
function lockWorkspace(message='') {
 drafts.capture();
 renderAuthGate(message);
}
async function pushToCloud({notifyOnDone=false}={}) {
 if (!cloud.getSession()||recoverySource||syncBusy) return;
 syncBusy=true;
 syncError='';
 syncStatus='Menyimpan ke awan…';
 if (page==='Settings'&&settingsTab==='General') render();
 try {
  await cloud.pushState(currentState());
  syncStatus='Diselaraskan ke awan';
  if (notifyOnDone) notify('Data diselaraskan ke awan');
 } catch (error) {
  if (!cloud.getSession()) { syncBusy=false; lockWorkspace('Sesi tamat. Sila log masuk semula.'); return; }
  syncError=error.message;
  syncStatus='Disimpan setempat (menunggu sambungan awan)';
 } finally {
  syncBusy=false;
  if (cloud.getSession()&&page==='Settings'&&settingsTab==='General') render();
  if (!syncError&&cloud.getSession()&&cloud.getMeta().pendingSync) void pushToCloud();
 }
}
async function syncWithCloud({notifyOnDone=false}={}) {
 if (!cloud.getSession()||recoverySource||syncBusy) return;
 syncBusy=true;
 syncError='';
 syncStatus='Menyelaraskan dengan awan…';
 if (page==='Settings'&&settingsTab==='General') render();
 try {
  if (cloud.getMeta().pendingSync) {
   await cloud.pushState(currentState());
   syncStatus='Diselaraskan ke awan';
   if (notifyOnDone) notify('Perubahan setempat diselaraskan ke awan');
  } else {
   const remote=await cloud.pullState({draftKeys:drafts.keys()});
   if (remote.status==='loaded'&&!cloud.getMeta().pendingSync) {
    const needsRosterSync=remote.state.quranSeedVersion!==1;
    const incoming=migrateGroupNames(remote.state);
    ({records,domains,projects,notes,tags,subfolders,library,quranStudents,demoCleanupVersion,quranSeedVersion}=incoming);
    try { localStorage.setItem(key,JSON.stringify(currentState())); storageOK=true; } catch { storageOK=false; }
    if (needsRosterSync) cloud.markPendingSync();
    syncStatus='Diselaraskan dengan awan';
    render();
    if (notifyOnDone) notify('Data terkini diselaraskan dari awan');
   } else if (remote.status==='empty') {
    await cloud.pushState(currentState());
    syncStatus='Diselaraskan ke awan';
    if (notifyOnDone) notify('Ruang kerja dimuat naik ke awan');
   }
  }
 } catch (error) {
  if (!cloud.getSession()) { syncBusy=false; lockWorkspace('Sesi tamat. Sila log masuk semula.'); return; }
  syncError=error.message;
  syncStatus='Gagal menyelaraskan dengan awan';
 } finally {
  syncBusy=false;
  if (cloud.getSession()&&page==='Settings'&&settingsTab==='General') render();
  if (!syncError&&cloud.getSession()&&cloud.getMeta().pendingSync) void pushToCloud();
 }
}
function showPage(nextPage, selectedDomain) {
  if (page!=='Overview') pageDomains[page]=domain;
  page=nextPage;
  domain=page==='Overview'||page==='Works'||page==='QuranClass'||page==='Copywriting'?'':selectedDomain??pageDomains[page]??'';
  selectedSubfolder='';
  render();
  window.scrollTo(0,0);
  $('main').querySelector('h1')?.focus({preventScroll:true});
}

function quranNavBadge() {
 if (!quranStudents.length) return '';
 const counts=quranStudents.map(s=>s.sessions.filter(x=>x.date.startsWith(quranMonth)).length);
 const incomplete=counts.filter(c=>c<3).length;
 const color=incomplete?'pending':'complete';
 return '<span class="quran-nav-badge quran-'+color+'" title="'+(incomplete?incomplete+' pelajar belum cukup 3 kelas':'Semua pelajar selesai 3 kelas')+'">'+(incomplete||'✓')+'</span>';
}

function pageLinks(names,inDialog=false) {
 return names.map(name=>{
  const [label,symbol]=modules[name];
  const current=page===name;
  const extra=name==='QuranClass'?quranNavBadge():'';
  return '<button type="button" data-page="'+name+'"'+(inDialog?' data-from-more class="btn'+(current?' active':'')+'"':current?' class="active"':'')+(current?' aria-current="page"':'')+'>'+icon(symbol)+'<span class="nav-text">'+html(name==='Works'?'Laman Karya':label)+'</span>'+extra+'</button>';
 }).join('');
}
function profileBlock(inDialog=false) {
 const email=cloud.getSession()?.user?.email||'Akaun peribadi';
 return '<div class="person"><span class="avatar" aria-hidden="true">AS</span><div class="profile-info"><strong class="small">Abu Sulaim</strong><div class="muted small profile-email">'+html(email)+'</div></div>'+button('','data-page="Settings" data-profile-settings aria-label="Tetapan" title="Tetapan"'+(inDialog?' data-from-more':'')+(page==='Settings'?' aria-current="page"':''),'settings','icon ghost profile-settings'+(page==='Settings'?' active':''))+'</div>';
}
function bottomNavigation() {
  const left=['Overview','Planner'].map(name=>'<button data-page="'+name+'"'+(page===name?' class="active" aria-current="page"':'')+'>'+icon(modules[name][1])+modules[name][0]+'</button>').join('');
  const right=['Tasks','Notes'].map(name=>'<button data-page="'+name+'"'+(page===name?' class="active" aria-current="page"':'')+'>'+icon(modules[name][1])+modules[name][0]+'</button>').join('');
  const quickAdd='<button type="button" class="quick-add-nav" data-quick-add aria-haspopup="dialog" aria-label="Pilih dan tambah baharu"><span class="quick-add-plus">'+icon('plus')+'</span>Tambah</button>';
  return '<div class="bottom-links">'+left+quickAdd+right+'<button id="more-menu" type="button" aria-haspopup="dialog" aria-label="Lagi"'+(bottomPages.includes(page)?'':' class="active" aria-current="true"')+'>'+icon('menu')+'Lagi</button></div>';
}

function moreNavigation() {
  openDialog('Lagi','<div class="dialog-body more-nav"><nav class="more-nav" aria-label="Menu tambahan">'+pageLinks(['Events','Reminders','Ideas','Copywriting'],true)+'</nav><h3 class="eyebrow">Kelas Uthmani</h3><nav class="more-nav" aria-label="Kelas Uthmani">'+pageLinks(['QuranClass'],true)+'</nav><h3 class="eyebrow">Karya Abu Sulaim</h3><nav class="more-nav" aria-label="Karya Abu Sulaim">'+pageLinks(['Works'],true)+'</nav><h3 class="eyebrow">Ilmu dan Pengetahuan</h3><nav class="more-nav" aria-label="Ilmu dan Pengetahuan">'+pageLinks(secondaryPages,true)+'</nav><h3 class="eyebrow">Kumpulan</h3><nav class="more-nav" aria-label="Kumpulan">'+domainLinks(true)+'</nav>'+profileBlock(true)+'</div>');
}

function quickAddDialog() {
  const choices=[
    ['task','Tugasan','Tambah tugasan baharu','task'],
    ['event','Acara','Jadualkan acara atau kuliah','calendar'],
    ['reminder','Peringatan','Tetapkan tarikh akhir penting','bell'],
    ['QuranSession','Rekod Kelas Al-Quran','Tandakan tarikh & masa kelas pelajar','book'],
    ['QuranStudent','Pelajar Al-Quran Baharu','Daftar pelajar dewasa baharu','user'],
    ['Copywriting','Copywriting','Tulis kad kandungan copywriting','note'],
    ['Ideas','Khawatir','Catat lintasan idea pantas','note'],
    ['Notes','Nota Peribadi','Tulis nota atau rujukan kumpulan','note'],
    ['Works','Karya Abu Sulaim','Tambah catatan buku atau karya','book'],
    ['Knowledge','Bacaan & Kajian','Rekod nota rujukan dan penyelidikan','book'],
  ];
  openDialog('Pilih perkara untuk dibuat','<div class="dialog-body quick-create"><p class="small muted">Pilih fungsi yang ingin dibuka:</p>'+choices.map(([id,label,desc,symbol])=>button('<span class="quick-pick-text"><strong>'+html(label)+'</strong><small class="muted">'+html(desc)+'</small></span>','data-quick-pick="'+id+'"',symbol)).join('')+'</div>');
}

function domainLinks(inDialog=false) {
  return domains.map((name,index)=>{
    const active=page==='Group'&&domain===name;
    const attrs='data-scope="'+(index+1)+'" aria-pressed="'+active+'"'+(inDialog?' data-from-more':'');
    return inDialog?button(html(name),attrs,'project',active?'active':''):'<button '+attrs+(active?' class="active"':'')+'>'+icon('project')+html(name)+'</button>';
  }).join('');
}

function render() {
 if (!cloud.getSession()) {
  renderAuthGate();
  return;
 }
 renderInstallBanner();
 $('auth-gate').hidden=true;
 $('auth-gate').innerHTML='';
 $('app-layout').hidden=false;
 $('bottom-nav').hidden=false;
 $('bottom-nav').innerHTML=bottomNavigation();
 $('sidebar').innerHTML='<div class="brand"><div class="logo">'+icon('logo')+'</div><div><strong>KHUTTAH</strong><small>Ruang kerja peribadi</small></div></div><nav class="nav" aria-label="Menu utama">'+pageLinks(primaryPages)+'</nav><h2 class="nav-label eyebrow">Kelas Uthmani</h2><nav class="nav" aria-label="Kelas Uthmani">'+pageLinks(['QuranClass'])+'</nav><h2 class="nav-label eyebrow">Karya Abu Sulaim</h2><nav class="nav" aria-label="Karya Abu Sulaim">'+pageLinks(['Works'])+'</nav><h2 class="nav-label eyebrow">Ilmu dan Pengetahuan</h2><nav class="nav" aria-label="Ilmu dan Pengetahuan">'+pageLinks(secondaryPages)+'</nav><h2 class="nav-label eyebrow">Kumpulan</h2><nav class="nav domain-nav" aria-label="Kumpulan">'+domainLinks()+'</nav>'+profileBlock();
 const [moduleTitle]=modules[page];
 const title=page==='Group'?domain:moduleTitle;
 $('crumb').textContent=title;
 const primaryAction=page==='Settings'?'':page==='QuranClass'?button('<span class="new-label">Tambah pelajar</span>','data-add-quran-student="" aria-label="Tambah pelajar Al-Quran"','plus','primary'):(page==='Notes'||page==='Knowledge'||page==='Works'||page==='Ideas'||page==='Copywriting'||isThesis(page))?button('<span class="new-label">'+(page==='Knowledge'?'Tambah entri':page==='Copywriting'?'Tambah copywriting':'Tambah nota')+'</span>','data-add-note="'+page+'" aria-label="'+(page==='Knowledge'?'Tambah entri':page==='Copywriting'?'Tambah copywriting':'Tambah nota')+'"','plus','primary'):button('<span class="new-label">Tambah</span>','data-new="'+((page==='Planner'||page==='Events')?'event':page==='Reminders'?'reminder':'task')+'" aria-label="Tambah rekod"',page==='Planner'?'':'plus','primary'+(page==='Planner'?' text-only':''));
 const mobileQuickBtn=button('<span class="new-label">Pilih & tambah</span>','data-quick-add aria-haspopup="dialog" aria-label="Pilih dan tambah baharu"','plus','primary mobile-quick-btn');
 $('actions').innerHTML=button('<span class="search-label">Cari</span> <kbd>Ctrl K</kbd>','data-search aria-label="Cari dalam ruang kerja"','search','ghost')+mobileQuickBtn+primaryAction;
 const filter='<select class="filter scope-select" id="domain-select" aria-label="Tapis mengikut kumpulan">'+selectDomain(domain,'Semua kumpulan')+'</select>';
 const recovery=recoverySource?'<div class="storage-notice" role="alert"><p>Data tersimpan tidak dapat dibaca. Salinan asal masih dikekalkan; perubahan baharu tersedia dalam sesi ini sahaja.</p>'+button('Muat turun data asal','data-export-recovery')+button('Import sandaran','data-import')+'</div>':'';
 $('main').innerHTML=recovery+'<div class="page-head"><div>'+(page==='Overview'?'<p class="eyebrow">'+html(fullDate(today))+'</p>':'')+'<h1 tabindex="-1">'+html(title)+'</h1></div>'+(page==='Overview'||page==='Works'||page==='QuranClass'||page==='Copywriting'||page==='Settings'||isThesis(page)?'':filter)+'</div>'+({Overview:overview,Planner:planner,Events:eventsPage,Tasks:tasks,Knowledge:knowledge,Reminders:reminders,Notes:personalNotes,Master:thesisPage,PhD:thesisPage,Settings:settings,Group:groupPage,Works:worksPage,Ideas:ideasPage,Copywriting:copywritingPage,QuranClass:quranClassPage}[page])();
}
function sorted(items,scope=page,notesMode=false){return sortItems(items,sorting[scope]||(notesMode?'date-desc':'date-asc'),notesMode);}
function sortControl(scope=page,notesMode=false){
  const value=sorting[scope]||(notesMode?'date-desc':'date-asc');
  const options={'date-asc':notesMode?'Terlama':'Tarikh terdekat','date-desc':notesMode?'Terbaharu':'Tarikh terakhir','title-asc':'A–Z','title-desc':'Z–A'};
  return '<select class="filter sort-select" data-sort-scope="'+scope+'" aria-label="Susun '+modules[scope][0]+'">'+Object.entries(options).map(([key,label])=>'<option value="'+key+'"'+(key===value?' selected':'')+'>'+label+'</option>').join('')+'</select>';
}
function noteCards(items){
  if(!items.length)return blank('Tiada nota.');
  return '<div class="note-grid">'+items.map(item=>'<article class="note-card"><button class="note-card-open" data-note="'+notes.indexOf(item)+'"><strong>'+html(item.title)+'</strong><span class="note-excerpt">'+html(item.note.slice(0,240))+'</span></button><div class="note-card-meta"><span>'+html(domainName(item.domain)+(item.subfolder?' / '+item.subfolder:''))+'</span><time>'+html(item.updatedAt?noteDateLabel(item.updatedAt):'')+'</time></div>'+tagBadges(item)+'</article>').join('')+'</div>';
}
function deadlineRows(items){
  return items.length?'<div class="rows deadline-rows">'+items.map(item=>'<div class="row">'+(item.type==='event'?icon('calendar'):'<input class="check" type="checkbox" data-check="'+item.id+'" aria-label="Tandakan selesai '+html(item.title)+'">')+'<div class="row-main"><button class="row-title" data-edit="'+item.id+'">'+html(item.title)+'</button><div class="small muted">'+html(types[item.type]+' · '+domainName(item.domain)+' · '+shortDate(item.date)+(item.time?' · '+item.time:''))+'</div>'+deadlineStatus(item)+'</div></div>').join('')+'</div>':blank('Tiada tarikh terdekat atau tugasan tertunggak.');
}
function manageTags(scope){
  const rows=tags[scope].map((name,index)=>'<div class="row"><strong class="row-main">'+html(name)+'</strong>'+button('Sunting','data-edit-tag="'+index+'" data-tag-owner="'+scope+'" aria-label="Sunting tag '+html(name)+'"')+button('Padam','data-delete-tag="'+index+'" data-tag-owner="'+scope+'" aria-label="Padam tag '+html(name)+'"')+'</div>').join('');
  openDialog('Urus tag · '+modules[scope][0],'<div class="dialog-body">'+(rows||blank('Tiada tag.'))+button('Tambah tag','data-add-tag="'+scope+'"','plus')+'</div>');
}
function addInlineTag(control){
  const scope=control.dataset.inlineTag,fieldset=control.closest('fieldset'),input=fieldset.querySelector('[data-tag-input]'),name=input.value.trim();
  if(!name||name.length>48){input.setCustomValidity('Masukkan nama tag sehingga 48 aksara.');input.reportValidity();return false;}
  const canonical=tags[scope].find(tag=>tag.toLowerCase()===name.toLowerCase())||name;
  if(!tags[scope].includes(canonical))tags[scope].push(canonical);
  const selected=[...fieldset.querySelectorAll('input[name="tags"]:checked')].map(field=>field.value);
  const form=control.closest('form');
  fieldset.outerHTML=tagOptions(scope,[...selected,canonical]);
  form.dispatchEvent(new Event('input',{bubbles:true}));
  save('Tag ditambah');return true;
}
function worksPage(){
  if(selectedWorkBook&&!library.books.some(book=>book.id===selectedWorkBook))selectedWorkBook='';
  const book=library.books.find(item=>item.id===selectedWorkBook);
  const allNotes=notes.filter(note=>note.kind==='Karya');
  const count=id=>allNotes.filter(note=>(note.bookId||'')===id&&!note.archived).length;
  const target=(id,title,meta='')=>'<button type="button" class="book-target'+(selectedWorkBook===id?' active':'')+'" data-open-book="'+html(id)+'" data-drop-book="'+html(id)+'" aria-pressed="'+(selectedWorkBook===id)+'">'+icon(id?'book':'note')+'<span class="book-target-text"><strong>'+html(title)+'</strong>'+(meta?'<small>'+html(meta)+'</small>':'')+'</span><span class="book-count">'+count(id)+'</span></button>';
  const folders=[['published','Sudah diterbitkan'],['unpublished','Belum diterbitkan']].map(([status,label])=>{
    const books=sortItems(library.books.filter(item=>item.status===status&&(!bookSubjectFilter||item.subjects.includes(bookSubjectFilter))),'title-asc');
    return '<details class="book-shelf" open><summary>'+icon('project')+'<strong>'+label+'</strong><span class="book-count">'+books.length+'</span></summary><div class="book-shelf-list">'+books.map(item=>target(item.id,item.title,item.subjects.join(' · '))).join('')+(books.length?'':'<p class="library-empty">Tiada buku.</p>')+button('Tambah buku','data-add-book="'+status+'"','plus','ghost')+'</div></details>';
  }).join('');
  const libraryPanel='<aside class="book-library" aria-label="Folder buku"><div class="library-heading"><h2>Koleksi buku</h2>'+button('Bidang','data-manage-subjects','','ghost')+'</div><select class="filter" id="book-subject-filter" aria-label="Tapis buku mengikut bidang"><option value="">Semua bidang</option>'+library.subjects.map(name=>'<option'+(bookSubjectFilter===name?' selected':'')+'>'+html(name)+'</option>').join('')+'</select>'+target('','Belum ditetapkan')+folders+'</aside>';
  const items=sorted(allNotes.filter(item=>(item.bookId||'')===selectedWorkBook&&Boolean(item.archived)===workArchived&&(!workPurpose||item.purpose===workPurpose)&&tagged(item,'Works')),'Works',true).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)));
  const tabs='<div class="work-categories">'+button('Semua','data-work-purpose="" aria-pressed="'+(!workPurpose&&!workArchived)+'"','',!workPurpose&&!workArchived?'active':'')+workCategories.map(name=>button(html(name),'data-work-purpose="'+name+'" aria-pressed="'+(workPurpose===name&&!workArchived)+'"','',workPurpose===name&&!workArchived?'active':'')).join('')+button('Arkib','data-work-archive-view aria-pressed="'+workArchived+'"','',workArchived?'active':'')+'</div>';
  const heading='<div class="book-board-title"><div><h2>'+html(book?.title||'Nota belum ditetapkan')+'</h2><div class="tag-badges">'+(book?badge(book.status==='published'?'Sudah diterbitkan':'Belum diterbitkan')+book.subjects.map(badge).join(''):'<span class="small muted">Seret nota ke buku atau pindahkan melalui menu ⋯.</span>')+'</div></div>'+(book?button('Sunting buku','data-edit-book="'+book.id+'"'):'')+'</div>';
  const draft=quickWorkDrafts[selectedWorkBook||'inbox']||{};
  const quick='<form id="quick-work-form" class="quick-work-form"><label class="sr-only" for="quick-work-text">Catatan pantas</label><textarea id="quick-work-text" name="note" data-quick-work maxlength="20000" rows="3" placeholder="Tulis catatan yang terlintas…" required>'+html(draft.note||'')+'</textarea><div class="quick-work-actions"><label>Buku<select class="filter" name="bookId" data-quick-work>'+bookOptions(draft.bookId??selectedWorkBook)+'</select></label><button type="submit" class="btn primary">Simpan catatan</button></div></form>';
  const cards=stickyCards(items,'Works');
  return '<div class="book-workspace">'+libraryPanel+'<section class="book-board" aria-label="Papan nota buku">'+heading+quick+tabs+tagNav('Works')+'<div class="board-toolbar">'+sortControl('Works',true)+button('Nota berformat','data-add-note="Works"','plus')+'</div>'+cards+'</section></div>';
}

function bookOptions(current=''){
  return '<option value="">Belum ditetapkan</option>'+[['published','Sudah diterbitkan'],['unpublished','Belum diterbitkan']].map(([status,label])=>'<optgroup label="'+label+'">'+sortItems(library.books.filter(book=>book.status===status),'title-asc').map(book=>'<option value="'+book.id+'"'+(current===book.id?' selected':'')+'>'+html(book.title)+'</option>').join('')+'</optgroup>').join('');
}
function stickyCards(items,scope){
  const isArchived=scope==='Ideas'?ideasArchived:scope==='Copywriting'?copywritingArchived:workArchived;
  if(!items.length)return blank(isArchived?'Arkib kosong.':'Tiada catatan.');
  return '<div class="sticky-grid">'+items.map(item=>{
    const compact=text=>text.trim().replace(/\s+/g,' ');
    const lines=item.note.trim().split('\n');
    if(compact(lines[0])===compact(item.title))lines.shift();
    const excerpt=lines.join('\n').trim();
    const cardColor=scope==='Copywriting'?'white':(item.color||'white');
    return '<article class="sticky-card sticky-'+html(cardColor)+'"'+(scope==='Works'?' draggable="true" data-drag-work="'+item.id+'"':'')+'><button class="note-card-open" data-note="'+notes.indexOf(item)+'"><strong>'+html(item.title)+'</strong>'+(excerpt&&compact(excerpt)!==compact(item.title)?'<span class="note-excerpt">'+html(excerpt.slice(0,240))+'</span>':'')+'</button>'+tagBadges(item)+'<div class="sticky-bottom"><time title="'+html(scope==='Works'?item.purpose||'Catatan':scope==='Copywriting'?'Copywriting':'Khawatir')+'">'+html(item.updatedAt?noteDateLabel(item.updatedAt):'')+'</time><div class="inline">'+(item.pinned?'<span class="sticky-pinned" role="img" aria-label="Nota dipin">'+icon('pin')+'</span>':'')+(scope==='Copywriting'?button('','data-copy-note="'+item.id+'" aria-label="Salin teks '+html(item.title)+'" title="Salin teks"','copy','ghost'):'')+(scope==='Works'?button('⠿','data-work-drag-handle="'+item.id+'" draggable="true" aria-label="Seret nota '+html(item.title)+'" title="Seret ke buku"','','ghost note-drag-handle'):'')+button('','data-sticky-options="'+item.id+'" aria-label="Pilihan nota '+html(item.title)+'" aria-haspopup="dialog"','more','ghost')+'</div></div></article>';
  }).join('')+'</div>';
}
function stickyOptions(id){
  const item=notes.find(note=>note.id===id&&['Karya','Idea rambang','Copywriting'].includes(note.kind));
  if(!item)return;
  const colorPicker=item.kind==='Copywriting'?'':'<label>Warna<select data-sticky-color="'+item.id+'">'+Object.entries(workColors).map(([value,name])=>'<option value="'+value+'"'+(value===(item.color||'white')?' selected':'')+'>'+name+'</option>').join('')+'</select></label>';
  openDialog('Pilihan nota','<div class="dialog-body sticky-options"><strong>'+html(item.title)+'</strong>'+(item.kind==='Karya'?'<label>Pindah ke buku<select data-move-work="'+item.id+'" aria-label="Pindahkan '+html(item.title)+'">'+bookOptions(item.bookId||'')+'</select></label>':'')+colorPicker+(item.kind==='Copywriting'?button('Salin teks','data-copy-note="'+item.id+'"','copy'):'')+button(item.pinned?'Lepas pin':'Pin nota','data-work-pin="'+item.id+'" aria-pressed="'+Boolean(item.pinned)+'"','pin')+button(item.archived?'Pulihkan':'Arkib','data-work-archive="'+item.id+'"')+'</div>');
}
function ideasPage(){
  const items=sorted(visible(notes).filter(note=>note.kind==='Idea rambang'&&Boolean(note.archived)===ideasArchived&&tagged(note,'Ideas')),'Ideas',true).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)));
  return '<div class="work-categories">'+button('Khawatir','data-ideas-archive="false" aria-pressed="'+!ideasArchived+'"','',!ideasArchived?'active':'')+button('Arkib','data-ideas-archive="true" aria-pressed="'+ideasArchived+'"','',ideasArchived?'active':'')+'</div>'+tagNav('Ideas')+'<div class="board-toolbar">'+sortControl('Ideas',true)+button('Khawatir baharu','data-add-note="Ideas"','plus','primary')+'</div>'+stickyCards(items,'Ideas');
}
function copywritingPage(){
  const allCopy=notes.filter(note=>note.kind==='Copywriting');
  if(tagSelection.Copywriting&&!tags.Copywriting.includes(tagSelection.Copywriting))tagSelection.Copywriting='';
  const activeTag=tagSelection.Copywriting;
  const unarchivedCount=allCopy.filter(note=>!note.archived).length;
  const archivedCount=allCopy.filter(note=>note.archived).length;
  const tagCount=name=>allCopy.filter(note=>!note.archived&&note.tags?.includes(name)).length;
  const sortedTags=[...tags.Copywriting].sort((a,b)=>a.localeCompare(b,'ms'));
  const tagButtons=sortedTags.map((name,idx)=>{
    const isSelected=!copywritingArchived&&activeTag===name;
    return '<button type="button" class="book-target'+(isSelected?' active':'')+'" data-copywriting-tag-idx="'+idx+'" aria-pressed="'+isSelected+'">'+icon('note')+'<span class="book-target-text"><strong>'+html(name)+'</strong></span><span class="book-count">'+tagCount(name)+'</span></button>';
  }).join('');
  const sideNav='<aside class="book-library" aria-label="Navigasi tag Copywriting"><div class="library-heading"><h2>Tag Copywriting</h2>'+button('Urus','data-manage-tags="Copywriting"','','ghost')+'</div><button type="button" class="book-target'+(!copywritingArchived&&!activeTag?' active':'')+'" data-copywriting-all aria-pressed="'+(!copywritingArchived&&!activeTag)+'">'+icon('note')+'<span class="book-target-text"><strong>Semua copywriting</strong></span><span class="book-count">'+unarchivedCount+'</span></button><div class="book-shelf"><div class="book-shelf-list">'+(tagButtons||'<p class="library-empty">Belum ada tag.</p>')+button('Tambah tag','data-add-tag="Copywriting"','plus','ghost')+'</div></div><div class="book-shelf"><button type="button" class="book-target'+(copywritingArchived?' active':'')+'" data-copywriting-archive="true" aria-pressed="'+copywritingArchived+'">'+icon('project')+'<span class="book-target-text"><strong>Arkib</strong></span><span class="book-count">'+archivedCount+'</span></button></div></aside>';
  const items=sorted(allCopy.filter(item=>Boolean(item.archived)===copywritingArchived&&(!activeTag||item.tags?.includes(activeTag))),'Copywriting',true).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)));
  const headingTitle=copywritingArchived?'Arkib Copywriting':activeTag||'Semua Copywriting';
  const heading='<div class="book-board-title"><div><h2>'+html(headingTitle)+'</h2><p class="small muted">Kad kandungan monokrom · Klik kad untuk menyunting atau salin pantas.</p></div>'+button('Copywriting baharu','data-add-note="Copywriting"','plus','primary')+'</div>';
  const quick='<form id="quick-copywriting-form" class="quick-work-form"><label class="sr-only" for="quick-copywriting-text">Copywriting pantas</label><textarea id="quick-copywriting-text" name="note" maxlength="20000" rows="3" placeholder="Tulis draf copywriting pantas di sini… (baris pertama menjadi tajuk)" required></textarea><div class="quick-work-actions"><span class="small muted">'+(activeTag?'Disimpan dalam tag: <strong>'+html(activeTag)+'</strong>':'Tiada tag dipilih (masuk ke Semua)')+'</span><button type="submit" class="btn primary">Simpan kad</button></div></form>';
  return '<div class="book-workspace">'+sideNav+'<section class="book-board" aria-label="Papan Copywriting">'+heading+(copywritingArchived?'':quick)+'<div class="board-toolbar">'+sortControl('Copywriting',true)+button('Editor penuh','data-add-note="Copywriting"','plus')+'</div>'+stickyCards(items,'Copywriting')+'</section></div>';
}
const ringgit = value => 'RM' + Number(value).toLocaleString('ms-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2});
function quranStatusInfo(count){
  const remaining=Math.max(0,3-count);
  return {tier:String(Math.min(3,count)),color:remaining?'pending':'complete',label:remaining?'Baki '+remaining+' kelas':'Selesai',desc:count+' / 3 kelas selesai'};
}
function quranClassPage(){
  const monthHeading=dateLabel(quranMonth+'-01',{month:'long',year:'numeric'});
  const summary=summariseQuranMonth(quranStudents,quranMonth);
  const nav='<div class="quran-toolbar"><div class="inline">'+button('','data-quran-month="-1" aria-label="Bulan sebelumnya"','prev','icon')+'<h2>'+html(monthHeading)+'</h2>'+button('','data-quran-month="1" aria-label="Bulan seterusnya"','next','icon')+'</div>'+button('Bulan ini','data-quran-month="0"')+'</div>';
  const metrics=[['Pelajar',quranStudents.length,summary.completed+' pelajar selesai 3 kelas'],['Kelas selesai',summary.sessions,'Sasaran 3 kelas / pelajar'],['Baki kelas',summary.remaining,'Untuk bulan yang dipilih'],['Jumlah bayaran',ringgit(summary.earnings),summary.sessions+' kelas × RM'+defaultClassFee]];
  const dashboard='<div class="quran-dashboard" aria-label="Ringkasan kelas bulanan">'+metrics.map(([label,value,detail])=>'<div class="metric"><span class="metric-top">'+label+'</span><strong>'+value+'</strong><span class="small muted">'+detail+'</span></div>').join('')+'</div>';
  const filters='<div class="quran-filters" role="group" aria-label="Tapis status kelas">'+[['all','Semua'],['pending','Masih berbaki'],['3','Selesai']].map(([value,label])=>button(label,'data-quran-filter="'+value+'" aria-pressed="'+(quranFilter===value)+'"','',quranFilter===value?'active':'ghost')).join('')+'</div>';
  const filtered=summary.students.filter(item=>quranFilter==='all'||(quranFilter==='pending'?item.remaining>0:item.remaining===0));
  const rows=filtered.length?'<div class="quran-rows">'+filtered.map(({student,sessions,count})=>{
    const status=quranStatusInfo(count);
    const slots=Array.from({length:Math.max(3,count)},(_,index)=>{
      const session=sessions[index],slot=index+1;
      const label=session?fullDate(session.date):'Tandakan tarikh kelas '+slot;
      return '<button type="button" class="quran-tick'+(session?' checked':'')+'" data-tick-quran="'+student.id+'"'+(session?' data-session-id="'+session.id+'"':'')+' data-slot="'+slot+'" aria-pressed="'+Boolean(session)+'" aria-label="Kelas '+slot+' · '+html(label)+'" title="'+html(label)+'"><span class="tick-box" aria-hidden="true">'+(session?'✓':'')+'</span><span class="tick-label"><strong>Kelas '+slot+'</strong>'+(session?'<time datetime="'+session.date+'">'+html(shortDate(session.date))+'</time>':'<small>Belum ditanda</small>')+'</span></button>';
    }).join('');
    const extra=count>=3?button('Tambah kelas','data-tick-quran="'+student.id+'" data-slot="'+(count+1)+'"','plus','ghost quran-extra'):'';
    return '<article class="quran-student-row"><div class="quran-student-info"><div class="quran-name-line">'+(student.code?'<span class="quran-code">'+html(student.code)+'</span>':'')+'<button type="button" class="row-title" data-open-student="'+student.id+'">'+html(student.name)+'</button></div><div class="quran-student-meta"><span class="quran-pill quran-'+status.color+'">'+html(status.label)+'</span><span class="small muted">'+html(status.desc)+'</span></div>'+(student.note?'<p class="small muted">'+html(student.note)+'</p>':'')+'</div><div class="quran-ticks" role="group" aria-label="Tandakan kelas '+html(student.name)+'">'+slots+extra+'</div></article>';
  }).join('')+'</div>':blank(quranStudents.length?'Tiada pelajar dalam status ini.':'Belum ada pelajar. Pilih Tambah pelajar untuk bermula.');
  return nav+dashboard+'<section class="panel"><div class="section-head"><div><h2>Senarai pelajar</h2><p class="small muted">Baki kelas terbanyak di atas · '+html(monthHeading)+'</p></div>'+filters+'</div>'+rows+'</section>';
}

function quranTickDialog(studentId,slot=1,sessionId=''){
  const student=quranStudents.find(item=>item.id===studentId);
  if(!student)return;
  const existingSession=sessionId?student.sessions.find(s=>s.id===sessionId):null;
  const defaultDate=existingSession?.date||(today.startsWith(quranMonth)?today:quranMonth+'-01');
  const yesterday=add(today,-1);
  const quickDays='<div class="postpone-options" role="group" aria-label="Pilih hari pantas">'+button('<strong>Hari ini</strong><span class="small">'+html(fullDate(today))+'</span>','data-quick-quran-date="'+today+'"')+button('<strong>Semalam</strong><span class="small">'+html(fullDate(yesterday))+'</span>','data-quick-quran-date="'+yesterday+'"')+'</div>';
  openDialog((existingSession?'Kemaskini tanda · ':'Tandakan ✓ ')+'Kelas '+slot,'<form class="dialog-body" id="quran-tick-form"><p><strong>'+html((student.code?student.code+' · ':'')+student.name)+'</strong></p>'+quickDays+'<label>Atau pilih tarikh / hari kelas<input type="date" name="date" min="1900-01-01" max="9999-12-31" value="'+html(defaultDate)+'" required autofocus></label><p id="quran-day-preview" class="small muted">Hari dipilih: <strong>'+html(fullDate(defaultDate))+'</strong></p><div class="dialog-actions">'+(existingSession?button('Batal tanda ✓','data-delete-quran-session="'+existingSession.id+'" data-student-id="'+student.id+'"','','left'):'')+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan ✓</button></div></form>');
  const form=$('quran-tick-form'),dateInput=form.elements.date,preview=$('quran-day-preview');
  dateInput.addEventListener('change',()=>{
    if(dateInput.value)preview.innerHTML='Hari dipilih: <strong>'+html(fullDate(dateInput.value))+'</strong>';
  });
  form.addEventListener('click',event=>{
    const quick=event.target.closest('[data-quick-quran-date]');
    if(!quick)return;
    dateInput.value=quick.dataset.quickQuranDate;
    form.requestSubmit();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const date=dateInput.value;
    if(!date)return;
    if(existingSession){
      existingSession.date=date;
    } else {
      student.sessions.push({id:'qses-'+crypto.randomUUID(),date,time:'',note:''});
    }
    student.updatedAt=new Date().toISOString();
    quranMonth=date.slice(0,7);
    $('modal').close();
    save('✓ Kelas '+slot+' ditandakan ('+dayShortDate(date)+')');
  });
}
function quranStudentDialog(studentId){
  const student=quranStudents.find(item=>item.id===studentId);
  if(!student)return;
  const monthSessions=student.sessions.filter(s=>s.date.startsWith(quranMonth)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const status=quranStatusInfo(monthSessions.length);
  const allSessions=[...student.sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const sessionRows=allSessions.length?'<div class="rows">'+allSessions.map((s,idx)=>'<div class="row"><div class="row-main"><strong>'+html(fullDate(s.date))+'</strong><div class="small muted">Hari kelas direkodkan'+(s.note?' · '+html(s.note):'')+'</div></div><div class="inline">'+button('Tukar tarikh','data-tick-quran="'+student.id+'" data-session-id="'+s.id+'" data-slot="'+(idx+1)+'"')+button('Batal tanda','data-delete-quran-session="'+s.id+'" data-student-id="'+student.id+'"')+'</div></div>').join('')+'</div>':blank('Belum ada tarikh kelas ditandakan untuk pelajar ini.');
  openDialog((student.code?student.code+' · ':'')+student.name,'<div class="dialog-body quran-student-detail"><div class="detail panel"><div class="inline"><span class="quran-pill quran-'+status.color+'">'+html(status.label)+'</span><span class="small muted">'+html(status.desc)+'</span></div>'+(student.note?'<p class="small muted">Catatan: '+html(student.note)+'</p>':'')+'</div><div class="inline">'+button('Tandakan hari kelas','data-tick-quran="'+student.id+'" data-slot="'+(monthSessions.length+1)+'"','plus','primary')+button('Sunting maklumat pelajar','data-edit-quran-student="'+student.id+'"')+'</div><h3>Tarikh & hari kelas yang telah ditandakan</h3>'+sessionRows+'<div class="dialog-actions">'+button('Tutup','data-close')+'</div></div>');
}
function quranStudentForm(studentId){
  const student=quranStudents.find(item=>item.id===studentId);
  openDialog(student?'Sunting pelajar':'Tambah pelajar Al-Quran','<form class="dialog-body" id="quran-student-form"><div class="form-grid"><label>Kod pelajar (pilihan)<input name="code" maxlength="24" value="'+html(student?.code||'')+'" placeholder="Contoh: 011 / M015"></label><label>Nama pelajar dewasa<input name="name" required maxlength="120" value="'+html(student?.name||'')+'" placeholder="Contoh: ALI BIN MAHMOOD" autofocus></label></div><label>Catatan (pilihan)<input name="note" maxlength="240" value="'+html(student?.note||'')+'" placeholder="Pilihan"></label><div class="dialog-actions">'+(student?button('Padam pelajar','data-delete-quran-student="'+student.id+'"','','left'):'')+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan pelajar</button></div></form>');
  const form=$('quran-student-form'),nameInput=form.elements.name;
  nameInput.focus();
  nameInput.addEventListener('input',()=>nameInput.setCustomValidity(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const code=form.elements.code.value.trim();
    const name=nameInput.value.trim();
    const note=form.elements.note.value.trim();
    if(!name||quranStudents.some(item=>item.id!==student?.id&&item.name.toLowerCase()===name.toLowerCase())){
      nameInput.setCustomValidity(name?'Nama pelajar ini sudah wujud.':'Masukkan nama pelajar.');
      nameInput.reportValidity();
      return;
    }
    const now=new Date().toISOString();
    if(student){
      student.code=code;student.name=name;student.note=note;student.updatedAt=now;
      $('modal').close();save('Maklumat pelajar dikemas kini');
    } else {
      const created={id:'qs-'+crypto.randomUUID(),code,name,note,sessions:[],createdAt:now,updatedAt:now};
      quranStudents.push(created);
      $('modal').close();save('Pelajar ditambah');
    }
  });
}
function quranSessionForm(studentId='',sessionId=''){
  if(!quranStudents.length){quranStudentForm();return;}
  const initialStudent=quranStudents.find(item=>item.id===studentId)||quranStudents[0];
  const monthCount=initialStudent.sessions.filter(s=>s.date.startsWith(quranMonth)).length;
  quranTickDialog(initialStudent.id,monthCount+1,sessionId);
}
function openBook(id){selectedWorkBook=id;workArchived=false;workPurpose='';if(page!=='Works')showPage('Works');else render();}
function moveStickyNote(noteId,bookId){
  const note=notes.find(item=>item.id===noteId&&item.kind==='Karya');
  if(!note)return;
  const previous=note.bookId||'';
  if(!moveWorkNote(notes,library.books,noteId,bookId))return;
  save('Nota dipindahkan ke '+(library.books.find(book=>book.id===bookId)?.title||'Belum ditetapkan'),()=>{moveWorkNote(notes,library.books,noteId,previous);});
}
function bookForm(id,status='unpublished'){
  const item=library.books.find(book=>book.id===id);
  openDialog(item?'Sunting buku':'Tambah buku','<form id="book-form" class="dialog-body"><label>Tajuk buku<input name="title" value="'+html(item?.title||'')+'" maxlength="160" required autofocus></label><label>Status penerbitan<select name="status"><option value="unpublished"'+((item?.status||status)==='unpublished'?' selected':'')+'>Belum diterbitkan</option><option value="published"'+((item?.status||status)==='published'?' selected':'')+'>Sudah diterbitkan</option></select></label><fieldset class="tag-options"><legend>Bidang · boleh pilih lebih daripada satu</legend>'+library.subjects.map(name=>'<label><input type="checkbox" name="subjects" value="'+html(name)+'"'+(item?.subjects.includes(name)?' checked':'')+'>'+html(name)+'</label>').join('')+'</fieldset><label>Bidang baharu<input name="newSubject" maxlength="48" placeholder="Pilihan"></label><div class="dialog-actions">'+(item?button('Padam folder','data-delete-book="'+item.id+'"','','left'):'')+button('Batal','data-close')+'<button type="submit" class="btn primary">Simpan buku</button></div></form>');
  const form=$('book-form');
  form.elements.title.focus();
  form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const title=form.elements.title.value.trim();
    if(!title||library.books.some(book=>book.id!==item?.id&&book.title.toLowerCase()===title.toLowerCase())){form.elements.title.setCustomValidity('Tajuk kosong atau sudah digunakan.');form.elements.title.reportValidity();return;}
    const subjects=new FormData(form).getAll('subjects');
    const extra=form.elements.newSubject.value.trim();
    if(extra){const canonical=library.subjects.find(name=>name.toLowerCase()===extra.toLowerCase())||extra;if(!library.subjects.includes(canonical))library.subjects.push(canonical);subjects.push(canonical);}
    const now=new Date().toISOString();
    const values={...item,id:item?.id||'book-'+crypto.randomUUID(),title,status:form.elements.status.value,subjects:cleanTagNames(subjects),createdAt:item?.createdAt||now,updatedAt:now};
    if(item)library.books[library.books.indexOf(item)]=values;else library.books.push(values);
    selectedWorkBook=values.id;bookSubjectFilter='';workPurpose='';workArchived=false;
    $('modal').close();save('Buku disimpan');
  });
}
function manageSubjects(){
  openDialog('Urus bidang buku','<div class="dialog-body">'+library.subjects.map((name,index)=>'<div class="row"><strong class="row-main">'+html(name)+'</strong>'+button('Sunting','data-edit-subject="'+index+'" aria-label="Sunting bidang '+html(name)+'"')+button('Padam','data-delete-subject="'+index+'" aria-label="Padam bidang '+html(name)+'"')+'</div>').join('')+button('Tambah bidang','data-add-subject','plus')+'</div>');
}
function subjectForm(index){
  const previous=Number.isInteger(index)?library.subjects[index]:null;
  openDialog(previous?'Sunting bidang':'Tambah bidang','<form class="dialog-body" id="subject-form"><label>Nama bidang<input name="subject" value="'+html(previous||'')+'" maxlength="48" required autofocus></label><div class="dialog-actions">'+button('Batal','data-close')+'<button type="submit" class="btn primary">Simpan bidang</button></div></form>');
  const form=$('subject-form'),field=form.elements.subject;
  field.focus();field.addEventListener('input',()=>field.setCustomValidity(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();const name=field.value.trim();
    try{if(previous!==null)changeBookSubject(library,previous,name);else{if(!name||library.subjects.some(value=>value.toLowerCase()===name.toLowerCase()))throw new Error('Nama bidang kosong atau sudah digunakan.');library.subjects.push(name);}}
    catch(error){field.setCustomValidity(error.message);field.reportValidity();return;}
    if(bookSubjectFilter===previous)bookSubjectFilter=name;
    $('modal').close();save('Bidang disimpan');
  });
}
function persistQuickWorkDraft(){try{localStorage.setItem('khuttah-book-capture-v1',JSON.stringify(quickWorkDrafts));}catch{}}
function captureQuickWorkDraft(form){quickWorkDrafts[selectedWorkBook||'inbox']={note:form.elements.note.value,bookId:form.elements.bookId.value};persistQuickWorkDraft();}
function dayCreateDialog(day){
  openDialog(fullDate(day),'<div class="dialog-body quick-create">'+Object.entries(types).map(([type,label])=>button('Tambah '+label.toLowerCase(),'data-new="'+type+'" data-date="'+day+'"',type==='task'?'task':type==='event'?'calendar':'bell')).join('')+button('Lihat agenda hari','data-open-agenda="'+day+'"','','ghost')+'</div>');
}
function section(title, content, action='') {
 return '<section class="panel"><div class="section-head"><h2>'+title+'</h2>'+action+'</div>'+content+'</section>';
}
function priorityMarker(item,compact=false) {
 if (item.type!=='task') return '';
 const level=taskPriority(item);
 const label=priorities[level];
 const dot='<span class="priority-dot '+level+'" aria-hidden="true"></span>';
 return compact?dot:'<span class="priority">'+dot+label+'</span>';
}
function taskRows(items, emptyText='Tiada tugasan.') {
  if (!items.length) return blank(emptyText);
  return '<div class="rows">'+items.map(item=>'<div class="row'+(item.done?' done':'')+'"><input class="check" type="checkbox" data-check="'+item.id+'" aria-label="'+(item.done?'Buka semula ':'Tandakan selesai ')+html(item.title)+'" '+(item.done?'checked':'')+'><div class="row-main"><button class="row-title" data-edit="'+item.id+'">'+html(item.title)+'</button><div class="small muted">'+html(domainName(item.domain))+' · '+(!item.date?'Tanpa tarikh':item.date===today?'Hari ini':shortDate(item.date))+priorityMarker(item)+'</div>'+deadlineStatus(item)+'</div>'+(item.type==='task'&&!item.done?button(item.date?'Tunda':'Tetapkan tarikh','data-postpone="'+html(item.id)+'"','','postpone-button'):'')+'</div>').join('')+'</div>';
}

function deadlineStatus(item) {
  if (!item.date||item.done) return '';
  const days=Math.round((dateOf(item.date)-dateOf(today))/86400000);
  const label=days<0?'Lewat '+Math.abs(days)+' hari':days===0?'Hari ini':days===1?'Esok':days+' hari lagi';
  return '<span class="deadline-status'+(days<0?' overdue':'')+'">'+label+'</span>';
}

function postponeForm(id) {
 const item=records.find(entry=>entry.id===id&&entry.type==='task'&&!entry.done);
 if (!item) return;
 if (item.date>='9999-12-31') { notify('Tarikh tugasan sudah mencapai had kalendar.'); return; }
 const earliest=item.date?add(item.date>today?item.date:today,1):today;
 const choices=[['Esok',add(today,1)],['Minggu depan',add(today,7)]];
 const options=choices.map(([label,date])=>button('<strong>'+label+'</strong><span class="small">'+shortDate(date)+'</span>','data-postpone-date="'+date+'"'+(date<=item.date?' disabled':''))).join('');
 openDialog('Tunda tugasan','<form id="postpone-form" class="dialog-body"><div><p><strong>'+html(item.title)+'</strong></p><p class="small muted">Tarikh sekarang: '+(item.date?fullDate(item.date):'Tanpa tarikh')+'</p></div><div class="postpone-options" role="group" aria-label="Pilihan tarikh tunda">'+options+'</div><label>Atau pilih tarikh baharu<input type="date" name="date" min="'+earliest+'" max="9999-12-31" value="'+earliest+'" required></label><div class="dialog-actions">'+button('Batal','data-close')+'<button class="btn primary" type="submit">Tunda tugasan</button></div></form>');
 const form=$('postpone-form');
 form.addEventListener('click',event=>{
  const choice=event.target.closest('[data-postpone-date]');
  if (!choice) return;
  form.elements.date.value=choice.dataset.postponeDate;
  form.requestSubmit();
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const date=form.elements.date.value;
  if (date<earliest||date>'9999-12-31') { form.elements.date.reportValidity(); return; }
  item.date=date; item.updatedAt=new Date().toISOString();
  $('modal').close();
  save('Tugasan ditunda ke '+shortDate(date));
  (document.querySelector('[data-postpone="'+item.id+'"]')||$('main').querySelector('h1')).focus({preventScroll:true});
 });
}
function scheduleRows(items, emptyText='Tiada acara dijadualkan.') {
 if (!items.length) return blank(emptyText);
 return '<div class="rows">'+items.map(item=>'<div class="row"><span class="time">'+html(item.time|| (item.type==='task'?'Tarikh akhir':'Sepanjang hari'))+'</span><div class="row-main time-mark"><button class="row-title" data-edit="'+item.id+'">'+html(item.title)+'</button><div class="small muted">'+html(domainName(item.domain))+' · '+shortDate(item.date)+(item.repeat?' · Berulang setiap minggu':'')+'</div>'+tagBadges(item)+'</div></div>').join('')+'</div>';
}
function projectPanel() {
 const list=projects.length?'<div class="project-grid">'+projects.map((item,index)=>'<button class="project" data-project="'+index+'"><div class="inline">'+badge(domainName(item.domain))+'<span class="small muted">'+item.progress+'%</span></div><h3>'+html(item.title)+'</h3><p class="small muted">'+html(item.note)+'</p><div class="progress" role="progressbar" aria-label="'+html(item.title)+'" aria-valuenow="'+item.progress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+item.progress+'%"></span></div></button>').join('')+'</div>':blank('Tiada projek.');
 return section('Senarai projek',list);
}
function scheduledOn(day,types) {
 return visible(records).filter(item=>item.date&&types.includes(item.type)&&(item.date===day||(item.repeat==='weekly'&&day>item.date&&dateOf(day).getUTCDay()===dateOf(item.date).getUTCDay())))
  .sort((a,b)=>Number(b.type==='reminder')-Number(a.type==='reminder')||(a.time||'').localeCompare(b.time||'')||a.title.localeCompare(b.title));
}
function itemsInRange(start,end,types) {
 const result=[];
 for (let day=start;day<=end;day=add(day,1)) {
  for (const item of scheduledOn(day,types)) result.push({...item,date:day});
 }
 return result;
}
function rangeLabel(start,end) {
 return start===end?fullDate(start):shortDate(start)+' – '+dateLabel(end,{day:'numeric',month:'short',year:'numeric'});
}
function overview() {
 const sunday=weekStart(today);
 const ranges={today:[today,today],week:[sunday,add(sunday,6)],next:[add(sunday,7),add(sunday,13)],month:[monthStart(today),monthEnd(today)]};
 const [start,end]=ranges[period];
 const items=itemsInRange(start,end,['task','event','reminder']).filter(item=>!item.done);
 const groups=[
  {label:'Tugasan',type:'task',target:'Tasks',symbol:'task'},
  {label:'Acara',type:'event',target:'Events',symbol:'calendar'},
  {label:'Peringatan',type:'reminder',target:'Reminders',symbol:'bell'}
 ];
 const tabs='<div class="segments" aria-label="Tempoh ringkasan">'+Object.entries(periods).map(([id,label])=>'<button data-period="'+id+'" class="'+(period===id?'active':'')+'" aria-pressed="'+(period===id)+'">'+label+'</button>').join('')+'</div>';
 const metrics=groups.map(({label,type,target,symbol})=>'<button class="metric" data-page="'+target+'"><div class="metric-top">'+label+icon(symbol)+'</div><strong>'+items.filter(item=>item.type===type).length+'</strong></button>').join('');
 const lists=groups.map(({label,type})=>{
  const entries=items.filter(item=>item.type===type);
  return section(label,type==='event'?scheduleRows(entries,'Tiada acara dalam tempoh ini.'):taskRows(entries,type==='task'?'Tiada tugasan dalam tempoh ini.':'Tiada peringatan dalam tempoh ini.'));
 }).join('');
 const deadlines=upcomingDeadlines(records,today,add(today,7));
 const upcoming='<div class="deadline-preview">'+section('Tarikh terdekat · 7 hari',deadlineRows(deadlines),'')+'</div>';
 return upcoming+'<div class="period-bar">'+tabs+'<span class="small muted">'+rangeLabel(start,end)+'</span></div><div class="metrics">'+metrics+'</div><div class="overview-lists">'+lists+'</div>';
}
function groupPage() {
 const items=visible(records);
 const tasksList=sorted(items.filter(item=>item.type==='task'&&!item.done),'Group');
 const remindersList=sorted(items.filter(item=>item.type==='reminder'&&!item.done),'Group');
 const eventsList=sorted(itemsInRange(today,add(today,30),['event']),'Group');
 const groupNotes=sorted(visible(notes).filter(item=>!selectedSubfolder||item.subfolder===selectedSubfolder),'Group',true);
 const counts=[['Tugasan',tasksList.length,'Tasks'],['Acara · 30 hari',eventsList.length,'Events'],['Peringatan',remindersList.length,'Reminders']].map(([label,count,target])=>'<button class="metric" data-page="'+target+'"><span class="metric-top">'+label+'</span><strong>'+count+'</strong></button>').join('');
 const rows=groupNotes.map(item=>'<div class="row"><div class="row-main"><button class="row-title" data-note="'+notes.indexOf(item)+'">'+html(item.title)+'</button><p class="small muted">'+html((item.kind==='Idea rambang'?'Khawatir':item.kind)+(item.subfolder?' · '+item.subfolder:''))+'</p>'+tagBadges(item)+'</div></div>').join('');
 return '<div class="board-toolbar">'+sortControl('Group')+'</div><div class="metrics">'+counts+'</div><div class="overview-lists">'+section('Tugasan',taskRows(tasksList),button('Tambah','data-new="task"','plus'))+section('Acara · 30 hari',scheduleRows(eventsList),button('Tambah','data-new="event"','plus'))+section('Peringatan',taskRows(remindersList,'Tiada peringatan.'),button('Tambah','data-new="reminder"','plus'))+'</div><div class="group-notes">'+subfolderToolbar()+section('Nota dan rujukan',rows?'<div class="rows">'+rows+'</div>':blank('Tiada nota dalam kumpulan ini.'),button('Tambah nota','data-add-note="Notes"','plus'))+'</div>';
}
function selectDomain(current, emptyLabel) {
 return '<option value="">'+emptyLabel+'</option>'+domains.map(name=>'<option value="'+html(name)+'" '+(name===current?'selected':'')+'>'+html(name)+'</option>').join('');
}
function planner() {
 const holidayCalendars=new Map();
 const holidayOn=day=>{const year=Number(day.slice(0,4));if(!holidayCalendars.has(year))holidayCalendars.set(year,publicHolidays(year,holidayRegion));return holidayCalendars.get(year).get(day)||'';};
 const first=monthStart(focus);
 const start=view==='Month'?weekStart(first):weekStart(focus);
 const lastMonthDay=monthEnd(focus);
 const count=view==='Month'?Math.ceil(((dateOf(lastMonthDay)-dateOf(start))/86400000+1)/7)*7:7;
 const heading=view==='Month'?dateLabel(focus,{month:'long',year:'numeric'}):view==='Week'?rangeLabel(start,add(start,6)):fullDate(focus);
 const switches='<div class="segments" aria-label="Paparan kalendar">'+Object.entries(views).map(([name,label])=>'<button data-view="'+name+'" aria-pressed="'+(name===view)+'" class="'+(name===view?'active':'')+'">'+label+'</button>').join('')+'</div>';
 const nav='<div class="toolbar"><div class="inline">'+button('','data-step="-1" aria-label="Sebelumnya: '+views[view]+'"','prev','icon')+button('','data-step="1" aria-label="Seterusnya: '+views[view]+'"','next','icon')+button('Hari ini','data-today')+'<h2>'+heading+'</h2></div><div class="inline">'+switches+'</div></div>';
 const [agendaStart,agendaEnd]=view==='Month'?[first,lastMonthDay]:view==='Week'?[start,add(start,6)]:[focus,focus];
 const items=itemsInRange(agendaStart,agendaEnd,['task','event','reminder']);
 const agenda='<div class="agenda-heading"><h2>Agenda perancang</h2><span class="small muted">'+rangeLabel(agendaStart,agendaEnd)+'</span></div><div class="planner-lists">'+section('Tugasan',taskRows(items.filter(item=>item.type==='task')),button('Tambah tugasan','data-new="task"'))+section('Acara',scheduleRows(items.filter(item=>item.type==='event')),button('Tambah acara','data-new="event"'))+section('Peringatan',taskRows(items.filter(item=>item.type==='reminder'),'Tiada tarikh akhir penting dalam tempoh ini.'),button('Tambah peringatan','data-new="reminder"'))+'</div>';
 const legend='<div class="calendar-legend"><span class="calendar-key" aria-hidden="true"></span><span>Jumaat / cuti umum · '+html(holidayRegions[holidayRegion])+'</span>'+(!holidayYears.includes(Number(focus.slice(0,4)))?'<span>Cuti umum tahun ini belum tersedia.</span>':'')+'</div>';
 if(view==='Day') return '<section class="panel'+(dateOf(focus).getUTCDay()===5||holidayOn(focus)?' calendar-rest':'')+'">'+nav+(holidayOn(focus)?'<p class="day-holiday">'+html(holidayOn(focus))+'</p>':'')+'</section>'+legend+agenda;
 const cells=Array.from({length:count},(_,i)=>{
  const day=add(start,i);
  const holiday=holidayOn(day),rest=dateOf(day).getUTCDay()===5||Boolean(holiday);
  const items=scheduledOn(day,['task','event','reminder']);
  const limit=view==='Month'?2:7;
  return '<div data-create-day="'+day+'" tabindex="0" role="group" aria-label="'+html(fullDate(day)+(holiday?' · '+holiday:''))+'" class="cell'+(rest?' calendar-rest':'')+(holiday?' public-holiday':'')+(day.slice(0,7)!==focus.slice(0,7)?' outside':'')+'"><button class="day-num'+(day===today?' today':'')+'" data-day="'+day+'" aria-label="Buka '+fullDate(day)+'">'+Number(day.slice(8))+'</button>'+(holiday?'<span class="holiday-name" title="'+html(holiday)+'">'+html(holiday)+'</span>':'')+items.slice(0,limit).map(item=>'<button class="event'+(item.type==='reminder'?' deadline':'')+'" data-edit="'+item.id+'" title="'+html(types[item.type]+' · '+item.title+' · '+domainName(item.domain)+(item.type==='task'?' · '+priorities[taskPriority(item)]:''))+'">'+priorityMarker(item,true)+html((item.time?item.time+' ':'')+item.title)+(item.repeat?' <span class="recurrence" aria-label="Berulang setiap minggu">↻</span>':'')+'</button>').join('')+(items.length>limit?'<button class="event more" data-day="'+day+'">+'+(items.length-limit)+' lagi</button>':'')+'</div>';
 }).join('');
 return '<section class="panel">'+nav+'<div class="calendar-scroll" tabindex="0" aria-label="Jadual kalendar"><div class="calendar '+view.toLowerCase()+'">'+['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'].map((day,index)=>'<div class="weekday'+(index===5?' calendar-rest':'')+'">'+day+'</div>').join('')+cells+'</div></div></section>'+legend+agenda;
}
function tasks() {
  const list=visible(records).filter(x=>x.type==='task'&&(taskFilter==='All'||Boolean(x.done)===(taskFilter==='Completed'))&&(taskDates!=='undated'||!x.date));
  const filters='<div class="list-controls"><div class="segments" aria-label="Status tugasan">'+Object.entries(statuses).map(([name,label])=>'<button data-task-filter="'+name+'" class="'+(taskFilter===name?'active':'')+'" aria-pressed="'+(taskFilter===name)+'">'+label+'</button>').join('')+'</div><select class="filter" id="task-date-filter" aria-label="Tarikh tugasan"><option value="all">Semua tarikh</option><option value="undated"'+(taskDates==='undated'?' selected':'')+'>Tanpa tarikh</option></select>'+sortControl('Tasks')+'</div>';
  return section('Tugasan',taskRows(sorted(list,'Tasks')),filters);
}

function reminders() {
  return section('Peringatan',taskRows(sorted(visible(records).filter(item=>item.type==='reminder'),'Reminders'),'Tiada peringatan.'),sortControl('Reminders'));
}

function knowledge() {
  const items=sorted(visible(notes).filter(item=>['Rujukan','Penyelidikan'].includes(item.kind)&&tagged(item,'Knowledge')),'Knowledge',true);
  return tagNav('Knowledge')+section('Bacaan & Kajian',noteCards(items),sortControl('Knowledge',true));
}

function tagBadges(item) {
 return item.tags?.length?'<div class="tag-badges">'+item.tags.map(badge).join('')+'</div>':'';
}
function tagNav(scope) {
  const names=['',...([...tags[scope]].sort((a,b)=>a.localeCompare(b,'ms')))];
  return '<nav class="tag-nav" aria-label="Tapis mengikut tag">'+names.map(name=>button(html(name||'Semua'),'data-tag-scope="'+scope+'" data-tag-index="'+(name?tags[scope].indexOf(name)+1:0)+'" aria-pressed="'+(tagSelection[scope]===name)+'"','',tagSelection[scope]===name?'active':'')).join('')+button('Urus tag','data-manage-tags="'+scope+'"','','ghost')+'</nav>';
}

function tagOptions(scope,selected=[],hidden=false) {
  return '<fieldset class="tag-options" data-inline-tags="'+scope+'" id="'+(scope==='Events'?'event-tags':scope==='Notes'?'note-tags':scope==='Works'?'work-tags':scope==='Ideas'?'idea-tags':scope==='Copywriting'?'copywriting-tags':'knowledge-tags')+'" '+(hidden?'hidden':'')+'><legend>Tag</legend>'+tags[scope].map(name=>'<label><input type="checkbox" name="tags" value="'+html(name)+'"'+(selected.includes(name)?' checked':'')+'>'+html(name)+'</label>').join('')+'<div class="inline tag-create"><input data-tag-input name="newTag" aria-label="Tag baharu" placeholder="Tag baharu" maxlength="48" autocomplete="off"><button type="button" class="btn" data-inline-tag="'+scope+'">Tambah</button></div></fieldset>';
}

function tagForm(scope,index) {
  const previous=Number.isInteger(index)?tags[scope][index]:null;
  openDialog(previous?'Sunting tag':'Tambah tag','<form class="dialog-body" id="tag-form"><label>Nama tag<input name="tag" value="'+html(previous||'')+'" maxlength="48" required autofocus></label><div class="dialog-actions">'+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan</button></div></form>');
  const form=$('tag-form'),field=form.elements.tag;
  field.focus();
  field.addEventListener('input',()=>field.setCustomValidity(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const name=field.value.trim();
    try {
      if(previous!==null) { changeTag(currentState(),scope,previous,name); drafts.changeTag(scope,previous,name); if(tagSelection[scope]===previous)tagSelection[scope]=name; }
      else {
        if(!name||tags[scope].some(tag=>tag.toLowerCase()===name.toLowerCase()))throw new Error('Nama tag kosong atau sudah digunakan.');
        tags[scope].push(name); tagSelection[scope]=name;
      }
    } catch(error) { field.setCustomValidity(error.message);field.reportValidity();return; }
    $('modal').close();save('Tag disimpan');
  });
}

function tagged(item,scope) {
 return !tagSelection[scope]||item.tags?.includes(tagSelection[scope]);
}
function eventsPage() {
  const items=sorted(visible(records).filter(item=>item.type==='event'&&tagged(item,'Events')),'Events');
  return tagNav('Events')+section('Acara',scheduleRows(items,'Tiada acara.'),sortControl('Events'));
}

function subfolderOptions(folder,current,emptyLabel) {
 return '<option value="">'+emptyLabel+'</option>'+subfolders.filter(item=>item.folder===folder).map(({name})=>'<option value="'+html(name)+'"'+(name===current?' selected':'')+'>'+html(name)+'</option>').join('');
}
function subfolderForm(previous='') {
 const folder=domain;
 if(!folder)return;
 openDialog(previous?'Sunting subfolder':'Tambah subfolder','<form id="subfolder-form" class="dialog-body"><p class="small muted">'+html(folder)+'</p><label>Nama subfolder<input name="name" maxlength="48" required autofocus value="'+html(previous)+'"></label><div class="dialog-actions">'+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan subfolder</button></div></form>');
 const form=$('subfolder-form'),field=form.elements.name;
 field.focus();
 field.addEventListener('input',()=>field.setCustomValidity(''));
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=field.value.trim();
  if(!name||subfolders.some(item=>item.folder===folder&&item.name!==previous&&item.name.toLowerCase()===name.toLowerCase())){
   field.setCustomValidity(name?'Nama subfolder sudah digunakan.':'Masukkan nama subfolder.');field.reportValidity();return;
  }
  if(previous){
   const entry=subfolders.find(item=>item.folder===folder&&item.name===previous);
   if(!entry)return;
   entry.name=name;
   for(const note of notes)if(note.domain===folder&&note.subfolder===previous)note.subfolder=name;
   drafts.changeSubfolder(folder,previous,name);
  }else subfolders.push({folder,name});
  selectedSubfolder=name;$('modal').close();save(previous?'Subfolder dikemas kini':'Subfolder ditambah');
 });
}
function subfolderToolbar(){
 if(!domain)return '<p class="small muted subfolder-hint">Pilih kumpulan untuk mengurus subfolder.</p>';
 return '<div class="subfolder-nav"><select class="filter" id="subfolder-select" aria-label="Tapis mengikut subfolder">'+subfolderOptions(domain,selectedSubfolder,'Semua subfolder')+'</select>'+button('Tambah subfolder','data-add-subfolder','plus')+(selectedSubfolder?button('Sunting','data-edit-subfolder aria-label="Sunting subfolder"')+button('Padam','data-delete-subfolder aria-label="Padam subfolder"'):'')+'</div>';
}
function deleteSubfolder(){
 const folder=domain,name=selectedSubfolder;
 const index=subfolders.findIndex(item=>item.folder===folder&&item.name===name);
 if(index<0)return;
 const [removed]=subfolders.splice(index,1),affected=notes.filter(item=>item.domain===folder&&item.subfolder===name).map(item=>item.id);
 for(const note of notes)if(affected.includes(note.id))note.subfolder='';
 const restoreDrafts=drafts.changeSubfolder(folder,name,'');
 selectedSubfolder='';$('modal').close();
 save('Subfolder dipadam; nota dikekalkan',()=>{
  if(!subfolders.some(item=>item.folder===folder&&item.name===name))subfolders.splice(Math.min(index,subfolders.length),0,removed);
  for(const note of notes)if(affected.includes(note.id)&&note.domain===folder&&!note.subfolder)note.subfolder=name;
  restoreDrafts();
 });
}

function personalNotes() {
  const folders=subfolderToolbar();
  const items=sorted(visible(notes).filter(item=>item.kind==='Nota peribadi'&&(!selectedSubfolder||item.subfolder===selectedSubfolder)&&tagged(item,'Notes')),'Notes',true);
  return folders+tagNav('Notes')+section('Nota',noteCards(items),sortControl('Notes',true));
}

function chapterOptions(current) {
 return '<option value="0"'+(current===0?' selected':'')+'>Catatan Awal</option>'+chapterNames.map((name,i)=>'<option value="'+(i+1)+'"'+(current===i+1?' selected':'')+'>Bab '+(i+1)+' · '+name+'</option>').join('');
}
function thesisRows(items) {
 return items.length?'<div class="rows">'+items.map(item=>{
  const index=notes.indexOf(item);
  return '<div class="row thesis-row" draggable="true" data-drag-note="'+index+'"><div class="row-main"><button class="row-title" data-note="'+index+'">'+html(item.title)+'</button></div><select class="filter" data-move-note="'+index+'" aria-label="Pindahkan '+html(item.title)+'">'+chapterOptions(item.chapter)+'</select></div>';
 }).join('')+'</div>':blank('Tiada nota di sini.');
}
function thesisPage() {
 const items=sorted(notes.filter(item=>item.thesis===page&&tagged(item,'Notes')),page,true);
 const active=selectedChapter[page];
 const folders=chapterNames.map((name,i)=>{
  const chapter=i+1;
  return button('<span class="inline">'+icon('project')+' Bab '+chapter+'</span><span>'+name+'</span><span class="small muted">'+items.filter(item=>item.chapter===chapter).length+' nota</span>','data-chapter="'+chapter+'" data-drop-chapter="'+chapter+'" aria-pressed="'+(active===chapter)+'"','',active===chapter?'chapter-card active':'chapter-card');
 }).join('');
 return tagNav('Notes')+sortControl(page,true)+'<div class="thesis-folders" role="group" aria-label="Folder bab">'+folders+'</div>'+section('Bab '+active+' · '+chapterNames[active-1],thesisRows(items.filter(item=>item.chapter===active)),button('Tambah nota bab','data-add-note="'+page+'" data-in-chapter="'+active+'"','plus'))+'<div class="thesis-tray" data-drop-chapter="0">'+section('Catatan Awal','<p class="detail small muted">Simpan idea di sini. Seret nota ke folder bab atau gunakan pilihan pindah pada nota.</p>'+thesisRows(items.filter(item=>item.chapter===0)),button('Tambah catatan awal','data-add-note="'+page+'"','plus'))+'</div>';
}
function moveThesisNote(index,chapter) {
 const item=notes[index];
 if (!isThesis(page)||item?.thesis!==page||!Number.isInteger(chapter)||chapter<0||chapter>chapterNames.length||item.chapter===chapter) return;
 item.chapter=chapter; item.updatedAt=new Date().toISOString();
 if (chapter) selectedChapter[page]=chapter;
 save(chapter?'Nota dipindahkan ke Bab '+chapter:'Nota dipindahkan ke Catatan Awal');
}
function noteForm(scope,index,chapter=0){
  const item=notes[index];
  const initial=item||{title:'',note:'',noteHtml:'',domain,kind:'Rujukan'};
  const personal=scope==='Notes',thesis=isThesis(scope),work=scope==='Works',idea=scope==='Ideas',copywriting=scope==='Copywriting',sticky=work||idea||copywriting,tagScope=thesis?'Notes':scope;
  const initialBook=item?item.bookId||'':selectedWorkBook;
  const book=library.books.find(value=>value.id===initialBook);
  const kindField=personal||thesis||sticky?'':'<label>Jenis<select name="kind">'+['Rujukan','Penyelidikan'].map(kind=>'<option'+(kind===initial.kind?' selected':'')+'>'+kind+'</option>').join('')+'</select></label>';
  const locationField=work?'<input name="domain" type="hidden" value="'+html(initial.domain||'')+'"><label>Buku<select name="bookId">'+bookOptions(initialBook)+'</select></label>':copywriting?'<input name="domain" type="hidden" value="'+html(initial.domain||'')+'">':thesis?'<label>Bab<select name="chapter">'+chapterOptions(item?.chapter??chapter)+'</select></label>':'<label>Kumpulan<select name="domain">'+selectDomain(initial.domain,'Tanpa kumpulan')+'</select></label>';
  const subfolderField=personal?'<label id="note-subfolder-field" '+(initial.domain?'':'hidden')+'>Subfolder<select name="subfolder">'+subfolderOptions(initial.domain,item?.subfolder??selectedSubfolder,'Tanpa subfolder')+'</select></label>':'';
  const purpose=item?.purpose||(book?.status==='published'?'Pembetulan':book?'Idea buku':'Catatan');
  const workFields=(work?'<label>Jenis catatan<select name="purpose">'+workCategories.map(name=>'<option'+(name===purpose?' selected':'')+'>'+name+'</option>').join('')+'</select></label>':'')+((work||idea)?'<label>Warna<select name="color">'+Object.entries(workColors).map(([value,name])=>'<option value="'+value+'"'+(value===(item?.color||'white')?' selected':'')+'>'+name+'</option>').join('')+'</select></label>':'')+(sticky?'<label class="check-label"><input type="checkbox" name="pinned"'+(item?.pinned?' checked':'')+'> Pin nota</label>':'');
  openDialog(work?'Nota karya':idea?'Khawatir':copywriting?'Copywriting':item?'Sunting nota':'Nota baharu','<form class="dialog-body note-form" id="personal-note-form"><label class="note-title-label"><span class="sr-only">Tajuk</span><input class="note-title-input" name="title" placeholder="'+(sticky?'Tajuk (pilihan)':'Tajuk')+'" '+(sticky?'':'required ')+'maxlength="120" value="'+html(initial.title)+'" autofocus></label><details class="note-details"'+(sticky?' open':'')+'><summary>'+(work?'Buku dan jenis catatan':copywriting?'Tag dan pin':'Kumpulan dan tag')+'</summary><div class="form-grid">'+kindField+locationField+subfolderField+workFields+'</div>'+tagOptions(tagScope,item?.tags||(tagSelection[tagScope]?[tagSelection[tagScope]]:[]))+'</details><div class="editor-toolbar" data-editor-toolbar role="toolbar" aria-label="Format nota"></div><div class="note-paper"><div data-note-editor></div></div><textarea name="note" hidden>'+html(initial.note)+'</textarea><textarea name="noteHtml" hidden>'+html(initial.noteHtml||'')+'</textarea><p id="note-error" class="form-error" role="alert"></p><div class="dialog-actions note-footer">'+(item?button('Padam','data-delete-note="'+index+'"','','left'):'')+button('Besarkan','data-expand-note')+button('Tutup','data-close')+'<button class="btn primary" type="submit">Simpan nota</button></div></form>');
  const form=$('personal-note-form');
  if(personal)form.elements.domain.addEventListener('change',()=>{const folder=form.elements.domain.value;$('note-subfolder-field').hidden=!folder;form.elements.subfolder.innerHTML=subfolderOptions(folder,'','Tanpa subfolder');});
  form.addEventListener('input',event=>{event.target.setCustomValidity?.('');$('note-error').textContent='';});
  drafts.attach(form,'note:'+scope+':'+(item?.id||'new'));
  noteEditor=createNoteEditor(form);form.elements.title.focus();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(form.elements.newTag?.value.trim()&&!addInlineTag(form.querySelector('[data-inline-tag]')))return;
    noteEditor.sync();
    const note=form.elements.note.value.trim(),title=form.elements.title.value.trim()||(sticky?note.split('\n')[0].slice(0,120):'');
    if(!title||!note){$('note-error').textContent=!title?'Masukkan tajuk.':'Masukkan catatan.';if(!title)form.elements.title.focus();else noteEditor.focus();return;}
    const now=new Date().toISOString();
    const values={...item,id:item?.id||'n-'+crypto.randomUUID(),title,note,noteHtml:form.elements.noteHtml.value,domain:thesis?'':form.elements.domain.value,kind:thesis?'Nota tesis':work?'Karya':idea?'Idea rambang':copywriting?'Copywriting':personal?'Nota peribadi':form.elements.kind.value,tags:cleanTagNames(new FormData(form).getAll('tags')),createdAt:item?item.createdAt||'':now,updatedAt:now};
    if(personal)values.subfolder=form.elements.subfolder.value;
    if(sticky)Object.assign(values,{color:copywriting?'white':form.elements.color.value,pinned:form.elements.pinned.checked,archived:Boolean(item?.archived)});
    if(work)Object.assign(values,{bookId:form.elements.bookId.value,purpose:form.elements.purpose.value});
    if(thesis){values.thesis=scope;values.chapter=Number(form.elements.chapter.value);if(page===scope&&values.chapter)selectedChapter[scope]=values.chapter;}
    if(item)notes[index]=values;else notes.push(values);
    drafts.clear();$('modal').close();save('Nota disimpan');
  });
}

function settings() {
 const tabs={Domains:'Kumpulan',Completed:'Selesai',General:'Umum'};
 const switches='<div class="segments settings-tabs" aria-label="Bahagian tetapan">'+Object.entries(tabs).map(([id,label])=>'<button data-settings="'+id+'" class="'+(settingsTab===id?'active':'')+'" aria-pressed="'+(settingsTab===id)+'">'+label+'</button>').join('')+'</div>';
 if(settingsTab==='Completed'){
  const completed=sortItems(records.filter(item=>item.done),'date-desc',true);
  return switches+'<div class="overview-lists completed-records">'+Object.entries(types).map(([type,label])=>section(label,taskRows(completed.filter(item=>item.type===type),'Tiada rekod selesai.'))).join('')+'</div>';
 }
 if (settingsTab==='General') {
  const email=cloud.getSession()?.user?.email||'';
  const installBtn=isStandaloneApp()?'':button('Pasang aplikasi','data-install-app');
  const calendarPanel=section('Cuti umum','<div class="detail"><label class="holiday-setting">Kalendar cuti<select class="filter" id="holiday-region">'+Object.entries(holidayRegions).map(([id,label])=>'<option value="'+id+'"'+(id===holidayRegion?' selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="small muted">Takwim 2026–2027 · <a href="https://www.kabinet.gov.my/hari-kelepasan-am/" target="_blank" rel="noopener">Sumber rasmi BKPP JPM</a>. Tarikh perayaan tertakluk kepada pengumuman rasmi.</p></div>');
  const cloudPanel=section('Penyelarasan awan & akaun','<div class="detail"><p><strong>'+html(email)+'</strong></p><p class="small muted">'+html(syncStatus)+'</p>'+(syncError?'<p class="small sync-error" role="alert">'+html(syncError)+'</p>':'')+'<div class="backup-actions">'+button(syncBusy?'Menyelaraskan…':'Selaraskan sekarang','data-sync-now'+(syncBusy?' disabled':''))+installBtn+button('Log keluar','data-sign-out')+'</div></div>');
  const themePanel=section('Paparan','<div class="detail"><label class="holiday-setting">Tema aplikasi<select class="filter" id="theme-select">'+Object.entries(themeOptions).map(([value,label])=>'<option value="'+value+'"'+(getTheme()===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="small muted">Pilihan tema disimpan pada peranti ini.</p></div>');
  return switches+themePanel+'<div class="settings-gap"></div>'+cloudPanel+'<div class="settings-gap"></div>'+calendarPanel+'<div class="settings-gap"></div>'+section('Sandaran data','<div class="detail"><p class="muted">Data disimpan dalam awan dan pelayar ini. Eksport sandaran JSON untuk membuat salinan tambahan.</p><div class="backup-actions">'+button('Eksport sandaran','data-export')+button('Import sandaran','data-import')+'</div><p class="small muted">Sandaran merangkumi rekod dan nota yang telah disimpan. Draf kekal dalam pelayar ini.</p></div>');
 }
 const rows=domains.map((name,index)=>'<div class="row"><div class="row-main"><strong>'+html(name)+'</strong></div><div class="inline settings-row-actions">'+button('Sunting','data-rename-domain="'+index+'" aria-label="Sunting kumpulan '+html(name)+'"')+button('Buang','data-remove-domain="'+index+'" aria-label="Buang kumpulan '+html(name)+'"')+'</div></div>').join('');
 return switches+section('Urus kumpulan',rows?'<div class="rows">'+rows+'</div>':blank('Tiada kumpulan ditetapkan.'),button('Tambah kumpulan','data-add-domain','plus','primary'));
}
function downloadText(filename,source) {
 const url=URL.createObjectURL(new Blob([source],{type:'application/json'}));
 const link=document.createElement('a');
 link.href=url;
 link.download=filename;
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup() {
 try {
  downloadText('khuttah-backup-'+today+'.json',JSON.stringify(createBackup(currentState()),null,2));
  notify('Sandaran dimuat turun');
 } catch (error) { notify('Sandaran tidak dapat disediakan: '+error.message); }
}
function importDialog() {
 openDialog('Import sandaran','<form class="dialog-body" id="import-form"><p class="small muted">Pilih fail sandaran KHUTTAH. Eksport data semasa dahulu jika anda mahu menyimpannya.</p><label>Fail sandaran<input type="file" name="file" accept=".json,application/json" required></label><p id="import-preview" class="small" role="status">Belum ada fail dipilih.</p><p id="import-error" class="small" role="alert"></p><label class="import-confirm"><input type="checkbox" name="confirm" required> Saya faham data semasa dan draf akan digantikan.</label><div class="dialog-actions">'+button('Batal','data-close')+'<button class="btn primary" id="import-submit" type="submit" disabled>Ganti dengan sandaran</button></div></form>');
 const form=$('import-form');
 let incoming=null;
 form.elements.file.addEventListener('change',async()=>{
  incoming=null;
  $('import-submit').disabled=true;
  $('import-error').textContent='';
  const file=form.elements.file.files[0];
  if (!file) { $('import-preview').textContent='Belum ada fail dipilih.'; return; }
  $('import-preview').textContent='Menyemak fail…';
  try {
   if (file.size>MAX_BACKUP_BYTES) throw new Error('Saiz maksimum sandaran ialah 10 MB.');
   const candidate=clearLegacyDemoData(migrateGroupNames(parseBackup(await file.text())));
   if (form.elements.file.files[0]!==file||!form.isConnected) return;
   incoming=candidate;
   $('import-preview').textContent=candidate.records.length+' rekod · '+candidate.notes.length+' nota · '+candidate.domains.length+' kumpulan';
   $('import-submit').disabled=false;
  } catch (error) {
   if (!form.isConnected||form.elements.file.files[0]!==file) return;
   $('import-preview').textContent='Fail tidak boleh diimport.';
   $('import-error').textContent=error.message;
  }
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if (!incoming) return;
  try { localStorage.setItem(key,JSON.stringify(incoming)); }
  catch { $('import-error').textContent='Storan pelayar tidak dapat ditulis. Data semasa belum diganti.'; return; }
  ({records,domains,projects,notes,tags,subfolders,library,quranStudents,demoCleanupVersion,quranSeedVersion}=incoming);
  recoverySource=null;
  drafts.clearAll();quickWorkDrafts={};persistQuickWorkDraft();selectedWorkBook='';bookSubjectFilter='';workPurpose='';
  selectedSubfolder='';
  selectedChapter.Master=1;
  selectedChapter.PhD=1;
  for (const scope of Object.keys(tagSelection)) tagSelection[scope]='';
  domain='';
  page='Overview';
  $('modal').close();
  save('Sandaran berjaya dipulihkan');
 });
}
function moveDomain(previous,next) {
 if (next) {
  for (const item of subfolders) if (item.folder===previous) item.folder=next;
 } else {
  subfolders=subfolders.filter(item=>item.folder!==previous);
  for (const item of notes) if (item.domain===previous) item.subfolder='';
  if (domain===previous) selectedSubfolder='';
 }
 for (const item of [...records,...projects,...notes]) {
  if (item.domain===previous) item.domain=next;
 }
 if (domain===previous) domain=next;
 for (const scope of Object.keys(pageDomains)) if(pageDomains[scope]===previous)pageDomains[scope]=next;
}
function domainForm(index) {
 const previous=domains[index];
 const editing=previous!==undefined;
 openDialog(editing?'Sunting kumpulan':'Tambah kumpulan','<form class="dialog-body" id="domain-form"><label>Nama kumpulan<input name="name" required maxlength="45" value="'+html(previous)+'" autofocus></label><div class="dialog-actions">'+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan</button></div></form>');
 const form=$('domain-form');
 const input=form.elements.name;
 input.focus();
 input.addEventListener('input',()=>input.setCustomValidity(''));
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=input.value.trim();
  if (!name || domains.some((entry,i)=>i!==index && entry.toLowerCase()===name.toLowerCase())) {
   input.setCustomValidity(name?'Nama kumpulan ini sudah digunakan.':'Masukkan nama kumpulan.');
   input.reportValidity();
   return;
  }
  if (editing) {
   domains[index]=name;
   moveDomain(previous,name);
  } else domains.push(name);
  $('modal').close();
  save(editing?'Kumpulan dikemas kini':'Kumpulan ditambah');
 });
}
function openDialog(title, body) {
 drafts.detach();
 noteEditor?.destroy(); noteEditor=null; $('modal').classList.remove('note-expanded');
 $('modal').setAttribute('autocapitalize','off');
 $('modal').innerHTML='<div class="section-head"><h2 id="modal-title">'+html(title)+'</h2>'+button('','data-close aria-label="Tutup dialog"','close','icon ghost')+'</div>'+body;
 if (!$('modal').open) $('modal').showModal();
}
function itemForm(type,item,chosenDate) {
  const initial=item||{type,title:'',domain:domain||(domains.includes('Peribadi')?'Peribadi':''),date:chosenDate||(page==='Planner'?focus:today),time:'',repeat:'',detail:''};
  const priorityField='<label id="task-priority" '+(initial.type==='task'?'':'hidden')+'>Kepentingan<select name="priority">'+Object.entries(priorities).map(([level,label])=>'<option value="'+level+'"'+(taskPriority(initial)===level?' selected':'')+'>'+label+'</option>').join('')+'</select></label>';
  openDialog((item?'Sunting ':'Tambah ')+types[initial.type].toLowerCase(),'<form class="dialog-body" id="item-form"><label>Tajuk<input name="title" required maxlength="120" value="'+html(initial.title)+'" autofocus></label><div class="form-grid"><label>Jenis<select name="type">'+Object.entries(types).map(([name,label])=>'<option value="'+name+'" '+(initial.type===name?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+priorityField+'<label>Kumpulan<select name="domain">'+selectDomain(initial.domain,'Tanpa kumpulan')+'</select></label><label><span id="record-date-label">'+recordDateLabels[initial.type]+'</span><input type="date" name="date" min="1900-01-01" max="9999-12-31" value="'+(initial.date||'')+'"></label><label id="event-time" '+(initial.type==='event'?'':'hidden')+'>Masa<input type="time" name="time" value="'+html(initial.time)+'"></label></div><label id="task-undated" class="check-label" '+(initial.type==='task'?'':'hidden')+'><input type="checkbox" name="undated"'+(!initial.date?' checked':'')+'> Tanpa tarikh</label><label id="event-repeat" '+(initial.type==='event'?'':'hidden')+'>Ulangan<select name="repeat"><option value="">Tiada ulangan</option><option value="weekly" '+(initial.repeat?'selected':'')+'>Setiap minggu</option></select></label><label>Catatan<input name="detail" value="'+html(initial.detail)+'" maxlength="240" placeholder="Pilihan"></label>'+tagOptions('Events',item?.tags||[],initial.type!=='event')+'<div class="dialog-actions">'+(item?button('Padam','data-delete="'+item.id+'"','','left'):'')+button('Batal','data-close')+'<button class="btn primary" type="submit">Simpan</button></div></form>');
  const form=$('item-form');
  const updateDate=()=>{
    const task=form.elements.type.value==='task';
    $('task-undated').hidden=!task;
    if(!task)form.elements.undated.checked=false;
    form.elements.date.disabled=task&&form.elements.undated.checked;
    form.elements.date.required=!form.elements.date.disabled;
    if(!form.elements.date.disabled&&!form.elements.date.value)form.elements.date.value=chosenDate||today;
  };
  form.elements.undated.addEventListener('change',updateDate);
  form.elements.type.addEventListener('change',()=>{
    const event=form.elements.type.value==='event';
    $('record-date-label').textContent=recordDateLabels[form.elements.type.value];
    $('event-time').hidden=!event;$('event-repeat').hidden=!event;$('event-tags').hidden=!event;
    $('task-priority').hidden=form.elements.type.value!=='task';updateDate();
  });
  updateDate();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(form.elements.type.value==='event'&&form.elements.newTag.value.trim()&&!addInlineTag(form.querySelector('[data-inline-tag]')))return;
    const fields=new FormData(form),values=Object.fromEntries(fields);
    values.date=values.type==='task'&&form.elements.undated.checked?'':form.elements.date.value;
    values.tags=values.type==='event'?cleanTagNames(fields.getAll('tags')):[];
    values.title=values.title.trim();delete values.newTag;delete values.undated;
    if(!values.title){form.elements.title.setCustomValidity('Masukkan tajuk.');form.elements.title.reportValidity();return;}
    if(values.type!=='event'){values.time='';values.repeat='';}
    if(values.type!=='task')delete values.priority;
    const now=new Date().toISOString();values.updatedAt=now;
    if(item){if(values.type!=='task')delete item.priority;const done=item.type===values.type&&Boolean(item.done);Object.assign(item,values,{done});}
    else records.push({id:'i'+crypto.randomUUID(),...values,createdAt:now,done:false});
    drafts.clear();$('modal').close();save('Rekod disimpan');
  });
  form.elements.title.addEventListener('input',()=>form.elements.title.setCustomValidity(''));
  drafts.attach(form,'record:'+(item?.id||'new-'+type));
  updateDate();form.elements.title.focus();
}

function searchDialog() {
 openDialog('Carian ruang kerja','<div class="dialog-body"><label>Cari tajuk, kumpulan dan catatan<input id="query" type="search" placeholder="Contoh: Uthmani atau sirah" autocomplete="off" autofocus></label><div id="search-results" aria-live="polite"></div></div>');
 const entries=[
  ...visible(records).map(item=>({...item,attrs:'data-edit="'+item.id+'"',kind:types[item.type]})),
  ...visible(projects).map(item=>({...item,attrs:'data-project="'+projects.indexOf(item)+'"',kind:'Projek'})),
  ...visible(notes).map(item=>({...item,kind:item.kind==='Idea rambang'?'Khawatir':item.kind,attrs:'data-note="'+notes.indexOf(item)+'"'})),
  ...quranStudents.map(student=>({title:student.name,domain:'Uthmani',note:student.note,detail:'',kind:'Kelas Al-Quran',tags:[],attrs:'data-open-student="'+student.id+'"'}))
 ];
 const query=$('query');
 const update=()=>{
  const phrase=query.value.trim().toLowerCase();
  if (!phrase){ $('search-results').innerHTML=blank(domain?'Cari dalam '+html(domain)+'.':'Cari dalam semua kumpulan.'); return; }
  const hits=entries.filter(item=>[item.title,item.domain,item.note,item.detail,item.kind,...(item.tags||[])].join(' ').toLowerCase().includes(phrase)).slice(0,10);
  $('search-results').innerHTML=hits.length?hits.map(item=>'<div class="row"><div class="row-main"><button class="row-title" '+item.attrs+'>'+html(item.title)+'</button><p class="small muted">'+html(domainName(item.domain)+' · '+item.kind)+'</p></div></div>').join(''):blank('Tiada padanan.');
 };
 query.addEventListener('input',update);
 query.focus();
 update();
}
function adjustDate(step) {
 if(view==='Month'){
  const date=dateOf(focus.slice(0,7)+'-01');
  date.setUTCMonth(date.getUTCMonth()+step);
  focus=isoOf(date);
 } else focus=add(focus,step*(view==='Week'?7:1));
}
document.addEventListener('click',e=>{
 const cell=e.target.closest('[data-create-day]');
 if(cell&&!e.target.closest('button')){dayCreateDialog(cell.dataset.createDay);return;}
 const control=e.target.closest('button');
 if (!control) return;
 const data=control.dataset;
 if('quickAdd' in data){quickAddDialog();return;}
 if('quickPick' in data){
  const pick=data.quickPick;
  $('modal').close();
  if(pick==='task'){showPage('Tasks');itemForm('task');return;}
  if(pick==='event'){showPage('Events');itemForm('event');return;}
  if(pick==='reminder'){showPage('Reminders');itemForm('reminder');return;}
  if(pick==='QuranSession'){showPage('QuranClass');quranSessionForm();return;}
  if(pick==='QuranStudent'){showPage('QuranClass');quranStudentForm();return;}
  if(['Copywriting','Ideas','Notes','Works','Knowledge'].includes(pick)){showPage(pick);noteForm(pick);return;}
  return;
 }
 if('copywritingAll' in data){copywritingArchived=false;tagSelection.Copywriting='';render();return;}
 if('copywritingTagIdx' in data){
  const sorted=[...tags.Copywriting].sort((a,b)=>a.localeCompare(b,'ms'));
  tagSelection.Copywriting=sorted[Number(data.copywritingTagIdx)]||'';
  copywritingArchived=false;
  render();
  return;
 }
 if('copywritingArchive' in data){copywritingArchived=data.copywritingArchive==='true';render();return;}
 if('copyNote' in data){
  const item=notes.find(n=>n.id===data.copyNote);
  if(item){
   navigator.clipboard?.writeText(item.note).catch(()=>{});
   if($('modal').open)$('modal').close();
   notify('Teks copywriting disalin');
  }
  return;
 }
 if('quranFilter' in data){quranFilter=data.quranFilter;render();return;}
 if('tickQuran' in data){quranTickDialog(data.tickQuran,Number(data.slot||1),data.sessionId||'');return;}
 if('quranMonth' in data){
  const step=Number(data.quranMonth);
  if(step===0)quranMonth=today.slice(0,7);
  else{const d=dateOf(quranMonth+'-01');d.setUTCMonth(d.getUTCMonth()+step);quranMonth=isoOf(d).slice(0,7);}
  render();
  return;
 }
 if('addQuranStudent' in data){quranStudentForm();return;}
 if('editQuranStudent' in data){quranStudentForm(data.editQuranStudent);return;}
 if('deleteQuranStudent' in data){
  const student=quranStudents.find(item=>item.id===data.deleteQuranStudent);
  if(!student)return;
  openDialog('Padam pelajar '+student.name+'?','<div class="dialog-body"><p>Semua rekod tarikh kelas bagi pelajar ini akan turut dipadam.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam pelajar','data-confirm-delete-quran-student="'+student.id+'"','','primary')+'</div></div>');
  return;
 }
 if('confirmDeleteQuranStudent' in data){
  const index=quranStudents.findIndex(item=>item.id===data.confirmDeleteQuranStudent);
  if(index<0)return;
  const [removed]=quranStudents.splice(index,1);
  $('modal').close();
  save('Pelajar dipadam',()=>{if(!quranStudents.some(item=>item.id===removed.id))quranStudents.splice(Math.min(index,quranStudents.length),0,removed);});
  return;
 }
 if('openStudent' in data){if(page!=='QuranClass')showPage('QuranClass');quranStudentDialog(data.openStudent);return;}
 if('addQuranSession' in data){quranSessionForm(data.addQuranSession);return;}
 if('editQuranSession' in data){quranSessionForm(data.studentId,data.editQuranSession);return;}
 if('deleteQuranSession' in data){
  const student=quranStudents.find(item=>item.id===data.studentId);
  if(!student)return;
  const index=student.sessions.findIndex(s=>s.id===data.deleteQuranSession);
  if(index<0)return;
  const [removed]=student.sessions.splice(index,1);
  student.updatedAt=new Date().toISOString();
  $('modal').close();
  save('Tanda kelas dibatalkan',()=>{if(!student.sessions.some(s=>s.id===removed.id))student.sessions.splice(Math.min(index,student.sessions.length),0,removed);});
  return;
 }
 if('createDay' in data){dayCreateDialog(data.createDay);return;}
 if('openAgenda' in data){focus=data.openAgenda;view='Day';$('modal').close();render();return;}
 if('expandNote' in data){const expanded=$('modal').classList.toggle('note-expanded');control.textContent=expanded?'Kecilkan':'Besarkan';return;}
 if('inlineTag' in data){addInlineTag(control);return;}
 if('manageTags' in data){manageTags(data.manageTags);return;}
 if('editTag' in data){tagForm(data.tagOwner,Number(data.editTag));return;}
 if('deleteTag' in data){const name=tags[data.tagOwner][Number(data.deleteTag)];openDialog('Padam tag '+name+'?','<div class="dialog-body"><p>Tag akan dibuang daripada catatan berkaitan. Catatan dikekalkan.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam','data-confirm-delete-tag="'+data.deleteTag+'" data-tag-owner="'+data.tagOwner+'"','','primary')+'</div></div>');return;}
 if('confirmDeleteTag' in data){const scope=data.tagOwner,name=tags[scope][Number(data.confirmDeleteTag)];changeTag(currentState(),scope,name,null);drafts.changeTag(scope,name,null);if(tagSelection[scope]===name)tagSelection[scope]='';$('modal').close();save('Tag dipadam');return;}
 if('openBook' in data){openBook(data.openBook);return;}
 if('workPurpose' in data){workPurpose=data.workPurpose;workArchived=false;render();return;}
 if('ideasArchive' in data){ideasArchived=data.ideasArchive==='true';render();return;}
 if('addBook' in data){bookForm(undefined,data.addBook);return;}
 if('editBook' in data){bookForm(data.editBook);return;}
 if('deleteBook' in data){const book=library.books.find(item=>item.id===data.deleteBook);if(!book)return;openDialog('Padam folder '+book.title+'?','<div class="dialog-body"><p>Catatan buku akan dipindahkan ke Belum ditetapkan.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam folder','data-confirm-delete-book="'+book.id+'"','','primary')+'</div></div>');return;}
 if('confirmDeleteBook' in data){const index=library.books.findIndex(item=>item.id===data.confirmDeleteBook);if(index<0)return;const [book]=library.books.splice(index,1),affected=notes.filter(item=>item.kind==='Karya'&&item.bookId===book.id);for(const note of affected)note.bookId='';if(selectedWorkBook===book.id)selectedWorkBook='';$('modal').close();save('Folder dipadam; catatan dikekalkan',()=>{if(!library.books.some(item=>item.id===book.id))library.books.splice(index,0,book);for(const note of affected){const current=notes.find(item=>item.id===note.id);if(current&&current.kind==='Karya'&&!current.bookId)current.bookId=book.id;}});return;}
 if('manageSubjects' in data){manageSubjects();return;}
 if('addSubject' in data){subjectForm();return;}
 if('editSubject' in data){subjectForm(Number(data.editSubject));return;}
 if('deleteSubject' in data){const name=library.subjects[Number(data.deleteSubject)];openDialog('Padam bidang '+name+'?','<div class="dialog-body"><p>Label bidang akan dibuang daripada buku berkaitan. Buku dan catatan dikekalkan.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam','data-confirm-delete-subject="'+data.deleteSubject+'"','','primary')+'</div></div>');return;}
 if('confirmDeleteSubject' in data){const name=library.subjects[Number(data.confirmDeleteSubject)];changeBookSubject(library,name,null);if(bookSubjectFilter===name)bookSubjectFilter='';$('modal').close();save('Bidang dipadam');return;}
 if('workArchiveView' in data){workPurpose='';workArchived=true;render();return;}
 if('stickyOptions' in data){stickyOptions(data.stickyOptions);return;}
 if('workPin' in data||'workArchive' in data){const item=notes.find(note=>['Karya','Idea rambang','Copywriting'].includes(note.kind)&&note.id===(data.workPin||data.workArchive));if(item){if('workPin' in data)item.pinned=!item.pinned;else item.archived=!item.archived;item.updatedAt=new Date().toISOString();$('modal').close();save('Nota dikemas kini');}return;}
 if ('installApp' in data) { void triggerInstall(); return; }
 if ('dismissInstall' in data) { installDismissed=true; renderInstallBanner(); return; }
 if ('authMode' in data) { authMode=data.authMode; renderAuthGate(); return; }
 if ('syncNow' in data) { void syncWithCloud({notifyOnDone:true}); return; }
 if ('signOut' in data) {
  void (async()=>{
   await cloud.signOut();
   ({records,domains,projects,notes,tags,subfolders,library,quranStudents}=emptyState());
   drafts.clearAll();quickWorkDrafts={};persistQuickWorkDraft();selectedWorkBook='';
   try { localStorage.removeItem(key); } catch {}
   lockWorkspace();
   notify('Anda telah log keluar');
  })();
  return;
 }
 if ('undo' in data) {
  const restore=undoAction;
  undoAction=null;
  if (restore) { restore(); save('Pemadaman dibatalkan'); }
  return;
 }
 if ('export' in data) { exportBackup(); return; }
 if ('exportRecovery' in data) { downloadText('khuttah-recovery-'+today+'.json',recoverySource); return; }
 if ('import' in data) { importDialog(); return; }
 if (control.id==='more-menu'){ moreNavigation(); return; }
 if ('close' in data){ $('modal').close(); return; }
 if ('page' in data){
  const fromMore='fromMore' in data;
  const fromBottom=control.closest('#bottom-nav');
  if (fromMore) $('modal').close();
  showPage(data.page);
  if (fromMore) $('more-menu').focus();
  if (fromBottom) $('bottom-nav').querySelector('[aria-current="page"]').focus();
  if ('profileSettings' in data&&!fromMore) $('sidebar').querySelector('[data-profile-settings]').focus();
  return;
 }
 if ('period' in data){
  period=data.period;
  render();
  document.querySelector('[data-period="'+period+'"]').focus();
  return;
 }
 if ('scope' in data){
  const chosenDomain=['',...domains][Number(data.scope)];
  selectedSubfolder='';
  const fromMore='fromMore' in data;
  if (fromMore) $('modal').close();
  showPage(chosenDomain?'Group':'Overview',chosenDomain);
  if (fromMore) $('more-menu').focus();
  else $('sidebar').querySelector('[data-scope="'+data.scope+'"]').focus();
  return;
 }
 if ('settings' in data){ settingsTab=data.settings; render(); document.querySelector('[data-settings="'+settingsTab+'"]').focus(); return; }
 if ('addDomain' in data){ domainForm(); return; }
 if ('renameDomain' in data){ domainForm(Number(data.renameDomain)); return; }
 if ('removeDomain' in data){
  const index=Number(data.removeDomain);
  openDialog('Buang kumpulan '+domains[index]+'?','<div class="dialog-body"><p>Rekod dalam kumpulan ini akan dipindahkan ke kategori Tanpa kumpulan.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Buang kumpulan','data-confirm-remove-domain="'+index+'"','','primary')+'</div></div>'); return;
 }
 if ('confirmRemoveDomain' in data){
  const [name]=domains.splice(Number(data.confirmRemoveDomain),1);
  moveDomain(name,'');
  $('modal').close();
  save('Kumpulan dibuang'); return;
 }
 if ('search' in data){ searchDialog(); return; }
 if ('new' in data){ itemForm(data.new,undefined,data.date); return; }
 if ('postpone' in data){ postponeForm(data.postpone); return; }
 if ('edit' in data){ const item=records.find(x=>x.id===data.edit); if(item) itemForm(item.type,item); return; }
 if ('delete' in data){ openDialog('Padam rekod?','<div class="dialog-body"><p>Rekod ini akan dipadam.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam','data-confirm-delete="'+data.delete+'"','','primary')+'</div></div>'); return; }
 if ('confirmDelete' in data){
  const index=records.findIndex(item=>item.id===data.confirmDelete);
  if (index<0) return;
  const [removed]=records.splice(index,1);
  $('modal').close();
  save('Rekod dipadam',()=>{ if (!records.some(item=>item.id===removed.id)) records.splice(Math.min(index,records.length),0,removed); });
  return;
 }
 if ('view' in data){ view=data.view; render(); return; }
 if ('step' in data){ adjustDate(Number(data.step)); render(); return; }
 if ('today' in data){ focus=today; render(); return; }
 if ('day' in data){ focus=data.day; view='Day'; render(); return; }
 if ('taskFilter' in data){ taskFilter=data.taskFilter; render(); return; }
 if ('project' in data){
  const item=projects[Number(data.project)];
  openDialog(item.title,'<div class="detail"><p>'+badge(domainName(item.domain))+'</p><p>'+html(item.note)+'</p><p class="muted">'+item.progress+'% siap</p></div>'); return;
 }
 if ('addTag' in data){ tagForm(data.addTag); return; }
 if ('tagScope' in data){
  tagSelection[data.tagScope]=['',...tags[data.tagScope]][Number(data.tagIndex)];
  render();
  document.querySelector('[data-tag-scope="'+data.tagScope+'"][aria-pressed="true"]').focus();
  return;
 }
 if ('addSubfolder' in data){ subfolderForm(); return; }
 if ('editSubfolder' in data){subfolderForm(selectedSubfolder);return;}
 if ('deleteSubfolder' in data){openDialog('Padam subfolder '+selectedSubfolder+'?','<div class="dialog-body"><p>Nota dalam subfolder ini akan dikekalkan dalam kumpulan '+html(domain)+'.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam subfolder','data-confirm-delete-subfolder','','primary')+'</div></div>');return;}
 if ('confirmDeleteSubfolder' in data){deleteSubfolder();return;}
 if ('chapter' in data){ selectedChapter[page]=Number(data.chapter); render(); document.querySelector('[data-chapter="'+data.chapter+'"]').focus(); return; }
 if ('addNote' in data){ noteForm(data.addNote,undefined,Number(data.inChapter||0)); return; }
 if ('deleteNote' in data){
  openDialog('Padam catatan?','<div class="dialog-body"><p>Catatan ini akan dipadam.</p><div class="dialog-actions">'+button('Batal','data-close')+button('Padam','data-confirm-delete-note="'+data.deleteNote+'"','','primary')+'</div></div>');
  return;
 }
 if ('confirmDeleteNote' in data){
  const index=Number(data.confirmDeleteNote);
  const [removed]=notes.splice(index,1);
  $('modal').close();
  save('Catatan dipadam',removed?()=>{ if (!notes.some(item=>item.id===removed.id)) notes.splice(Math.min(index,notes.length),0,removed); }:null);
  return;
 }
 if ('note' in data){
  const index=Number(data.note);
  const item=notes[index];
  noteForm(item.thesis||tagScopeOf(item),index);
  return;
 }
});
document.addEventListener('change',e=>{
 const control=e.target;
 if(control.id==='holiday-region'&&Object.hasOwn(holidayRegions,control.value)){holidayRegion=control.value;try{localStorage.setItem('khuttah-holiday-region-v1',holidayRegion);}catch{}notify('Kalendar cuti dikemas kini');return;}
 if('moveWork' in control.dataset){$('modal').close();moveStickyNote(control.dataset.moveWork,control.value);return;}
 if('stickyColor' in control.dataset){const item=notes.find(note=>note.id===control.dataset.stickyColor&&['Karya','Idea rambang'].includes(note.kind));if(item&&Object.hasOwn(workColors,control.value)){item.color=control.value;item.updatedAt=new Date().toISOString();$('modal').close();save('Warna nota dikemas kini');}return;}
 if(control.id==='book-subject-filter'){bookSubjectFilter=control.value;const book=library.books.find(item=>item.id===selectedWorkBook);if(bookSubjectFilter&&book&&!book.subjects.includes(bookSubjectFilter))selectedWorkBook='';render();$('book-subject-filter').focus();return;}
 if('sortScope' in control.dataset){sorting[control.dataset.sortScope]=control.value;try{localStorage.setItem('khuttah-sorting-v1',JSON.stringify(sorting));}catch{}render();document.querySelector('[data-sort-scope="'+control.dataset.sortScope+'"]').focus();return;}
 if(control.id==='task-date-filter'){taskDates=control.value;render();$('task-date-filter').focus();return;}
 if ('moveNote' in control.dataset){ moveThesisNote(Number(control.dataset.moveNote),Number(control.value)); return; }
 if (control.id==='theme-select'){setTheme(control.value);return;}
 if (control.id==='subfolder-select'){ selectedSubfolder=control.value; render(); $('subfolder-select').focus(); return; }
 if (control.id==='domain-select'){ domain=control.value; pageDomains[page]=domain; selectedSubfolder=''; if (page==='Group'&&!domain) page='Overview'; render(); ($('domain-select')||$('main').querySelector('h1')).focus(); return; }
 if ('check' in control.dataset){
  const item=records.find(x=>x.id===control.dataset.check);
  if(item){ item.done=control.checked; item.updatedAt=new Date().toISOString(); save(item.done?'Ditandakan selesai':'Dibuka semula'); }
 }
});
let draggedNote=null;
document.addEventListener('dragstart',event=>{
 const row=event.target.closest('[data-drag-note]');
 if (!row||!event.dataTransfer) return;
 draggedNote=Number(row.dataset.dragNote);
 event.dataTransfer.setData('text/plain',row.dataset.dragNote);
 event.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',event=>{
 const target=event.target.closest('[data-drop-chapter]');
 if (draggedNote===null||!target) return;
 event.preventDefault();
 event.dataTransfer.dropEffect='move';
 target.classList.add('drop-ready');
});
document.addEventListener('dragleave',event=>{
 const target=event.target.closest('[data-drop-chapter]');
 if (target&&!target.contains(event.relatedTarget)) target.classList.remove('drop-ready');
});
document.addEventListener('dragend',()=>{
 draggedNote=null;
 document.querySelectorAll('.drop-ready').forEach(target=>target.classList.remove('drop-ready'));
});
document.addEventListener('drop',event=>{
 const target=event.target.closest('[data-drop-chapter]');
 if (draggedNote===null||!target) return;
 event.preventDefault();
 target.classList.remove('drop-ready');
 const index=draggedNote;
 draggedNote=null;
 moveThesisNote(index,Number(target.dataset.dropChapter));
});
installBookDragging(moveStickyNote);
document.addEventListener('input',event=>{if(event.target.matches('[data-quick-work]')){event.target.setCustomValidity?.('');captureQuickWorkDraft(event.target.closest('form'));}});
document.addEventListener('change',event=>{if(event.target.matches('select[data-quick-work]'))captureQuickWorkDraft(event.target.closest('form'));});
document.addEventListener('submit',event=>{
 const form=event.target;
 if(form.id==='quick-copywriting-form'){
  event.preventDefault();
  const note=form.elements.note.value.trim();
  if(!note){form.elements.note.setCustomValidity('Masukkan kandungan copywriting.');form.elements.note.reportValidity();return;}
  const now=new Date().toISOString();
  const activeTag=tagSelection.Copywriting;
  notes.push({id:'n-'+crypto.randomUUID(),kind:'Copywriting',title:note.split('\n')[0].slice(0,120),note,noteHtml:'',domain:'',tags:activeTag?[activeTag]:[],color:'white',pinned:false,archived:false,createdAt:now,updatedAt:now});
  save(activeTag?'Copywriting disimpan dalam tag '+activeTag:'Copywriting disimpan');
  $('quick-copywriting-text')?.focus();
  return;
 }
 if(form.id!=='quick-work-form')return;
 event.preventDefault();const note=form.elements.note.value.trim();
 if(!note){form.elements.note.setCustomValidity('Masukkan catatan.');form.elements.note.reportValidity();return;}
 const bookId=form.elements.bookId.value,book=library.books.find(item=>item.id===bookId),now=new Date().toISOString();
 notes.push({id:'n-'+crypto.randomUUID(),kind:'Karya',title:note.split('\n')[0].slice(0,120),note,noteHtml:'',domain:'',tags:[],bookId:book?.id||'',purpose:book?.status==='published'?'Pembetulan':book?'Idea buku':'Catatan',color:'white',pinned:false,archived:false,createdAt:now,updatedAt:now});
 delete quickWorkDrafts[selectedWorkBook||'inbox'];persistQuickWorkDraft();save(book?'Catatan disimpan dalam '+book.title:'Catatan disimpan');$('quick-work-text')?.focus();
});
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('.cell[data-create-day]')){e.preventDefault();dayCreateDialog(e.target.dataset.createDay);return;}
 if(e.key==='Enter'&&e.target.matches('[data-tag-input]')){e.preventDefault();addInlineTag(e.target.closest('fieldset').querySelector('[data-inline-tag]'));return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
  if (!cloud.getSession()) return;
  e.preventDefault();
  searchDialog();
 }
});
$('modal').addEventListener('close',()=>{ if (!$('modal').open) {drafts.detach();noteEditor?.destroy();noteEditor=null;} });
window.addEventListener('pagehide',()=>drafts.capture());
window.addEventListener('online',()=>{ if (cloud.getSession()) void syncWithCloud(); });
document.addEventListener('visibilitychange',()=>{
 if (document.hidden) drafts.capture();
 else if (cloud.getSession()) void syncWithCloud();
});
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 deferredInstallPrompt=event;
 renderInstallBanner();
});
window.addEventListener('appinstalled',()=>{
 deferredInstallPrompt=null;
 installDismissed=true;
 renderInstallBanner();
});
if ('serviceWorker' in navigator) {
 window.addEventListener('load',()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}
render();
if (cloud.getSession()) void syncWithCloud();
