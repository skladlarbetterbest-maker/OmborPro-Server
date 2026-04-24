// import.js
// 1. Exceldan A (Mahsulot nomi) va B (O'lchov birligi) ustunlarni COPY qiling.
// 2. Ushbu papkadagi import.txt nomli faylga PASTE qiling.
// 3. Keyin terminalda `node import.js` buyrug'ini tushiring.

const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, 'import.txt');
const katalogPath = path.join(__dirname, 'data', 'katalog.json');

// Katalog faylini o'qiymiz
let katalog = [];
if (fs.existsSync(katalogPath)) {
  katalog = JSON.parse(fs.readFileSync(katalogPath, 'utf8'));
}

// import.txt tekshiramiz
if (!fs.existsSync(txtPath)) {
  console.log("XATO: import.txt fayli topilmadi!");
  console.log("Iltimos, oldin import.txt nomli fayl yarating va Exceldagi A va B ustunlarni uning ichiga copy-paste qiling.");
  process.exit(1);
}

const lines = fs.readFileSync(txtPath, 'utf8').split('\n');

let added = 0;
let updated = 0;

lines.forEach(line => {
  // Exceldan oddiy copy qilinganda ular tab bilan ajratiladi (\t)
  const parts = line.split('\t');
  if (parts.length > 0) {
    const nom = parts[0].trim();
    const olv = parts[1] ? parts[1].trim() : 'dona'; // Agar o'lcham yo'q bo'lsa default 'dona'

    if (nom) {
      // Shunday nomli mahsulot bormi?
      const existing = katalog.find(k => k.nom.toLowerCase() === nom.toLowerCase());
      if (existing) {
        // Agar bor bo'lsa, faqat o'lchamini yangilab qo'yamiz ehtiyot shart
        if (olv) existing.olv = olv;
        updated++;
      } else {
        // Yo'q bo'lsa, yangisini qo'shamiz
        katalog.push({ nom, olv, active: true });
        added++;
      }
    }
  }
});

fs.writeFileSync(katalogPath, JSON.stringify(katalog, null, 2), 'utf8');

console.log("=========================================");
console.log("✅ IMPORT MUVAFFAQIYATLI YAKUNLANDI!");
console.log(`➕ Yangi qo'shildi: ${added} ta mahsulot`);
console.log(`🔄 Yangilandi: ${updated} ta mahsulot`);
console.log(`📈 Umumiy baza: ${katalog.length} ta mahsulot`);
console.log("=========================================");
