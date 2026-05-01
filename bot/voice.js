/**
 * Voice → Text → Strukturali JSON
 * Provider: Groq (whisper-large-v3-turbo + llama-3.3-70b-versatile)
 * Bepul tier yetarli; kelajakda STT_PROVIDER env bilan boshqasiga almashtirsa bo'ladi.
 */
const log = require('../utils/logger')('bot:voice');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const STT_MODEL = process.env.STT_MODEL || 'whisper-large-v3-turbo';
const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

function isEnabled() {
  return !!GROQ_API_KEY;
}

/**
 * Telegram fayl URL'idan audio'ni yuklab oladi va Groq Whisper'ga jo'natadi.
 * @returns {Promise<string>} transkripsiya matni
 */
async function transcribe(fileUrl, mimeType = 'audio/ogg') {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY .env da o\'rnatilmagan');

  // Audio'ni buferga yuklab olish
  const audioRes = await fetch(fileUrl);
  if (!audioRes.ok) throw new Error(`Audio yuklab olinmadi: ${audioRes.status}`);
  const audioBuf = Buffer.from(await audioRes.arrayBuffer());
  log.debug('Audio downloaded', { bytes: audioBuf.length });

  // Multipart formData
  const form = new FormData();
  const blob = new Blob([audioBuf], { type: mimeType });
  form.append('file', blob, 'audio.ogg');
  form.append('model', STT_MODEL);
  form.append('language', 'uz');
  form.append('response_format', 'json');
  form.append('temperature', '0');

  const t0 = Date.now();
  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: form
  });
  const ms = Date.now() - t0;

  if (!res.ok) {
    const err = await res.text();
    log.error('Groq STT failed', { status: res.status, err: err.slice(0, 300) });
    throw new Error(`STT xato: ${res.status}`);
  }
  const data = await res.json();
  const text = (data.text || '').trim();
  log.info('Transcribed', { ms, len: text.length });
  return text;
}

/**
 * Matnni Llama orqali strukturali JSON'ga parse qiladi.
 * Kontekst: mavjud mahsulotlar, firmalar, obyektlar ro'yxati.
 */
async function parseTransaction(text, ctx) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY o\'rnatilmagan');

  const products = (ctx.products || []).slice(0, 200).join(', ');
  const firms = (ctx.firms || []).slice(0, 200).join(', ');
  const obyekts = (ctx.obyekts || []).join(', ');

  const sys = `Sen OmborPro tizimi uchun ovozli buyruqlarni JSON'ga aylantiruvchi yordamchisan.
Foydalanuvchi o'zbek tilida kirim/chiqim haqida gapiradi. Sen quyidagi formatda JSON qaytarasan:

{
  "tur": "Kirim" yoki "Chiqim",
  "mahsulot": "string (mavjud mahsulot nomidan eng yaqinini tanla)",
  "miqdor": number,
  "narx": number yoki null (chiqim uchun null bo'lishi mumkin, FIFO avto hisoblaydi),
  "tomon": "string yoki bo'sh (mavjud firmalardan eng yaqinini tanla)",
  "obyekt": "string (ro'yxatdagi obyektlardan eng yaqinini tanla)",
  "izoh": "string yoki bo'sh",
  "confidence": "high" | "medium" | "low",
  "missing": ["nimalar yetishmayotgani"]
}

QOIDALAR:
- "yigirma besh ming" → 25000, "ikki yarim million" → 2500000, "yuz dona" → 100
- "kirim qil" / "kirim qildim" / "olib keldi" / "kelishi" → "Kirim"
- "chiqim" / "berdim" / "sotdim" / "ketdi" → "Chiqim"
- mahsulot/firma/obyekt — faqat ro'yxatdagi qiymatlardan eng yaqinini tanla, agar yo'q bo'lsa missing'ga qo'sh
- agar narx aytilmasa va Kirim bo'lsa — narx: null va missing: ["narx"]
- raqamlar har doim number, string emas
- faqat JSON qaytar, izoh yozma

Mavjud mahsulotlar: ${products || 'yo\'q'}
Mavjud firmalar: ${firms || 'yo\'q'}
Mavjud obyektlar: ${obyekts || 'Barchasi'}`;

  const t0 = Date.now();
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500
    })
  });
  const ms = Date.now() - t0;

  if (!res.ok) {
    const err = await res.text();
    log.error('Groq LLM failed', { status: res.status, err: err.slice(0, 300) });
    throw new Error(`Parser xato: ${res.status}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  log.info('Parsed', { ms, raw: raw.slice(0, 200) });

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) {
    log.error('JSON parse failed', { raw });
    throw new Error('AI noto\'g\'ri JSON qaytardi');
  }

  // Normalizatsiya
  parsed.miqdor = Number(parsed.miqdor) || 0;
  if (parsed.narx !== null && parsed.narx !== undefined) {
    parsed.narx = Number(parsed.narx) || 0;
  }
  parsed.tur = parsed.tur === 'Chiqim' ? 'Chiqim' : 'Kirim';
  parsed.missing = Array.isArray(parsed.missing) ? parsed.missing : [];
  return parsed;
}

module.exports = { isEnabled, transcribe, parseTransaction };
