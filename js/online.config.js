// ============================================================
//  ตั้งค่าโหมดออนไลน์ (Supabase)
//  เว้นว่างไว้ = เล่นแบบออฟไลน์ (เซฟในเบราว์เซอร์)
//  ใส่ Project URL และ anon public key จาก Supabase → Project Settings → API
//  (anon key เปิดเผยได้ ข้อมูลถูกป้องกันด้วย Row Level Security ใน supabase/schema.sql)
// ============================================================
window.ONLINE_CONFIG = {
  url: 'https://sxfjcxesjivevgqbueyk.supabase.co',
  anonKey: '',
  // ใช้สร้างอีเมลภายในจากชื่อผู้ใช้ (ผู้เล่นไม่ต้องใช้อีเมลจริง)
  emailDomain: 'players.ragnarok-web.game',
};
