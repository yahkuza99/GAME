'use strict';
(() => {
  const button=document.getElementById('create'),pw=document.getElementById('password'),out=document.getElementById('result');
  if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
    button.disabled=true;out.textContent='หน้านี้ใช้เฉพาะ localhost สำหรับทดสอบในเครื่อง';return;
  }
  Online.enabled=true;Online.local=true;
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  pw.value=Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>chars[n%chars.length]).join('');
  if(Online.lsGet(Online.LS.accounts,{}).gm_test){pw.value='';button.textContent='ล็อกอินบัญชี GM เดิม';}
  button.onclick=async()=>{
    button.disabled=true;
    try {
      if(pw.value.length<6)throw Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      const exists=Online.lsGet(Online.LS.accounts,{}).gm_test;
      if(exists)await Online.localLogin('gm_test',pw.value);else await Online.localRegister('gm_test',pw.value);
      const accounts=Online.lsGet(Online.LS.accounts,{});accounts.gm_test.gmTester=true;
      if(!Online.lsSet(Online.LS.accounts,accounts))throw Error('บันทึกสิทธิ์ GM ไม่สำเร็จ');
      out.textContent='บัญชี gm_test พร้อมใช้แล้ว กรุณาเก็บรหัสผ่านด้านบนไว้';document.getElementById('play').hidden=false;
    }catch(e){out.textContent=e.message;}finally{button.disabled=false;}
  };
})();
