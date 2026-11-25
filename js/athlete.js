(async function () {
  const root=document.getElementById('athleteStudio');
  if (!root) return;
  const model=AthleteModel;
  const byId = id => document.getElementById(id);
  const controls=byId('studioControls'), canvas=byId('athleteCanvas'), kitItems=byId('kitItems');
  const storageKey='xpodium.athlete.v1';
  const assets={};
  let products=[], byProduct=new Map(), tab='wear', part='armR', section='apparel', category=null, paired=false;
  let state, pickPart, frame=0, storageEnabled=true, notifyTimer=0, missingSizes=false;
  let quickSlot=null;
  const drafts={};
  const wardrobe=[['base','Бра'],['top','Футболка'],['outer','Худи'],['bottom','Низ']];
  const gear=[['bag','Рюкзак'],['waist','Пояс'],['grips','Накладки'],['knees','Наколенники']];
  const wearSections={apparel:'Одежда',gear:'Экипировка',accessories:'Аксессуары'};
  const sectionLabels={
    apparel:{top:'Футболки и лонгсливы',bottom:'Шорты и брюки',suit:'Костюмы'},
    gear:{handheld:'Скакалки',headwear:'Повязки'},
    accessories:{handheld:'Бутылки',headwear:'Кепки и банданы'}
  };
  const symbols={
    base:'M5 20l2-12 4-1 1 6q4 4 8 0l1-6 4 1 2 12-2 5H7z M7 21q9 3 18 0',
    top:'M10 5l-7 6 4 6 4-2v12h10V15l4 2 4-6-7-6q-6 5-12 0z',
    outer:'M11 8q0-6 5-6t5 6l4 3 4 14-5 2-3-10v11H11V17l-3 10-5-2 4-14z M11 8l5 5 5-5 M16 13v14 M13 13l-1 5m7-5 1 5',
    bottom:'M7 6h18l3 20-9 1-3-10-3 10-9-1z M7 10h18 M16 10v5',
    bag:'M12 6q0-4 4-4t4 4 M10 7h12q3 0 4 5l1 13q0 3-3 3H8q-3 0-3-3l1-13q1-5 4-5z M10 17h12v7H10z M10 12h12',
    waist:'M3 12q8 2 13 0t13-1v10q-7-1-13 1T3 21z M12 13h8v7h-8z M16 16h6',
    grips:'M9 26l-3-8L4 9q0-2 2-2t3 4l1-6q1-2 3 0l1 5 1-6q2-2 3 1l1 5 1-5q2-1 3 1l-1 10 3-3q3-1 3 2l-7 9-1 4z M9 23l12-1',
    knees:'M11 3l11 2-2 7 3 10-4 7-10-3 3-7-3-7z M13 11l5 2 1 5-5 2-2-5z',
    headwear:'M4 21q1-14 12-14 10 0 11 13l-8-2q-8-1-15 3z M7 20l-3 4q9 0 16-5',
    wrists:'M4 16L20 5l8 11-16 11z M8 17l13-9 M12 20l9-6',
    sweatbands:'M6 9q10-3 20 0l-2 15q-8 3-16 0z M7 12q9-2 18 0 M8 21q8 2 16 0',
    elbows:'M11 4l11 3-4 8 7 7-6 6-12-11z M11 15l7 7',
    socks:'M13 4h11l-2 17-12 6q-7 1-7-4l10-8z M13 8h10',
    handheld:'M12 4h8v5l3 4v12q0 3-3 3h-8q-3 0-3-3V13l3-4z M12 8h8 M10 16h12',
    suit:'M7 4l3 1 1 4h4l1-4 3-1 2 11H5z M13 19h12l2 10h-5l-3-6-2 6h-5z'
  };
  function slotButton(slot,label,rail) {
    const equipped=state.look[slot] || (['base','bottom'].includes(slot) && state.look.suit);
    const product=byProduct.get(equipped?.id);
    const item=product && (rail || product.category===section);
    const btn=el('button',{type:'button',class:rail?'stage-slot':'extra-slot','data-category':slot,
      'aria-controls':rail && window.matchMedia?.('(max-width:800px)').matches?'quickWear':'studioControls','aria-pressed':tab==='wear' && category===slot,
      'aria-label':(rail?model.slots[slot]:label)+(item?' · '+product.name_ru:'')});
    const icon=el('span',{class:'slot-glyph','aria-hidden':true});
    icon.innerHTML='<svg viewBox="0 0 32 32"><path d="'+symbols[slot]+'"/></svg>';
    if(item) btn.classList.add('equipped');
    btn.append(icon,el('span',{class:'slot-label'},label));return btn;
  }
  function renderRails() {
    for(const [id,slots] of [['clothingSlots',wardrobe],['gearSlots',gear]]) {
      const rail=byId(id);
      rail.replaceChildren(...slots.filter(([slot])=>products.some(p=>model.cuts[p.id].slot===slot))
        .map(([slot,label])=>slotButton(slot,label,true)));
    }
  }
  function productsInSlot(slot) {
    return products.filter(p=>p.category===section && model.cuts[p.id].slot===slot);
  }
  function readStorage(key) {
    try {return JSON.parse(localStorage.getItem(key));} catch {return null;}
  }
  function writeStorage(key,value) {
    try {localStorage.setItem(key,JSON.stringify(value));}
    catch {storageEnabled=false;}
  }
  function persist() {
    drafts[state.mode]=state;
    byId('manualShare').hidden=true;
    if (storageEnabled) {
      writeStorage(storageKey+'.'+state.mode,state);
      writeStorage(storageKey+'.last',state.mode);
    }
    // Edits to a shared outfit become a draft on this device.
    if (location.hash.startsWith('#look=')) {
      try {history.replaceState(null,'',location.pathname+location.search);} catch { /* local file preview */ }
    }
  }
  function loadDraft(mode) {
    return drafts[mode] || model.normalize(readStorage(storageKey+'.'+mode),products) || model.starting(products,mode==='friend');
  }
  function notice(text) {
    clearTimeout(notifyTimer);
    byId('studioStatus').textContent=text;
    notifyTimer=setTimeout(()=>{byId('studioStatus').textContent='';},5000);
  }
  function el(tag, attributes={}, text) {
    const node=document.createElement(tag);
    for (const [name,value] of Object.entries(attributes)) node.setAttribute(name,String(value));
    if (text !== undefined) node.textContent=text;
    return node;
  }
  function selectOption(value,text,selected) {
    const option=el('option',{value},text);option.selected=selected;return option;
  }
  function makeField(title) {
    const field=el('fieldset',{class:'studio-field'});
    field.append(el('legend',{},title));return field;
  }
  function pickButton(text, action, key, on) {
    return el('button',{type:'button','data-action':action,'data-key':key,'aria-pressed':on},text);
  }
  function choices(title,key,entries,selected) {
    const field=makeField(title), row=el('div',{class:'studio-picks'});
    for(const [value,label] of Object.entries(entries)) row.append(pickButton(label,key,value,value===selected));
    field.append(row);return field;
  }
  function palette(title,key,list,index) {
    const field=makeField(title+' · '+list[index][0]), row=el('div',{class:'studio-swatches'});
    for(const [i,[label,color]] of list.entries()) {
      const btn=pickButton('',key,i,i===index);
      btn.setAttribute('aria-label',label);btn.title=label;btn.style.setProperty('--swatch',color);row.append(btn);
    }
    field.append(row);return field;
  }
  function renderFace() {
    const label=el('label',{class:'studio-label',for:'athleteName'},state.mode==='friend'?'Имя друга':'Имя атлета');
    const input=el('input',{id:'athleteName',class:'studio-input',maxlength:24,placeholder:'Необязательно',autocomplete:'off'});
    input.value=state.name;
    const name=el('div',{class:'studio-field'});name.append(label,input);
    controls.append(name,choices('Телосложение','frame',{straight:'Мужское',curved:'Женское'},state.frame),
      palette('Цвет кожи','skin',model.skin,state.skin),choices('Причёска','hair',model.hairstyles,state.hair),
      palette('Цвет волос','tint',model.hairColors,state.tint),choices('Борода и усы','beard',model.beards,state.beard));
  }
  function renderBody() {
    controls.append(choices('Часть тела','part',model.parts,part));
    const label=el('label',{for:'partSize',class:'range-label'},model.parts[part]);
    label.append(el('output',{id:'partValue',for:'partSize'},state.parts[part]));
    const range=el('input',{id:'partSize',class:'studio-range',type:'range',min:0,max:100,step:1,value:state.parts[part],
      'aria-label':model.parts[part]});
    controls.append(label,range);
    if(['armL','armR','calfL','calfR'].includes(part)){
      const together=el('label',{class:'studio-switch-row'});
      const check=el('input',{id:'limbsTogether',type:'checkbox'});check.checked=paired;
      together.append(check,document.createTextNode(part.startsWith('arm')?'Обе руки вместе':'Обе икры вместе'));controls.append(together);
    }
    controls.append(el('p',{class:'studio-hint'},'Коснись части тела на персонаже и потяни в сторону, чтобы изменить её размер.'));
  }
  function thumbnail(product,color) {
    const src=productColorPhoto(product,color) || product.images?.[0];
    return el('img',{class:'studio-thumb',src:productImageUrl(src),loading:'lazy',alt:''});
  }
  function productButton(product){
    const item=state.look[model.cuts[product.id].slot],on=item?.id===product.id;
    const btn=pickButton('','wear',product.id,on);
    btn.className='wear-option';btn.setAttribute('aria-label',(on?'Снять ':'Надеть ')+product.name_ru);
    const info=el('span',{class:'wear-info'});
    info.append(el('b',{},product.name_ru),el('small',{},productPriceLabel(product,on?item.size:undefined)));
    btn.append(thumbnail(product,on?item.color:null),info);return btn;
  }
  function renderQuick(){
    const box=byId('quickWear');box.hidden=!quickSlot;
    const scroll=box.dataset.slot===quickSlot?box.querySelector('.quick-options')?.scrollLeft||0:0;
    box.replaceChildren();if(!quickSlot)return;
    box.dataset.slot=quickSlot;
    const head=el('div',{class:'quick-head'}),close=el('button',{type:'button','data-action':'close-quick','aria-label':'Закрыть выбор вещей'},'×');
    head.append(el('span',{},model.slots[quickSlot]),close);
    const options=el('div',{class:'quick-options'});
    options.append(...productsInSlot(quickSlot).map(productButton));
    box.append(head,options);options.scrollLeft=scroll;
  }
  function renderWear() {
    const tabs=el('div',{class:'wear-sections',role:'group','aria-label':'Разделы каталога'});
    for(const [id,label] of Object.entries(wearSections)){
      if(products.some(p=>p.category===id))tabs.append(pickButton(label,'wear-section',id,section===id));
    }
    controls.append(tabs);
    const usable=Object.keys(model.slots).filter(slot=>productsInSlot(slot).length);
    if(!usable.length){controls.append(el('p',{class:'studio-hint'},'Сейчас нет вещей для примерки.'));return;}
    if(!usable.includes(category))category=null;
    if(!category){
      const options=el('div',{class:'wear-categories',role:'group','aria-label':wearSections[section]});
      for(const slot of usable)options.append(slotButton(slot,sectionLabels[section][slot]||model.slots[slot],false));
      controls.append(options);
      return;
    }
    const heading=el('div',{class:'wear-heading'});
    heading.append(el('button',{type:'button',class:'wear-back','data-action':'wear-back'},'‹ '+wearSections[section]),
      el('h3',{id:'wearHeading',tabindex:-1},sectionLabels[section][category]||model.slots[category]));
    controls.append(heading);
    const hints={base:'Первый слой. Поверх можно надеть футболку и худи.',
      top:'Средний слой. Можно надеть поверх бра и под худи.',
      outer:'Верхний слой. Под расстёгнутым зип-худи виден нижний слой.',
      suit:'Бра и леггинсы продаются вместе. Костюм занимает оба места.'};
    if(hints[category])controls.append(el('p',{class:'wear-hint'},hints[category]));
    const row=el('div',{class:'wear-list'});
    row.append(...productsInSlot(category).map(productButton));
    controls.append(row);
  }
  function renderControls(focus) {
    const listScroll=focus?.includes('data-action="wear"') ? controls.querySelector('.wear-list')?.scrollTop || 0 : 0;
    controls.replaceChildren();
    root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));
    if(tab==='face') renderFace();
    if(tab==='body') renderBody();
    if(tab==='wear') renderWear();
    renderRails();renderQuick();
    if(tab==='wear' && listScroll) {const list=controls.querySelector('.wear-list');if(list)list.scrollTop=listScroll;}
    if(focus) controls.querySelector(focus)?.focus({preventScroll:true});
  }
  function draw() {
    frame=0;
    if (!state) return;
    const {width,height}=canvas.getBoundingClientRect();
    const density=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(width*density)),h=Math.max(1,Math.round(height*density));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    pickPart=AthleteArt.paint(canvas,state,assets);
  }
  function redraw() {if(!frame) frame=requestAnimationFrame(draw);}
  function updatePreview() {
    const name=byId('stageName');name.textContent=state.name;name.hidden=!state.name;
    canvas.setAttribute('aria-label',[
      state.name || (state.mode==='friend'?'Атлет друга':'Твой атлет'),
      'цвет кожи '+model.skin[state.skin][0],model.hairstyles[state.hair],
      ...Object.values(state.look).map(i=>byProduct.get(i.id)?.name_ru).filter(Boolean)
    ].join(', '));
    root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
    redraw();
  }
  function variant(product,item,key,slot) {
    const values=product[key==='size'?'sizes':'colors'] || [];
    if(!values.length) return null;
    const select=el('select',{'data-slot':slot,'data-variant':key,
      'aria-label':(key==='size'?'Размер':'Цвет')+' · '+product.name_ru});
    if(key==='size' && values.length>1){
      const first=selectOption('','Размер',!item.size);
      first.disabled=true;select.append(first);
      if(missingSizes && !item.size) select.setAttribute('aria-invalid','true');
    }
    select.append(...values.map(v=>selectOption(v,v,v===item[key])));
    return select;
  }
  function renderKit() {
    const list=Object.keys(model.slots).filter(slot=>state.look[slot]).map(slot=>[slot,state.look[slot]]);
    const oldScroll=kitItems.scrollTop;
    const fragment=document.createDocumentFragment();
    let total=0;
    let purchasable=false;
    for(const [slot,item] of list){
      const product=byProduct.get(item.id);
      const price=getPriceFor(product,item.size);
      total+=price;
      purchasable ||= price>0;
      const card=el('div',{class:'kit-item'}),info=el('div',{class:'kit-info'});
      const layer={base:'Первый слой',top:'Средний слой',outer:'Верхний слой'};
      if(layer[slot]) info.append(el('span',{class:'kit-layer'},layer[slot]));
      info.append(el('b',{},product.name_ru),el('small',{},productPriceLabel(product,item.size)));
      const opts=el('div',{class:'kit-options'});
      for(const key of ['size','color']){
        const input=variant(product,item,key,slot);if(input)opts.append(input);
      }
      info.append(opts);
      const remove=el('button',{class:'kit-remove',type:'button','data-remove':slot,'aria-label':'Снять '+product.name_ru});
      remove.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
      card.append(thumbnail(product,item.color),info,remove);fragment.append(card);
    }
    if(!list.length)fragment.append(el('p',{class:'kit-empty'},'Открой «Вещи» и примерь что-нибудь из каталога.'));
    kitItems.replaceChildren(fragment);kitItems.scrollTop=oldScroll;
    byId('kitCount').textContent=list.length;
    byId('kitPrice').textContent=byId('mobilePrice').textContent=formatPrice(total);
    byId('kitBuy').disabled=!purchasable;
  }
  function changePart(value) {
    state.parts[part]=model.bounds(Math.round(value),0,100);
    const pair={armL:'armR',armR:'armL',calfL:'calfR',calfR:'calfL'};
    if(paired && pair[part])state.parts[pair[part]]=state.parts[part];
    byId('partValue').textContent=state.parts[part];redraw();
  }

  root.addEventListener('click',event=>{
    if(!state) return;
    const btn=event.target.closest('button');
    if(!btn) return;
    const {mode,tab:nextTab,action,key,remove}=btn.dataset;
    if(btn.dataset.category){
      const rail=btn.classList.contains('stage-slot');
      category=btn.dataset.category;tab='wear';
      if(rail) {
        const selected=byProduct.get(state.look[category]?.id);
        section=selected?.category || products.find(p=>model.cuts[p.id].slot===category)?.category || section;
      }
      quickSlot=rail && window.matchMedia?.('(max-width:800px)').matches?category:null;
      renderControls();
      if(rail){
        root.querySelector('.stage-slot[data-category="'+category+'"]')?.focus({preventScroll:true});
        if(quickSlot)byId('quickWear').scrollIntoView({block:'nearest'});
      }else controls.querySelector('#wearHeading')?.focus({preventScroll:true});
      return;
    }
    if(mode && mode!==state.mode) {
      state=loadDraft(mode);tab='face';quickSlot=null;missingSizes=false;
      persist();renderControls();renderKit();updatePreview();
      if(mode==='friend')byId('athleteName')?.focus({preventScroll:true});return;
    }
    if(nextTab){tab=nextTab;quickSlot=null;renderControls();return;}
    if(remove){delete state.look[remove];persist();renderKit();if(tab==='wear')renderControls();else renderRails();updatePreview();return;}
    if(!action) return;
    if(action==='wear-section'||action==='wear-back'){
      if(action==='wear-section')section=key;
      const former=category;
      category=quickSlot=null;
      renderControls(action==='wear-section'?`[data-action="wear-section"][data-key="${section}"]`:
        `.wear-categories [data-category="${former}"]`);
      return;
    }
    if(action==='close-quick'){
      const old=quickSlot;quickSlot=null;renderQuick();
      root.querySelector('.stage-slot[data-category="'+old+'"]')?.focus({preventScroll:true});return;
    }
    if(action==='part'){part=key;renderControls(`[data-action="part"][data-key="${part}"]`);return;}
    if(action==='wear'){
      const p=byProduct.get(key);if(!p) return;
      const slot=model.cuts[key].slot;
      if(state.look[slot]?.id===key) delete state.look[slot]; else model.equip(state,p);
      missingSizes=false;renderKit();
    } else if(action==='skin'||action==='tint') state[action]=Number(key);
    else if(action==='frame'||action==='hair'||action==='beard') state[action]=key;
    const inQuick=!!btn.closest('#quickWear');
    const selector=`[data-action="${action}"][data-key="${key}"]`;
    persist();updatePreview();renderControls(inQuick?null:selector);
    if(inQuick)byId('quickWear').querySelector(selector)?.focus({preventScroll:true});
  });
  controls.addEventListener('input',event=>{
    if(event.target.id==='athleteName'){
      state.name=Array.from(event.target.value).slice(0,24).join('').trim();
      updatePreview();persist();
    }else if(event.target.id==='partSize'){changePart(Number(event.target.value));}
  });
  byId('quickWear').addEventListener('keydown',event=>{
    if(event.key==='Escape')byId('quickWear').querySelector('[data-action="close-quick"]')?.click();
  });
  controls.addEventListener('change',event=>{
    const input=event.target;
    if(input.id==='limbsTogether')paired=input.checked;
    if(input.id==='partSize')persist();
  });
  kitItems.addEventListener('change',event=>{
    const {slot,variant:key}=event.target.dataset;
    if(!slot || !key) return;
    const item=state.look[slot],product=byProduct.get(item.id);
    if(!(product[key==='size'?'sizes':'colors']||[]).includes(event.target.value)) return;
    item[key]=event.target.value;persist();updatePreview();renderKit();
    kitItems.querySelector(`[data-slot="${slot}"][data-variant="${key}"]`)?.focus({preventScroll:true});
    if(tab==='wear')renderControls();
  });
  let drag=null;
  function editPickedPart(key) {
    if(tab==='body' && part===key) return;
    tab='body';part=key;quickSlot=null;renderControls();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!pickPart || !event.isPrimary || event.button!==0) return;
    const box=canvas.getBoundingClientRect();
    const key=pickPart((event.clientX-box.left)*canvas.width/box.width,(event.clientY-box.top)*canvas.height/box.height);
    if(key) drag={key, id:event.pointerId, x:event.clientX, y:event.clientY, value:state.parts[key], width:box.width, moved:false};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved){
      if(Math.abs(dy)>8 && Math.abs(dy)>Math.abs(dx)){drag=null;return;}
      if(Math.abs(dx)<6) return;
      drag.moved=true;canvas.setPointerCapture(event.pointerId);editPickedPart(drag.key);
    }
    changePart(drag.value+dx*200/drag.width);
    byId('partSize').value=state.parts[part];
  });
  function finishDrag(event) {
    if(!drag || event.pointerId!==drag.id) return;
    if(drag.moved) persist();
    else if(event.type==='pointerup') editPickedPart(drag.key);
    drag=null;
  }
  canvas.addEventListener('pointerup',finishDrag);
  canvas.addEventListener('pointercancel',finishDrag);
  canvas.addEventListener('pointerleave',()=>{if(drag && !drag.moved) drag=null;});
  byId('athleteRandom').addEventListener('click',()=>{
    if(!state) return;
    model.randomize(state);persist();renderControls();updatePreview();
  });

  byId('kitBuy').addEventListener('click',()=>{
    if(!state) return;
    const items=Object.values(state.look).filter(item=>getMinPrice(byProduct.get(item.id))>0);
    if(!items.length) return;
    // Validate the complete selection before adding the first item.
    const needsSize=items.some(item=>{
      const product=byProduct.get(item.id);
      return product.sizes?.length && !product.sizes.includes(item.size);
    });
    if(needsSize){
      missingSizes=true;renderKit();
      kitItems.querySelector('[aria-invalid=true]')?.focus();
      notice('Выбери размеры отмеченных вещей.');return;
    }
    for(const item of items) addToCart(byProduct.get(item.id),item.size||null,item.color||null);
    openCart();
    if(items.length<Object.keys(state.look).length)notice('Бандана осталась в образе. Её цена уточняется.');
  });

  function loadImage(url) {
    return new Promise(resolve=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;
    });
  }
  async function loadArtwork(){
    const loading=byId('stageLoading'), retry=byId('retryArt');
    loading.hidden=false;loading.firstElementChild.textContent='Загружаем персонажа…';retry.hidden=true;
    const [gym,logo,atlas,shoe,black,graphite,olive]=await Promise.all([
      loadImage('images/athlete/comic-gym.webp'),
      loadImage('images/athlete/wordmark.png'),
      loadImage('images/athlete/comic-wardrobe.webp'),
      loadImage('images/athlete/comic-shoe.webp'),
      loadImage('images/athlete/bandana-black.webp'),
      loadImage('images/athlete/bandana-graphite.webp'),
      loadImage('images/athlete/bandana-olive.webp')
    ]);
    assets.gym=gym;assets.logo=logo;assets.atlas=atlas;assets.shoe=shoe;
    assets.bandanas={'Чёрный':black,'Графитовый':graphite,'Оливковый':olive};
    if(!atlas||!shoe){
      loading.firstElementChild.textContent='Не удалось загрузить персонажа.';retry.hidden=false;redraw();return false;
    }
    if(logo){
      const dark=document.createElement('canvas');dark.width=logo.width;dark.height=logo.height;
      const c=dark.getContext('2d');c.drawImage(logo,0,0);c.globalCompositeOperation='source-in';
      c.fillStyle='#30263e';c.fillRect(0,0,dark.width,dark.height);assets.darkLogo=dark;
    }
    loading.hidden=true;byId('saveStory').disabled=false;redraw();return true;
  }
  let artReady=loadArtwork();
  byId('retryArt').addEventListener('click',()=>{artReady=loadArtwork();});
  byId('saveStory').addEventListener('click',async()=>{
    if(!state) return;
    const button=byId('saveStory');button.disabled=true;
    try{
      if(!await artReady)throw new Error('art');
      const poster=document.createElement('canvas');poster.width=1080;poster.height=1920;
      AthleteArt.paint(poster,state,assets,true);
      const blob=await new Promise((ok,fail)=>poster.toBlob(b=>b?ok(b):fail(new Error('PNG')),'image/png'));
      const url=URL.createObjectURL(blob);
      const link=el('a',{href:url,download:'XPODIUM-athlete.png'});document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      notice('Картинка для сторис готова.');
    }catch {notice('Не удалось сохранить картинку. Попробуй ещё раз.');}
    finally{button.disabled=!assets.atlas||!assets.shoe;}
  });
  function shareURL() {
    const url=new URL(location.href);
    url.search='';url.hash='look='+model.encode(state);return url.href;
  }
  byId('shareLook').addEventListener('click',async()=>{
    if(!state)return;
    const link=shareURL();
    if(navigator.share){
      try{await navigator.share({title:state.name || 'Атлет XPODIUM',url:link});return;}
      catch(e){if(e.name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(link);notice('Ссылка на образ скопирована.');}
    catch{
      const input=byId('manualShare');input.hidden=false;input.value=link;input.focus();input.select();
      notice('Скопируй ссылку на образ.');
    }
  });
  if ('IntersectionObserver' in window) {
    const watchKit=new IntersectionObserver(entries=>{
      byId('mobileKit').hidden=entries[0].isIntersecting;
    });
    watchKit.observe(byId('athleteKit'));
  }
  byId('mobileKit').addEventListener('click',event=>{
    event.preventDefault();byId('athleteKit').scrollIntoView({block:'start'});
  });
  function sharedDraft() {
    return location.hash.startsWith('#look=') ? model.normalize(model.decode(location.hash.slice(6)),products) : null;
  }
  window.addEventListener('hashchange',()=>{
    if(!state) return;
    const shared=sharedDraft();
    if(!shared) return;
    state=shared;drafts[state.mode]=state;tab='face';quickSlot=null;missingSizes=false;
    byId('manualShare').hidden=true;renderControls();renderKit();updatePreview();
  });
  async function start() {
    controls.replaceChildren(el('p',{class:'studio-hint'},'Загружаем гардероб…'));
    const catalog=await loadProducts();
    if(!Array.isArray(catalog)||!catalog.length){
      const retry=el('button',{type:'button',class:'studio-try'},'Загрузить ещё раз');
      retry.addEventListener('click',start,{once:true});
      controls.replaceChildren(el('p',{class:'studio-hint'},'Не удалось загрузить каталог.'),retry);
      return;
    }
    products=model.available(catalog);byProduct=new Map(products.map(p=>[p.id,p]));
    const shared=sharedDraft();
    const mode=readStorage(storageKey+'.last')==='friend'?'friend':'self';
    state=shared||loadDraft(mode);
    if (shared && !drafts[shared.mode]) drafts[shared.mode]=shared;
    renderControls();renderKit();updatePreview();
  }
  if('ResizeObserver' in window)new ResizeObserver(redraw).observe(canvas);
  else window.addEventListener('resize',redraw);
  await start();
})();
