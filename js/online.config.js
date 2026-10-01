// ============================================================
//  ตั้งค่าโหมดออนไลน์ (Supabase)
//  เว้นว่างไว้ = เล่นแบบออฟไลน์ (เซฟในเบราว์เซอร์)
//  ใส่ Project URL และ anon public key จาก Supabase → Project Settings → API
//  (anon key เปิดเผยได้ ข้อมูลถูกป้องกันด้วย Row Level Security ใน supabase/schema.sql)
// ============================================================
window.ONLINE_CONFIG = {
  url: 'https://sxfjcxesjivevgqbueyk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZmpjeGVzaml2ZXZncWJ1ZXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MTk0ODQsImV4cCI6MjEwNjM5NTQ4NH0.jPTwaMMln8OhVzLnhSj0ngID-pINIvtOTZ7_HdrmGgs',
  // ใช้สร้างอีเมลภายในจากชื่อผู้ใช้ (ผู้เล่นไม่ต้องใช้อีเมลจริง)
  emailDomain: 'players.ragnarok-web.game',
};
