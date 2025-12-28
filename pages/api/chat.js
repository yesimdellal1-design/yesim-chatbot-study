// pages/api/chat.js
const crypto = require("crypto");

/**
 * REQUIRED ENV (Vercel):
 * - OPENAI_API_KEY
 * - EXPERIMENT_SECRET
 */

const TEMPLATES = [
  {
    id: "T1",
    title: "Akademik Baskı",
    text: "Ders/tez/iş yetiştirme baskısı, performans kaygısı, erteleme ve suçluluk.",
  },
  {
    id: "T2",
    title: "İlişki Kaygısı",
    text: "Romantik ilişkide iletişim sorunları, belirsizlik, anlaşılmama ve kaygı.",
  },
  {
    id: "T3",
    title: "Aile ve Sınırlar",
    text: "Aile beklentileri, hayır diyememe, sınır koyma güçlüğü, bunalmışlık.",
  },
  {
    id: "T4",
    title: "Özgüven ve Yetersizlik",
    text: "Kendini yetersiz hissetme, yoğun öz-eleştiri, kıyaslama, değersizlik düşünceleri.",
  },
  {
    id: "T5",
    title: "Tükenmişlik",
    text: "Uzun süreli yorgunluk, motivasyon kaybı, zihinsel tükenme, enerji düşüklüğü.",
  },
  {
    id: "T6",
    title: "Yalnızlık",
    text: "Yalnız hissetme, anlaşılmama, destek eksikliği, yakınlık ihtiyacı.",
  },
];

const SENTENCE_COMPLETION_FORM = `
Lütfen aşağıdaki cümleleri ayrı satırlar halinde tamamla:

1) Bu durum beni en çok ______ hissettirdi.
2) O sırada aklımdan geçen en baskın düşünce ______ idi.
3) Beni en çok zorlayan şey ______.
4) Şu anda bu konudan beklentim / ihtiyacım ______.
5) Daha önce denediğim şey ______ ve sonucu ______ oldu.
`.trim();

function getStarterUniform() {
  return (
    "Kısa bir sohbet yapacağız. Daha iyi anlayabilmem için lütfen aşağıdaki cümleleri tamamla.\n\n" +
    SENTENCE_COMPLETION_FORM
  );
}

function getSystemPrompt(condition) {
  if (condition === "empathic") {
    return [
      "You are a short-term emotional support chatbot (not a therapist).",
      "Respond in Turkish.",
      "Use an empathic, warm, validating, non-clinical tone.",
      "Do: reflect feelings, normalize, show understanding.",
      "Do: ask ONE gentle follow-up question.",
      "Do NOT: diagnose, claim clinical authority, or provide medical/legal advice.",
      "Avoid long lists. Keep it concise.",
      "Length: 90-140 words.",
    ].join(" ");
  }
  return [
    "You are a short-term informational support chatbot (not a therapist).",
    "Respond in Turkish.",
    "Use a structured, solution-focused, non-clinical tone.",
    "Do: summarize briefly, offer 2-3 actionable steps, ask ONE clarifying question.",
    "Do NOT: diagnose, claim clinical authority, or provide medical/legal advice.",
    "Length: 90-140 words.",
  ].join(" ");
}

// ---- Token helpers (HMAC signed) ----
function signToken(payloadObj, secret) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payload, "ba
