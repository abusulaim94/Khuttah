(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 11h18m-13 4h2m4 0h2"/>',
    task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
    note:'<path d="M5 3h14v13l-5 5H5zM14 21v-5h5M9 8h6m-6 4h6"/>',
    book:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    prev:'<path d="m14 6-6 6 6 6"/>',next:'<path d="m10 6 6 6-6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.7 2.3-2 .9L5 5 3 8l1.7 1.7v2.6L3 14l2 3 2.3-.8 2 .9.7 2.9h4l.7-2.9 2-.9 2.3.8 2-3-1.7-1.7V9.7L21 8l-2-3-2.3 1.2-2-.9L14 3z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',pin:'<path d="m16 3 5 5-4 1-3 5-1 3-6-6 3-1 5-3zM7 17l-4 4"/>',leaf:'<path d="M20 4C9 2 2 9 6 16s16 3 14-12ZM5 21 15 10"/>',play:'<path d="m9 5 10 7-10 7z"/>',check:'<path d="m5 12 4 4L19 6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.note}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dateObj = value => new Date(`${value}T12:00:00`);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const offsetDay = n => { const date=dateObj(today); date.setDate(date.getDate()+n); return dateKey(date); };
  const formatDate = (value,options={day:'numeric',month:'short'}) => new Intl.DateTimeFormat('ms-MY',options).format(dateObj(value));
  const key = 'khuttah-luxury-prototype-v1';
  const groups = ['Peribadi','Uthmani','KPAZ'];
  const books = [
    {id:'makhraj',title:'Nota Mudah Makhraj & Sifat Huruf',field:'TAJWID',color:'',desc:'Catatan dan idea untuk cetakan seterusnya.'},
    {id:'nasyr',title:'Tajwid al-Nasyr',field:'TAJWID',color:'wine',desc:'Ruang semakan, rujukan dan penambahbaikan.'},
    {id:'akhlaq',title:'Akhlaq Hamalat al-Quran',field:'AKHLAK',color:'olive',desc:'Terjemahan, renungan dan nota editorial.'}
  ];
  function seed() { return {
    tasks:[
      {id:'t1',title:'Semak manuskrip Makhraj & Sifat Huruf',group:'Peribadi',date:today,important:true,done:false},
      {id:'t2',title:'Sediakan bahan kelas hujung minggu',group:'Uthmani',date:today,important:false,done:false},
      {id:'t3',title:'Kemaskini jadual pengajian KPAZ',group:'KPAZ',date:today,important:false,done:false},
      {id:'t4',title:'Baca satu bab & catat faedah',group:'Peribadi',date:today,important:false,done:true},
      {id:'t5',title:'Susun rujukan kajian seterusnya',group:'Peribadi',date:offsetDay(1),important:false,done:false},
      {id:'t6',title:'Semak draf modul pengajaran',group:'Uthmani',date:offsetDay(3),important:true,done:false}
    ],
    events:[{id:'e1',title:'Kelas Al-Quran',group:'Uthmani',date:today,time:'10:00'},{id:'e2',title:'Ruang menulis & mengulang kaji',group:'Peribadi',date:today,time:'15:00'},{id:'e3',title:'Perbincangan pengurusan',group:'KPAZ',date:offsetDay(2),time:'09:00'}],
    notes:[
      {id:'n1',title:'Tentang ilmu & kesabaran',body:'Ilmu tidak datang sekaligus. Berikan waktu untuk membaca, merenung dan mengamalkan. Sedikit yang berterusan lebih bermakna.',group:'Peribadi',date:today,book:''},
      {id:'n2',title:'Idea untuk kelas seterusnya',body:'Mulakan dengan ulang kaji ringkas, kemudian beri ruang kepada setiap pelajar untuk mencuba bacaan sendiri.',group:'Uthmani',date:today,book:''},
      {id:'n3',title:'Catatan penyuntingan',body:'Perhalusi huraian sifat huruf dan susun contoh mengikut urutan pembelajaran. Tambahkan ruang catatan pembaca.',group:'Peribadi',date:offsetDay(-1),book:'makhraj'}
    ]
  }; }
  let storageIssue = '';
  function validItem(item,type) {
    return item && typeof item.id==='string' && typeof item.title==='string' && groups.includes(item.group) && typeof item.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && !Number.isNaN(dateObj(item.date).getTime()) && (type!=='tasks'||typeof item.done==='boolean') && (type!=='notes'||typeof item.body==='string') && (type!=='events'||/^\d{2}:\d{2}$/.test(item.time));
  }
  let state=seed();
  try {const raw=localStorage.getItem(key); if(raw){const parsed=JSON.parse(raw);if(!['tasks','events','notes'].every(type=>Array.isArray(parsed[type])&&parsed[type].every(item=>validItem(item,type))))throw Error('invalid');state=parsed;}} catch {storageIssue='Simpanan prototaip tidak dapat dibaca. Data contoh digunakan untuk sesi ini.';}
  let canSave=!storageIssue;
  function save(){if(!canSave){toast('Perubahan hanya disimpan untuk sesi ini. Pulihkan data contoh melalui Tetapan untuk mengaktifkan simpanan.');return;}try{localStorage.setItem(key,JSON.stringify(state));}catch{toast('Storan pelayar tidak tersedia. Perubahan kekal untuk sesi ini sahaja.');}}
  let page='overview',taskFilter='today',groupFilter='all',selectedDate=today,month=dateObj(today),selectedBook='';
  let toastTimeout,focusEnd=null,focusRemaining=25*60;
  const pages={overview:['Ringkasan','home'],planner:['Perancang','calendar'],tasks:['Tugasan','task'],notes:['Nota peribadi','note'],works:['Karya Abu Sulaim','book']};
  const groupTag = group => `<span class="tag ${group.toLowerCase()}">${esc(group)}</span>`;
  const action = (name,label,extra='') => `<button class="text-link" data-action="${name}" ${extra}>${label}</button>`;
  const plusButton = (type,label) => `<button class="btn primary" data-action="new" data-type="${type}">${icon('plus')}${label}</button>`;
  function toast(message){clearTimeout(toastTimeout);$('#toast').textContent=message;toastTimeout=setTimeout(()=>$('#toast').textContent='',4500);}
  function nav(){
    $('#primary-nav').innerHTML=Object.entries(pages).map(([id,[label,symbol]])=>`<a class="nav-link ${page===id?'active':''}" href="#${id}" ${page===id?'aria-current="page"':''}>${icon(symbol)}${label}${id==='tasks'?`<span class="nav-count">${state.tasks.filter(t=>!t.done).length}</span>`:''}</a>`).join('');
    $('#group-nav').innerHTML=groups.map((group,i)=>`<a class="nav-link ${page===group?'active':''}" href="#${group}" ${page===group?'aria-current="page"':''}><span class="group-mark">${['P','U','K'][i]}</span>${group}</a>`).join('');
    $('#crumb').textContent=pages[page]?.[0]||page;
  }
  function heading(eyebrow,title,subtitle,button=''){return `<section class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${button}</section>`;}
  function taskRows(items){return items.length?items.map(t=>`<div class="task-row ${t.done?'done':''}"><input type="checkbox" class="task-check" aria-label="Tandakan selesai: ${esc(t.title)}" data-task="${esc(t.id)}" ${t.done?'checked':''}><div class="task-content"><div class="task-title">${esc(t.title)}</div><div class="task-meta">${groupTag(t.group)}<span>·</span><span>${icon('clock')} ${t.date===today?'Hari ini':formatDate(t.date)}</span></div></div>${t.important?'<span class="priority">Penting</span>':''}</div>`).join(''):'<p class="empty">Semuanya lapang di sini. Tambah sesuatu yang bermakna.</p>';}
  function filteredTasks(group){return state.tasks.filter(t=>(!group||t.group===group)&&(groupFilter==='all'||t.group===groupFilter)&&(taskFilter==='all'||taskFilter==='today'&&t.date===today||taskFilter==='open'&&!t.done||taskFilter==='done'&&t.done));}
  function taskPanel(group){return `<section class="panel"><div class="panel-heading"><h2>${page==='overview'?'Keutamaan anda':'Senarai tugasan'}</h2>${page==='overview'?'<a class="text-link" href="#tasks">Lihat semua</a>':`<span class="tag">${state.tasks.filter(t=>!t.done&&(!group||t.group===group)).length} belum selesai</span>`}</div><div class="tabs" role="group" aria-label="Tapis tugasan">${[['today','Hari ini'],['open','Belum selesai'],['done','Selesai'],['all','Semua']].map(([value,label])=>`<button class="tab ${taskFilter===value?'active':''}" aria-pressed="${taskFilter===value}" data-filter="${value}">${label}</button>`).join('')}</div><div class="task-list">${taskRows(filteredTasks(group))}</div><button class="add-inline" data-action="new" data-type="task">${icon('plus')}Tambah tugasan baharu</button></section>`;}
  function eventsFor(date){return state.events.filter(e=>e.date===date).sort((a,b)=>a.time.localeCompare(b.time));}
  function agenda(){const items=eventsFor(selectedDate);return `<div class="agenda"><p class="agenda-label">${selectedDate===today?'Jadual hari ini':formatDate(selectedDate,{weekday:'long',day:'numeric',month:'short'})}</p>${items.length?items.map(e=>`<div class="agenda-item"><span class="agenda-time">${esc(e.time)}</span><div class="agenda-detail">${esc(e.title)}<small>${esc(e.group)}</small></div></div>`).join(''):'<p class="empty">Belum ada acara. Nikmati ruang ini.</p>'}</div>`;}
  function calendar(full=false){
    const first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);start.setDate(1-(first.getDay()+6)%7);
    const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const date=dateKey(d),events=eventsFor(date);return `<button class="day ${d.getMonth()!==month.getMonth()?'outside':''} ${date===today?'today':''} ${date===selectedDate?'selected':''} ${events.length?'has-events':''}" data-date="${date}" aria-pressed="${date===selectedDate}" ${date===today?'aria-current="date"':''} aria-label="${formatDate(date,{day:'numeric',month:'long',year:'numeric'})}, ${events.length} acara">${d.getDate()}${full&&events.length?`<small>${esc(events[0].title)}</small>`:''}</button>`;}).join('');
    return `<section class="panel calendar-panel ${full?'full-calendar':''}"><div class="calendar-head"><h2 class="calendar-title">${new Intl.DateTimeFormat('ms-MY',{month:'long',year:'numeric'}).format(month)}</h2><div class="calendar-controls"><button class="icon-button" data-month="-1" aria-label="Bulan sebelumnya">${icon('prev')}</button><button class="icon-button" data-month="1" aria-label="Bulan seterusnya">${icon('next')}</button></div></div><div class="calendar-grid">${['Is','Se','Ra','Kh','Ju','Sa','Ah'].map(d=>`<span class="weekday">${d}</span>`).join('')}${days}</div>${full?'':agenda()}</section>`;
  }
  function noteCards(items){return items.length?items.map(n=>`<button class="note-card" data-note="${esc(n.id)}">${groupTag(n.group)}<span class="pin">${icon(n.book?'book':'note')}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)||'Catatan baharu anda.'}</p><small>${formatDate(n.date)}${n.book?' · Catatan karya':''}</small></button>`).join(''):'<p class="empty">Idea yang baik bermula dengan satu catatan.</p>';}
  function notesSection(group){return `<section class="notes-section"><div class="section-heading"><h2 class="section-title">Catatan terkini</h2><a href="#notes" class="text-link">Semua nota</a></div><div class="note-grid">${noteCards(state.notes.filter(n=>!group||n.group===group).slice(0,3))}</div></section>`;}
  function overview(){const todays=state.tasks.filter(t=>t.date===today),done=todays.filter(t=>t.done).length;return heading(formatDate(today,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase(),'Assalamualaikum, <em>Abu Sulaim.</em>','Setiap hari, satu langkah yang lebih bermakna.',plusButton('task','Tambah baharu'))+`
    <section class="hero"><div class="hero-copy"><div class="eyebrow">NIAT YANG JELAS. LANGKAH YANG TENANG.</div><h2>Rancang dengan niat.<br>Laksanakan dengan ihsan.</h2><p>Satukan urusan, ilmu dan karya dalam satu ruang yang tenang.</p><button class="btn gold" data-action="plan">${icon('calendar')}Lihat perancangan hari ini</button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><span class="orbit-line"></span><span class="art-star">✦</span></div><span class="hero-caption" aria-hidden="true">INTENTION · CLARITY · PURPOSE</span></section>
    <section class="metrics" aria-label="Ringkasan ruang kerja">${[
      ['Tugasan hari ini',todays.filter(t=>!t.done).length,'<b>'+done+' selesai</b> daripada '+todays.length+' tugasan','task','tasks'],
      ['Acara akan datang',state.events.filter(e=>e.date>=today).length,eventsFor(today).length+' acara dijadualkan hari ini','calendar','planner'],
      ['Koleksi nota',state.notes.length,'Idea yang terus bertumbuh','note','notes'],
      ['Karya & penulisan',books.length,'Setiap tulisan, satu sumbangan','book','works']
    ].map(([title,value,foot,symbol,target])=>`<a href="#${target}" class="metric"><div class="metric-top">${title}${icon(symbol)}</div><strong class="metric-value">${String(value).padStart(2,'0')}</strong><span class="metric-foot">${foot}</span></a>`).join('')}</section>
    <div class="dashboard">${taskPanel()}<div class="right-stack">${calendar()}<section class="focus-card"><div class="focus-ring" id="focus-time" role="timer" aria-label="Masa fokus berbaki">${timerText()}</div><div><h3>Satu ruang untuk fokus.</h3><p>25 minit. Satu perkara utama.</p><button data-action="focus" id="focus-toggle">${focusEnd?'Jeda sesi fokus':'Mulakan sesi fokus'}</button></div></section></div></div>${notesSection()}`;
  }
  function render(){nav();let content='';
    if(page==='overview')content=overview();
    if(page==='tasks'||groups.includes(page)){const group=groups.includes(page)?page:null;content=heading(group?'KUMPULAN ANDA':'SEDIKIT DEMI SEDIKIT',group?`Ruang ${group}.`:'Lakukan yang <em>bermakna.</em>',group?'Urusan dan catatan, tersusun dalam satu tempat.':'Satu tugasan pada satu masa. Berikan perhatian pada yang utama.',plusButton('task','Tambah tugasan'))+(group?'':`<div class="toolbar"><span class="dialog-description">Semua urusan anda, dengan lebih jelas.</span><select class="filter-select" id="group-filter" aria-label="Tapis kumpulan"><option value="all">Semua kumpulan</option>${groups.map(g=>`<option ${groupFilter===g?'selected':''}>${g}</option>`).join('')}</select></div>`)+taskPanel(group)+(group?notesSection(group):'');}
    if(page==='planner')content=heading('MASA UNTUK YANG UTAMA','Ruang dalam <em>hari anda.</em>','Susun waktu untuk urusan, ilmu dan diri sendiri.',plusButton('event','Tambah acara'))+`<div class="toolbar"><span class="dialog-description">Pilih tarikh untuk melihat jadual.</span><button class="btn" data-action="today">Hari ini</button></div><div class="planner-layout">${calendar(true)}<section class="panel"><div class="panel-heading"><h2>Agenda anda</h2></div>${agenda()}<button class="add-inline" data-action="new" data-type="event">${icon('plus')}Tambah acara pada tarikh ini</button></section></div>`;
    if(page==='notes')content=heading('SIMPAN YANG BERMAKNA','Dari fikiran, <em>ke catatan.</em>','Ruang untuk idea kecil, renungan dan ilmu yang ingin disimpan.',plusButton('note','Tulis nota'))+`<div class="note-grid">${noteCards(state.notes)}</div>`;
    if(page==='works'){const book=books.find(b=>b.id===selectedBook);content=book?heading('KARYA ABU SULAIM',esc(book.title),'Catatan penyuntingan dan idea untuk karya ini.',plusButton('note','Tambah catatan'))+`<div class="toolbar"><button class="btn" data-action="all-books">Semua karya</button><span class="tag">${esc(book.field)}</span></div><div class="note-grid">${noteCards(state.notes.filter(n=>n.book===book.id))}</div>`:heading('PERJALANAN SEBUAH KARYA','Tulisan yang <em>meninggalkan makna.</em>','Himpunkan idea dan perhalusi setiap karya, halaman demi halaman.')+`<div class="books">${books.map(b=>`<button class="book-card" data-book="${b.id}"><div class="book-cover ${b.color}"><small>${b.field}</small><h2>${b.title}</h2><span>Abu Sulaim</span></div><h3>${b.title}</h3><p>${b.desc}</p><p>${state.notes.filter(n=>n.book===b.id).length} catatan · Lihat ruang karya</p></button>`).join('')}</div>`;}
    $('#main').innerHTML=content;
  }
  function route(){const hash=decodeURIComponent(location.hash.slice(1));page=pages[hash]||groups.includes(hash)?hash:'overview';taskFilter=page==='overview'?'today':'all';groupFilter='all';selectedBook='';closeMenu();render();}
  function closeMenu(){const wasOpen=$('#sidebar').classList.contains('open');$('#sidebar').classList.remove('open');$('#scrim').hidden=true;$('#menu').setAttribute('aria-expanded','false');if(wasOpen)$('#menu').focus();}
  function openMenu(){$('#sidebar').classList.add('open');$('#scrim').hidden=false;$('#menu').setAttribute('aria-expanded','true');$('#sidebar a').focus();}
  $('#menu').addEventListener('click',openMenu);$('#scrim').addEventListener('click',closeMenu);
  window.addEventListener('hashchange',route);
  let dialogOpener=null;
  function openDialog(title,body){dialogOpener=document.activeElement;$('#dialog').innerHTML=`<div class="dialog-header"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="Tutup">${icon('close')}</button></div><div class="dialog-body">${body}</div>`;$('#dialog').showModal();}
  $('#dialog').addEventListener('close',()=>{if(dialogOpener?.isConnected)dialogOpener.focus();});
  $('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#dialog').close();}});
  function editor(type='task',id=''){
    const collection=type==='note'?'notes':type==='event'?'events':'tasks';const item=state[collection].find(i=>i.id===id);const group=item?.group||(groups.includes(page)?page:'Peribadi');const title=type==='note'?(item?'Sunting catatan':'Sebuah catatan baharu'):type==='event'?'Rancang sebuah acara':'Satu langkah baharu';
    openDialog(title,`<form id="item-form" data-type="${type}" data-id="${esc(id)}"><label class="field">Tajuk<input name="title" required maxlength="180" placeholder="Apa yang ingin anda ${type==='note'?'catat':'lakukan'}?" value="${esc(item?.title||'')}" autofocus></label>${type==='note'?`<label class="field">Catatan<textarea name="body" maxlength="20000" placeholder="Biarkan idea anda mengalir…">${esc(item?.body||'')}</textarea></label>`:''}<div class="form-row"><label class="field">Kumpulan<select class="filter-select" name="group">${groups.map(g=>`<option ${g===group?'selected':''}>${g}</option>`).join('')}</select></label>${type==='note'?`<label class="field">Karya<select name="book" class="filter-select"><option value="">Nota peribadi</option>${books.map(b=>`<option value="${b.id}" ${(item?.book||(page==='works'?selectedBook:''))===b.id?'selected':''}>${b.title}</option>`).join('')}</select></label>`:`<label class="field">Tarikh<input name="date" type="date" required value="${type==='event'?selectedDate:today}"></label>`}</div>${type==='event'?'<label class="field">Masa<input name="time" type="time" required value="09:00"></label>':''}${type==='task'?'<label class="field">Keutamaan<select class="filter-select" name="priority"><option value="normal">Biasa</option><option value="important">Penting</option></select></label>':''}<div class="dialog-actions"><button class="btn" type="button" data-action="close">Batal</button><button class="btn primary" type="submit">${icon('check')}Simpan ${type==='note'?'catatan':type==='event'?'acara':'tugasan'}</button></div></form>`);
    setTimeout(()=>$('#item-form [name="title"]')?.focus(),0);
  }
  function openSearch(){openDialog('Cari dalam ruang anda',`<label class="field">Tugasan, acara atau nota<input class="search-input" id="search" type="search" placeholder="Taip sesuatu untuk dicari…" autocomplete="off"></label><div class="search-results" id="search-results" aria-live="polite"><p class="empty">Mulakan dengan satu kata.</p></div>`);setTimeout(()=>$('#search')?.focus(),0);}
  function search(value){const query=value.trim().toLocaleLowerCase();if(!query){$('#search-results').innerHTML='<p class="empty">Mulakan dengan satu kata.</p>';return;}const results=['tasks','events','notes'].flatMap(type=>state[type].filter(item=>`${item.title} ${item.body||''} ${item.group}`.toLocaleLowerCase().includes(query)).map(item=>({...item,type}))).slice(0,30);$('#search-results').innerHTML=results.length?results.map(item=>`<button class="search-result" data-result="${esc(item.id)}" data-kind="${item.type}">${esc(item.title)}<small>${{tasks:'Tugasan',events:'Acara',notes:'Nota'}[item.type]} · ${esc(item.group)}</small></button>`).join(''):'<p class="empty">Tiada hasil. Cuba kata yang lain.</p>';}
  function settings(){openDialog('Ruang anda, pilihan anda.',`<p class="dialog-description">Edisi prototaip premium KHUTTAH. Data contoh disimpan dalam pelayar ini, berasingan daripada akaun KHUTTAH anda.</p><div class="setting-row"><div>Simpanan setempat<small>Tugasan, acara dan catatan prototaip.</small></div><span class="tag">Dalam pelayar</span></div><div class="setting-row"><div>Mulakan semula<small>Pulihkan data contoh asal prototaip.</small></div><button class="btn" data-action="reset-confirm">Pulihkan</button></div>`);}
  function timerText(){const remaining=focusEnd?Math.max(0,Math.ceil((focusEnd-Date.now())/1000)):focusRemaining;return `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;}
  function toggleFocus(){if(focusEnd){focusRemaining=Math.max(0,Math.ceil((focusEnd-Date.now())/1000));focusEnd=null;toast('Sesi fokus dijeda. Sambung apabila anda bersedia.');}else{if(focusRemaining===0)focusRemaining=25*60;focusEnd=Date.now()+focusRemaining*1000;toast('Ruang fokus bermula. Berikan perhatian pada satu perkara.');}render();}
  setInterval(()=>{if(focusEnd&&Date.now()>=focusEnd){focusEnd=null;focusRemaining=0;toast('Sesi fokus selesai. Ambil masa untuk berehat.');if($('#focus-toggle'))$('#focus-toggle').textContent='Mulakan sesi baharu';}if($('#focus-time'))$('#focus-time').textContent=timerText();},1000);
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    if(el.dataset.filter){taskFilter=el.dataset.filter;render();$('#main [data-filter="'+taskFilter+'"]')?.focus();}
    if(el.dataset.month){month=new Date(month.getFullYear(),month.getMonth()+Number(el.dataset.month),1);render();$('#main [data-month="'+el.dataset.month+'"]')?.focus();}
    if(el.dataset.date){selectedDate=el.dataset.date;month=dateObj(selectedDate);render();$('#main [data-date="'+selectedDate+'"]')?.focus();}
    if(el.dataset.note)editor('note',el.dataset.note);
    if(el.dataset.book){selectedBook=el.dataset.book;render();}
    if(el.dataset.result){const item=state[el.dataset.kind].find(i=>i.id===el.dataset.result);$('#dialog').close();if(el.dataset.kind==='notes')editor('note',item.id);else{page=el.dataset.kind==='events'?'planner':'tasks';taskFilter='all';groupFilter='all';if(page==='planner'){selectedDate=item.date;month=dateObj(item.date);}history.replaceState(null,'','#'+page);render();$('#main').focus();}}
    switch(el.dataset.action){
      case 'new':editor(el.dataset.type);break;
      case 'close':$('#dialog').close();break;
      case 'search':openSearch();break;
      case 'settings':settings();break;
      case 'plan':selectedDate=today;month=dateObj(today);location.hash='planner';break;
      case 'today':selectedDate=today;month=dateObj(today);render();break;
      case 'focus':toggleFocus();break;
      case 'all-books':selectedBook='';render();break;
      case 'reset-confirm':$('#dialog').close();openDialog('Pulihkan data contoh?',`<p class="dialog-description">Tugasan, acara dan nota yang anda tambah dalam prototaip ini akan diganti dengan data contoh asal.</p><div class="dialog-actions"><button class="btn" data-action="close">Batal</button><button class="btn primary" data-action="reset">Ya, pulihkan</button></div>`);break;
      case 'reset':state=seed();canSave=true;save();$('#dialog').close();render();toast('Data contoh prototaip telah dipulihkan.');break;
    }
  });
  document.addEventListener('change',e=>{if(e.target.dataset.task){const item=state.tasks.find(t=>t.id===e.target.dataset.task);if(item){item.done=e.target.checked;save();render();$('#main input[data-task="'+item.id+'"]')?.focus();}}if(e.target.id==='group-filter'){groupFilter=e.target.value;render();$('#group-filter').focus();}});
  document.addEventListener('input',e=>{if(e.target.id==='search')search(e.target.value);if(e.target.name==='title')e.target.setCustomValidity('');});
  document.addEventListener('submit',e=>{if(e.target.id!=='item-form')return;e.preventDefault();const form=e.target,data=new FormData(form),type=form.dataset.type,collection=type==='note'?'notes':type==='event'?'events':'tasks',title=String(data.get('title')||'').trim();if(!title){form.elements.title.setCustomValidity('Sila masukkan tajuk.');form.elements.title.reportValidity();return;}const old=state[collection].find(i=>i.id===form.dataset.id);const item={id:old?.id||`${type}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,title,group:data.get('group'),date:type==='note'?today:data.get('date')};if(type==='note'){item.body=String(data.get('body')||'').trim();item.book=data.get('book')||'';}if(type==='task'){item.done=false;item.important=data.get('priority')==='important';}if(type==='event')item.time=data.get('time');if(old)Object.assign(old,item);else state[collection].unshift(item);$('#dialog').close();if(type==='task'){taskFilter='all';groupFilter='all';}if(type==='event'){selectedDate=item.date;month=dateObj(item.date);}render();toast(type==='note'?'Catatan anda telah disimpan.':type==='event'?'Acara telah ditambah ke perancang.':'Satu langkah baharu telah ditambah.');save();});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#dialog').open)openSearch();}if(e.key==='Escape'&&$('#sidebar').classList.contains('open'))closeMenu();if(e.key==='Tab'&&$('#sidebar').classList.contains('open')){const focusable=[...$('#sidebar').querySelectorAll('a,button')],first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  route();if(storageIssue)toast(storageIssue);
})();
