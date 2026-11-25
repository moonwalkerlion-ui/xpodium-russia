// The comic wardrobe and the touch targets use the same front-view rig.
const AthleteArt = (() => {
  const width=820, height=1190, cx=410, top=145, resolution=.78;
  const normal={head:48,shoulders:52,chest:50,belly:35,hips:48,armR:52,armL:52,calfR:48,calfL:48};
  const fabricColours={'navyblue':'#34465a','drak grey':'#62665f','long':'#d7d9d0','short':'#d7d9d0'};
  const textures=new Map(), printLogos=new Map();
  let lastSprite=null, lastShape=null, lastSticker=null, activeAtlas=null;
  let layers={};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const bell=(y,center,radius)=>Math.exp(-((y-center)**2)/(radius*radius));
  function surface(w,h,assets) {
    const canvas=assets.makeCanvas?assets.makeCanvas(w,h):document.createElement('canvas');
    canvas.width=w;canvas.height=h;return canvas;
  }
  function resetLayer(name,w,h,assets){
    if(!layers[name])layers[name]=surface(w,h,assets);
    const canvas=layers[name],ctx=canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);
    return canvas;
  }
  function dyeName(value) {
    const s=(value||'').trim().toLowerCase();
    if(!s || /ч[её]рный|black/.test(s))return '#333a38';
    if(/белый|white/.test(s))return '#eef0f2';
    if(s==='лавандовый')return '#ad8ac1';
    if(fabricColours[s])return fabricColours[s];
    return getSwatchColor(value);
  }
  function worn(state,slot) {
    const item=state.look[slot];if(!item)return null;
    const colours=(item.color||'').split('+');
    return {id:item.id,cut:AthleteModel.cuts[item.id].cut,color:item.color,tone:dyeName(colours[0]),trim:colours[1]?dyeName(colours[1]):null};
  }
  function colouredSprite(key, colour, kind, assets) {
    const rect=AthleteSprites[key];if(!rect)return null;
    const tag=[key,colour,kind].join('|');
    if(textures.has(tag))return textures.get(tag);
    const [x,y,w,h]=rect, tile=surface(w,h,assets), ctx=tile.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(assets.atlas,x,y,w,h,0,0,w,h);
    if(colour){
      const pixels=ctx.getImageData(0,0,w,h), a=pixels.data, target=rgb(colour);
      const reference=kind==='skin'?167:kind==='gear'?80:kind==='hair'?68:kind==='sock'?215:143;
      // Recolour the filled areas while keeping the comic ink, the teeth and the whites of the eyes.
      const lut=new Uint8ClampedArray(256*3);
      for(let v=0;v<256;v++){
        const shadow=Math.min(v/reference,1.0)**.9, highlight=Math.max(0,v-reference)/(255-reference);
        for(let c=0;c<3;c++){
          const base=target[c]*shadow;
          lut[3*v+c]=base+(255-base)*highlight*(kind==='gear'?.7:kind==='skin'?.85:.89);
        }
      }
      for(let i=0;i<a.length;i+=4){
        if(!a[i+3])continue;
        const r=a[i],g=a[i+1],b=a[i+2];
        const v=Math.round(.27*r+.58*g+.15*b);
        const ink=smooth(26,58,v);
        const strength=kind==='skin'?ink*smooth(.12,.37,(r-b)/Math.max(35,r)):ink;
        if(!strength)continue;
        for(let c=0;c<3;c++)a[i+c]+=(lut[3*v+c]-a[i+c])*strength;
      }
      ctx.putImageData(pixels,0,0);
    }
    // Keep the current outfit and a few recently tried pieces without retaining every variant.
    if(textures.size>=28){
      const oldest=textures.keys().next().value;
      textures.get(oldest).width=1;textures.delete(oldest);
    }
    textures.set(tag,tile);return tile;
  }
  function compose(state,assets) {
    const pose=state.frame, female=pose==='curved', dy=female?37:0;
    const items=Object.keys(state.look).sort().map(slot=>[slot,state.look[slot].id,state.look[slot].color]);
    const key=JSON.stringify([pose,state.skin,state.hair,state.beard,state.tint,items]);
    if(lastSprite?.key===key)return lastSprite;
    const bitmap=resetLayer('outfit',Math.round(width*resolution),Math.round(height*resolution),assets);
    const ctx=bitmap.getContext('2d',{willReadFrequently:true});
    ctx.scale(resolution,resolution);ctx.translate(cx,top);ctx.lineJoin='round';ctx.lineCap='round';
    function tile(key,tone,kind,x,y,w,h){
      const tex=colouredSprite(key,tone,kind,assets);if(!tex)return;
      ctx.drawImage(tex,x,y,w,h);
    }
    function plate(cut,tone,kind='fabric'){
      const key=pose+'/'+cut, rect=AthleteSprites[key];
      tile(key,tone,kind,...rect.slice(4));
    }
    function path(d,fill,stroke=null,n=1){
      const p=new Path2D(d);
      if(fill){ctx.fillStyle=fill;ctx.fill(p);}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=n;ctx.stroke(p);}
    }
    function logo(x,y,w,tone,ink){
      const sum=rgb(tone).reduce((s,c,i)=>s+c*[.3,.55,.15][i],0);
      let mark=sum>142?assets.darkLogo:assets.logo;
      if(ink && assets.logo){
        if(!printLogos.has(ink)){
          const dyed=surface(assets.logo.width,assets.logo.height,assets), brush=dyed.getContext('2d');
          brush.drawImage(assets.logo,0,0);brush.globalCompositeOperation='source-in';
          brush.fillStyle=ink;brush.fillRect(0,0,dyed.width,dyed.height);printLogos.set(ink,dyed);
        }
        mark=printLogos.get(ink);
      }
      if(!mark)return;
      ctx.globalAlpha=.87;ctx.drawImage(mark,x-w/2,y,w,w*mark.height/mark.width);ctx.globalAlpha=1;
    }
    const suit=worn(state,'suit'), base=suit||worn(state,'base'), bottom=suit||worn(state,'bottom');
    const shirt=worn(state,'top'), jacket=worn(state,'outer'), waist=worn(state,'waist'), knees=worn(state,'knees');
    const elbows=worn(state,'elbows'), wrists=worn(state,'wrists'), grips=worn(state,'grips'), bag=worn(state,'bag');
    const prop=worn(state,'handheld'), sock=worn(state,'socks'), hat=worn(state,'headwear');
    const hair=AthleteModel.hairColors[state.tint][1], skin=AthleteModel.skin[state.skin][1];
    function gear(key,tone,x,y,w,h,rotation=0,mirror=false,cuff=null){
      ctx.save();ctx.translate(x,y);ctx.rotate(rotation);if(mirror)ctx.scale(-1,1);
      tile('gear/'+key,tone,'gear',-w/2,0,w,h);
      if(cuff){
        ctx.beginPath();ctx.rect(-w/2,h*.738,w,h*.262);ctx.clip();
        tile('gear/'+key,cuff,'gear',-w/2,0,w,h);
      }
      ctx.restore();
    }
    if(bag?.cut==='pack'){
      const mini=bag.id==='mini-backpack';
      gear('pack',bag.tone,female?99:122,(mini?272:196)+dy,mini?122:177,mini?184:284,-.13);
    }
    if(bag?.cut==='tote')gear('tote',bag.tone,138,258+dy,151,246,-.06);
    plate('body',state.skin===2?null:skin,'skin');
    if(sock){
      plate(sock.id,sock.tone,'sock');
      if(sock.id==='basic-logo-socks'||sock.id==='lifting-socks'){
        const y=sock.id==='lifting-socks'?839:880;
        logo(-96,y,30,sock.tone);logo(96,y,30,sock.tone);
      }
    }
    if(base){plate('bra',base.tone);logo(0,female?332:306,59,base.tone);}
    if(bottom){
      plate(suit?'leggings':bottom.cut,bottom.tone);
      logo(suit||bottom.cut==='leggings'?72:-62,female?462:446,36,bottom.tone);
    }
    if(shirt){
      plate(shirt.cut,shirt.tone);
      if(shirt.trim && shirt.cut.startsWith('raglan')){
        ctx.save();const sleeves=new Path2D(`M-270 122 L-43 ${155+dy} Q-114 ${196+dy} -109 ${310+dy} L-118 465H-280Z M270 122 L43 ${155+dy} Q114 ${196+dy} 109 ${310+dy} L118 465H280Z`);ctx.clip(sleeves);plate(shirt.cut,shirt.trim);ctx.restore();
      }
      const inks={'Белый + Серый':'#747775','Лавандовый':'#624379','Графитовый + Серый':'#3c98c7'};
      const small=shirt.id.includes('small-logo');
      logo(small?-60:0,222+dy,small?35:shirt.id.includes('big-logo')?144:107,shirt.tone,inks[shirt.color]);
    }
    if(jacket){
      plate(jacket.cut,jacket.tone);
      if(jacket.cut==='hood')logo(0,234+dy,91,jacket.tone);
      else logo(72,238+dy,35,jacket.tone);
    }
    if(bag){
      // A rucksack hangs on one shoulder, with the pack behind the body and its webbing in front.
      const shoulder=166+dy;
      path(`M58 ${shoulder+4} Q67 ${shoulder-3} 85 ${shoulder+6} Q114 ${shoulder+75} 107 ${shoulder+112} Q119 ${shoulder+149} 133 ${shoulder+160} L119 ${shoulder+173} Q86 ${shoulder+132} 86 ${shoulder+107} Q87 ${shoulder+63} 58 ${shoulder+4}Z`,bag.tone,'#302439',3);
      path(`M67 ${shoulder+7} Q100 ${shoulder+79} 95 ${shoulder+109} L108 ${shoulder+138}`,null,'#ad9fb3',2.2);
      ctx.save();ctx.translate(100,shoulder+122);ctx.rotate(-.28);ctx.strokeStyle='#b7aec2';ctx.lineWidth=3.3;ctx.strokeRect(-8,-7,16,13);ctx.restore();
    }
    if(waist)gear('belt',waist.tone,0,female?408:388,female?171:196,48);
    if(assets.shoe)ctx.clearRect(-cx,978,width,40);
    for(const sign of [-1,1]){
      if(assets.shoe){
        ctx.save();ctx.scale(sign,1);
        ctx.drawImage(assets.shoe,female?69:68,927,female?120:128,87);
        ctx.restore();
      }
      if(knees){
        const y=female?661:650;
        gear('knee',knees.tone,sign*(female?74:77),y,94,115,-sign*.13,sign<0);
      }
      if(elbows){const x=female?144:166,y=female?320:309;gear('knee',elbows.tone,x*sign,y,69,85,-sign*.40,sign<0);}
      if(wrists){const x=female?209:231;gear('wrap',wrists.tone,x*sign,female?494:474,48,41,-sign*.22,sign<0);}
      if(grips){
        const x=(female?211:230)*sign, yy=female?613:602;
        if(['tape','strap'].includes(grips.cut)){
          ctx.save();ctx.translate(x,yy-70);ctx.rotate(-sign*.18);
          path(grips.cut==='tape'?'M-13 1l21 3-2 10-21-3Z':'M-19-27q19 7 36 0l-2 12-15 1q20 37-1 72l-7-4q15-32-2-63l-10-3Z',grips.tone,'#242923',1.5);ctx.restore();
        }else{
          const sticky=grips.id==='xpodium-sticky-grips'||grips.id==='elite-sticky-grips';
          const navy=sticky && grips.color===DEEP_BLUE_COLOR;
          const oldBlue=grips.id==='xpodium-sticky-grips' && grips.color==='Синий';
          const tone=navy?'#a3bafa':oldBlue?'#e8eced':grips.tone;
          const cuff=navy?grips.tone:oldBlue?'#009bd0':null;
          gear(grips.cut==='holes'?'holes':'grip',tone,x,yy,60,117,Math.PI+sign*.11,sign>0,cuff);
        }
      }
    }
    if(prop?.cut==='bottle')gear('bottle',prop.tone,-(female?216:240),female?557:542,43,131,.12);
    if(prop?.cut==='rope'){
      const x=female?210:233,y=female?567:553;
      path(`M${-x} ${y} C-315 833 -209 961 0 965 C210 971 313 825 ${x} ${y}`,null,'#263431',5);
      path(`M${-x} ${y+4} C-311 831 -207 958 0 962 C209 966 309 824 ${x} ${y+4}`,null,prop.tone,2);
      for(const sign of [-1,1])path(`M${(x+6)*sign} ${y-15}l${-9*sign} 55`,null,'#272d29',9);
    }
    const hairDims={crop:[-69,-40,134,85],curls:[-80,-48,157,101],crest:[-66,-66,128,116],bob:[-82,-36,160,170],bun:[-64,-69,125,122]};
    if(state.hair!=='bald'){
      const [x,y,w,h]=hairDims[state.hair];ctx.save();
      if(hat?.cut==='cap'){const lower=new Path2D();lower.rect(-170,27+dy,340,195);ctx.clip(lower);}
      tile('hair/'+state.hair,state.tint===0?null:hair,'hair',x,y+dy,w,h);ctx.restore();
    }
    if(state.beard!=='none'){
      ctx.save();
      if(state.beard==='moustache'){const upper=new Path2D();upper.ellipse(2,78+dy,30,9,0,0,2*Math.PI);ctx.clip(upper);}
      if(state.beard==='stubble')ctx.globalAlpha=.28;
      tile('hair/beard',state.tint===0?null:hair,'hair',-60,55+dy,121,state.beard==='stubble'?82:95);ctx.restore();
    }
    if(hat?.cut==='bandana'){
      ctx.save();
      ctx.translate(0,dy-13);
      const ink='#271f34';
      path('M46 25 Q67 23 83 32 L103 30 L91 48 L106 59 Q78 60 59 43Z',hat.tone,ink,3);
      const fold='M-66 28 Q-61 11 -43 4 Q-16 -4 -4 -27 Q18 -11 46 0 Q63 11 66 34 Q63 48 55 54 Q3 44 -58 54 Q-66 45 -66 28Z';
      path(fold,hat.tone,ink,4);
      const fabric=assets.bandanas?.[hat.color];
      if(fabric){
        ctx.save();ctx.clip(new Path2D(fold));
        ctx.drawImage(fabric,-67,-25,134,81);ctx.restore();
        path(fold,null,ink,3);
      }
      path('M-62 46 Q1 36 60 46',null,'#d1c8d55e',1.6);
      ctx.restore();
    }else if(hat){
      gear(hat.cut==='cap'?'cap':'band',hat.tone,hat.cut==='cap'?7:0,(hat.cut==='cap'?-35:12)+dy,hat.cut==='cap'?156:128,hat.cut==='cap'?87:29);
    }
    lastSprite={key,canvas:bitmap};lastShape=lastSticker=null;return lastSprite;
  }
  // A monotone cross-section at each height expands the body and the clothes together.
  // The two halves are independent so one arm or one calf can have a different width.
  function rowMap(y,side,p,curved){
    const offset=curved?32:0, jaw=131+offset, head=1+(p.head-48)*.0095;
    const upper=smooth(jaw-18,jaw+51,y), legs=smooth(560,641,y);
    const shoulder=(p.shoulders-52)*.93*bell(y,207+offset,92);
    const trunk=96+(curved?-10:8)+18*bell(y,258+offset,84)-11*bell(y,386,55);
    const trunkDelta=shoulder+(p.chest-50)*.75*bell(y,252+offset,78)+(p.belly-35)*1.30*bell(y,390+offset*.35,85)+(p.hips-48)*.70*bell(y,529,98);
    const armMid=(curved?112:132)+clamp((y-210-offset)*.35,0,curved?103:102);
    const armHalf=19+19*bell(y,310+offset,130);
    const armDelta=(p[side<0?'armR':'armL']-52)*.018*armHalf*(.18+.82*bell(y,315+offset,158));
    const inner=Math.min(trunk,armMid-armHalf-3), outer=armMid+armHalf;
    const targetTrunk=Math.max(12,inner+trunkDelta);
    const mid=Math.max(armMid+shoulder*.75+Math.max(0,trunkDelta)*.53,targetTrunk+armHalf+armDelta+2);
    const armTip=mid+armHalf+armDelta;
    const legMid=clamp(66+(y-590)*.101,65,111);
    const legHalf=clamp(45-(y-610)*.052,22,47);
    const thigh=(p.hips-48)*.56*bell(y,604,124), calf=(p[side<0?'calfR':'calfL']-48)*.81*bell(y,803,86);
    const legDelta=thigh+calf;
    const legIn=Math.max(1,legMid-legHalf-.72*legDelta),legOut=legMid+legHalf+legDelta;
    function bend(v){
      let arm;
      if(v<=inner)arm=v*targetTrunk/inner;
      else if(v<=armMid)arm=targetTrunk+(mid-targetTrunk)*(v-inner)/(armMid-inner);
      else if(v<=outer)arm=mid+(armTip-mid)*(v-armMid)/(outer-armMid);
      else arm=v+armTip-outer;
      let leg;
      if(v<=legMid-legHalf)leg=v*legIn/(legMid-legHalf);
      else if(v<=legMid+legHalf)leg=legIn+(legOut-legIn)*(v-legMid+legHalf)/(2*legHalf);
      else leg=v+legOut-legMid-legHalf;
      return ((1-upper)*v*head+upper*arm)*(1-legs)+leg*legs;
    }
    const keys=[0,inner,armMid,outer,legMid-legHalf,legMid+legHalf,cx].sort((a,b)=>a-b);
    return [keys,keys.map(bend)];
  }
  function shape(sprite,state,assets){
    const p=state.parts, key=Object.values(p).join(',');
    if(lastShape?.sprite===sprite && lastShape.key===key)return lastShape.canvas;
    if(Object.keys(normal).every(k=>p[k]===normal[k]))return sprite.canvas;
    const src=sprite.canvas,sw=src.width,sh=src.height;
    const result=resetLayer('shape',sw,sh,assets),ctx=result.getContext('2d');
    if(!sprite.pixels)sprite.pixels=new Uint32Array(src.getContext('2d').getImageData(0,0,sw,sh).data.buffer);
    if(!layers.warpPixels)layers.warpPixels=ctx.createImageData(sw,sh);
    const pixels=layers.warpPixels,dst=new Uint32Array(pixels.data.buffer),curved=state.frame==='curved';
    dst.fill(0);
    const jaw=curved?163:131,head=1+(p.head-48)*.0095;
    for(let iy=0;iy<sh;iy++){
      const y=iy/resolution-top, sourceY=y<jaw?jaw+(y-jaw)/head:y;
      const sy=Math.round((sourceY+top)*resolution);if(sy<0||sy>=sh)continue;
      for(const side of [-1,1]){
        const [a,b]=rowMap(sourceY,side,p,curved);
        for(let j=1;j<a.length;j++){
          if(b[j]<=b[j-1])continue;
          const l=Math.max(0,Math.ceil((cx+(side>0?b[j-1]:-b[j]))*resolution)),r=Math.min(sw,Math.ceil((cx+(side>0?b[j]:-b[j-1]))*resolution));
          const slope=(a[j]-a[j-1])/(b[j]-b[j-1]);
          let sx=cx*resolution+side*a[j-1]*resolution+(l-(cx+side*b[j-1])*resolution)*slope;
          for(let ix=l;ix<r;ix++,sx+=slope){const k=Math.round(sx);if(k>=0&&k<sw)dst[iy*sw+ix]=sprite.pixels[sy*sw+k];}
        }
      }
    }
    ctx.putImageData(pixels,0,0);lastSticker=null;lastShape={key,sprite,canvas:result};return result;
  }
  function sticker(portrait,assets){
    if(lastSticker?.source===portrait)return lastSticker.canvas;
    const w=portrait.width,h=portrait.height,mask=resetLayer('outline',w,h,assets),m=mask.getContext('2d');
    m.drawImage(portrait,0,0);m.globalCompositeOperation='source-in';m.fillStyle='#fffaf3';m.fillRect(0,0,w,h);
    const result=resetLayer('sticker',w,h,assets),ctx=result.getContext('2d');
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;ctx.drawImage(mask,Math.round(4.5*Math.cos(a)),Math.round(4.5*Math.sin(a)));
    }
    ctx.drawImage(portrait,0,0);
    lastSticker={source:portrait,canvas:result};return result;
  }
  function paint(canvas,state,assets,story=false){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#ffda82';ctx.fillRect(0,0,w,h);
    if(assets.gym){const img=assets.gym,scale=Math.max(w/img.width,h/img.height);ctx.drawImage(img,(w-img.width*scale)/2,(h-img.height*scale)/2,img.width*scale,img.height*scale);}
    if(!assets.atlas)return ()=>null;
    if(activeAtlas!==assets.atlas){activeAtlas=assets.atlas;layers={};textures.clear();printLogos.clear();lastSprite=lastShape=lastSticker=null;}
    const curved=state.frame==='curved',jaw=curved?163:131,head=1+(state.parts.head-48)*.0095;
    const hairTop=({crest:-66,bun:-69,curls:-48,crop:-40,bob:-36,bald:-20})[state.hair]+(curved?37:0);
    const peak=jaw+(hairTop-jaw)*head, ground=story?.84:.935;
    const scale=Math.min((h*(ground-(story?.13:.055)))/(1013-peak),w/(story?680:795));
    const baseY=h*ground-1013*scale;
    ctx.save();ctx.translate(w/2,h*ground-3*scale);ctx.scale(scale,scale);
    ctx.fillStyle='#4c708a62';ctx.beginPath();ctx.ellipse(5,1,180,22,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const portrait=sticker(shape(compose(state,assets),state,assets),assets);
    ctx.drawImage(portrait,w/2-cx*scale,baseY-top*scale,width*scale,height*scale);
    if(story){
      ctx.textAlign='center';ctx.fillStyle='#30263e';
      if(state.name){
        ctx.font=`800 ${Math.round(w*.066)}px Manrope, Arial, sans-serif`;
        ctx.strokeStyle='#fffcf2';ctx.lineWidth=w*.008;ctx.lineJoin='round';
        ctx.strokeText(state.name,w/2,h*.91,w*.86);ctx.fillText(state.name,w/2,h*.91,w*.86);
      }
      if(assets.darkLogo){const m=assets.darkLogo,mw=w*.31;ctx.drawImage(m,(w-mw)/2,h*.946,mw,mw*m.height/m.width);}
    }
    return function hit(x,y){
      const xx=(x-w/2)/scale,yy=(y-baseY)/scale,sourceY=yy<jaw?jaw+(yy-jaw)/head:yy;
      if(sourceY<hairTop-2||sourceY>1014)return null;
      const side=xx<0?-1:1,[a,b]=rowMap(sourceY,side,state.parts,curved),d=Math.abs(xx);
      let origin=d;for(let j=1;j<b.length;j++)if(d>=b[j-1] && d<=b[j]){origin=a[j-1]+(d-b[j-1])*(a[j]-a[j-1])/(b[j]-b[j-1]);break;}
      if(sourceY<jaw+13)return origin<76?'head':null;
      if(sourceY>647)return origin>22 && origin<165?(side<0?'calfR':'calfL'):null;
      if(sourceY<221+(curved?30:0))return origin<178?'shoulders':null;
      if(origin>110 && origin<270 && sourceY<620)return side<0?'armR':'armL';
      if(origin>140)return null;
      return sourceY<315+(curved?20:0)?'chest':sourceY<465?'belly':'hips';
    };
  }
  return {paint};
})();
