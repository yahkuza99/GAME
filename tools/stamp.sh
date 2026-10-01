#!/bin/sh
# ติดเลขเวอร์ชัน ?v=... ให้ไฟล์ js/css ใน index.html เพื่อให้เบราว์เซอร์โหลดของใหม่ทุกครั้งที่อัปเดตเกม (กันแคชเก่า)
# ใช้: sh tools/stamp.sh   (รันก่อน commit ทุกครั้งที่จะ deploy)
cd "$(dirname "$0")/.." || exit 1
V=$(date -u +%Y%m%d%H%M)
sed -i -E "s#((src|href)=\"(js|css)/[^\"?]+)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#g" index.html
echo "stamped v=$V"
