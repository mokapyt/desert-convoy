(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
const ui={distance:$('distance'),fuelText:$('fuelText'),fuelBar:$('fuelBar'),healthText:$('healthText'),healthBar:$('healthBar'),overlay:$('overlay'),overlayTitle:$('overlayTitle'),overlayText:$('overlayText'),mainBtn:$('mainBtn'),pauseBtn:$('pauseBtn'),missionText:$('missionText'),toast:$('toast')};
let W=0,H=0,DPR=1,last=0,raf=0,toastTimer=0,state='menu',camera=0,elapsed=0,spawnAt=400,shake=0;
const input={boost:false,brake:false,tiltLeft:false,tiltRight:false,fire:false};
let fuel=86,health=100,speed=0,angle=0,angularV=0,vy=0,grounded=true,terrain=[],objects=[],particles=[],shots=[],enemies=[];
let collected=0,enemyKills=0,missionStage=0,fireCooldown=0;
const car={x:150,y:0,w:112,h:44};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);if(!terrain.length)generateTerrain();}
function groundY(x){const i=Math.max(0,Math.floor(x/70));while(terrain.length<=i+2){terrain.push(clamp(terrain[terrain.length-1]+rand(-34,34),H*.48,H*.82));}return lerp(terrain[i]||H*.7,terrain[i+1]||terrain[i]||H*.7,x/70-i);}
function generateTerrain(){terrain=[H*.72];for(let i=0;i<130;i++)terrain.push(clamp(terrain[terrain.length-1]+rand(-23,23),H*.49,H*.82));}
function toast(s){ui.toast.textContent=s;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500);}
function overlay(title,text,button){ui.overlayTitle.textContent=title;ui.overlayText.textContent=text;ui.mainBtn.textContent=button;ui.overlay.classList.remove('hidden');}
function reset(){camera=0;elapsed=0;spawnAt=420;fuel=86;health=100;speed=0;angle=0;angularV=0;vy=0;grounded=true;objects=[];particles=[];shots=[];enemies=[];collected=0;enemyKills=0;missionStage=0;fireCooldown=0;terrain=[];generateTerrain();car.x=Math.min(150,W*.2);car.y=groundY(car.x)-car.h;state='playing';ui.overlay.classList.add('hidden');mission();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
function mission(){ui.missionText.textContent=missionStage===0?`المهمة 1: اجمع الإمدادات (${collected}/3)`:missionStage===1?`المهمة 2: عطّل الحراس (${enemyKills}/3)`:'المهمة 3: وصل إلى نقطة العبور';}
function addObject(type,x){objects.push({type,x,y:groundY(x),used:false,phase:rand(0,6)});}
function addEnemy(x){enemies.push({x,y:groundY(x),hp:2,shot:rand(1.5,3),flash:0});}
function update(dt){
 if(state!=='playing')return;elapsed+=dt;
 speed+=((input.boost&&fuel>0)?300:0)*dt;speed-=(input.brake?430:0)*dt;speed-=speed*(input.boost?.055:.35)*dt;speed=clamp(speed,0,360);
 if(input.boost&&speed>15)fuel=Math.max(0,fuel-dt*1.25);
 if(input.tiltLeft)angularV-=2.1*dt;if(input.tiltRight)angularV+=2.1*dt;angularV-=angle*2*dt;angularV*=Math.pow(.08,dt);angle=clamp(angle+angularV*dt,-.62,.62);
 camera+=speed*dt;const gy=groundY(car.x+camera),target=gy-car.h+4;
 if(grounded)car.y=lerp(car.y,target,Math.min(1,dt*18));else{vy+=730*dt;car.y+=vy*dt;if(car.y+car.h>=gy){car.y=gy-car.h;vy=0;grounded=true;shake=3;}}
 if(speed>100&&Math.abs(angle)>.5)health-=dt*5.5;health=clamp(health,0,100);
 if(camera>spawnAt){let r=Math.random();addObject(r<.43?'crate':r<.72?'fuel':'scrap',camera+W+rand(0,140));if(Math.random()<.55)addEnemy(camera+W+rand(200,430));spawnAt=camera+rand(280,520);}
 for(const o of objects){if(o.used)continue;const sx=o.x-camera;if(Math.abs(sx-car.x-car.w*.5)<34&&Math.abs(o.y-car.y-car.h)<46){o.used=true;if(o.type==='crate'){health=Math.max(0,health-10);speed*=.65;shake=7;toast('اصطدام! تضررت المركبة');}else if(o.type==='fuel'){fuel=Math.min(100,fuel+20);collected++;toast('وقود وإمدادات +20%');}else{health=Math.min(100,health+12);collected++;toast('قطعة غيار +12%');}mission();}}
 fireCooldown=Math.max(0,fireCooldown-dt);
 if(input.fire&&fireCooldown<=0&&speed>15){shots.push({x:car.x+camera+car.w-3,y:car.y+15,life:1.2});fireCooldown=.24;}
 for(const s of shots){s.x+=560*dt;s.life-=dt;}
 shots=shots.filter(s=>s.life>0);
 for(const e of enemies){e.flash=Math.max(0,e.flash-dt);e.shot-=dt;if(e.shot<=0&&e.x-camera< W+40){e.shot=rand(2,4);if(Math.abs(e.x-camera-car.x)>90){health=Math.max(0,health-3);toast('إطلاق نار من الحراس!');shake=3;}}}
 for(const s of shots){for(const e of enemies){if(e.hp>0&&Math.abs(s.x-e.x)<24&&Math.abs(s.y-(e.y-28))<28){e.hp--;s.life=0;e.flash=.13;if(e.hp<=0){enemyKills++;toast('تم تعطيل حارس');mission();}}}}
 enemies=enemies.filter(e=>e.x-camera>-100&&e.hp>0);objects=objects.filter(o=>o.x-camera>-100);
 if(shake>0)shake=Math.max(0,shake-dt*20);
 if(missionStage===0&&collected>=3){missionStage=1;toast('اكتملت المهمة الأولى! احذر الحراس.');mission();}
 if(missionStage===1&&enemyKills>=3){missionStage=2;toast('الطريق أصبح آمنًا. اتجه إلى نقطة العبور.');mission();}
 if(health<=0){state='over';overlay('تعطلت المركبة','انتهت حالة المركبة. أعد المحاولة ووازن بين السرعة والحذر.','إعادة المحاولة');}
 if(camera>5000){state='won';overlay('وصلت إلى نقطة العبور!','أكملت الرحلة الأولى. هذه بداية حملتك في الصحراء.','رحلة جديدة');}
 ui.distance.textContent=Math.floor(camera/10)+' م';ui.fuelText.textContent=Math.round(fuel)+'%';ui.fuelBar.style.width=fuel+'%';ui.healthText.textContent=Math.round(health)+'%';ui.healthBar.style.width=health+'%';
}
function poly(points,fill,stroke,line=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function sky(){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#6e9db5');g.addColorStop(.5,'#b7c9c4');g.addColorStop(1,'#e3c39a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#f6d9a0';ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(W*.78,H*.2,Math.min(W,H)*.055,0,7);ctx.fill();ctx.globalAlpha=1;
 for(let l=0;l<4;l++){let y=H*(.39+l*.075);ctx.fillStyle=['#8aaab2','#78949a','#8c8d79','#9a886b'][l];ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+20;x+=24){let xx=x+camera*(.035+l*.035);ctx.lineTo(x,y+Math.sin(xx*.004+l)*H*.06+Math.sin(xx*.012)*H*.02);}ctx.lineTo(W,H);ctx.fill();}}
function terrainDraw(){ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+8;x+=8)ctx.lineTo(x,groundY(x+camera));ctx.lineTo(W,H);ctx.closePath();let g=ctx.createLinearGradient(0,H*.48,0,H);g.addColorStop(0,'#b79a73');g.addColorStop(.48,'#8e7458');g.addColorStop(1,'#4d4940');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#ddc39b';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=W+8;x+=8){const y=groundY(x+camera);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
 for(let i=0;i<38;i++){let x=((Math.floor(camera/67)+i)*67-camera%67);let y=groundY(x+camera);ctx.fillStyle=i%2?'#806b54':'#c2a27a';ctx.beginPath();ctx.ellipse(x,y+rand(5,13),rand(2,6),rand(1,3),0,0,7);ctx.fill();}}
function crate(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#484e4a';ctx.fillRect(-15,-30,30,30);ctx.strokeStyle='#d0c5ae';ctx.lineWidth=2;ctx.strokeRect(-14,-29,28,28);ctx.beginPath();ctx.moveTo(-12,-27);ctx.lineTo(12,-3);ctx.moveTo(12,-27);ctx.lineTo(-12,-3);ctx.stroke();ctx.restore();}
function itemDraw(o,x,y){if(o.type==='crate')return crate(x,y);ctx.save();ctx.translate(x,y);if(o.type==='fuel'){ctx.fillStyle='#b5a05d';ctx.fillRect(-10,-24,20,24);ctx.fillStyle='#e8d9a7';ctx.fillRect(-5,-29,10,6);ctx.fillStyle='#617d65';ctx.fillRect(-5,-17,10,11);}else{poly([[-12,-2],[-7,-20],[3,-24],[12,-12],[8,0]],'#77a398','#334a48',2);}ctx.restore();}
function vehicle(){ctx.save();ctx.translate(car.x+car.w/2,car.y+car.h/2);ctx.rotate(angle);ctx.translate(-car.w/2,-car.h/2);ctx.fillStyle='#24343a50';ctx.beginPath();ctx.ellipse(58,49,62,8,0,0,7);ctx.fill();
 poly([[4,20],[12,9],[29,4],[68,0],[91,9],[107,20],[111,31],[100,37],[12,37],[3,30]],'#34454a','#172a30',2);
 poly([[18,17],[27,5],[68,2],[86,11],[96,23],[15,26]],'#b8c6bf','#26353a',2);
 poly([[31,7],[43,5],[44,18],[25,20]],'#5e7d86','#26353a',1.5);poly([[49,5],[66,4],[80,13],[47,17]],'#a6d8dc','#26353a',1.5);poly([[69,5],[78,7],[88,17],[72,15]],'#8fc3cd','#26353a',1.5);
 ctx.strokeStyle='#27383d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(30,1);ctx.lineTo(67,-1);ctx.stroke();ctx.fillStyle='#bd6b4c';ctx.fillRect(51,-5,13,5);
 ctx.strokeStyle='#66777a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(47,18);ctx.lineTo(47,31);ctx.lineTo(70,31);ctx.stroke();ctx.fillStyle='#f4d89c';ctx.fillRect(104,21,5,5);ctx.fillStyle='#d65d4d';ctx.fillRect(5,22,5,6);
 for(let wx of [28,84]){ctx.fillStyle='#20272a';ctx.beginPath();ctx.arc(wx,34,14,0,7);ctx.fill();ctx.strokeStyle='#89908a';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#c9c5b6';ctx.beginPath();ctx.arc(wx,34,6,0,7);ctx.fill();ctx.strokeStyle='#536064';ctx.lineWidth=1.5;for(let a=0;a<4;a++){let an=a*Math.PI/2;ctx.beginPath();ctx.moveTo(wx,34);ctx.lineTo(wx+Math.cos(an)*10,34+Math.sin(an)*10);ctx.stroke();}}
 ctx.restore();if(speed>70&&Math.random()<.65)particles.push({x:car.x+rand(-5,10),y:car.y+car.h+rand(0,7),vx:rand(-55,-15),vy:rand(-24,-2),life:rand(.2,.6)});}
function enemyDraw(e,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#1d2b30';ctx.fillRect(-9,-31,18,29);ctx.fillStyle=e.flash?'#fff1b8':'#725b4c';ctx.fillRect(-8,-29,16,13);ctx.fillStyle='#c96c50';ctx.fillRect(-5,-25,3,3);ctx.fillRect(2,-25,3,3);ctx.strokeStyle='#28343a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-7,0);ctx.moveTo(5,-2);ctx.lineTo(7,0);ctx.stroke();ctx.fillStyle='#293c42';ctx.fillRect(6,-20,18,4);ctx.restore();}
function draw(dt){ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake*.4,shake*.4));sky();terrainDraw();for(const o of objects){let x=o.x-camera;if(x>-40&&x<W+50)itemDraw(o,x,groundY(o.x));}
 for(const e of enemies){let x=e.x-camera;if(x>-40&&x<W+40)enemyDraw(e,x,groundY(e.x));}
 for(const s of shots){let x=s.x-camera;ctx.fillStyle='#ffd37b';ctx.shadowColor='#ffad52';ctx.shadowBlur=9;ctx.fillRect(x,s.y,13,3);ctx.shadowBlur=0;}
 vehicle();for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=clamp(p.life*1.7,0,.45);ctx.fillStyle='#e0c8a3';ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0).slice(-70);
 let vg=ctx.createLinearGradient(0,0,0,H);vg.addColorStop(0,'#15242a05');vg.addColorStop(1,'#14201930');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();}
function loop(now){const dt=Math.min((now-last)/1000||0,.04);last=now;update(dt);draw(dt);if(state==='playing')raf=requestAnimationFrame(loop);}
function setInput(key,on){input[key]=on;let b=document.querySelector(`[data-key="${key}"]`);if(b)b.classList.toggle('active',on);}
document.querySelectorAll('[data-key]').forEach(b=>{let k=b.dataset.key;const down=e=>{e.preventDefault();setInput(k,true)},up=e=>{e.preventDefault();setInput(k,false)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});
const keyMap={ArrowUp:'boost',w:'boost',W:'boost',ArrowDown:'brake',s:'brake',S:'brake',ArrowLeft:'tiltLeft',a:'tiltLeft',A:'tiltLeft',ArrowRight:'tiltRight',d:'tiltRight',D:'tiltRight', ' ':'fire'};
addEventListener('keydown',e=>{if(keyMap[e.key]){e.preventDefault();setInput(keyMap[e.key],true);}if(e.key==='Escape'&&state==='playing')pause();});addEventListener('keyup',e=>{if(keyMap[e.key])setInput(keyMap[e.key],false);});
function pause(){if(state==='playing'){state='paused';overlay('استراحة قصيرة','رحلتك متوقفة مؤقتًا.','متابعة الرحلة');}else if(state==='paused'){state='playing';ui.overlay.classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop);}}
ui.mainBtn.addEventListener('click',()=>{if(state==='paused'){pause();return;}reset();});ui.pauseBtn.addEventListener('click',()=>{if(state==='playing'||state==='paused')pause();});
addEventListener('resize',resize);resize();car.y=groundY(car.x)-car.h;draw(0);
})();