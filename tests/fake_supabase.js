// ============================================================
//  Supabase ปลอมสำหรับทดสอบหลายผู้เล่นในเครื่องเดียว (Playwright addInitScript)
//  ใช้ BroadcastChannel ระหว่างแท็บใน browser context เดียวกัน แทน Realtime จริง
//  รองรับเฉพาะ API ที่ js/online.js ใช้: auth, from('characters'|'chat_messages'), rpc, channel (broadcast + presence)
// ============================================================
(() => {
  const DB = 'fake_sb_db';
  const db = () => { try { return JSON.parse(localStorage.getItem(DB)) || { users: {}, chars: {}, chat: [] }; } catch (e) { return { users: {}, chars: {}, chat: [] }; } };
  const save = d => localStorage.setItem(DB, JSON.stringify(d));
  const ok = data => Promise.resolve({ data, error: null });
  // เซสชันอยู่ต่อหลังรีโหลดแท็บเดิม (เหมือน persistSession ของจริง) แต่แยกตามแท็บ ให้หลายผู้เล่นในเบราว์เซอร์เดียวไม่ชนกัน
  const SKEY = 'fake_sb_session';
  let session = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) { return null; } })();
  const setSession = s => { session = s; try { if (s) sessionStorage.setItem(SKEY, JSON.stringify(s)); else sessionStorage.removeItem(SKEY); } catch (e) { /* ignore */ } };

  // แถวตาราง characters: เก็บคีย์ต่อผู้เล่น (fake_sb_char:<uid>) — หลายแท็บเซฟ/RPC พร้อมกันไม่เขียนทับแถวของกันและกัน
  // สำเนาเดียวกันใน fake_sb_db.chars ไว้ให้เทสต์ที่อ่าน localStorage ตรง ๆ
  const CH = {
    get(u) { try { const v = localStorage.getItem('fake_sb_char:' + u); if (v) return JSON.parse(v); } catch (e) { /* เสีย */ } return db().chars[u] || null; },
    put(u, row) { localStorage.setItem('fake_sb_char:' + u, JSON.stringify(row)); const d = db(); d.chars[u] = row; save(d); },
    all() {
      const out = Object.assign({}, db().chars);
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fake_sb_char:')) { try { const r = JSON.parse(localStorage.getItem(k)); out[r.user_id] = r; } catch (e) { /* เสีย */ } } }
      return Object.values(out);
    },
  };
  window.__FAKE_CH = CH;

  function query(table) {
    const q = { table, filters: [], op: 'select', row: null };
    const run = () => {
      const d = db();
      if (q.op === 'upsert') {
        // trigger characters_session_guard (supabase/migrations/20261011000000_single_session.sql)
        const cur = d.sess && d.sess[q.row.user_id];
        if (table === 'characters' && cur && q.row.sid !== cur) return { data: null, error: { code: 'P0001', message: 'stale_session' } };
        if (table === 'characters') {
          const old = CH.get(q.row.user_id);
          EC.merge(q.row.user_id, old && old.data, q.row); // trigger characters_econ_merge (20261012001000_economy.sql) — เปิดเมื่อ window.__fakeEcon
          const err = SV.verify(old, q.row); // trigger characters_verify_save (20261012000000_save_verify.sql) — เปิดเมื่อเทสต์ใส่สำเนากติกา
          if (err) return { data: null, error: err };
          CH.put(q.row.user_id, q.row);
          return { data: null, error: null };
        }
        save(d); return { data: null, error: null };
      }
      if (q.op === 'insert') {
        if (table === 'chat_messages') {
          const m = Object.assign({ id: Date.now(), user_id: session && session.user.id, name: session && session.user.user_metadata.username }, q.row);
          d.chat.push(m); save(d); bus.postMessage({ kind: 'pg', table, row: m });
        }
        return { data: null, error: null };
      }
      let rows = table === 'characters' ? CH.all() : d.chat;
      for (const [k, v] of q.filters) rows = rows.filter(r => r[k] === v);
      return { data: q.single ? (rows[0] || null) : rows, error: null };
    };
    const thenable = {
      select() { return thenable; }, eq(k, v) { q.filters.push([k, v]); return thenable; }, limit() { return thenable; },
      order() { return thenable; }, abortSignal() { return thenable; },
      maybeSingle() { q.single = true; return Promise.resolve(run()); },
      upsert(row) { q.op = 'upsert'; q.row = row; return Promise.resolve(run()); },
      insert(row) { q.op = 'insert'; q.row = row; return Promise.resolve(run()); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return thenable;
  }

  // ---------- ระบบตรวจเซฟ (supabase/migrations/20261012000000_save_verify.sql) ----------
  // กติกาใช้สำเนา JavaScript (supabase/save_verify_rules.js → window.SaveVerifyRules) + ข้อมูล window.__SV_DATA (tests/save_verify_data.json)
  //   ไม่มีสองอย่างนี้ = เซิร์ฟเวอร์ไม่ตรวจเซฟ (เทสต์อื่นทำงานเหมือนเดิม) • window.__noSaveVerify = จำลองเซิร์ฟเวอร์ที่ยังไม่ได้รัน migration (RPC → PGRST202)
  //   เก็บแยกคีย์ต่อแถว (fake_sv:*) ไม่อ่าน-แก้-เขียนก้อนเดียวกันข้ามแท็บ (กันสองแท็บเขียนทับกัน) • เซฟเดิม = แถว CH ของผู้เล่น
  //   นาฬิกาเซิร์ฟเวอร์ = Date.now() + fake_sv:clock (เทสต์เลื่อนเวลาได้ ใช้ร่วมกันทุกแท็บ) • ตั้งค่า fake_sv:cfg • แบน fake_sv:ban:<uid>
  const SV = {
    get(k, d) { try { const v = localStorage.getItem('fake_sv:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { localStorage.setItem('fake_sv:' + k, JSON.stringify(v)); },
    keys(pre) { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fake_sv:' + pre)) out.push(k.slice(8)); } return out; },
    on() { return !!(window.SaveVerifyRules && window.__SV_DATA) && !window.__noSaveVerify; },
    now() { return Date.now() + (+this.get('clock', 0) || 0); },
    cfg() { return Object.assign({ mode: 'log', soft_rules: ['unknown_item', 'unknown_job', 'dup_uid', 'import_offline'], params: {}, derived: window.__SV_DATA ? window.__SV_DATA.derived : {} }, this.get('cfg', {})); },
    banned(u) { return this.get('ban:' + u, null); },
    worth(items) {
      const I = window.__SV_DATA ? window.__SV_DATA.items : {};
      let w = 0;
      for (const x of Array.isArray(items) ? items : []) { if (!x) continue; w += (I[x.id] ? I[x.id].w : 0) * Math.max(0, Math.min(1e6, +x.qty || 0)); for (const c of x.cards || []) w += I[c] ? I[c].w : 0; }
      return w;
    },
    ledger(u) { return this.keys('led:').map(k => Object.assign({ key: k }, this.get(k))).filter(r => !u || r.user_id === u); },
    paired(r) { return !!this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`, null) && this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`).peer_id === r.user_id && this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`).sig === r.sig; },
    flag(u, f) { const l = this.get('flags:' + u, []); l.push(f); this.set('flags:' + u, l); },
    verify(prev, row) { // prev = แถวเดิม (CH) หรือ null
      if (!this.on()) return null;
      const u = row.user_id;
      if (this.banned(u) != null) return { code: 'P0001', message: 'banned' };
      const now = this.now(), cfg = this.cfg();
      if (cfg.mode === 'off') { row.updated_ms = now; return null; }
      const rows = this.ledger(u).filter(r => !r.consumed).map(r => Object.assign({}, r, { paired: this.paired(r) }));
      const res = window.SaveVerifyRules.evaluate({ oldData: prev ? prev.data : null, newData: row.data, oldAt: prev ? prev.updated_ms : null, now, state: this.get('state:' + u, null), rows, cfg, items: window.__SV_DATA.items, jobs: window.__SV_DATA.jobs });
      const log = this.get('log:' + u, []); log.push({ at: now, t: res.t, dW: res.dW, credit: res.credit, flags: res.flags.map(f => f.rule), reject: res.reject, state: res.state }); this.set('log:' + u, log.slice(-300));
      if (res.reject) return { code: 'P0001', message: 'save_rejected:' + res.reject, hint: 'The server rejected this save' };
      this.set('state:' + u, res.state);
      for (const r of rows) if (res.consume.includes(r.id)) this.set(r.key, Object.assign(this.get(r.key), { consumed: now }));
      const fl = this.get('flags:' + u, []);
      for (const f of res.flags) if (!fl.some(x => x.rule === f.rule && x.slot === f.slot && now - x.at < 600000)) fl.push({ user_id: u, slot: f.slot, rule: f.rule, detail: f.detail, mode: cfg.mode, at: now });
      this.set('flags:' + u, fl);
      row.updated_ms = now;
      return null;
    },
    rpc(fn, a) {
      if (window.__noSaveVerify) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } };
      if (!session) return { data: null, error: { message: 'not signed in' } };
      const u = session.user.id, now = this.now();
      if (fn === 'my_ban') return { data: this.banned(u), error: null };
      if (fn === 'save_verify_report') { this.flag(u, { user_id: u, slot: null, rule: 'rejected:' + a.rule, detail: a.detail || {}, mode: 'enforce', rejected: true, at: now }); return { data: null, error: null }; }
      if (this.banned(u) != null) return { data: null, error: { code: 'P0001', message: 'banned' } };
      let r;
      if (fn === 'market_record') {
        if (u !== a.seller && u !== a.buyer) return { data: null, error: { message: 'not a party to this sale' } };
        const peer = u === a.seller ? a.buyer : a.seller, w = this.worth([{ id: a.item, qty: a.qty, cards: a.cards || [] }]), cost = a.price * a.qty;
        if (!peer || peer === u) return { data: null, error: { message: 'bad peer' } };
        r = { kind: 'market', tid: a.tid, user_id: u, peer_id: peer, zin: u === a.seller ? cost : 0, zout: u === a.buyer ? cost : 0, win: u === a.buyer ? w : 0, wout: u === a.seller ? w : 0,
          sig: ['market', a.seller, a.buyer, a.item, a.qty, a.price, (a.cards || []).join(',')].join('|') };
      } else if (fn === 'trade_record') {
        if (!a.peer || a.peer === u) return { data: null, error: { message: 'bad peer' } };
        const zg = Math.max(0, Math.floor(+a.gave.zeny) || 0), zr = Math.max(0, Math.floor(+a.got.zeny) || 0), wg = this.worth(a.gave.items), wr = this.worth(a.got.items);
        r = { kind: 'trade', tid: a.tid, user_id: u, peer_id: a.peer, zin: zr, zout: zg, win: wr, wout: wg, sig: u < a.peer ? ['trade', u, zg, wg, a.peer, zr, wr].join('|') : ['trade', a.peer, zr, wr, u, zg, wg].join('|') };
      } else return { data: null, error: null };
      const k = `led:${r.kind}:${r.tid}:${u}`;
      if (!this.get(k, null)) this.set(k, Object.assign(r, { id: k, at: now }));
      return { data: this.paired(this.get(k)), error: null };
    },
  };
  window.__FAKE_SV = SV;

  // ---------- เศรษฐกิจฝั่งเซิร์ฟเวอร์ (supabase/migrations/20261012001000_economy.sql) — เปิดเมื่อเทสต์ตั้ง window.__fakeEcon = true ----------
  //   ไม่เปิด = RPC econ_* ตอบ PGRST202 (เหมือนเซิร์ฟเวอร์ที่ยังไม่ได้รัน migration) → เกมใช้วิธีเดิม (เทสต์เดิมไม่เปลี่ยน)
  //   ตรรกะเดียวกับ SQL (ec_apply / ec_commit / econ_*) • เก็บแยกคีย์ fake_ec:* • แถวตัวละครอ่าน/เขียนผ่าน CH (คีย์ต่อผู้เล่น)
  const EC = {
    on() { return !!window.__fakeEcon && !window.__noSaveVerify; },
    get(k, d) { try { const v = localStorage.getItem('fake_ec:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { localStorage.setItem('fake_ec:' + k, JSON.stringify(v)); },
    key: n => String(n || '').trim().toLowerCase(),
    err: m => ({ data: null, error: { code: 'P0001', message: m } }),
    fail(m) { const e = new Error(m); e.econ = m; throw e; },
    uid() { const n = this.get('uid', 1e12) + 1; this.set('uid', n); return n; },
    item: id => window.__SV_DATA && window.__SV_DATA.items[id],
    idx(d, k) { return d && Array.isArray(d.chars) ? d.chars.findIndex(c => c && this.key(c.name) === k) : -1; },
    apply(c, d, strict) {
      c = JSON.parse(JSON.stringify(c));
      let inv = Array.isArray(c.inventory) ? c.inventory : [];
      const z = (c.zeny || 0) + (d.zeny || 0);
      if (strict && z < 0) this.fail('econ_no_zeny');
      c.zeny = Math.max(0, z);
      for (const r of d.remove || []) {
        if (r.uid != null) { const i = inv.findIndex(x => String(x.uid) === String(r.uid)); if (i < 0) { if (strict) this.fail('econ_missing_item'); continue; } inv.splice(i, 1); continue; }
        let need = r.qty; const out = [];
        for (const e of inv) { if (need > 0 && e.id === r.id && e.uid == null) { const k = Math.min(need, e.qty); need -= k; if (e.qty - k > 0) out.push(Object.assign({}, e, { qty: e.qty - k })); } else out.push(e); }
        if (strict && need > 0) this.fail('econ_missing_item');
        inv = out;
      }
      for (const a of d.add || []) {
        if (a.uid != null) inv.push(a);
        else { const e = inv.find(x => x.id === a.id && x.uid == null); if (e) e.qty += a.qty; else inv.push({ id: a.id, qty: a.qty }); }
      }
      c.inventory = inv;
      if ('vend' in d) c.vend = d.vend;
      if (d.sale) c.mkSales = [d.sale].concat(Array.isArray(c.mkSales) ? c.mkSales : []).slice(0, 20);
      if (d.refine) { if (c.equip && c.equip[d.refine.slot]) c.equip[d.refine.slot].refine = d.refine.to; else if (strict) this.fail('econ_missing_item'); }
      if (d.exp) { // ec_exp: ขึ้นเลเวลแบบเดียวกับ gainExp
        const J = window.__SV_DATA && window.__SV_DATA.jobs[c.job], tier = c.job === 'novice' ? 0 : (J ? J.tier : 1);
        const nb = l => 3 * l * l * l + 40, nj = l => (tier === 0 ? Math.floor(5 * Math.pow(l, 1.5)) + 5 : (tier === 2 ? 70 : tier === 3 ? 100 : 40) * l * l);
        let lv = c.baseLv || 1, ex = (c.baseExp || 0) + Math.max(0, d.exp.b || 0), sp = c.statPoints || 0;
        while (lv < 99 && ex >= nb(lv)) { ex -= nb(lv); lv++; sp += Math.floor(lv / 5) + 3; }
        if (lv >= 99) ex = 0;
        let jl = c.jobLv || 1, jx = (c.jobExp || 0) + Math.max(0, d.exp.j || 0), sk = c.skillPoints || 0;
        if (d.exp.jmax > 0) { while (jl < d.exp.jmax && jx >= nj(jl)) { jx -= nj(jl); jl++; sk++; } if (jl >= d.exp.jmax) jx = 0; }
        Object.assign(c, { baseLv: lv, baseExp: ex, statPoints: sp, jobLv: jl, jobExp: jx, skillPoints: sk });
      }
      if (Array.isArray(d.chips)) c.chips = [...new Set([...(Array.isArray(c.chips) ? c.chips : []), ...d.chips])];
      return c;
    },
    begin(u, k) {
      if (!session) this.fail('not signed in');
      if (window.__FAKE_SV && window.__FAKE_SV.banned(u) != null) this.fail('banned');
      const row = CH.get(u), i = this.idx(row && row.data, k);
      if (i < 0) this.fail('econ_no_char');
      return row.data.chars[i];
    },
    commit(u, k, delta, kind, ref) {
      const row = CH.get(u), i = this.idx(row && row.data, k);
      if (i < 0) this.fail('econ_no_char');
      const c = this.apply(row.data.chars[i], delta, true);
      c.econSeq = (c.econSeq || 0) + 1;
      row.data.chars[i] = c; CH.put(u, row);
      const evs = this.get(`ev:${u}:${k}`, []); evs.push({ seq: c.econSeq, kind, delta, ref, at: Date.now() }); this.set(`ev:${u}:${k}`, evs);
      return c.econSeq;
    },
    vend(c) { return c.vend && Array.isArray(c.vend.items) ? JSON.parse(JSON.stringify(c.vend)) : { v: 2, sid: Math.random().toString(36).slice(2, 12), items: [], earned: 0, at: Date.now() }; },
    canon(o) {
      const items = ((o && o.items) || []).map(x => (x.uid != null ? { uid: +x.uid } : { id: x.id, qty: Math.floor(+x.qty) || 0 }));
      items.sort((a, b) => String(a.uid != null ? a.uid : '').localeCompare(String(b.uid != null ? b.uid : '')) || String(a.id || '').localeCompare(String(b.id || '')) || (a.qty || 0) - (b.qty || 0));
      return JSON.stringify({ zeny: Math.max(0, Math.floor(+(o && o.zeny)) || 0), items });
    },
    give(c, offer) {
      const rem = [], add = [];
      for (const x of offer.items) {
        if (x.uid != null) {
          const e = (c.inventory || []).find(y => +y.uid === +x.uid);
          if (!e) this.fail('econ_missing_item');
          rem.push({ uid: e.uid }); add.push({ id: e.id, qty: 1, uid: this.uid(), refine: e.refine || 0, cards: (e.cards || []).slice() });
        } else { rem.push({ id: x.id, qty: x.qty }); add.push({ id: x.id, qty: x.qty }); }
      }
      return { rem, add };
    },
    res: (seq, delta) => ({ seq, delta }),
    rpc(fn, a) {
      const u = session && session.user.id;
      const k = this.key(a.ch || a.my_char || a.buyer_char);
      switch (fn) {
        case 'econ_pull': return (this.get(`ev:${u}:${k}`, [])).filter(e => e.seq > (a.since || 0)).slice(0, 200).map(e => ({ seq: e.seq, kind: e.kind, delta: e.delta, ref: e.ref }));
        case 'econ_shop_buy': {
          this.begin(u, k);
          const it = this.item(a.item);
          if (!it || !it.shop) this.fail('econ_not_sold');
          if (!(a.qty >= 1 && a.qty <= (it.eq ? 20 : 10000))) this.fail('econ_bad_qty');
          const add = it.eq ? Array.from({ length: a.qty }, () => ({ id: a.item, qty: 1, uid: this.uid(), refine: 0, cards: [] })) : [{ id: a.item, qty: a.qty }];
          const d = { zeny: -(it.p * a.qty), add };
          return this.res(this.commit(u, k, d, 'shop_buy', a.item), d);
        }
        case 'econ_shop_sell': {
          const c = this.begin(u, k);
          let gain = 0; const rem = [];
          for (const x of a.lines || []) {
            if (x.uid != null) { const e = (c.inventory || []).find(y => +y.uid === +x.uid); if (!e) this.fail('econ_missing_item'); gain += Math.floor((this.item(e.id) || { p: 0 }).p / 2); rem.push({ uid: x.uid }); }
            else { if (!(x.qty >= 1)) this.fail('econ_bad_qty'); gain += Math.floor((this.item(x.id) || { p: 0 }).p / 2) * x.qty; rem.push({ id: x.id, qty: x.qty }); }
          }
          const d = { zeny: gain, remove: rem };
          return this.res(this.commit(u, k, d, 'shop_sell', null), d);
        }
        case 'econ_refine': {
          const c = this.begin(u, k), e = c.equip && c.equip[a.slot];
          if (!e) this.fail('econ_missing_item');
          const R = (window.__SV_DATA && window.__SV_DATA.refine) || { rate: [1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1], weapon_fee: 250, armor_fee: 400, ore: { weapon: 'rune_alloy', armor: 'volt_ore' }, ore_from: 4 };
          const lv = e.refine || 0;
          if (lv >= 10) this.fail('econ_maxed');
          const rate = window.__fakeRefineRate != null ? window.__fakeRefineRate : R.rate[lv];
          const fee = (a.slot === 'weapon' ? R.weapon_fee : R.armor_fee) * (lv + 1), ore = lv >= R.ore_from ? (a.slot === 'weapon' ? R.ore.weapon : R.ore.armor) : null;
          const okk = Math.random() < rate;
          const d = { zeny: -fee, remove: ore ? [{ id: ore, qty: 1 }] : [], ok: okk };
          if (okk) d.refine = { slot: a.slot, to: lv + 1 };
          return this.res(this.commit(u, k, d, 'refine', a.slot), d);
        }
        case 'econ_market_list': {
          const c = this.begin(u, k), line = a.line || {};
          if (!(a.price >= 1 && a.price <= 1e9)) this.fail('econ_bad_price');
          const v = this.vend(c); v.items = v.items.filter(x => x.qty > 0);
          let e = null, qty, same = -1;
          if (line.uid != null) { e = (c.inventory || []).find(y => +y.uid === +line.uid); if (!e) this.fail('econ_missing_item'); qty = 1; }
          else { qty = Math.floor(+line.qty) || 0; if (qty < 1 || !this.item(line.id)) this.fail('econ_bad_qty'); same = v.items.findIndex(x => x.id === line.id && x.uid == null && x.price === a.price); }
          if (same >= 0) v.items[same].qty += qty;
          else {
            if (v.items.length >= 12) this.fail('econ_market_full');
            let i = 0; while (v.items.some(x => x.i === i)) i++;
            v.items.push(e ? { i, id: e.id, qty: 1, price: a.price, uid: e.uid, refine: e.refine || 0, cards: (e.cards || []).slice() } : { i, id: line.id, qty, price: a.price });
          }
          const d = { remove: [e ? { uid: e.uid } : { id: line.id, qty }], vend: v };
          return this.res(this.commit(u, k, d, 'market_list', null), d);
        }
        case 'econ_market_cancel': {
          const c = this.begin(u, k), v = this.vend(c), x = v.items.find(y => y.i === a.i && y.qty > 0);
          if (!x) this.fail('econ_no_listing');
          v.items = v.items.filter(y => y.i !== a.i);
          const d = { add: [x.uid != null ? { id: x.id, qty: 1, uid: x.uid, refine: x.refine || 0, cards: x.cards || [] } : { id: x.id, qty: x.qty }], vend: v.items.some(y => y.qty > 0) ? v : null };
          return this.res(this.commit(u, k, d, 'market_cancel', null), d);
        }
        case 'econ_market_price': {
          const c = this.begin(u, k), v = this.vend(c), x = v.items.find(y => y.i === a.i && y.qty > 0);
          if (!(a.price >= 1 && a.price <= 1e9)) this.fail('econ_bad_price');
          if (!x) this.fail('econ_no_listing');
          x.price = a.price;
          const d = { vend: v };
          return this.res(this.commit(u, k, d, 'market_price', null), d);
        }
        case 'econ_market_buy': {
          const prev = this.get('buy:' + a.tid, null);
          if (prev && prev.buyer === u) return prev.result;
          if (!a.seller || a.seller === u) this.fail('econ_bad_peer');
          const bc = this.begin(u, this.key(a.buyer_char)), sk = this.key(a.seller_char);
          const srow = CH.get(a.seller), si = this.idx(srow && srow.data, sk);
          if (si < 0) this.fail('econ_no_listing');
          const v = this.vend(srow.data.chars[si]), n = v.items.findIndex(y => y.i === a.i), x = v.items[n];
          if (!x || x.qty <= 0) this.fail('econ_soldout');
          if (x.price !== a.price) this.fail('econ_changed');
          if (x.qty < a.qty || (x.uid != null && a.qty !== 1)) this.fail('econ_stock');
          const cost = a.price * a.qty;
          if ((bc.zeny || 0) < cost) this.fail('econ_no_zeny');
          x.qty -= a.qty; if (x.qty <= 0) x.soldAt = Date.now(); v.earned = (v.earned || 0) + cost;
          const bd = { zeny: -cost, add: [x.uid != null ? { id: x.id, qty: 1, uid: this.uid(), refine: x.refine || 0, cards: (x.cards || []).slice() } : { id: x.id, qty: a.qty }] };
          const bs = this.commit(u, this.key(a.buyer_char), bd, 'market_buy', a.tid);
          const sd = { zeny: cost, vend: v, sale: { who: String(bc.name).slice(0, 24), id: x.id, qty: a.qty, gain: cost, refine: x.refine || 0, at: Date.now(), i: a.i } };
          const ss = this.commit(a.seller, sk, sd, 'market_sale', a.tid);
          const result = Object.assign(this.res(bs, bd), { seller_seq: ss });
          this.set('buy:' + a.tid, { buyer: u, result });
          return result;
        }
        case 'econ_trade': {
          if (!a.peer || a.peer === u) this.fail('econ_bad_peer');
          this.begin(u, k);
          const gave = JSON.parse(this.canon(a.gave)), got = JSON.parse(this.canon(a.got));
          const t = this.get('tr:' + a.tid, null);
          if (!t) { this.set('tr:' + a.tid, { a: u, b: a.peer, a_char: k, a_gave: gave, a_got: got, status: 'pending', at: Date.now() }); return { status: 'pending' }; }
          const evOf = (uu, kk, s) => (this.get(`ev:${uu}:${kk}`, []).find(e => e.seq === s) || {}).delta;
          if (t.status === 'done') {
            if (u === t.a) return Object.assign({ status: 'done' }, this.res(t.a_seq, evOf(u, t.a_char, t.a_seq)));
            if (u === t.b) return Object.assign({ status: 'done' }, this.res(t.b_seq, evOf(u, t.b_char, t.b_seq)));
          }
          if (t.status === 'cancelled') return { status: 'cancelled' };
          if (u === t.a) return { status: 'pending' };
          if (u !== t.b || a.peer !== t.a) this.fail('econ_bad_peer');
          if (Date.now() - t.at > 120000 || this.canon(gave) !== this.canon(t.a_got) || this.canon(got) !== this.canon(t.a_gave)) {
            t.status = 'cancelled'; this.set('tr:' + a.tid, t); return { status: 'cancelled', why: Date.now() - t.at > 120000 ? 'timeout' : 'mismatch' };
          }
          const ra = CH.get(t.a), ca = ra.data.chars[this.idx(ra.data, t.a_char)], cb = this.begin(u, k);
          if ((ca.zeny || 0) < t.a_gave.zeny || (cb.zeny || 0) < gave.zeny) this.fail('econ_no_zeny');
          const ga = this.give(ca, t.a_gave), gb = this.give(cb, gave);
          const da = { zeny: gave.zeny - t.a_gave.zeny, remove: ga.rem, add: gb.add }, db2 = { zeny: t.a_gave.zeny - gave.zeny, remove: gb.rem, add: ga.add };
          const sa = this.commit(t.a, t.a_char, da, 'trade', a.tid), sb = this.commit(u, k, db2, 'trade', a.tid);
          Object.assign(t, { status: 'done', b_char: k, a_seq: sa, b_seq: sb }); this.set('tr:' + a.tid, t);
          return Object.assign({ status: 'done' }, this.res(sb, db2));
        }
        case 'econ_trade_cancel': { const t = this.get('tr:' + a.tid, null); if (t && t.status === 'pending' && (u === t.a || u === t.b)) { t.status = 'cancelled'; this.set('tr:' + a.tid, t); } return null; }
      }
      return null;
    },
    call(fn, a) {
      window.__ecCalls = (window.__ecCalls || 0) + 1;
      if (!this.on()) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } };
      if (window.__fakeEconOff) return this.err('econ_off');
      try { return { data: this.rpc(fn, a || {}), error: null }; } catch (e) { return this.err(e.econ || e.message); }
    },
    // trigger characters_econ_merge: เซฟที่ econSeq ต่ำกว่าเซิร์ฟเวอร์ → เติมรายการที่ขาด · vend ของเซิร์ฟเวอร์ · ของปั๊ม (uid ที่ออกไปแล้ว)
    merge(u, oldData, row) {
      if (!this.on() || !oldData || !row.data || !Array.isArray(row.data.chars)) return;
      const oc = Array.isArray(oldData.chars) ? oldData.chars : [];
      row.data.chars = row.data.chars.map((c, idx) => {
        if (!c || typeof c !== 'object') return c;
        const k = this.key(c.name), o = oc.find(x => x && this.key(x.name) === k);
        if (!o || o.econSeq == null) return c;
        const sv = o.econSeq, cv = Math.min(sv, Math.floor(+c.econSeq) || 0), evs = this.get(`ev:${u}:${k}`, []);
        for (const ev of evs) if (ev.seq > cv && ev.seq <= sv) c = this.apply(c, ev.delta, false);
        c = Object.assign({}, c, { econSeq: sv, vend: o.vend == null ? null : o.vend });
        const gone = new Set();
        evs.forEach((ev, i) => { for (const r of ev.delta.remove || []) if (r.uid != null && !evs.slice(i + 1).some(e2 => (e2.delta.add || []).some(x => +x.uid === +r.uid)) && !((o.vend && o.vend.items) || []).some(v => +v.uid === +r.uid && v.qty > 0)) gone.add(+r.uid); });
        const all = [...(c.inventory || []), ...(c.storage || []), ...Object.values(c.equip || {}).filter(Boolean)];
        const dup = all.filter(e => e && e.uid != null && gone.has(+e.uid)).map(e => e.uid);
        if (dup.length) {
          const fl = window.__FAKE_SV.get('flags:' + u, []);
          fl.push({ user_id: u, slot: idx, rule: 'dup_item', detail: { name: c.name, uids: dup }, at: window.__FAKE_SV.now() }); window.__FAKE_SV.set('flags:' + u, fl);
          if (window.__FAKE_SV.cfg().mode === 'enforce') {
            const keep = e => !(e && e.uid != null && gone.has(+e.uid));
            c.inventory = (c.inventory || []).filter(keep); c.storage = (c.storage || []).filter(keep);
            for (const s in c.equip || {}) if (!keep(c.equip[s])) c.equip[s] = null;
          }
        }
        return c;
      });
    },
  };
  window.__FAKE_EC = EC;

  // ---------- โซ่บันทึกการเล่น + ดรอป/EXP ฝั่งเซิร์ฟเวอร์ (supabase/migrations/20261012002000_event_chain.sql) — เปิดเมื่อ window.__fakeChain ----------
  //   ตรรกะเดียวกับ submit_events (ตรวจโซ่ · ความเป็นไปได้ · ทอยรางวัล · หมุด HMAC) • ข้อมูลมอน/แผนที่จาก window.__SV_DATA (tests/save_verify_data.json)
  //   นาฬิกา = Date.now() + fake_ch:skew (เทสต์เลื่อนเวลาได้) • ไม่เปิด = RPC ตอบ PGRST202 (เซิร์ฟเวอร์ยังไม่ได้รัน migration)
  const CHN = {
    on() { return !!window.__fakeChain && EC.on(); },
    get: (k, d) => EC.get('ch:' + k, d), set: (k, v) => EC.set('ch:' + k, v),
    now() { return Date.now() + (+this.get('skew', 0) || 0); },
    hex: b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join(''),
    async sha(s) { return this.hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); },
    async hmac(k, m) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return this.hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(m))); },
    secret() { let s = this.get('secret', null); if (!s) { s = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); this.set('secret', s); } return s; },
    canon: e => [e.seq, e.prev, e.t, e.k, (e.a || []).join('|')].join('|'),
    async last(u, k) {
      let a = this.get(`a:${u}:${k}`, null);
      if (!a) {
        const h = await this.hmac(this.secret(), ['genesis', u, k].join('|'));
        a = { id: (this.get('id', 0) + 1), seq: 0, head: h, mac: await this.hmac(this.secret(), [u, k, 0, h].join('|')), at: this.now() };
        this.set('id', a.id); this.set(`a:${u}:${k}`, a);
      }
      return a;
    },
    pub: a => ({ id: a.id, seq: a.seq, head: a.head, mac: a.mac }),
    flag(u, rule, detail) {
      const fl = window.__FAKE_SV.get('flags:' + u, []), now = this.now();
      if (!fl.some(f => f.rule === rule && now - f.at < 120000)) { fl.push({ user_id: u, slot: null, rule, detail, at: now }); window.__FAKE_SV.set('flags:' + u, fl); }
    },
    expMul(mlv, lv) { const d = mlv - lv; return d >= 16 ? 0.4 : d >= 10 ? 1.4 - (d - 10) * 0.05 : d >= 3 ? 1 + (d - 2) * 0.05 : d >= -5 ? 1 : d >= -10 ? 0.95 : d >= -15 ? 0.9 : d >= -20 ? 0.85 : d >= -25 ? 0.6 : d >= -30 ? 0.35 : 0.1; },
    async rpc(fn, a) {
      if (!this.on()) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } };
      if (window.__fakeChainOff) return EC.err('chain_off');
      const u = session && session.user.id, k = EC.key(a.ch);
      try { EC.begin(u, k); } catch (e) { return EC.err(e.econ || e.message); }
      const A = await this.last(u, k);
      if (fn === 'chain_head') return { data: this.pub(A), error: null };
      if (fn !== 'submit_events') return { data: null, error: null };
      const D = window.__SV_DATA, mode = window.__FAKE_SV.cfg().mode, E = a.entries || [], n = E.length, now = this.now();
      const rej = rule => ({ data: { status: 'rejected', rule, anchor: this.pub(A) }, error: null });
      if (!n || n > 200) return rej('bad_batch');
      const log = this.get(`log:${u}:${k}`, []);
      if (a.prev_anchor !== A.id) {
        if (log.some(l => l.to_seq === E[n - 1].seq && l.h === E[n - 1].h)) return { data: { status: 'dup', anchor: this.pub(A) }, error: null };
        this.flag(u, 'chain_break', { why: 'stale_anchor' }); return rej('chain_break');
      }
      let prev = A.head, s = A.seq, lastt = 0;
      for (const e of E) {
        if (e.seq !== s + 1 || e.prev !== prev || e.h !== await this.sha(this.canon(e)) || e.t < lastt) { this.flag(u, 'chain_break', { why: 'link', at: s + 1 }); return rej('chain_break'); }
        prev = e.h; s++; lastt = e.t;
      }
      const span = Math.max(0, (lastt - E[0].t) / 1000), elapsed = (now - A.at) / 1000, kills = E.filter(e => e.k === 'kill');
      let bad = null;
      if (kills.length > 3 * (Math.min(elapsed, 21600) + 30)) bad = 'kill_rate';
      const by = {};
      for (const e of kills) { const key = e.a[1] + '|' + e.a[0]; by[key] = (by[key] || 0) + 1; }
      const bk = this.get(`boss:${u}:${k}`, {});
      for (const key in by) {
        if (bad) break;
        const [map, mob] = key.split('|'), m = D.mobs[mob], sp = (D.spawns || []).find(x => x[0] === map && x[1] === mob);
        if (!m || !sp) { bad = 'kill_map'; break; }
        if (m.boss || m.wb) { if (by[key] > 1 || (bk[mob] && now - bk[mob] < Math.max(60000, m.respawn * 0.8))) bad = 'boss_cooldown'; }
        else if (by[key] > sp[2] * (1 + Math.max(span, Math.min(elapsed, 21600)) / 4) * 1.5 + 2) bad = 'kill_rate';
      }
      if (bad) { this.flag(u, bad, { kills: kills.length }); if (mode === 'enforce') return rej(bad); }
      // ทอยรางวัล
      const row = CH.get(u), c = row.data.chars[EC.idx(row.data, k)];
      let lv = c.baseLv || 1, b = 0, j = 0, zeny = 0; const add = [], chips = [], got = [], G2 = D.gacha || {};
      for (const e of kills) {
        const m = D.mobs[e.a[0]]; if (!m) continue;
        const party = Math.min(5, Math.max(0, e.a[3] | 0)), kf = (1 + 0.15 * party) / (party + 1), em = this.expMul(m.lv, lv);
        b += Math.round(Math.max(1, Math.round(m.exp * em)) * kf); j += Math.round(Math.max(1, Math.round(m.jexp * em)) * kf);
        if (m.zmax > 0) zeny += m.zmin + Math.floor(Math.random() * (m.zmax - m.zmin + 1));
        for (const [id, ch] of m.drops) if (Math.random() < ch) { add.push(D.items[id] && D.items[id].eq ? { id, qty: 1, uid: EC.uid(), refine: 0, cards: [] } : { id, qty: 1 }); got.push({ id, mob: e.a[0] }); }
        if (m.chip && Math.random() < (m.boss ? D.chip.boss : D.chip.drop)) { add.push({ id: m.chip, qty: 1 }); chips.push(e.a[0]); got.push({ id: m.chip, mob: e.a[0], chip: true }); }
        if (G2.token) {
          if (m.boss || m.wb) { const q = m.wb ? G2.wb : G2.mvp; if (q > 0) { add.push({ id: G2.token, qty: q }); got.push({ id: G2.token, qty: q }); } }
          else if (m.exp > 0) { const gap = Math.abs(lv - m.lv), f = gap <= G2.fullGap ? 1 : Math.max(0, 1 - (gap - G2.fullGap) / (G2.zeroGap - G2.fullGap)); if (Math.random() < G2.base * f * (m.elite ? G2.eliteMul : 1)) { add.push({ id: G2.token, qty: 1 }); got.push({ id: G2.token }); } }
        }
        if (m.boss && !m.wb) add.push({ id: ['white_potion', 'blue_potion', 'yellow_potion'][Math.floor(Math.random() * 3)], qty: 3 });
        if (m.boss || m.wb) bk[e.a[0]] = now;
      }
      this.set(`boss:${u}:${k}`, bk);
      const jm = D.jobs[c.job] ? D.jobs[c.job].max : 0;
      const delta = { zeny, add, exp: { b, j, jmax: jm }, chips, kills: kills.length };
      log.push({ to_seq: s, h: prev, n, at: now }); this.set(`log:${u}:${k}`, log.slice(-500));
      const na = { id: this.get('id', 0) + 1, seq: s, head: prev, mac: await this.hmac(this.secret(), [u, k, s, prev].join('|')), at: now };
      this.set('id', na.id); this.set(`a:${u}:${k}`, na);
      const seq = EC.commit(u, k, delta, 'kills', String(na.id));
      return { data: { status: 'ok', anchor: this.pub(na), seq, delta, got }, error: null };
    },
  };
  window.__FAKE_CHN = CHN;

  const bus = new BroadcastChannel('fake_supabase_bus');
  const channels = new Set();
  bus.onmessage = ({ data: m }) => { for (const ch of channels) ch._recv(m); };

  function channel(name, opts) {
    const key = opts && opts.config && opts.config.presence && opts.config.presence.key;
    const handlers = [];
    const presence = {}; // key -> [meta]
    const ch = {
      name,
      on(type, filter, cb) { handlers.push({ type, filter, cb }); return ch; },
      subscribe(cb) {
        channels.add(ch);
        setTimeout(() => { cb && cb('SUBSCRIBED'); bus.postMessage({ kind: 'hello', ch: name, from: key }); }, 20);
        return ch;
      },
      track(meta) { if (key) { presence[key] = [meta]; bus.postMessage({ kind: 'presence', ch: name, key, meta }); fire('presence', 'sync'); } return Promise.resolve('ok'); },
      presenceState() { return presence; },
      send(msg) { bus.postMessage({ kind: 'bc', ch: name, event: msg.event, payload: msg.payload }); return Promise.resolve('ok'); },
      _leave() { if (key) bus.postMessage({ kind: 'leave', ch: name, key }); channels.delete(ch); },
      _recv(m) {
        if (m.kind === 'pg') { for (const h of handlers) if (h.type === 'postgres_changes' && h.filter.table === m.table) h.cb({ new: m.row }); return; }
        if (m.ch !== name) return;
        if (m.kind === 'bc') for (const h of handlers) if (h.type === 'broadcast' && h.filter.event === m.event) h.cb({ payload: m.payload });
        if (m.kind === 'hello' && key && presence[key]) bus.postMessage({ kind: 'presence', ch: name, key, meta: presence[key][0] });
        if (m.kind === 'presence') {
          const isNew = !presence[m.key]; presence[m.key] = [m.meta]; fire('presence', 'sync');
          if (isNew) for (const h of handlers) if (h.type === 'presence' && h.filter.event === 'join') h.cb({ key: m.key });
        }
        if (m.kind === 'leave') { delete presence[m.key]; fire('presence', 'sync'); for (const h of handlers) if (h.type === 'presence' && h.filter.event === 'leave') h.cb({ key: m.key }); }
      },
    };
    function fire(type, ev) { for (const h of handlers) if (h.type === type && h.filter.event === ev) h.cb({}); }
    return ch;
  }

  const auth = {
    async signUp({ email, password, options }) {
      const d = db(); if (d.users[email]) return { data: {}, error: { message: 'User already registered' } };
      const user = { id: 'u_' + Math.random().toString(36).slice(2, 10), email, user_metadata: options && options.data || {} };
      d.users[email] = { user, password }; save(d); setSession({ user });
      return { data: { session, user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const u = db().users[email]; if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      setSession({ user: u.user }); return { data: { session, user: u.user }, error: null };
    },
    async getSession() { return { data: { session } }; },
    async signOut() { setSession(null); return { error: null }; },
  };

  window.__FAKE_SUPABASE__ = true;
  window.supabase = {
    createClient() {
      // name_available: เหมือน supabase/migrations/..._multi_char.sql — เช็กทั้งคอลัมน์ name และทุกช่องใน data.chars ของคนอื่น (ไม่สนตัวพิมพ์)
      const lc = s => String(s || '').trim().toLowerCase();
      const names = c => [c.name, ...((c.data && Array.isArray(c.data.chars)) ? c.data.chars.map(x => x && x.name) : [])].map(lc);
      // claim_session: เครื่องล่าสุดเป็นเจ้าของบัญชี (window.__noServerGuard = จำลองเซิร์ฟเวอร์ที่ยังไม่ได้รัน migration)
      const claim = s => {
        if (window.__noServerGuard) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.claim_session' } });
        if (!session) return Promise.resolve({ data: null, error: { message: 'not signed in' } });
        const d = db(); d.sess = d.sess || {}; d.sess[session.user.id] = s; save(d); return ok(null);
      };
      const svRpc = (fn, args) => { window.__svCalls = (window.__svCalls || 0) + 1; return Promise.resolve(SV.rpc(fn, args || {})); };
      // ระบบเพื่อน: เหมือน supabase/migrations/20261012010000_friends.sql (window.__noFriendsServer = เซิร์ฟเวอร์ที่ยังไม่ได้รัน migration)
      const friend = (fn, args) => {
        if (window.__noFriendsServer) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } });
        if (!session) return Promise.resolve({ data: null, error: { message: 'not signed in' } });
        // เก็บแยกคีย์ (ไม่ปนกับก้อน db ที่ทุกแท็บเขียนทับทั้งก้อนตอนเซฟตัวละคร — localStorage ข้ามแท็บส่งค่าแบบ async)
        const FK = 'fake_sb_friends', d = db(), me = session.user.id;
        const fr = { friends: (() => { try { return JSON.parse(localStorage.getItem(FK)) || []; } catch (e) { return []; } })() };
        const saveF = () => localStorage.setItem(FK, JSON.stringify(fr.friends));
        const F = fr.friends, rel = (a, b) => F.find(r => r.user_id === a && r.friend_id === b);
        const nameOf = id => (d.chars[id] || {}).name || null;
        if (fn === 'friend_list') return ok(F.filter(r => r.user_id === me || r.friend_id === me).map(r => {
          const id = r.user_id === me ? r.friend_id : r.user_id;
          return { id, name: nameOf(id), status: r.status, dir: r.status === 'accepted' ? 'both' : r.user_id === me ? 'out' : 'in', created_at: r.created_at };
        }));
        if (fn === 'friend_accept') { const r = rel(args.id, me); if (r && r.status === 'pending') { r.status = 'accepted'; saveF(); return ok(true); } return ok(false); }
        if (fn === 'friend_remove') { const n = F.length; fr.friends = F.filter(r => !((r.user_id === me && r.friend_id === args.id) || (r.user_id === args.id && r.friend_id === me))); saveF(); return ok(fr.friends.length < n); }
        if (fn === 'friend_request') {
          const q = lc(args.n); if (!q || q.length > 24) return ok({ ok: false, why: 'bad_name' });
          const row = Object.values(d.chars).find(c => names(c).includes(q)); if (!row) return ok({ ok: false, why: 'not_found' });
          const other = row.user_id, shown = [row.name, ...((row.data && Array.isArray(row.data.chars)) ? row.data.chars.map(x => x && x.name) : [])].find(x => lc(x) === q) || row.name;
          if (other === me) return ok({ ok: false, why: 'self' });
          const back = rel(other, me);
          if (back && back.status === 'pending') { back.status = 'accepted'; saveF(); return ok({ ok: true, id: other, name: shown, status: 'accepted' }); }
          if (back || rel(me, other)) return ok({ ok: false, why: 'exists', id: other, status: (back || rel(me, other)).status });
          F.push({ user_id: me, friend_id: other, status: 'pending', created_at: new Date().toISOString() }); saveF();
          return ok({ ok: true, id: other, name: shown, status: 'pending' });
        }
        return ok(null);
      };
      return { auth, from: query, rpc: (fn, args) => fn === 'claim_session' ? claim(args.s)
        : ['market_record', 'trade_record', 'save_verify_report', 'my_ban'].includes(fn) ? svRpc(fn, args)
        : /^econ_/.test(fn) ? Promise.resolve(EC.call(fn, args))
        : fn === 'chain_head' || fn === 'submit_events' ? CHN.rpc(fn, args || {})
        : /^friend_/.test(fn) ? friend(fn, args || {})
        : ok(fn === 'name_available' ? !CH.all().some(c => names(c).includes(lc(args.n)) && (!session || c.user_id !== session.user.id)) : null),
        channel, removeChannel(ch) { ch && ch._leave && ch._leave(); } };
    },
  };
  // ไม่ให้สคริปต์ CDN จริงมาทับของปลอม
  Object.defineProperty(window, 'supabase', { configurable: false, writable: false, value: window.supabase });
  window.ONLINE_CONFIG = { url: 'https://fake.supabase.test', anonKey: 'fake', emailDomain: 'players.test' };
  Object.defineProperty(window, 'ONLINE_CONFIG', { configurable: false, writable: false, value: window.ONLINE_CONFIG });
})();
