// The comic wardrobe and the touch targets use the same front-view rig.
const AthleteArt = (() => {
  const width=820, height=1190, cx=410, top=145, resolution=.78;
  const normal={head:48,shoulders:52,chest:50,belly:35,hips:48,armR:52,armL:52,calfR:48,calfL:48};
  const fabricColours={'drak grey':'#62665f','long':'#d7d9d0','short':'#d7d9d0'};
  const textures=new Map(), printLogos=new Map(), contours=new Map();
  const hairDims={crop:[-69,-40,134,85],curls:[-80,-48,157,101],crest:[-66,-66,128,116],bob:[-82,-36,160,170],bun:[-64,-69,125,122]};
  const hairPeaks={bald:-21,buzz:-25,sidePart:-34,quiff:-56,waves:-39,ponytail:-54,braids:-31};
  const hairstyles={
    buzz:{front:'M-55 43 Q-68 22 -56 0 Q-40-23 -10-24 Q29-29 48-5 Q58 9 58 38 L51 39 L48 18 Q43 3 32 1 Q20 0 12 8 Q-11-2 -40 14 L-50 43Z',
      shade:'M-59 14 Q-37-25 -2-23 Q24-24 42-9 Q3-24 -39 6 L-54 30Z', lines:'M-42 0l-5 6 M-33-5l-6 5 M-22-9l-6 5 M-9-11l-7 5 M7-13l-6 4 M22-12l-5 3 M34-8l-5 2'},
    sidePart:{front:'M-57 51 Q-71 35 -65 7 Q-60-25 -30-30 Q-3-42 23-27 Q49-29 61-5 Q66 13 59 44 L52 47 Q50 24 40 13 L26-5 Q3 15 -14 10 Q-35 12 -48 28 L-50 50Z',
      shade:'M-59 13 Q-41-31 13-27 L25-21 Q-8 9 -31 5 Q-51 8 -59 26Z M30-23 Q60-17 61 12 L58 22 Q50-1 30-15Z', lines:'M-59 23 Q-35-4 6-14 M-49 6 Q-30-17 5-23 M-21 6 Q2 4 24-16 M35-14 Q54-3 57 10'},
    quiff:{front:'M-57 46 Q-69 34 -65 8 Q-60-8 -49-14 Q-58-22 -56-38 Q-38-28 -26-34 Q-2-49 18-54 Q44-60 53-40 Q61-25 44-17 Q68-11 61 21 L55 44 L49 45 Q49 17 35 10 Q5 23 -29 20 Q-43 21 -50 45Z',
      shade:'M-53-36 Q-35-25 -12-39 Q26-61 44-47 Q54-41 49-34 Q30-50 -9-21 Q-37-8 -53-36Z M-58 6 Q-41-12 -14-13 Q18-14 38-24 Q29 0 2 4 Q-30 6 -58 23Z', lines:'M-42-23 Q-24-15 8-38 Q29-51 40-41 M-51 10 Q-30-4 -3-7 Q23-11 37-19 M-31 14 Q4 15 32 1 M45-10 Q59-1 55 16'},
    waves:{back:'M-51-14 Q-82-9 -80 30 Q-88 59 -73 96 Q-64 117 -75 138 Q-91 155 -79 184 Q-39 201 -27 150 L38 144 Q52 183 81 186 Q102 176 85 149 Q75 131 85 111 Q104 82 88 54 Q85 37 78 14 Q74-14 39-22Z',
      backLines:'M-70 16 Q-86 51 -63 94 Q-48 120 -66 157 Q-72 169 -63 179 M72 27 Q82 55 78 77 Q67 108 75 128 Q86 149 80 170',
      front:'M-61 64 Q-78 45 -71 11 Q-68-26 -34-33 Q-4-47 29-29 Q72-25 75 19 Q82 42 66 75 Q60 89 69 103 Q79 122 65 139 Q49 151 54 174 Q32 161 45 139 Q54 123 47 111 Q41 96 53 76 Q61 57 51 35 Q36 19 24-10 Q10 21 -27 20 Q-43 25 -47 43 L-51 73 Q-62 89 -55 101 Q-43 122 -55 145 Q-78 165 -64 182 Q-90 175 -75 146 Q-60 124 -70 108 Q-81 90 -61 64Z',
      shade:'M-68 30 Q-79-23 -30-32 Q12-44 20-24 Q6-32 -25-16 Q-58-11 -68 30Z M26-25 Q67-16 70 25 Q70 55 60 65 Q71 17 39-6Z', lines:'M-67 31 Q-47 7 -22 1 Q9-8 17-20 M29-20 Q48 4 58 15 Q70 36 60 56 M-66 65 Q-76 90 -64 106 Q-55 122 -67 145 M58 83 Q52 96 61 110 Q70 125 55 142'},
    ponytail:{back:'M39-15 Q57-52 84-39 Q111-25 104 12 Q94 45 106 61 Q123 88 107 119 Q97 146 115 155 Q82 157 76 136 Q72 118 86 97 Q100 76 81 54 Q68 34 75 6 Q80-13 64-14 L54 2Z',
      backLines:'M68-26 Q97-40 97-6 Q97 15 89 36 Q84 52 98 70 Q113 92 94 122 Q84 138 100 147 M72-21 Q83-25 86-13 Q90-2 84 14',
      front:'M-58 52 Q-70 23 -66 5 Q-57-30 -11-33 Q21-44 40-27 Q52-22 63-4 Q66 22 57 47 L51 48 Q52 29 45 18 Q32 12 27-5 Q13 12 -12 12 Q-40 13 -49 31 L-51 53Z',
      shade:'M-63 13 Q-54-23 -23-28 Q9-37 28-25 Q3-25 -17-13 Q-38-3 -57 24Z', lines:'M-54 8 Q-38-13 -17-17 Q6-23 23-24 M-50 22 Q-26 4 -5 2 Q17-1 26-15 M34-22 Q52-15 58 3'},
    braids:{front:'M-57 53 Q-68 34 -64 9 Q-59-23 -20-28 Q-8-34 2-28 Q16-34 33-26 Q60-19 65 8 Q68 31 55 53 L49 51 Q52 31 45 19 Q21 17 3-10 Q-13 17 -43 20 Q-50 36 -50 54Z',
      shade:'M-61 21 Q-60-24 -9-27 Q-10-16 -19-9 Q-35-8 -55 26Z M10-25 Q52-27 63 11 Q41-15 15-15Z', lines:'M-57 21 Q-37 3 -17-5 Q-4-13 0-24 M-52 8 Q-38-9 -17-16 M9-23 Q21-7 42 0 Q53 5 58 18 M23-18 Q43-16 53-4'}
  };
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
  // Read the solid runs of an atlas plate in rig coordinates. The same plate is
  // used to render the character, so attachments follow the visible silhouette.
  function silhouette(key,assets){
    if(contours.has(key))return contours.get(key);
    const [sx,sy,sw,sh,x,y,w,h]=AthleteSprites[key];
    const ctx=surface(sw,sh,assets).getContext('2d',{willReadFrequently:true});
    ctx.drawImage(assets.atlas,sx,sy,sw,sh,0,0,sw,sh);
    const rgba=ctx.getImageData(0,0,sw,sh).data, rows=[];
    for(let py=0;py<sh;py++){
      const runs=[];
      let start=-1;
      for(let px=0;px<=sw;px++){
        if(px<sw && rgba[(py*sw+px)*4+3]>110){
          if(start<0)start=px;
        }else if(start>=0){
          if(px-start>2)runs.push([x+start*w/sw,x+px*w/sw]);
          start=-1;
        }
      }
      rows.push(runs);
    }
    const profile=at=>rows[Math.floor((at-y)*sh/h)]||[];
    contours.set(key,profile);
    return profile;
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
    const sweatband=worn(state,'sweatbands');
    const prop=worn(state,'handheld'), sock=worn(state,'socks'), hat=worn(state,'headwear');
    const hair=AthleteModel.hairColors[state.tint][1], skin=AthleteModel.skin[state.skin][1];
    const ink='#2b2032', body=silhouette(pose+'/body',assets);
    const tint=(tone,amount)=>{
      const target=amount<0?[32,24,41]:[255,245,226];
      return 'rgb('+rgb(tone).map((c,i)=>Math.round(c+(target[i]-c)*Math.abs(amount))).join(',')+')';
    };
    const middle=([left,right])=>(left+right)/2;
    const partBounds=(y,x,over=[])=>{
      const spans=[body,...over].map(profile=>profile(y).find(([left,right])=>left<=x && right>=x)).filter(Boolean);
      return [Math.min(...spans.map(run=>run[0])),Math.max(...spans.map(run=>run[1]))];
    };
    const armBounds=(y,side)=>{
      const x=side*(female?208:229);
      const spans=body(y).filter(([left,right])=>side*(side<0?left:right)>150);
      return spans.find(([left,right])=>left<=x && right>=x) || (side<0?spans.at(0):spans.at(-1));
    };
    // Draw just the front of the garment. The curved hems sit over the leg,
    // arm or waist instead of showing the empty opening of a product cutout.
    function garmentBand(bounds, start, end, ease, curve, tone, design){
      const [left,right]=bounds(start).map((x,i)=>x+(i?ease:-ease));
      const [lo,hi]=bounds(end).map((x,i)=>x+(i?ease:-ease));
      const side=(edge,from,to)=>{
        const steps=Math.ceil(Math.abs(to-from)/6), points=[];
        for(let i=1;i<=steps;i++){
          const y=from+(to-from)*i/steps;
          points.push([bounds(y)[edge]+(edge?ease:-ease),y]);
        }
        return points.map(([x,y])=>`L${x} ${y}`).join(' ');
      };
      const shape=`M${left} ${start} Q${(left+right)/2} ${start+curve} ${right} ${start} ${side(1,start,end)} Q${(lo+hi)/2} ${end+curve} ${lo} ${end} ${side(0,end,start)}Z`;
      const fill=ctx.createLinearGradient(Math.min(left,lo),0,Math.max(right,hi),0);
      fill.addColorStop(0,tint(tone,-.47));fill.addColorStop(.23,tint(tone,.2));
      fill.addColorStop(.64,tone);fill.addColorStop(1,tint(tone,-.44));
      path(shape,fill,ink,2.8);
      ctx.save();ctx.clip(new Path2D(shape));
      const seam=(y,d,colour,width=1.8)=>{
        const [a,b]=bounds(clamp(y,start,end));
        path(`M${a-ease-1} ${y} Q${(a+b)/2} ${y+d} ${b+ease+1} ${y}`,null,colour,width);
      };
      design({seam,center:middle(bounds((start+end)/2)),left,right,lo,hi});
      ctx.restore();
    }
    const shoeTop=945;
    function drawSocks(side){
      const start={'basic-logo-socks':861,'lifting-socks':807,'weightlifting-socks':757}[sock.id];
      const end=shoeTop+14, tone=sock.tone;
      const bounds=y=>partBounds(y,side*100);
      garmentBand(bounds,start,end,2,9,tone,({seam,center,left,right,lo,hi})=>{
        for(let i=1;i<9;i++){
          const from=left+(right-left)*i/9, to=lo+(hi-lo)*i/9;
          const mid=middle(bounds((start+end)/2))+(i-4.5)*5.1;
          path(`M${from} ${start} Q${mid} ${(start+end)/2} ${to} ${end}`,null,tint(tone,i%2?.23:-.18),1.45);
        }
        seam(start+7,9,tint(tone,-.42),2.4);
        if(sock.id==='weightlifting-socks'){
          seam(start+16,9,tint(tone,-.66),6);seam(start+26,9,tint(tone,-.66),5);
        }else logo(center,start+17,Math.min(37,right-left-10),tone);
      });
    }
    function drawShoe(side,back){
      // The rear collar sits behind the ankle. The padded front edge covers
      // the end of the sock, with the sole flat and the toe turned slightly out.
      const bounds=partBounds(shoeTop,side*100);
      ctx.save();ctx.translate(middle(bounds),shoeTop);
      ctx.scale(side*(bounds[1]-bounds[0])/48,1);
      if(back){
        path('M-28 14 Q-32 0 -25-5 Q-13-12 8-8 Q22-8 27-2 Q30 3 29 14 L25 24 H-23Z','#353640',ink,3.2);
        path('M-24 5 Q-20-4 -3-4 Q18-5 25 4 L22 17 H-23Z','#1b1d25','#54535b',2);
      }else{
        path('M-30 48 Q-28 59 -15 64 Q10 69 37 67 Q53 65 54 54 L51 45Z','#171922',ink,3.2);
        path('M-32 43 Q-35 49 -29 56 Q-18 66 19 64 Q45 65 53 57 Q57 53 52 44 L48 39Z','#c88c38',ink,3.2);
        path('M-29 49 Q-19 55 -4 56 Q14 66 40 59 Q49 57 53 52 M-8 58l4 3 M2 60l4 4 M34 59l-1 4 M42 57l-1 4',null,'#865123',1.8);
        const upper=ctx.createLinearGradient(0,0,0,61);
        upper.addColorStop(0,'#40424d');upper.addColorStop(.55,'#262b35');upper.addColorStop(1,'#191d28');
        path('M-28 8 Q-13 20 0 15 Q11 13 23 6 Q28 8 27 18 Q31 24 41 30 Q52 34 54 45 Q55 52 47 55 Q26 63 4 54 Q-11 49 -24 48 Q-36 44 -31 32 Q-28 22 -28 8Z',upper,ink,3.3);
        path('M-25 10 Q-14 20 -3 19 Q10 17 24 8 M-27 17 Q-14 25 -6 24',null,'#666774',2);
        path('M-10 21 Q4 15 15 15 L36 35 Q24 45 10 44 Q0 31 -10 21Z','#151923','#555866',2.1);
        path('M-8 24L16 20 M-2 30L22 25 M4 36L28 30 M11 41L34 35',null,'#8c8c96',2);
        path('M-26 30 Q-18 29 -12 36 L1 54 Q-12 49 -24 47 Q-33 42 -26 30Z','#353945',ink,2.1);
        path('M16 47 Q26 39 41 39 Q52 39 53 46 Q51 54 42 55 Q26 59 14 53Z','#373b47','#20232d',2);
        path('M22 48 Q35 44 45 46 M-24 40 Q-18 39 -14 44',null,'#575963',1.6);
      }
      ctx.restore();
    }
    function drawSleeve(bounds,start,end,tone,mark){
      garmentBand(bounds,start,end,3.4,12,tone,({seam,center,left,right,lo,hi})=>{
        path(`M${left} ${start+10} Q${center} ${start+32} ${hi} ${start+23} L${hi} ${end-8} Q${center+3} ${end-56} ${lo} ${end-25}Z`,tint(tone,-.28));
        seam(start+7,12,tint(tone,-.47),3);seam(end-5,12,tint(tone,.38),2);
        logo(center,end-19,mark,tone);
      });
    }
    function drawBelt(){
      const layers=[bottom&&(suit?'leggings':bottom.cut),base&&'bra',shirt?.cut].filter(Boolean).map(cut=>silhouette(pose+'/'+cut,assets));
      const bounds=y=>partBounds(y,0,layers);
      const start=female?390:380, end=start+42, tone=waist.tone;
      garmentBand(bounds,start,end,4,12,tone,({seam})=>{
        const rim=tint(tone,.45), fastener=tint(tone,-.53);
        seam(start+5,12,rim,2);seam(end-6,12,rim,2);
        path(`M-18 ${start+15} Q23 ${start+19} 70 ${start+11} L70 ${end-8} Q24 ${end} -18 ${end-2}Z`,fastener,ink,2);
        path(`M-18 ${start+7} Q-10 ${start+6} -2 ${start+8} L-2 ${end+1} Q-10 ${end+3} -18 ${end+1}Z`,tint(tone,.31),ink,2.6);
        path(`M-13 ${start+16} V${end-7}`,null,rim,2);
        logo(-55,start+19,53,tone);logo(36,start+19,40,tone);
      });
    }
    function drawWrist(side){
      const bounds=y=>armBounds(y,side);
      let end=female?527:507;
      const gripsWithCuff=grips && ['grip','holes'].includes(grips.cut);
      const wrap=(tone,kind,length)=>{
        const start=end-length;
        garmentBand(bounds,start,end,kind==='terry'?4:3,6,tone,({seam,center,left,right,lo,hi})=>{
          const detail=tint(tone,.49);
          if(kind==='terry')for(let i=1;i<12;i++){
            const p=i/12;
            path(`M${left+(right-left)*p} ${start} L${lo+(hi-lo)*p} ${end+5}`,null,detail,1.1);
          }
          seam(start+5,6,tint(tone,-.45),2);seam(end-4,6,detail,1.5);
          logo(center,start+length*.49,Math.min(34,right-left-6),tone);
        });
        end=start-3;
      };
      if(gripsWithCuff){
        const sticky=grips.id==='xpodium-sticky-grips'||grips.id==='elite-sticky-grips';
        const navy=sticky && grips.color===DEEP_BLUE_COLOR;
        const oldBlue=grips.id==='xpodium-sticky-grips' && grips.color==='Синий';
        const tone=navy?'#a3bafa':oldBlue?'#e8eced':grips.tone;
        const cuff=navy?grips.tone:oldBlue?'#009bd0':grips.tone;
        const center=middle(bounds(end)), sprite=colouredSprite('gear/'+(grips.cut==='holes'?'holes':'grip'),tone,'gear',assets);
        ctx.save();ctx.translate(center,end-9);ctx.rotate(side*.13);ctx.scale(side,-1);
        ctx.drawImage(sprite,0,0,sprite.width,Math.round(sprite.height*.74),-24,-69,48,69);
        ctx.restore();
        wrap(cuff,'grip',23);
      }
      if(wrists)wrap(wrists.tone,'wrap',31);
      if(sweatband)wrap(sweatband.tone,'terry',30);
      if(grips?.cut==='strap'||grips?.cut==='tape'){
        const x=middle(bounds(end+3));
        ctx.save();ctx.translate(x,end+3);ctx.rotate(-side*.22);
        const strap=grips.cut==='strap';
        path(strap?'M-22-8 Q0-2 22-8 L20 6 Q13 10 7 8 Q22 39 2 66 L-7 62 Q8 35 -6 9 Q-17 9 -22 6Z':'M-12 2 Q0-1 12 2 L12 11 Q0 8 -12 11Z',grips.tone,ink,2);
        ctx.restore();
      }
    }
    function drawHair(back){
      const style=hairstyles[state.hair], dims=hairDims[state.hair];
      if(!style && (!dims||back))return;
      ctx.save();
      if(!back && hat?.cut==='cap'){
        const visible=new Path2D();visible.rect(-170,28+dy,340,215);ctx.clip(visible);
      }
      if(dims){
        const [x,y,w,h]=dims;
        tile('hair/'+state.hair,state.tint===0?null:hair,'hair',x,y+dy,w,h);
      }else{
        ctx.translate(female?4:-6,dy);
        const dark=tint(hair,-.34), highlight=tint(hair,.27);
        if(back && style.back){path(style.back,dark,ink,4);path(style.backLines,null,highlight,2.3);}
        if(!back){
          path(style.front,hair,ink,4);path(style.shade,highlight);path(style.lines,null,dark,2.3);
          if(state.hair==='braids')for(const side of [-1,1]){
            ctx.save();ctx.scale(side,1);
            path('M51 42 Q69 40 69 59 Q76 66 70 80 Q79 87 73 100 Q81 109 75 122 Q84 130 76 143 Q80 161 88 173 Q73 180 66 168 L64 150 Q53 144 58 132 Q49 124 55 114 Q46 105 51 94 Q43 84 49 73 Q42 63 49 56Z',hair,ink,3.4);
            path('M49 56 Q52 65 65 70 M69 60 Q64 73 49 76 M50 79 Q56 89 70 92 M72 83 Q67 96 52 99 M54 101 Q61 110 75 113 M76 104 Q70 118 56 120 M58 124 Q64 135 77 136 M78 124 Q71 139 60 143',null,highlight,2.4);
            path('M63 147 Q68 150 77 144 L79 150 Q72 155 65 153Z','#9c70b1',ink,1.7);
            ctx.restore();
          }
          if(state.hair==='ponytail' && hat?.cut!=='cap')path('M42-25 Q54-31 60-35 L66-31 Q59-24 52-18Z','#9c70b1',ink,2.1);
        }
      }
      ctx.restore();
    }
    function drawBeard(){
      const style=state.beard;if(style==='none')return;
      const highlight=tint(hair,.27), shadow=tint(hair,-.34);
      ctx.save();ctx.translate(female?3:1,female?38:0);if(female)ctx.scale(.94,1);
      const mouth='M-27 80 Q-9 78 3 80 Q16 78 34 75 Q31 96 5 106 Q-19 106 -27 80Z';
      const trim={
        stubble:'M-47 75 Q-34 90 -25 99 Q-8 112 9 109 Q36 105 51 83 Q52 108 39 121 Q26 133 6 135 Q-21 134 -40 114 Q-49 97 -47 75Z',
        goatee:'M-20 103 Q1 111 23 101 Q27 118 17 130 L5 140 L-8 133 Q-23 122 -20 103Z',
        short:'M-51 67 Q-44 69 -42 82 Q-36 98 -24 100 Q-10 110 3 108 Q24 108 40 94 Q48 85 49 67 L55 68 Q56 86 52 105 Q49 125 31 134 Q16 143 3 143 Q-17 143 -34 129 Q-48 118 -50 101 Q-53 83 -51 67Z',
        beard:'M-54 61 Q-45 62 -42 82 Q-35 99 -24 103 Q-10 113 5 111 Q29 106 41 92 Q48 82 49 63 L56 62 Q60 89 53 109 Q53 130 34 144 L25 146 L17 157 L9 155 L1 160 L-8 155 L-16 155 Q-43 147 -50 122 Q-56 97 -54 61Z',
        long:'M-54 64 Q-46 65 -42 82 Q-35 98 -23 103 Q-9 114 6 110 Q31 105 43 89 Q49 78 50 63 L57 64 Q60 97 53 116 Q51 134 44 151 Q36 174 23 185 L14 183 L7 197 L-2 189 L-11 192 Q-35 178 -43 153 Q-52 130 -54 101Z'
      }[style];
      if(trim){
        const area=new Path2D(trim+' '+mouth);
        ctx.save();ctx.clip(new Path2D(trim));
        if(style==='stubble'){
          ctx.globalAlpha=.25;ctx.fillStyle=hair;ctx.fill(area,'evenodd');ctx.globalAlpha=.53;
          ctx.clip(area,'evenodd');
          for(let y=83;y<138;y+=4)for(let x=-52;x<55;x+=5){
            path(`M${x+(y%3)} ${y} l1.4 1.3`,null,hair,1.15);
          }
        }else{
          ctx.fillStyle=hair;ctx.fill(area,'evenodd');
          const end=style==='long'?187:style==='beard'?151:135;
          ctx.save();ctx.clip(area,'evenodd');
          path(`M-55 72 Q-51 114 -34 ${end-18} Q-21 ${end-1} -7 ${end} Q-29 ${end-31} -35 104Z M54 72 Q51 112 32 ${end-14} Q20 ${end-2} 13 ${end} Q37 ${end-36} 44 91Z`,shadow);
          path(`M-32 104 Q-26 130 -12 ${end-4} M-10 113 Q-10 124 -2 ${end-4} M10 119 Q8 ${end-21} 7 ${end-5} M31 107 Q26 ${end-23} 17 ${end-10}`,null,highlight,2.1);
          ctx.restore();
        }
        ctx.restore();
        if(style!=='stubble')path(trim,null,ink,2.5);
      }
      if(style!=='stubble'){
        path('M5 73 Q-2 67 -10 71 Q-20 78 -29 76 Q-24 84 -14 82 Q-3 82 5 78 Q14 82 24 79 Q31 77 33 71 Q27 74 20 70 Q10 68 5 73Z',hair,ink,1.9);
        path('M-22 78 Q-12 78 -6 73 M10 73 Q20 72 27 75',null,highlight,1.5);
      }
      ctx.restore();
    }
    function drawCap(){
      ctx.save();ctx.translate(female?4:-6,dy);
      const tone=hat.tone;
      path('M-59 38 Q-67 17 -61-8 Q-49-36 -11-41 Q26-45 49-24 Q66-10 67 24 Q17 19 -59 38Z',tone,ink,4);
      path('M-55 27 Q-60 6 -46-14 Q-32-31 -12-35 Q-27-24 -34-8 L-35 22Z',tint(tone,-.35));
      path('M-10-39 Q-34-10 -33 26 M-10-39 Q30-34 44 22',null,tint(tone,-.44),2.3);
      path('M-59 34 Q-15 16 28 16 Q66 14 90 36 Q98 43 88 46 Q58 49 43 41 Q-4 23 -59 36Z',tint(tone,.22),ink,3.6);
      path('M28 21 Q62 22 84 39',null,tint(tone,.5),1.9);
      logo(5,-13,hat.id==='cap-big-logo'?53:34,tone);
      ctx.restore();
    }
    function gear(key,tone,x,y,w,h,rotation=0){
      ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
      tile('gear/'+key,tone,'gear',-w/2,0,w,h);
      ctx.restore();
    }
    function drawHeldProp(){
      if(!prop)return;
      const y=female?558:540, left=middle(armBounds(y,-1)), right=middle(armBounds(y,1));
      if(prop.cut==='bottle'){
        gear('bottle',prop.tone,left+15,y-33,42,124,-.14);
        return;
      }
      const curve=`M${left} ${y+42} C${left-71} 837 -209 961 0 965 C210 971 ${right+74} 826 ${right} ${y+42}`;
      path(curve,null,ink,5);path(curve,null,prop.tone,2);
      for(const x of [left,right]){
        path(`M${x-4} ${y-16} l4 58`,null,ink,14);
        path(`M${x-7} ${y-14} l4 48`,null,tint(prop.tone,.25),3);
      }
    }
    if(bag?.cut==='pack'){
      const mini=bag.id==='mini-backpack';
      gear('pack',bag.tone,female?99:122,(mini?272:196)+dy,mini?122:177,mini?184:284,-.13);
    }
    if(bag?.cut==='tote')gear('tote',bag.tone,138,258+dy,151,246,-.06);
    drawHeldProp();
    drawHair(true);
    for(const side of [-1,1])drawShoe(side,true);
    ctx.save();
    ctx.beginPath();ctx.rect(-cx,-top,width,top+shoeTop+15);ctx.clip();
    plate('body',state.skin===2?null:skin,'skin');
    ctx.restore();
    if(sock)for(const side of [-1,1])drawSocks(side);
    if(base){plate('bra',base.tone);logo(0,female?332:306,59,base.tone);}
    const bottomCut=suit?'leggings':bottom?.cut;
    if(bottom && bottomCut!=='jogger')plate(bottomCut,bottom.tone);
    if(knees && bottomCut!=='jogger'){
      const over=bottomCut==='leggings'?[silhouette(pose+'/leggings',assets)]:[];
      for(const side of [-1,1])drawSleeve(y=>partBounds(y,side*76,over),female?660:651,female?768:760,knees.tone,36);
    }
    if(bottomCut==='jogger')plate(bottomCut,bottom.tone);
    if(bottom)logo(bottomCut==='leggings'?72:-62,female?462:446,
      /\bbig logo$/i.test(bottom.color)?49:/\bsmall logo$/i.test(bottom.color)?27:36,bottom.tone);
    for(const side of [-1,1])drawShoe(side,false);
    if(elbows)for(const side of [-1,1])drawSleeve(y=>armBounds(y,side),female?337:324,female?407:396,elbows.tone,28);
    if(shirt){
      plate(shirt.cut,shirt.tone);
      if(shirt.trim && shirt.cut.startsWith('raglan')){
        ctx.save();const sleeves=new Path2D(`M-270 122 L-43 ${155+dy} Q-114 ${196+dy} -109 ${310+dy} L-118 465H-280Z M270 122 L43 ${155+dy} Q114 ${196+dy} 109 ${310+dy} L118 465H280Z`);ctx.clip(sleeves);plate(shirt.cut,shirt.trim);ctx.restore();
      }
      const inks={'Белый + Серый':'#747775','Лавандовый':'#624379','Графитовый + Серый':'#3c98c7'};
      const small=shirt.id.includes('small-logo');
      logo(small?-60:0,222+dy,small?35:shirt.id.includes('big-logo')?144:107,shirt.tone,inks[shirt.color]);
    }
    if(waist)drawBelt();
    if(wrists||sweatband||grips)for(const side of [-1,1])drawWrist(side);
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
    drawBeard();
    drawHair(false);
    if(hat?.cut==='bandana'){
      ctx.save();
      ctx.translate(0,dy-13);
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
    }else if(hat?.cut==='cap'){
      drawCap();
    }else if(hat){
      const start=female?44:8;
      garmentBand(y=>partBounds(y,female?3:-6),start,start+21,4,12,hat.tone,({center,seam})=>{
        seam(start+6,12,tint(hat.tone,.29));logo(center,start+9,53,hat.tone);
      });
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
    if(activeAtlas!==assets.atlas){activeAtlas=assets.atlas;layers={};textures.clear();printLogos.clear();contours.clear();lastSprite=lastShape=lastSticker=null;}
    const curved=state.frame==='curved',jaw=curved?163:131,head=1+(state.parts.head-48)*.0095;
    const hat=worn(state,'headwear'), hairY=hairDims[state.hair]?.[1]??hairPeaks[state.hair];
    const hairTop=(hat?.cut==='cap'?Math.min(-43,hairY):Math.min(hairY,hat?.cut==='bandana'?-40:hairY))+(curved?37:0);
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
