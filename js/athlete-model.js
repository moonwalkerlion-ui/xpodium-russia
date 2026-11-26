// The drawing only knows garment cuts. The shop supplies product names, options and prices.
const AthleteModel = (() => {
  const slots = {
    base: 'Бра', top: 'Футболки и майки', outer: 'Худи', bottom: 'Шорты и брюки',
    suit: 'Спортивные костюмы', headwear: 'Головные уборы', waist: 'Пояса',
    knees: 'Наколенники', elbows: 'Налокотники', wrists: 'Кистевые бинты', sweatbands: 'Напульсники',
    grips: 'Накладки и лямки', socks: 'Носки', bag: 'Рюкзаки и сумки', handheld: 'В руки'
  };
  const cuts = {};
  function register(slot, cut, ...ids) {
    ids.forEach(id => { cuts[id] = { slot, cut }; });
  }
  register('top', 'tee', 'pro-t-shirts', 'light-fit-t-shirt');
  register('top', 'crop', 'girls-t-shirts');
  register('top', 'loose', 'oversized-shirts', 'oversized-shirts-big-logo', 'oversized-shirts-small-logo');
  register('top', 'raglan', '3-4-sleeves-t-shirt');
  register('top', 'raglanCrop', '3-4-sleeves-t-shirt-shorts');
  register('top', 'vest', 'pro-vest', 'girls-vest');
  register('base', 'bra', 'sports-bra');
  register('outer', 'hood', 'basic-logo-hoodie');
  register('outer', 'zip', 'hoodie');
  register('bottom', 'short', 'shorts-1-0');
  register('bottom', 'training', 'shorts-2-0', 'shorts-3-0');
  register('bottom', 'compression', 'compression-shorts', 'leggings-short');
  register('bottom', 'leggings', 'leggings-long');
  register('bottom', 'jogger', 'long-pants');
  register('suit', 'set', 'zhenskiy-kostyum-xpodium');
  register('headwear', 'cap', 'cap-big-logo', 'cap-small-logo');
  register('headwear', 'bandana', 'xpodium-bandana');
  register('headwear', 'band', 'head-bands');
  register('waist', 'belt', 'pr-belt');
  register('knees', 'sleeve', 'knee-sleeves-1-0', 'knee-sleeves-2-0', 'knee-sleeves-3-0', 'ultra-knee-leeves');
  register('elbows', 'sleeve', 'elbow-sleeves-3-0');
  register('wrists', 'wrap', 'wristband-1-0', 'wristband-2-0', 'wristband-3-0');
  register('sweatbands', 'terry', 'sweat-band');
  register('grips', 'grip', 'xpodium-sticky-grips', 'elite-sticky-grips', 'suede-grip', 'xpodium-carbon-grips', 'xpodium-3-0-grip-white', 'xpodium-3-0-grip-black');
  register('grips', 'holes', 'suede-grip-with-hole', 'xpodium-carbon-grips-with-hole');
  register('grips', 'strap', 'lifting-strap');
  register('grips', 'tape', 'hookgrip-tape');
  register('socks', 'sock', 'basic-logo-socks', 'lifting-socks', 'weightlifting-socks');
  register('bag', 'pack', 'backpack-1-0', 'backpack-2-0', 'backpack-medium-small', 'mini-backpack');
  register('bag', 'tote', 'satchel');
  register('handheld', 'rope', 'jump-rope', 'jump-rope-2-0');
  register('handheld', 'bottle', 'sport-bottle');

  const skin = [
    ['Фарфоровый','#ffdac0'], ['Песочный','#eab689'], ['Медовый','#c88052'],
    ['Каштановый','#95573e'], ['Тёмно-коричневый','#603d36'], ['Глубокий коричневый','#3d292b'],
    ['Угольный','#383441'], ['Кобальт','#6883fb'], ['Мятный','#83e4ac'],
    ['Сиреневый','#b497ec'], ['Коралловый','#f67869'], ['Лимонный','#f2da65']
  ];
  const hairColors = [
    ['Графит','#35303c'], ['Каштан','#6c4438'], ['Медь','#b9603e'],
    ['Блонд','#eac68a'], ['Седой','#d4d2d3'], ['Розовый','#e77c9d']
  ];
  const hairstyles = {
    crop:'Короткая', buzz:'Ёжик', sidePart:'Боковой пробор', quiff:'Квифф', curls:'Кудри', crest:'Ирокез',
    bob:'Каре', waves:'Длинные волны', bun:'Пучок', ponytail:'Высокий хвост', braids:'Две косы', bald:'Налысо'
  };
  const beards = {
    none:'Без бороды', stubble:'Щетина', moustache:'Усы', goatee:'Эспаньолка',
    short:'Короткая борода', beard:'Густая борода', long:'Длинная борода'
  };
  const parts = {
    head:'Голова', shoulders:'Плечи', chest:'Грудь', belly:'Живот', hips:'Бёдра',
    armR:'Правая рука', armL:'Левая рука', calfR:'Правая икра', calfL:'Левая икра'
  };
  const normal = { head:48, shoulders:52, chest:50, belly:35, hips:48, armR:52, armL:52, calfR:48, calfL:48 };
  const bounds = (n, low, high) => Math.min(high, Math.max(low, n));
  const choose = list => list[Math.floor(Math.random() * list.length)];
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  function available(products) {
    return products.filter(p => p && own(cuts, p.id) && String(p.brand).trim().toUpperCase() === 'XPODIUM' &&
      p.hidden !== true && p.in_stock !== false && (Number(p.price) > 0 || p.id === 'xpodium-bandana'));
  }
  function fresh(friend = false) {
    return { version:2, mode:friend ? 'friend' : 'self', name:'', frame:friend ? 'curved' : 'straight',
      skin:friend ? 4 : 2, hair:friend ? 'bun' : 'crop', tint:0, beard:'none',
      parts:{...normal},
      look:{} };
  }
  function starting(products, friend) {
    const state = fresh(friend);
    Object.assign(state.parts, friend ? {head:65,hips:57,calfR:70} : {head:70,shoulders:56,armR:75,armL:43});
    state.skin=friend ? 4 : 7;
    const starter = friend ? [['girls-t-shirts','Жёлтый'],['leggings-short','Чёрный']] :
      [['pro-t-shirts','Розовый'],['shorts-3-0','Чёрный']];
    starter.push(['lifting-socks','Белый']);
    for (const [id,color] of starter) {
      const product = products.find(p => p.id === id);
      if (product) equip(state, product, color);
    }
    return state;
  }
  function equip(state, product, preferredColor) {
    const slot = cuts[product.id].slot;
    // The shop sells the sports bra and leggings in this set as one SKU.
    if (slot === 'suit') { delete state.look.base; delete state.look.bottom; }
    if (slot === 'bottom' || slot === 'base') delete state.look.suit;
    const sizes = product.sizes || [], colors = product.colors || [];
    state.look[slot] = { id:product.id, color:resolveProductColor(product, preferredColor) || colors[0] || '',
      size:sizes.length === 1 ? sizes[0] : '' };
  }
  function normalize(input, products) {
    if (!input || ![1,2].includes(input.version)) return null;
    const state = fresh(input.mode === 'friend');
    state.name = typeof input.name === 'string' ? Array.from(input.name.trim()).slice(0,24).join('') : '';
    state.frame = input.frame === 'curved' ? 'curved' : 'straight';
    for (const [key, list] of [['skin',skin], ['tint',hairColors]]) {
      if (Number.isInteger(input[key])) state[key] = bounds(input[key], 0, list.length-1);
    }
    if (own(hairstyles, input.hair)) state.hair = input.hair;
    if (own(beards, input.beard)) state.beard = input.beard;
    for (const key of Object.keys(parts)) {
      const value = input.parts && input.parts[key];
      if (Number.isFinite(value)) state.parts[key] = bounds(Math.round(value), 0, 100);
    }
    for (const savedSlot of Object.keys(slots)) {
      const item = input.look && input.look[savedSlot];
      if (!item || typeof item !== 'object') continue;
      const product = products.find(p => p.id === item.id);
      if (!product) continue;
      const slot = cuts[product.id].slot;
      const legacyTop = input.version === 1 && savedSlot === 'top' && ['base','outer'].includes(slot);
      const legacySweatband = savedSlot === 'wrists' && item.id === 'sweat-band';
      if (slot !== savedSlot && !legacyTop && !legacySweatband) continue;
      if (legacySweatband && input.look.sweatbands?.id === item.id) continue;
      equip(state, product, item.color);
      if ((product.sizes || []).includes(item.size)) state.look[slot].size = item.size;
    }
    return state;
  }
  function randomize(state) {
    state.frame = choose(['straight','curved']);
    state.skin = Math.floor(Math.random()*skin.length);
    state.hair = choose(Object.keys(hairstyles));
    state.tint = Math.floor(Math.random()*hairColors.length);
    state.beard = choose(Object.keys(beards));
    for (const key of Object.keys(parts)) state.parts[key] = Math.round(12 + Math.random()*65);
    state.parts[choose(['armR','armL','belly','head','shoulders','calfL','calfR'])] = 100;
  }
  function encode(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decode(value) {
    if (!value || value.length > 8000) return null;
    try {
      const text = atob(value.replace(/-/g,'+').replace(/_/g,'/'));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(text, c => c.charCodeAt(0))));
    } catch { return null; }
  }
  return { slots, cuts, skin, hairColors, hairstyles, beards, parts, bounds, available, starting, equip, normalize, randomize, encode, decode };
})();
