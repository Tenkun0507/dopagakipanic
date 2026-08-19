(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>performance.now()/1000;
  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const safeStorage={
    get(key,fallback='0'){try{return window.localStorage?localStorage.getItem(key)??fallback:fallback}catch(_){return fallback}},
    set(key,value){try{if(window.localStorage)localStorage.setItem(key,String(value))}catch(_){}}
  };

  const els={
    full:$('fullnessText'),fullBar:$('fullnessBar'),dopa:$('dopamineText'),dopaBar:$('dopamineBar'),money:$('moneyText'),bread:$('breadText'),mochiChip:$('mochiChip'),energyChip:$('energyChip'),survival:$('survivalText'),best:$('bestText'),
    taskSuccess:$('taskSuccess'),taskMiss:$('taskMiss'),combo:$('comboText'),maxCombo:$('maxComboText'),
    eat:$('eatBtn'),toast:$('toastBtn'),fry:$('fryBtn'),toastButtonFill:$('toastButtonFill'),toastButtonText:$('toastButtonText'),toastButtonSub:$('toastButtonSub'),fryCookText:$('fryCookText'),fryCookFill:$('fryCookFill'),sweet:$('sweetSpot'),take:$('takeBtn'),
    energyBuy:$('energyBuyBtn'),mochiBuy:$('mochiBuyBtn'),energyButtonFill:$('energyButtonFill'),mochiButtonFill:$('mochiButtonFill'),energyBuyText:$('energyBuyText'),mochiBuyText:$('mochiBuyText'),energyBuySub:$('energyBuySub'),mochiBuySub:$('mochiBuySub'),
    shortArt:$('shortArt'),shortTitle:$('shortTitle'),shortTag:$('shortTag'),progress:$('videoProgress'),adCount:$('adCount'),shortStreak:$('shortStreak'),commentCount:$('commentCount'),like:$('likeBtn'),watch:$('watchBtn'),swipe:$('swipeBtn'),ad:$('ad'),adClose:$('adClose'),adWait:$('adWait'),adTimerFill:$('adTimerFill'),phone:$('phone'),
    eggStock:$('eggStockText'),eggTimerText:$('eggTimerText'),eggTimerFill:$('eggTimerFill'),
    start:$('startOverlay'),gameOver:$('gameOver'),overTitle:$('gameOverTitle'),overReason:$('gameOverReason'),result:$('resultText')
  };
  const buyButtons=[...document.querySelectorAll('.buyBtn')];
  const eggButtons=[...document.querySelectorAll('.eggSlot')];
  const eggEls=[0,1,2].map(i=>({btn:$(`eggSlot${i}`),rarity:$(`eggRarity${i}`),tap:$(`eggTap${i}`),reward:$(`eggReward${i}`),crack:$(`eggCrack${i}`)}));
  const taskEls=[0,1,2].map(i=>({
    prompt:$(`taskPrompt${i}`),area:$(`taskArea${i}`),reward:$(`taskReward${i}`),
    cooldown:$(`taskCooldown${i}`),cooldownText:$(`taskCooldownText${i}`),cooldownFill:$(`taskCooldownFill${i}`)
  }));

  const state={
    running:false,startedAt:0,lastTick:0,best:Number(safeStorage.get('dopagagiBestV4','0')||0),
    fullness:100,dopamine:100,money:120,bread:1,energyUntil:0,mochiUntil:0,
    task:{success:0,miss:0,combo:0,maxCombo:0,slots:Array.from({length:3},()=>({type:null,reward:15,answer:null,step:1,started:0,cooldownUntil:0,cooldownDuration:10}))},
    toast:{active:false,ready:false,start:0,duration:12},
    fry:{active:false,start:0,duration:10.5,sweetA:.742,sweetB:.792},
    short:{progress:0,duration:3.8,watching:false,liked:false,count:0,ended:false,endedAt:0,streak:0,ad:false,adProgress:0,adDuration:10,untilAd:rand(3,6)},
    eggs:{slots:[null,null,null],capacity:3,recharge:16,nextAt:0}
  };

  const shorts=[
    ['🐕','犬、急にテンションMAX','#おすすめ #犬'],['🍳','絶対失敗しない卵焼き','#料理 #時短'],['🧩','これ3秒で分かったら天才','#クイズ #暇つぶし'],['🐈','猫、箱に入りたい','#猫 #かわいい'],['🎮','この裏技知ってた？','#ゲーム #裏技'],['🍜','深夜2時の背徳ラーメン','#飯テロ #夜食'],['🕺','この動きクセになる','#ダンス #おすすめ'],['🤯','最後で全部ひっくり返る','#衝撃 #最後まで見て']
  ];

  function toastMsg(_text){}
  function addFull(v){state.fullness=clamp(state.fullness+v,0,100)}
  function addDopa(v){state.dopamine=clamp(state.dopamine+v,0,100)}
  function percent(left,total){return clamp(left/total,0,1)*100}
  function shortWatchRate(){return 3.0*(1+Math.min(state.short.streak,4)*0.07)}
  function shortFinishBonus(){return Math.round(3+Math.min(state.short.streak,4)*0.8)}

  function render(){
    const t=now();
    els.full.textContent=Math.ceil(state.fullness);els.fullBar.style.width=`${state.fullness}%`;
    els.dopa.textContent=Math.ceil(state.dopamine);els.dopaBar.style.width=`${state.dopamine}%`;
    els.money.textContent=Math.floor(state.money);els.bread.textContent=state.bread;
    els.survival.textContent=state.running?fmt(t-state.startedAt):'0:00';els.best.textContent=fmt(state.best);
    els.combo.textContent=state.task.combo;els.maxCombo.textContent=state.task.maxCombo;

    taskEls.forEach((el,i)=>{
      const slot=state.task.slots[i];
      const left=Math.max(0,slot.cooldownUntil-t);
      const cooling=left>0;
      el.cooldown.classList.toggle('hidden',!cooling);
      if(cooling){
        el.cooldownText.textContent=`${left.toFixed(1)}秒`;
        el.cooldownFill.style.width=`${clamp(1-left/(slot.cooldownDuration||10),0,1)*100}%`;
      }else{
        el.cooldownFill.style.width='0%';
      }
    });

    const eLeft=Math.max(0,state.energyUntil-t),mLeft=Math.max(0,state.mochiUntil-t);
    els.energyChip.textContent=eLeft>0?`エナドリ ${Math.ceil(eLeft)}秒`:'エナドリ OFF';
    els.mochiChip.textContent=mLeft>0?`もち ${Math.ceil(mLeft)}秒`:'もち OFF';

    buyButtons.forEach(b=>{
      const cost=Number(b.dataset.cost),item=b.dataset.item;
      const activeTimed=(item==='energy'&&eLeft>0)||(item==='mochi'&&mLeft>0);
      const ok=state.running&&state.money>=cost&&!activeTimed;
      b.classList.toggle('affordable',ok);b.classList.toggle('activeTimed',activeTimed);b.disabled=!state.running||!ok;
    });

    els.energyButtonFill.style.width=`${percent(eLeft,20)}%`;
    els.mochiButtonFill.style.width=`${percent(mLeft,35)}%`;
    els.energyBuyText.textContent=eLeft>0?`${eLeft.toFixed(1)}秒`:'220円';
    els.mochiBuyText.textContent=mLeft>0?`${mLeft.toFixed(1)}秒`:'150円';
    els.energyBuySub.textContent=eLeft>0?'ドーパミン減少半分':'20秒 ドーパミン減少半分';
    els.mochiBuySub.textContent=mLeft>0?'満腹度減少半分':'35秒 満腹度減少半分';


    els.eat.disabled=!state.running||state.bread<1;
    const toastCanStart=state.running&&state.bread>0&&!state.toast.active&&!state.toast.ready;
    els.toast.disabled=!state.running||(!state.toast.ready&&!toastCanStart);
    els.fry.disabled=!state.running||state.bread<1||state.fry.active;
    els.eat.classList.toggle('ready',state.running&&state.bread>0);
    els.toast.classList.toggle('ready',toastCanStart);
    els.toast.classList.toggle('toastDone',state.running&&state.toast.ready);
    els.fry.classList.toggle('ready',state.running&&state.bread>0&&!state.fry.active);

    if(state.toast.active){
      const elapsed=t-state.toast.start,left=Math.max(0,state.toast.duration-elapsed),p=clamp(elapsed/state.toast.duration,0,1);
      els.toastButtonFill.style.width=`${percent(left,state.toast.duration)}%`;
      els.toastButtonText.textContent=`トースト中 ${left.toFixed(1)}秒`;
      els.toastButtonSub.textContent='焼き上がるまで放置OK';
    }else if(state.toast.ready){
      els.toastButtonFill.style.width='100%';
      els.toastButtonText.textContent='焼き上がり！ 食べる';
      els.toastButtonSub.textContent='押すと満腹度 +34 / ドパ +4';
    }else{
      els.toastButtonFill.style.width='0%';els.toastButtonText.textContent='トースト';els.toastButtonSub.textContent='12秒で焼き上がる。完成後に押して食べる';
    }

    if(state.fry.active){
      const p=(t-state.fry.start)/state.fry.duration;
      els.fryCookFill.style.width=`${clamp(p,0,1)*100}%`;
      els.fryCookText.textContent=p<.62?'まだ早い':p<state.fry.sweetA?'もうすぐ':p<=state.fry.sweetB?'今！！！':p<=.93?'遅い！':'焦げる！';
      els.take.disabled=false;
    }else{
      els.fryCookFill.style.width='0%';els.fryCookText.textContent='待機中';els.take.disabled=true;
    }

    els.progress.style.width=`${clamp(state.short.progress/state.short.duration,0,1)*100}%`;
    els.watch.classList.toggle('watching',state.short.watching);els.watch.textContent=state.short.watching?'視聴中…（離すと停止）':'長押しで視聴';
    els.watch.disabled=!state.running||state.short.ad||state.short.ended;
    els.swipe.disabled=!state.running||state.short.ad||!state.short.ended;
    els.like.disabled=!state.running||state.short.ad;els.like.classList.toggle('liked',state.short.liked);const likeKey=state.short.liked?'1':'0';if(els.like.dataset.like!==likeKey){els.like.dataset.like=likeKey;els.like.innerHTML=state.short.liked?'♥<small>いいね</small>':'♡<small>いいね</small>';}
    els.shortStreak.textContent=`沼 ×${state.short.streak}`;
    els.shortStreak.classList.toggle('hot',state.short.streak>=3);
    els.adCount.textContent=state.short.ad?'広告中':`広告まであと ${state.short.untilAd}本`;
    els.adCount.classList.toggle('inAd',state.short.ad);
    const adReady=state.short.adProgress>=state.short.adDuration;
    els.adWait.textContent=adReady?'閉じられます':`×まで ${(state.short.adDuration-state.short.adProgress).toFixed(1)}秒`;
    els.adTimerFill.style.width=`${clamp(state.short.adProgress/state.short.adDuration,0,1)*100}%`;
    els.adClose.classList.toggle('hidden',!adReady);
    els.adClose.disabled=!adReady;

    const occupied=state.eggs.slots.filter(Boolean).length;
    els.eggStock.textContent=`たまご ${occupied}/${state.eggs.capacity}`;
    if(occupied>=state.eggs.capacity){
      els.eggTimerText.textContent='満タン';els.eggTimerFill.style.width='100%';
    }else{
      const left=Math.max(0,state.eggs.nextAt-t);
      els.eggTimerText.textContent=`次のたまご ${left.toFixed(1)}秒`;
      els.eggTimerFill.style.width=`${clamp(1-left/state.eggs.recharge,0,1)*100}%`;
    }
    state.eggs.slots.forEach((egg,i)=>{
      const e=eggEls[i];
      e.btn.classList.remove('empty','rarity-N','rarity-R','rarity-SR','rarity-SSR');
      if(!egg){
        e.btn.classList.add('empty');e.btn.disabled=true;e.rarity.textContent='--';e.tap.textContent='補充待ち';e.reward.textContent='';e.crack.style.width='0%';return;
      }
      e.btn.disabled=!state.running;e.btn.classList.add(`rarity-${egg.rarity}`);e.rarity.textContent=egg.rarity;
      e.tap.textContent=`あと ${egg.left}回`;e.reward.textContent=`ドパ +${egg.reward}`;e.crack.style.width=`${clamp((egg.clicks-egg.left)/egg.clicks,0,1)*100}%`;
    });
  }

  function freshSlot(){return {type:null,reward:15,answer:null,step:1,started:0,cooldownUntil:0,cooldownDuration:10}}
  function newTask(slotIndex){
    if(!state.running)return;
    const slot=state.task.slots[slotIndex],el=taskEls[slotIndex];
    const types=['bigger','color','sequence','calc','odd','memory'];
    slot.type=pick(types);slot.reward=rand(12,20);slot.answer=null;slot.step=1;slot.started=now();slot.cooldownUntil=0;slot.cooldownDuration=10;
    el.reward.textContent=`+${slot.reward}円`;el.area.innerHTML='';el.cooldown.classList.add('hidden');
    if(slot.type==='bigger')makeBigger(slotIndex);
    if(slot.type==='color')makeColor(slotIndex);
    if(slot.type==='sequence')makeSequence(slotIndex);
    if(slot.type==='calc')makeCalc(slotIndex);
    if(slot.type==='odd')makeOdd(slotIndex);
    if(slot.type==='memory')makeMemory(slotIndex);
  }
  function btn(text,cls='taskChoice'){const b=document.createElement('button');b.className=cls;b.textContent=text;return b}
  function beginCooldown(slotIndex){
    const slot=state.task.slots[slotIndex],el=taskEls[slotIndex];
    const duration=10;
    slot.type=null;slot.answer=null;slot.step=1;slot.started=0;slot.cooldownDuration=duration;slot.cooldownUntil=now()+duration;
    el.prompt.textContent='完了';el.area.innerHTML='';el.reward.textContent='WAIT';
    render();
  }
  function taskCorrect(slotIndex){
    const slot=state.task.slots[slotIndex];
    if(!state.running||!slot.type)return;
    const elapsed=now()-slot.started;
    const speedBonus=elapsed<=1.8?4:elapsed<=3.1?2:0;
    state.task.combo++;
    state.task.maxCombo=Math.max(state.task.maxCombo,state.task.combo);
    const comboBonus=Math.min(8,Math.max(0,state.task.combo-1)*2);
    const rawTotal=slot.reward+speedBonus+comboBonus;
    const total=rawTotal;
    state.money+=total;state.task.success++;els.taskSuccess.textContent=state.task.success;
    const bonusBits=[];if(speedBonus)bonusBits.push(`速さ+${speedBonus}`);if(comboBonus)bonusBits.push(`コンボ+${comboBonus}`);
    toastMsg(`成功 +${total}円${bonusBits.length?`（${bonusBits.join(' / ')}）`:''}`);beginCooldown(slotIndex);
  }
  function taskWrong(slotIndex){
    const slot=state.task.slots[slotIndex];
    if(!state.running||!slot.type)return;
    state.task.miss++;state.task.combo=0;els.taskMiss.textContent=state.task.miss;state.dopamine=Math.max(0,state.dopamine-4);
    toastMsg('ミス！ コンボ0 / ドパ-2');beginCooldown(slotIndex);
  }
  function makeBigger(i){
    const slot=state.task.slots[i],el=taskEls[i];let a=rand(10,99),b=rand(10,99);while(a===b)b=rand(10,99);el.prompt.textContent='大きい数字を押せ';const wrap=document.createElement('div');wrap.className='taskChoiceGrid';[a,b].sort(()=>Math.random()-.5).forEach(n=>{const x=btn(n,'numberCell');x.onclick=()=>n===Math.max(a,b)?taskCorrect(i):taskWrong(i);wrap.appendChild(x)});el.area.appendChild(wrap)
  }
  function makeColor(i){
    const el=taskEls[i];const colors=[['赤','#d6535b'],['青','#4e86d4'],['黄','#c7b944'],['緑','#4ca66a']];const target=pick(colors);el.prompt.textContent=`「${target[0]}」を押せ`;const wrap=document.createElement('div');wrap.className='taskChoiceGrid';[...colors].sort(()=>Math.random()-.5).forEach(c=>{const x=btn(c[0],'colorCell');x.style.borderBottom=`4px solid ${c[1]}`;x.onclick=()=>c[0]===target[0]?taskCorrect(i):taskWrong(i);wrap.appendChild(x)});el.area.appendChild(wrap)
  }
  function makeSequence(i){
    const slot=state.task.slots[i],el=taskEls[i];el.prompt.textContent='1 → 5 の順に押せ';slot.step=1;const nums=[1,2,3,4,5].sort(()=>Math.random()-.5);const wrap=document.createElement('div');wrap.className='sequenceGrid';nums.forEach(n=>{const x=btn(n,'sequenceCell');x.onclick=()=>{if(n===slot.step){x.classList.add('done');x.disabled=true;slot.step++;if(slot.step===6)taskCorrect(i)}else taskWrong(i)};wrap.appendChild(x)});el.area.appendChild(wrap)
  }
  function makeCalc(i){
    const el=taskEls[i];const a=rand(2,19),b=rand(2,19),plus=Math.random()<.7,ans=plus?a+b:a-b;el.prompt.textContent=`${a} ${plus?'+':'−'} ${b} = ?`;const vals=[ans,ans+rand(1,4),ans-rand(1,4)].sort(()=>Math.random()-.5);const wrap=document.createElement('div');wrap.className='sequenceGrid';vals.forEach(n=>{const x=btn(n,'taskChoice');x.onclick=()=>n===ans?taskCorrect(i):taskWrong(i);wrap.appendChild(x)});el.area.appendChild(wrap)
  }
  function makeOdd(i){
    const el=taskEls[i];
    const wantOdd=Math.random()<.5;
    el.prompt.textContent=wantOdd?'奇数を押せ':'偶数を押せ';

    // 必ず奇数2個・偶数2個を混ぜる。どちらか一方だけの選択肢にならないようにする。
    const odds=[];
    const evens=[];
    while(odds.length<2){
      const n=rand(10,99);
      if(n%2===1&&!odds.includes(n))odds.push(n);
    }
    while(evens.length<2){
      const n=rand(10,99);
      if(n%2===0&&!evens.includes(n))evens.push(n);
    }
    const vals=[...odds,...evens];
    for(let j=vals.length-1;j>0;j--){
      const k=rand(0,j);
      [vals[j],vals[k]]=[vals[k],vals[j]];
    }

    const wrap=document.createElement('div');
    wrap.className='taskChoiceGrid';
    vals.forEach(n=>{
      const x=btn(n,'numberCell');
      x.onclick=()=>((n%2===1)===wantOdd)?taskCorrect(i):taskWrong(i);
      wrap.appendChild(x);
    });
    el.area.appendChild(wrap);
  }
  function makeMemory(i){
    const slot=state.task.slots[i],el=taskEls[i];const code=String(rand(1000,9999));slot.answer=code;el.prompt.textContent='4桁を入力';
    const show=document.createElement('div');show.className='memoryCode';show.textContent='••••';show.setAttribute('role','button');show.setAttribute('aria-label','押している間だけ4桁を表示');show.tabIndex=0;
    const reveal=()=>{if(state.running&&slot.type==='memory'&&slot.answer===code){show.textContent=code;show.classList.add('revealing')}};
    const hide=()=>{if(slot.type==='memory'&&slot.answer===code){show.textContent='••••';show.classList.remove('revealing')}};
    show.addEventListener('pointerdown',e=>{e.preventDefault();try{show.setPointerCapture(e.pointerId)}catch(_){}reveal()});
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>show.addEventListener(ev,hide));show.addEventListener('contextmenu',e=>e.preventDefault());
    show.addEventListener('keydown',e=>{if((e.code==='Space'||e.key==='Enter')&&!e.repeat){e.preventDefault();reveal()}});show.addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();hide()}});show.addEventListener('blur',hide);
    el.area.appendChild(show);const row=document.createElement('div');row.className='inputRow';const input=document.createElement('input');input.inputMode='numeric';input.maxLength=4;input.placeholder='4桁';const ok=btn('送信');ok.onclick=()=>input.value===code?taskCorrect(i):taskWrong(i);input.onkeydown=e=>{if(e.key==='Enter')ok.click()};row.append(input,ok);el.area.appendChild(row)
  }

  const eggKinds=[
    {rarity:'N',weight:50,clicks:2,reward:7},
    {rarity:'R',weight:30,clicks:4,reward:13},
    {rarity:'SR',weight:15,clicks:7,reward:24},
    {rarity:'SSR',weight:5,clicks:12,reward:42}
  ];
  function makeEgg(){
    let roll=Math.random()*100,acc=0,kind=eggKinds[0];
    for(const k of eggKinds){acc+=k.weight;if(roll<acc){kind=k;break}}
    return {rarity:kind.rarity,clicks:kind.clicks,left:kind.clicks,reward:kind.reward};
  }
  function ensureEggTimer(t=now()){
    const count=state.eggs.slots.filter(Boolean).length;
    if(count>=state.eggs.capacity){state.eggs.nextAt=0;return}
    if(!state.eggs.nextAt)state.eggs.nextAt=t+state.eggs.recharge;
  }
  function updateEggRecharge(t=now()){
    const count=state.eggs.slots.filter(Boolean).length;
    if(count>=state.eggs.capacity){state.eggs.nextAt=0;return}
    ensureEggTimer(t);
    if(t>=state.eggs.nextAt){
      const idx=state.eggs.slots.findIndex(x=>!x);
      if(idx>=0)state.eggs.slots[idx]=makeEgg();
      if(state.eggs.slots.filter(Boolean).length<state.eggs.capacity)state.eggs.nextAt=t+state.eggs.recharge;else state.eggs.nextAt=0;
    }
  }
  function tapEgg(i){
    if(!state.running)return;
    const egg=state.eggs.slots[i];if(!egg)return;
    egg.left=Math.max(0,egg.left-1);
    if(egg.left===0){addDopa(egg.reward);state.eggs.slots[i]=null;ensureEggTimer();}
    render();
  }
  function shaveCooldown(i){
    if(!state.running)return;
    const slot=state.task.slots[i],t=now();
    if(slot.cooldownUntil<=t)return;
    slot.cooldownUntil=Math.max(t,slot.cooldownUntil-1);
    if(slot.cooldownUntil<=t+.001)newTask(i);else render();
  }

  function buy(item,cost,amount=1){
    if(!state.running||state.money<cost)return;
    const t=now();
    if(item==='energy'&&t<state.energyUntil)return;
    if(item==='mochi'&&t<state.mochiUntil)return;
    state.money-=cost;
    if(item==='bread'){state.bread+=amount;toastMsg(`パン +${amount}`)}
    if(item==='energy'){state.energyUntil=t+20;toastMsg('エナドリ：20秒ドーパミン減少半分')}
    if(item==='mochi'){state.mochiUntil=t+35;toastMsg('もち：35秒満腹度減少半分')}
    render();
  }
  function eat(){if(!state.running||state.bread<1)return;state.bread--;addFull(18);toastMsg('そのままパン：満腹 +18');render()}
  function startToast(){if(!state.running||state.bread<1||state.toast.active||state.toast.ready)return;state.bread--;state.toast={active:true,ready:false,start:now(),duration:12};toastMsg('トースト開始。揚げパンも同時に作れる');render()}
  function finishToast(){if(!state.toast.active)return;state.toast={active:false,ready:true,start:0,duration:12};toastMsg('トースト焼き上がり！ ボタンを押して食べよう');render()}
  function eatToast(){if(!state.running||!state.toast.ready)return;addFull(34);addDopa(4);state.toast={active:false,ready:false,start:0,duration:12};toastMsg('トーストを食べた！ 満腹+34 / ドパ+4');render()}
  function handleToast(){if(state.toast.ready)eatToast();else startToast()}
  function startFry(){if(!state.running||state.bread<1||state.fry.active)return;state.bread--;state.fry={active:true,start:now(),duration:10.5,sweetA:.742,sweetB:.792};els.sweet.style.left='74.2%';els.sweet.style.width='5%';toastMsg('揚げパン開始。ベストタイミングを見逃すな');render()}
  function takeFry(){
    if(!state.running||!state.fry.active)return;const p=(now()-state.fry.start)/state.fry.duration;let f,d,msg;
    if(p>=state.fry.sweetA&&p<=state.fry.sweetB){f=42;d=11;msg='完璧な揚げパン！！'}else if(p<state.fry.sweetA){f=14;d=1;msg='まだベチャベチャ'}else if(p<=.93){f=20;d=3;msg='ちょっと揚げすぎ'}else if(p<=1.08){f=8;d=0;msg='かなり焦げた'}else{f=4;d=0;msg='真っ黒……'}
    addFull(f);addDopa(d);state.fry={active:false,start:0,duration:10.5,sweetA:.742,sweetB:.792};toastMsg(`${msg} 満腹+${f} / ドパ+${d}`);render()
  }

  function nextShortVisual(){
    const s=pick(shorts);els.shortArt.textContent=s[0];els.shortTitle.textContent=s[1];els.shortTag.textContent=s[2];els.commentCount.textContent=String(rand(84,1480));
    state.short.progress=0;state.short.liked=false;state.short.ended=false;state.short.endedAt=0;state.short.watching=false
  }
  function setWatch(on){if(!state.running||state.short.ad||state.short.ended)on=false;state.short.watching=on;render()}
  function like(){if(!state.running||state.short.ad||state.short.ended)return;state.short.liked=!state.short.liked;render()}
  function swipe(){
    if(!state.running||state.short.ad||!state.short.ended)return;
    const quick=state.short.endedAt>0&&(now()-state.short.endedAt)<=1.6;
    if(quick){addDopa(1);}else state.short.streak=0;
    state.short.count++;
    state.short.untilAd=Math.max(0,state.short.untilAd-1);
    if(state.short.untilAd===0){
      state.short.ad=true;state.short.adProgress=0;els.ad.classList.remove('hidden');els.adClose.classList.add('hidden');toastMsg('広告……');render();return;
    }
    nextShortVisual();render();
  }
  function closeAd(){if(!state.running||!state.short.ad||state.short.adProgress<state.short.adDuration)return;state.short.ad=false;state.short.adProgress=0;state.short.untilAd=rand(3,6);els.ad.classList.add('hidden');els.adClose.classList.add('hidden');nextShortVisual();toastMsg('広告突破');render()}

  let rulesPage=0;
  const rulePages=[...document.querySelectorAll('.rulePage')];
  const ruleDots=[...document.querySelectorAll('.ruleDots i')];
  function renderRules(){
    rulePages.forEach((p,i)=>p.classList.toggle('active',i===rulesPage));
    ruleDots.forEach((d,i)=>d.classList.toggle('active',i===rulesPage));
    $('rulesPageCount').textContent=`${rulesPage+1} / ${rulePages.length}`;
    $('rulesPrevBtn').disabled=rulesPage===0;
    $('rulesNextBtn').textContent=rulesPage===rulePages.length-1?'閉じる':'次へ →';
  }
  function openRules(){rulesPage=0;renderRules();$('rulesOverlay').classList.remove('hidden')}
  function closeRules(){$('rulesOverlay').classList.add('hidden')}
  function nextRules(){if(rulesPage>=rulePages.length-1){closeRules();return}rulesPage++;renderRules()}
  function prevRules(){if(rulesPage<=0)return;rulesPage--;renderRules()}

  function startGame(){
    state.running=true;state.startedAt=now();state.lastTick=now();state.fullness=100;state.dopamine=100;state.money=120;state.bread=1;state.energyUntil=0;state.mochiUntil=0;
    state.task={success:0,miss:0,combo:0,maxCombo:0,slots:Array.from({length:3},freshSlot)};
    state.toast={active:false,ready:false,start:0,duration:12};state.fry={active:false,start:0,duration:10.5,sweetA:.742,sweetB:.792};
    state.short={progress:0,duration:3.8,watching:false,liked:false,count:0,ended:false,endedAt:0,streak:0,ad:false,adProgress:0,adDuration:10,untilAd:rand(3,6)};
    state.eggs={slots:[makeEgg(),makeEgg(),makeEgg()],capacity:3,recharge:16,nextAt:0};
    els.taskSuccess.textContent='0';els.taskMiss.textContent='0';els.start.classList.add('hidden');$('rulesOverlay').classList.add('hidden');els.gameOver.classList.add('hidden');els.ad.classList.add('hidden');[0,1,2].forEach(newTask);nextShortVisual();render();
  }
  function resetRoundState(){
    state.startedAt=0;state.lastTick=0;state.fullness=100;state.dopamine=100;state.money=120;state.bread=1;state.energyUntil=0;state.mochiUntil=0;
    state.task={success:0,miss:0,combo:0,maxCombo:0,slots:Array.from({length:3},freshSlot)};
    state.toast={active:false,ready:false,start:0,duration:12};state.fry={active:false,start:0,duration:10.5,sweetA:.742,sweetB:.792};
    state.short={progress:0,duration:3.8,watching:false,liked:false,count:0,ended:false,endedAt:0,streak:0,ad:false,adProgress:0,adDuration:10,untilAd:rand(3,6)};
    state.eggs={slots:[makeEgg(),makeEgg(),makeEgg()],capacity:3,recharge:16,nextAt:0};
    els.taskSuccess.textContent='0';els.taskMiss.textContent='0';taskEls.forEach((el,i)=>{el.reward.textContent='+15円';el.prompt.textContent='ゲーム開始で仕事が来る';el.area.innerHTML='';el.cooldown.classList.add('hidden');el.cooldownFill.style.width='0%';});
    els.ad.classList.add('hidden');
  }
  function endGame(reason){
    if(!state.running)return;
    state.running=false;state.short.watching=false;
    const elapsed=now()-state.startedAt;
    if(elapsed>state.best){state.best=elapsed;safeStorage.set('dopagagiBestV4',elapsed)}
    if(reason==='full'){els.overTitle.textContent='腹ペコ。';els.overReason.textContent='食べるのを忘れた。'}else{els.overTitle.textContent='虚無。';els.overReason.textContent='ドーパミンが、ない。'}
    els.result.textContent=fmt(elapsed);
    resetRoundState();
    els.gameOver.classList.remove('hidden');render()
  }

  function tick(){
    if(!state.running)return;const t=now(),dt=Math.min(.45,t-state.lastTick);state.lastTick=t;
    const fullnessDrain=1.58*(t<state.mochiUntil?0.5:1);state.fullness-=fullnessDrain*dt;const dopaDrain=2.55*(t<state.energyUntil?0.5:1);state.dopamine-=dopaDrain*dt;
    if(state.short.watching&&!state.short.ad&&!state.short.ended){
      state.short.progress+=dt;addDopa(shortWatchRate()*dt);
      if(state.short.progress>=state.short.duration){
        state.short.progress=state.short.duration;state.short.ended=true;state.short.watching=false;
        const finish=shortFinishBonus(),likeBonus=state.short.liked?2:0;addDopa(finish+likeBonus);state.short.streak=Math.min(9,state.short.streak+1);state.short.endedAt=t;
        toastMsg(`完走 +${finish}${likeBonus?` / ♥ +${likeBonus}`:''}`);
      }
    }
    if(state.short.ended&&state.short.endedAt>0&&t-state.short.endedAt>2.4&&state.short.streak>0){state.short.streak=0;state.short.endedAt=0}
    if(state.short.ad&&state.short.adProgress<state.short.adDuration){state.short.adProgress=Math.min(state.short.adDuration,state.short.adProgress+dt);if(state.short.adProgress>=state.short.adDuration)toastMsg('×が出た！')}
    state.task.slots.forEach((slot,i)=>{if(slot.cooldownUntil>0&&t>=slot.cooldownUntil)newTask(i)});
    if(state.toast.active&&t-state.toast.start>=state.toast.duration)finishToast();
    if(state.fry.active&&t-state.fry.start>=state.fry.duration*1.10){state.fry={active:false,start:0,duration:10.5,sweetA:.742,sweetB:.792};toastMsg('揚げパンが炭になった……')}
    if(state.mochiUntil>0&&t>=state.mochiUntil){state.mochiUntil=0}
    updateEggRecharge(t);
    state.fullness=clamp(state.fullness,0,100);state.dopamine=clamp(state.dopamine,0,100);if(state.fullness<=0)return endGame('full');if(state.dopamine<=0)return endGame('dopa');render()
  }

  buyButtons.forEach(b=>b.addEventListener('click',()=>buy(b.dataset.item,Number(b.dataset.cost),Number(b.dataset.amount||1))));
  els.eat.addEventListener('click',eat);els.toast.addEventListener('click',handleToast);els.fry.addEventListener('click',startFry);els.take.addEventListener('click',takeFry);
  eggButtons.forEach((b,i)=>b.addEventListener('click',()=>tapEgg(i)));
  taskEls.forEach((e,i)=>e.cooldownText.addEventListener('click',()=>shaveCooldown(i)));
  els.like.addEventListener('click',like);els.swipe.addEventListener('click',swipe);els.adClose.addEventListener('click',closeAd);
  ['pointerdown','touchstart'].forEach(ev=>els.watch.addEventListener(ev,e=>{e.preventDefault();setWatch(true)},{passive:false}));
  ['pointerup','pointercancel','pointerleave','touchend','touchcancel'].forEach(ev=>els.watch.addEventListener(ev,()=>setWatch(false),{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)state.short.watching=false});
  window.addEventListener('blur',()=>{state.short.watching=false});
  document.querySelectorAll('.mobileNav button').forEach(b=>b.addEventListener('click',()=>$(b.dataset.target).scrollIntoView({behavior:'smooth',block:'start'})));
  $('startBtn').addEventListener('click',startGame);$('restartBtn').addEventListener('click',startGame);$('rulesBtn').addEventListener('click',openRules);$('rulesCloseBtn').addEventListener('click',closeRules);$('rulesPrevBtn').addEventListener('click',prevRules);$('rulesNextBtn').addEventListener('click',nextRules);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&state.fry.active)takeFry();else if(e.key==='ArrowUp'&&state.short.ended){e.preventDefault();swipe()}else if(e.key.toLowerCase()==='l')like();else if(e.code==='Space'&&!e.repeat){e.preventDefault();setWatch(true)}});
  document.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();setWatch(false)}});

  // 軽量化：ゲームロジック/UI更新は4fps。タイミング判定自体はperformance.now()で実時間判定。
  setInterval(tick,250);render();
})();
