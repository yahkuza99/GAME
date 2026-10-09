'use strict';
// Local testing privileges are separate from cloud accounts and character saves.
const GM = {
  get allowed() {
    const host = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    if (!host || !Online.local || !Online.loggedIn || !Online.user.local) return false;
    const a = Online.lsGet(Online.LS.accounts,{})[Online.username.toLowerCase()];
    return !!(a && a.gmTester === true);
  },
  help: [
    '/gm heal — เติม HP/MP', '/gm level 20 — เพิ่ม Base Level ถึง 20',
    '/gm joblevel 99 — ตั้ง Job Level สำหรับทดสอบ (1–99)',
    '/gm class1 wildhunter — ชุดทดสอบ Class 1: สกิลเต็ม/Job 99/ล้างสกิลและบัฟเก่า',
    '/gm class2 galdr — ชุดทดสอบ Class 2: Base 50+/Job 99/สกิลเต็มทั้งสาย/แถบลัดพร้อมใช้',
    '/gm class3 runelord — ชุดทดสอบ Class 3: Base 70+/Job 99/สกิลเต็มทั้งสาย',
    '/gm job wildhunter — เปลี่ยน Class', '/gm skills — ปลดสกิลเต็มของ Class ปัจจุบัน',
    '/gm item blue_potion 50 — เพิ่มไอเทม', '/gm money 100000 — ตั้งจำนวนเงิน',
    '/gm warp meadow 28 28 — วาร์ป', '/gm spawn fenrir_pup 3 — เรียกมอน',
    '/gm clear — ลบมอนในแมพ', '/gm cooldown — รีเซ็ตคูลดาวน์',
    '/gm ids jobs|items|maps|mobs — ดู ID', '/gm help — ดูคำสั่ง'
  ],
  command(text) {
    if (!/^\/gm(?:\s|$)/i.test(text)) return false;
    if (!this.allowed) { UI.msg('GM ใช้ได้เฉพาะบัญชีทดสอบในเครื่องที่มีสิทธิ์เท่านั้น','err'); return true; }
    const [cmd='help',...args] = text.trim().toLowerCase().split(/\s+/).slice(1), p=G.player;
    const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
    const num=(s,min,max)=>{if(!/^\d+$/.test(s||''))throw Error('ต้องระบุจำนวนเต็ม');const n=Number(s);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`จำนวนต้องอยู่ระหว่าง ${min}–${max}`);return n;};
    const id=(o,k)=>{if(!own(o,k))throw Error('ไม่พบ ID: '+k);return k;};
    try {
      const limits={help:[0,0],ids:[1,1],heal:[0,0],level:[1,1],joblevel:[1,1],class1:[1,1],class2:[1,1],class3:[1,1],job:[1,1],skills:[0,0],item:[1,2],money:[1,1],warp:[1,3],spawn:[1,2],clear:[0,0],cooldown:[0,0]};
      if(own(limits,cmd)&&(args.length<limits[cmd][0]||args.length>limits[cmd][1]))throw Error('รูปแบบไม่ถูกต้อง ใช้ /gm help');
      if(cmd==='warp'&&args.length===2)throw Error('ระบุทั้ง x และ y หรือใช้เฉพาะ ID แมพ');
      if(cmd==='help') {this.help.forEach(t=>UI.msg(t,'info'));return true;}
      if(cmd==='ids') {
        const tables={jobs:JOBS,items:ITEMS,maps:MAP_DEFS,mobs:MOBS};
        const table=tables[id(tables,args[0])];UI.msg(Object.keys(table).join(', '),'info');return true;
      }
      if(cmd==='heal') { if(p.dead)throw Error('คืนชีพที่จุดเซฟก่อน แล้วใช้ /gm heal');p.hp=p.d.maxHp;p.sp=p.d.maxSp; }
      else if(cmd==='level') {
        const n=num(args[0],p.baseLv,MAX_BASE_LV);
        while(p.baseLv<n)gainExp(baseExpNeed(p.baseLv)-p.baseExp,0);
      }
      else if(cmd==='job') changeJob(id(JOBS,args[0]));
      else if(cmd==='class1'||cmd==='class2'||cmd==='class3') {
        const job=args[0];
        const tier=Number(cmd.slice(-1)), second=tier>=2;
        const candidates=tier===3?Object.values(THIRD_JOBS):second?Object.values(SECOND_JOBS).flat():Object.keys(JOB_STARTER);
        if(!candidates.includes(job))throw Error('Class '+tier+': '+candidates.join(', '));
        if(p.dead)throw Error('คืนชีพก่อนเปลี่ยนชุดทดสอบ');
        Bot.toggle(false);Nav.cancel();p.path=[];p.target=null;p.skillTarget=null;p.manualSkillLock=false;p.oneHit=null;p.cast=null;p.skillIntent=null;G.pendingSkill=null;
        p.skills={first_aid:1,basic_training:SKILLS.basic_training.max};p.buffs={};p.runes={};
        p.skillPoints=0;p.skillPose=null;p._bowPose=null;
        p.c3ward=null;p.c3ult=null;p.c3floorUntil=0;p.c3el=null;p.c3cast={};
        G.allies=[];G.traps=[];G.zones=[];G.fx=[];G.timers=[];G.respawns=[];
        if(second)for(const parent of jobLine(job).slice(1).reverse()){changeJob(parent);p.jobLv=99;}
        changeJob(job);
        while(p.baseLv<(tier===3?70:second?50:20))gainExp(baseExpNeed(p.baseLv)-p.baseExp,0);
        p.jobLv=99;p.jobExp=0;p.skillPoints=98;
        const line=second?jobLine(job):[job];
        for(const cls of line)for(const key of JOBS[cls].skills)if(SKILLS[key]&&!SKILLS[key].noLearn)p.skills[key]=SKILLS[key].max;
        fixSkillPoints(p);p.cds={};p.cdTot={};p.skillReadyAt=0;p.nextAttack=0;
        const active=line.flatMap(cls=>JOBS[cls].skills).filter(key=>SKILLS[key]&&SKILLS[key].type==='active'&&!SKILLS[key].noLearn);
        p.hotbar=Array.from({length:8},(_,i)=>i<active.length?{t:'skill',id:active[i]}:null);
        recalc();p.hp=p.d.maxHp;p.sp=p.d.maxSp;UI.renderHotbar();
        UI.msg('ชุดทดสอบ '+JOBS[job].name+': Base '+p.baseLv+' / Job 99 / สกิลเต็ม / แถบลัดพร้อมใช้','sys');
      }
      else if(cmd==='joblevel') {
        const n=num(args[0],p.jobLv,99);
        p.skillPoints+=n-p.jobLv;p.jobLv=n;p.jobExp=0;fixSkillPoints(p);recalc();
      }
      else if(cmd==='skills') {
        let job=p.job;const seen=new Set();
        while(job&&!seen.has(job)) {seen.add(job);for(const key of JOBS[job].skills||[])if(own(SKILLS,key))p.skills[key]=SKILLS[key].max;job=JOBS[job].parent;}
        fixSkillPoints(p);recalc();
      }
      else if(cmd==='item') addItem(id(ITEMS,args[0]),num(args[1]||'1',1,999));
      else if(cmd==='money') p.zeny=num(args[0],0,100000000);
      else if(cmd==='warp') {
        const key=id(MAP_DEFS,args[0]),map=getMap(key);
        const x=num(args[1]||String(Math.floor(map.w/2)),0,map.w-1),y=num(args[2]||String(Math.floor(map.h/2)),0,map.h-1);
        changeMap(key,x+.5,y+.5);
      }
      else if(cmd==='spawn') {
        const key=id(MOBS,args[0]),count=num(args[1]||'1',1,20);
        if(G.mobs.length+count>150)throw Error('มอนในแมพเกินขีดจำกัดทดสอบ 150 ตัว');
        for(let i=0;i<count;i++){const a=i*Math.PI*2/count,pos=G.map.nearestWalkable(p.x+Math.cos(a)*3,p.y+Math.sin(a)*3);spawnMob(key,{x:Math.floor(pos.x),y:Math.floor(pos.y)});}
      }
      else if(cmd==='clear') {G.mobs=[];G.respawns=[];G.fx=[];G.timers=[];p.target=null;p.skillTarget=null;p.manualSkillLock=false;p.cast=null;p.skillIntent=null;for(const a of G.allies){a.target=null;a.path=[];}}
      else if(cmd==='cooldown') {p.cds={};p.cdTot={};p.skillReadyAt=0;p.nextAttack=0;p.itemReadyAt=0;}
      else throw Error('ไม่พบคำสั่ง ใช้ /gm help');
      saveGame(true);UI.dirty();UI.updateHud();UI.msg('GM: '+cmd+' สำเร็จ','sys');
    } catch(e) {UI.msg('GM: '+e.message,'err');}
    return true;
  }
};
