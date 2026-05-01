# Task 2 — OmborPro Sotuv Sayti (Landing Page)

> **Maqsad:** OmborPro tizimini sotish uchun alohida marketing sayti.
> Asosiy app (`public/`) bilan aralashmasin — yangi `landing/` papkasida saqlanadi.

---

## 1. Texnik stack

- **Framework:** SvelteKit yoki Astro (statik build, SEO uchun ideal) — yoki oddiy HTML/CSS/JS (eng tez)
- **Stil:** TailwindCSS + glassmorphism (asosiy sayt dizayniga mos)
- **Til:** UZ / RU / EN — `i18n` JSON fayllar orqali
- **Hosting:** Render.com (Static Site) yoki GitHub Pages
- **Domen:** `omborpro.uz` yoki `landing.omborpro.com`

---

## 2. Sayt strukturasi (sahifalar)

| Sahifa | Mazmuni |
|--------|---------|
| `/` (Home) | Hero + Asosiy imkoniyatlar + CTA |
| `/features` | Barcha funksiyalar tafsiloti (skrinlar bilan) |
| `/pricing` | Tariflar va narxlar |
| `/demo` | Video demo + jonli demo (test login: `demo/demo`) |
| `/contact` | Aloqa formasi + Telegram |
| `/blog` (opsion) | Yangiliklar, qo'llanmalar |

---

## 3. Hero qismi (asosiy ekran)

- **Sarlavha:** *"Omboringizni telefondan boshqaring — 24/7"*
- **Subtitle:** *"PostgreSQL + Telegram bot + Real-time hisobotlar. Endi qog'oz va Excel kerak emas."*
- **CTA tugmalar:** `🎯 Bepul sinab ko'rish` | `📱 Demo ko'rish`
- **Trust signals:** Foydalanuvchilar soni, qancha tonna mahsulot boshqarilgan, yulduzli sharhlar

---

## 4. Asosiy imkoniyatlar bo'limi (Features)

Har bir blok: ikonka + qisqa matn + skrin/GIF.

1. **Real-time Kirim/Chiqim** — FIFO algoritmi, avtomatik narx hisoblash
2. **PostgreSQL bazasi** — ma'lumotlar xavfsizligi, backup, tezlik
3. **Telegram bot** — telefonda /Kirim, /Chiqim, /Hisobot
4. **Ko'p obyekt (RBAC)** — har kim faqat o'z omboriga ruxsat
5. **Mobil inventarizatsiya** — telefondan QR-link orqali sanash
6. **Hisobotlar** — Pro+ da AI tahlil, chartlar, eksport (XLS, PDF)
7. **Qarz/Kredit** — debtors/creditors moduli
8. **Tahrirlash tarixi** — kim qachon nimani o'zgartirgani

---

## 5. Tariflar (Pricing) — taklif qilingan narxlar

| Tarif | Narx (oyiga) | Imkoniyatlar |
|-------|--------------|--------------|
| **FREE** | **0 so'm** | 1 obyekt, 1 user, asosiy kirim/chiqim, 100 ta yozuv/oy |
| **PRO** | **149,000 so'm** | 3 obyekt, 5 user, hisobotlar, filtrlash, telegram bot (1 ta), cheksiz yozuv |
| **PRO+** | **349,000 so'm** | Cheksiz obyekt/user, AI tahlil, chartlar, telegram bot (5 ta), **individual yondashuv va sozlash**, prioritetli qo'llab-quvvatlash |
| **ENTERPRISE** | Kelishilgan holda | Local server, custom integratsiyalar, on-site treninig |

> **Maslahat:** Yillik to'lov uchun **−20%** chegirma — konversiyani oshiradi.
> **Trial:** 14 kun bepul Pro+ — credit card kerak emas.

---

## 6. "Pro+" individual yondashuv matni

> 💎 **Pro+ tarifi sizga shaxsan biriktirilgan menejer beradi:**
> - Birinchi haftada bepul on-boarding (Zoom orqali)
> - Sizning biznesingizga moslab hisobot shablonlari
> - Telegram bot tugmalari va mantiqini sizga moslash
> - Oylik strategik konsultatsiya (1 soat)
> - 24/7 prioritetli qo'llab-quvvatlash
>
> *"Biz sizning omboringizni emas, BIZNESINGIZNI o'sishini ko'zlaymiz."*

---

## 7. i18n strukturasi

```
landing/
  i18n/
    uz.json
    ru.json
    en.json
  pages/
    index.html
    pricing.html
    features.html
  assets/
    img/
    css/
    js/i18n.js
```

Til almashtirish — header'da bayroqcha tugmalari (🇺🇿 🇷🇺 🇬🇧). `localStorage` ga saqlanadi.

---

## 8. Konversiyani oshiruvchi elementlar

- ✅ Sotib olganlar guvohliklari (testimonials) — minimal 5 ta
- ✅ ROI kalkulator: *"Oyiga qancha vaqt tejaysiz?"*
- ✅ Live chat (Telegram orqali — `t.me/omborpro_support`)
- ✅ FAQ bo'limi (kamida 10 ta savol)
- ✅ Comparison table: Excel vs OmborPro
- ✅ Demo video (1-2 daqiqa, YouTube'da)
- ✅ Trust badges: SSL, PostgreSQL, 99.9% uptime

---

## 9. Bajarish bosqichlari

1. **Wireframe** (1 kun) — Figma yoki qog'ozda
2. **Statik HTML/CSS** (3 kun) — barcha sahifalar
3. **i18n integratsiya** (1 kun) — 3 til
4. **Lead form + Telegram bot integratsiya** (1 kun) — kontakt formasi yangi botga yuboradi
5. **SEO + meta tags** (1 kun) — Google'da topiladigan qilish
6. **Deploy + domen sozlash** (yarim kun)
7. **A/B test** (doim) — Hero matni va CTA tugmalarini sinash

**Jami:** ~7-10 kun.

---

## 10. Marketing kanallar (taklif)

- **Telegram kanal:** OmborPro yangiliklari (skrinlar, kelajak fichlar)
- **Instagram Reels:** 30s video — "Excel'dan 1 daqiqada o'tdim"
- **YouTube:** Tutoriallar + case studies
- **Cold outreach:** Telegram'da do'kon/ombor egalariga shaxsiy xabar
- **Hududiy expo:** Toshkentdagi savdo ko'rgazmalarida stand

---

> 📌 **Eslatma:** Sotuv sayti tayyor bo'lgach, asosiy app'ga `Tariflar` sahifasini qo'shish va to'lov tizimini integratsiya qilish kerak (Click, Payme, Octobank).
