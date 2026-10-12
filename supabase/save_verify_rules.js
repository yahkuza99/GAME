'use strict';
// ============================================================
//  กติกาตรวจเซฟ — ฉบับ JavaScript (สำเนาตรรกะเดียวกับ public.save_verify_eval ใน
//  supabase/migrations/20261012000000_save_verify.sql) ใช้ในเทสต์ (tests/saveverify.js ผ่าน tests/fake_supabase.js) และเป็นสเปกอ่านง่าย
//  แก้กติกาที่นี่ → แก้ SQL ให้ตรงกันด้วยเสมอ (ชื่อกติกา/ค่าคงที่/ลำดับการคำนวณเหมือนกัน)
//
//  evaluate({ oldData, newData, oldAt, now, state, rows, cfg, items, jobs })
//    oldData/newData = ก้อนบัญชี characters.data ({ v:2, active, chars:[...] } หรือเซฟรุ่นเก่าตัวเดียว)
//    oldAt = updated_at เดิม (ms) • now = เวลาเซิร์ฟเวอร์ (ms) • state = แถว save_verify_state เดิม (หรือ null)
//    rows = รายการโอน (transfer_ledger) ของผู้เล่นนี้ที่ยังไม่ใช้ [{ id, at, paired, zin, zout, win, wout }]
//    cfg = { mode, soft_rules, params, derived } • items = { id: { w, eq, card } } • jobs = { id: { max, tier, parent } }
//  คืน { flags:[{ rule, slot, detail, soft }], reject: rule|null, state, consume:[id] }
// ============================================================
(function (root) {
  const DEFAULTS = {
    kps: 1, safety: 3, exp_per_kill: 7784, jexp_per_kill: 5446, worth_per_kill: 388, boss_exp: 310000, party_mul: 1.75, max_base_lv: 99,
    stat_max: 99, refine_max: 10, cards_max: 4, stack_max: 1000000, zeny_max: 1e12, max_elapsed: 21600,
    worth_cap: 3000000, lv_cap: 30, lv_per_min: 15, new_char_worth: 20000, pair_wait: 120, stat_slack: 0, need_frac: 0.1,
  };
  const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const isInt = v => typeof v === 'number' && Number.isInteger(v);
  const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);

  function params(cfg) { return Object.assign({}, DEFAULTS, (cfg && cfg.derived) || {}, (cfg && cfg.params) || {}); }
  function chars(d) {
    if (!d || typeof d !== 'object') return [];
    if (Array.isArray(d.chars)) return d.chars.filter(c => c && typeof c === 'object' && c.name);
    return d.name ? [d] : [];
  }
  const key = c => String(c.name).trim().toLowerCase();
  // EXP สะสมทั้งหมด (ตรงกับ baseExpNeed / jobExpNeed ใน js/data.js)
  function needBase(lv) { return 3 * lv * lv * lv + 40; }
  function cumBase(lv, exp) { const n = Math.max(0, lv - 1); return 3 * Math.pow(n * (n + 1) / 2, 2) + 40 * n + Math.max(0, num(exp)); }
  function jobK(tier) { return tier === 2 ? 70 : tier === 3 ? 100 : 40; }
  function needJob(tier, jl) { return tier === 0 ? Math.floor(5 * Math.pow(jl, 1.5)) + 5 : jobK(tier) * jl * jl; }
  function cumJob(tier, jl, exp) {
    const n = Math.max(0, Math.min(jl, 200) - 1);
    let s = 0;
    if (tier === 0) for (let j = 1; j <= n; j++) s += needJob(0, j);
    else s = jobK(tier) * n * (n + 1) * (2 * n + 1) / 6;
    return s + Math.max(0, num(exp));
  }
  function statTotal(lv) { let s = 48; for (let l = 2; l <= lv; l++) s += Math.floor(l / 5) + 3; return s; }
  function statSpent(st) { let s = 0; for (const k of STATS) for (let v = 1; v < Math.min(num(st[k]), 1000); v++) s += Math.floor((v - 1) / 10) + 2; return s; }
  // ของทุกชิ้นของตัวละคร: กระเป๋า / คลัง / ที่สวม / ของที่วางขายในตลาด (escrow)
  function entries(c) {
    const out = [];
    for (const e of Array.isArray(c.inventory) ? c.inventory : []) out.push(['inventory', e]);
    for (const e of Array.isArray(c.storage) ? c.storage : []) out.push(['storage', e]);
    if (c.equip && typeof c.equip === 'object') for (const s in c.equip) if (c.equip[s]) out.push(['equip', c.equip[s]]);
    if (c.vend && Array.isArray(c.vend.items)) for (const e of c.vend.items) out.push(['vend', e]);
    return out;
  }
  function worthOf(c, items) {
    let w = Math.max(0, num(c.zeny));
    for (const [, e] of entries(c)) {
      if (!e || typeof e !== 'object') continue;
      const it = items[e.id];
      w += (it ? it.w : 0) * Math.max(0, num(e.qty));
      for (const cd of Array.isArray(e.cards) ? e.cards : []) w += items[cd] ? items[cd].w : 0;
    }
    return w;
  }
  function descends(jobs, from, to) { // to เป็น Class ลูกหลานของ from (หรือ Class เดียวกัน)
    let j = to, n = 0;
    while (j && n++ < 10) { if (j === from) return true; j = jobs[j] ? jobs[j].parent : null; }
    return false;
  }

  function evaluate(I) {
    const P = params(I.cfg), items = I.items, jobs = I.jobs;
    const soft = new Set((I.cfg && I.cfg.soft_rules) || ['unknown_item', 'unknown_job', 'dup_uid', 'import_offline']);
    const flags = [];
    const flag = (rule, slot, detail) => flags.push({ rule, slot, detail, soft: soft.has(rule) || rule === 'import_offline' });
    const st0 = I.state || null;
    const lastAt = st0 && st0.at ? st0.at : (I.oldAt || I.now);
    const t = Math.min(P.max_elapsed, Math.max(0, (I.now - lastAt) / 1000));
    const NC = chars(I.newData), OC = chars(I.oldData);
    const oldBy = new Map(); for (const c of OC) if (!oldBy.has(key(c))) oldBy.set(key(c), c);
    const expRate = P.exp_per_kill * P.kps * P.party_mul * P.safety, jexpRate = P.jexp_per_kill * P.kps * P.party_mul * P.safety;
    const worthRate = P.worth_per_kill * P.kps * P.safety;
    const state = { at: I.now, wb: 0, held: 0, chars: {} };
    let fresh = 0, importedW = 0;
    // ตัวละครที่นำเข้าจากเซฟออฟไลน์ (ครั้งเดียว — data.importedOffline / ตัวละคร.importedOffline เป็นเวลาที่นำเข้า)
    // = ไม่มีประวัติบนเซิร์ฟเวอร์ให้เทียบ → ข้ามกติกาอัตรา บันทึกธง import_offline (ไม่ปฏิเสธ) ค่าที่เป็นไปไม่ได้ยังตรวจตามปกติ
    const acctImp = I.newData && I.newData.importedOffline && (!I.oldData || I.oldData.importedOffline !== I.newData.importedOffline);

    NC.forEach((c, slot) => {
      const k = key(c), o = oldBy.get(k) || null, name = String(c.name).slice(0, 24);
      const imported = (c.importedOffline && (!o || o.importedOffline !== c.importedOffline)) || (acctImp && !o);
      if (!o && !imported) fresh++;
      if (imported) { flag('import_offline', slot, { name, at: c.importedOffline || I.newData.importedOffline, baseLv: c.baseLv, job: c.job, zeny: c.zeny }); importedW += worthOf(c, items) - (o ? worthOf(o, items) : 0); }
      // ---------- ค่าที่เป็นไปไม่ได้ (ไม่ขึ้นกับเวลา) ----------
      const lv = c.baseLv, job = jobs[c.job];
      if (!isInt(lv) || lv < 1 || lv > P.max_base_lv) flag('level_cap', slot, { name, baseLv: lv });
      for (const f of ['job1Lv', 'job2Lv']) if (c[f] != null && (!isInt(c[f]) || c[f] < 1 || c[f] > 99)) flag('level_cap', slot, { name, [f]: c[f] });
      if (!job) flag('unknown_job', slot, { name, job: c.job });
      else if (!isInt(c.jobLv) || c.jobLv < 1 || c.jobLv > job.max) flag('job_level_cap', slot, { name, job: c.job, jobLv: c.jobLv, max: job.max });
      const L = isInt(lv) ? Math.max(1, Math.min(P.max_base_lv, lv)) : 1;
      if (num(c.baseExp) < 0 || (L < P.max_base_lv && num(c.baseExp) >= 2 * needBase(L))) flag('exp_range', slot, { name, baseExp: c.baseExp });
      if (job && (num(c.jobExp) < 0 || num(c.jobExp) >= 2 * needJob(job.tier, Math.max(1, c.jobLv | 0)))) flag('exp_range', slot, { name, jobExp: c.jobExp });
      const sv = c.stats && typeof c.stats === 'object' ? c.stats : {};
      for (const s of STATS) if (!isInt(sv[s]) || sv[s] < 1 || sv[s] > P.stat_max) { flag('stat_cap', slot, { name, stat: s, v: sv[s] }); break; }
      const spent = statSpent(sv), pts = num(c.statPoints), have = statTotal(L);
      if (pts < 0 || spent + pts > have + P.stat_slack) flag('stat_points', slot, { name, spent, points: pts, allowed: have });
      if (c.zeny != null && (!isInt(c.zeny) || c.zeny < 0 || c.zeny > P.zeny_max)) flag('zeny_range', slot, { name, zeny: c.zeny });
      const uids = new Set();
      let unknown = null, qtyBad = null, refBad = null, cardBad = null, dupUid = null;
      for (const [where, e] of entries(c)) {
        if (!e || typeof e !== 'object') { qtyBad = qtyBad || { where }; continue; }
        const it = items[e.id];
        if (!it) { unknown = unknown || { where, id: String(e.id).slice(0, 40) }; continue; }
        const q = e.qty, minQ = where === 'vend' ? 0 : 1;
        if (!isInt(q) || q < minQ || q > (it.eq ? 1 : P.stack_max)) qtyBad = qtyBad || { where, id: e.id, qty: q };
        if (e.refine != null && (!isInt(e.refine) || e.refine < 0 || e.refine > P.refine_max)) refBad = refBad || { where, id: e.id, refine: e.refine };
        if (e.cards != null) {
          if (!Array.isArray(e.cards) || e.cards.length > P.cards_max) cardBad = cardBad || { where, id: e.id };
          else for (const cd of e.cards) if (!items[cd] || !items[cd].card) { if (!items[cd]) unknown = unknown || { where, id: String(cd).slice(0, 40) }; else cardBad = cardBad || { where, id: e.id, card: cd }; }
        }
        if (it.eq && isInt(e.uid) && e.uid > 0 && where !== 'vend') { if (uids.has(e.uid)) dupUid = dupUid || { where, id: e.id, uid: e.uid }; uids.add(e.uid); }
      }
      if (unknown) flag('unknown_item', slot, Object.assign({ name }, unknown));
      if (qtyBad) flag('qty_range', slot, Object.assign({ name }, qtyBad));
      if (refBad) flag('refine_cap', slot, Object.assign({ name }, refBad));
      if (cardBad) flag('card_range', slot, Object.assign({ name }, cardBad));
      if (dupUid) flag('dup_uid', slot, Object.assign({ name }, dupUid));
      // เปลี่ยน Class ได้ทีละขั้นตามสาย (ข้ามขั้นในเซฟเดียวไม่ได้) • ตัวละครใหม่เริ่มที่ Novice (เผื่อเปลี่ยน Class 1 ก่อนเซฟแรก)
      if (job && o && o.job !== c.job && (!descends(jobs, o.job, c.job) || (jobs[o.job] && job.tier - jobs[o.job].tier > 1))) flag('job_path', slot, { name, from: o.job, to: c.job });
      if (job && !o && !imported && job.tier > 1) flag('job_path', slot, { name, from: null, to: c.job });

      // ---------- อัตราเทียบเวลา (ถังโทเคน: เติมตามเวลา จุได้ไม่เกินเพดาน) ----------
      if (imported) { state.chars[k] = { eb: Math.round(3 * P.boss_exp * P.party_mul), jb: Math.round(3 * P.boss_exp * 0.7 * P.party_mul), lb: P.lv_cap }; return; }
      const oL = o && isInt(o.baseLv) ? Math.max(1, Math.min(P.max_base_lv, o.baseLv)) : 1;
      const prev = (st0 && st0.chars && st0.chars[k]) || null;
      const capE = 3 * P.boss_exp * P.party_mul + P.need_frac * needBase(oL);
      const ojob = o ? jobs[o.job] : null;
      const capJ = 3 * P.boss_exp * 0.7 * P.party_mul + (ojob ? P.need_frac * needJob(ojob.tier, Math.max(1, o.jobLv | 0)) : 0);
      const dE = cumBase(L, c.baseExp) - (o ? cumBase(oL, o.baseExp) : 0);
      let eb = Math.min(capE, (prev ? prev.eb : capE) + expRate * t) - Math.max(0, dE);
      if (eb < 0) { flag('exp_rate', slot, { name, gained: Math.round(dE), allowed: Math.round(eb + Math.max(0, dE)), seconds: Math.round(t) }); eb = 0; }
      let dJ = 0;
      if (job) {
        const jl = Math.max(1, c.jobLv | 0);
        dJ = o && o.job === c.job && ojob ? cumJob(job.tier, jl, c.jobExp) - cumJob(ojob.tier, Math.max(1, o.jobLv | 0), o.jobExp) : cumJob(job.tier, jl, c.jobExp);
      }
      let jb = Math.min(capJ, (prev ? prev.jb : capJ) + jexpRate * t) - Math.max(0, dJ);
      if (jb < 0) { flag('jexp_rate', slot, { name, gained: Math.round(dJ), allowed: Math.round(jb + Math.max(0, dJ)), seconds: Math.round(t) }); jb = 0; }
      const dL = L - oL;
      let lb = Math.min(P.lv_cap, (prev ? prev.lb : P.lv_cap) + P.lv_per_min * t / 60) - Math.max(0, dL);
      if (lb < 0) { flag('level_rate', slot, { name, from: oL, to: L, seconds: Math.round(t) }); lb = 0; }
      state.chars[k] = { eb: Math.round(eb), jb: Math.round(jb), lb: Math.round(lb * 100) / 100 };
    });

    // ---------- มูลค่ารวมทั้งบัญชี (Volt + ของทุกชิ้น ตามราคาขายร้าน) ----------
    const W0 = OC.reduce((s, c) => s + worthOf(c, items), 0), W1 = NC.reduce((s, c) => s + worthOf(c, items), 0);
    const dW = W1 - W0 - P.new_char_worth * fresh - importedW;
    let credit = 0, pendingOut = 0;
    const consume = [];
    for (const r of I.rows || []) {
      if (r.paired) { credit += num(r.zin) + num(r.win) - num(r.zout) - num(r.wout); consume.push(r.id); }
      else if ((I.now - r.at) / 1000 > P.pair_wait) consume.push(r.id); // อีกฝ่ายไม่ยืนยันภายในเวลา = ไม่นับ
      else pendingOut += num(r.zout) + num(r.wout);
    }
    const capW = P.worth_cap + worthRate * 0;
    const bucket = Math.min(capW, (st0 && st0.wb != null ? st0.wb : capW) + worthRate * t);
    const use = dW - credit;
    let total = bucket + (st0 && st0.held ? st0.held : 0) - use;
    if (total < 0) { flag('worth_rate', NC.length ? Math.max(0, Math.min(NC.length - 1, (I.newData && I.newData.active) | 0)) : 0, { gained: Math.round(dW), credit: Math.round(credit), allowed: Math.round(total + use), seconds: Math.round(t) }); total = 0; }
    state.held = Math.round(Math.min(pendingOut, total));
    state.wb = Math.round(Math.min(capW, total - state.held));

    const hard = flags.find(f => !f.soft);
    const mode = (I.cfg && I.cfg.mode) || 'log';
    return { flags: mode === 'off' ? [] : flags, reject: mode === 'enforce' && hard ? hard.rule : null, state, consume, t, dW, credit };
  }

  const api = { DEFAULTS, evaluate, params, cumBase, cumJob, needBase, needJob, statTotal, statSpent, worthOf, chars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SaveVerifyRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
