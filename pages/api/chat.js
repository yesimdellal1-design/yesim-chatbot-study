// pages/api/chat.js
import crypto from "crypto";

const TEMPLATES = [
  {
    id: "T1",
    title: "Akademik Performans Baskısı",
    text: "Son zamanlarda ders/tez/iş yetiştirme baskısı yüzünden sürekli gerginim. Ne kadar çalışsam da yetmiyor gibi hissediyorum. Erteledikçe suçluluk artıyor ve kısır döngüye giriyorum.",
    area: "academics",
  },
  {
    id: "T2",
    title: "İlişkide Belirsizlik ve Kaygı",
    text: "İlişkimde son dönemde iletişim bozuldu. Ne hissettiğimden emin değilim ama kaygım yükseliyor. Bir şey söyleyince yanlış anlaşılmaktan, söylemeyince de birikmesinden korkuyorum.",
    area: "relationship",
  },
  {
    id: "T3",
    title: "Aile Baskısı ve Sınırlar",
    text: "Ailem benden sürekli bir şey bekliyor ve hayır demekte zorlanıyorum. Kendimi suçlu hissediyorum ama aynı zamanda bunalmış durumdayım. Sınır koymak istiyorum.",
    area: "family",
  },
  {
    id: "T4",
    title: "Sosyal Kaygı ve Değerlendirilme Korkusu",
    text: "İnsanlarla bir araya gelince çok geriliyorum. Yanlış bir şey söyleyeceğim ya da garip görüneceğim diye düşünüyorum. Sonra günlerce kafamda tekrar ediyorum.",
    area: "social_anxiety",
  },
  {
    id: "T5",
    title: "Özgüven / Kendini Yetersiz Hissetme",
    text: "Kendimi sürekli yetersiz hissediyorum. Başkaları daha başarılı, daha güzel/iyi gibi geliyor. Kendimi eleştirmekten duramıyorum.",
    area: "self_esteem",
  },
  {
    id: "T6",
    title: "Tükenmişlik ve Motivasyon Kaybı",
    text: "Uzun süredir yorgun hissediyorum. Gün içinde enerjim yok, her şey üstüme geliyor. Dinlensem bile toparlanamıyorum.",
    area: "burnout",
  },
  {
    id: "T7",
    title: "Kayıp / Yas / Ayrılık",
    text: "Yakın zamanda bir kayıp yaşadım (ayrılık/vefat/bitmiş bir dönem). Aklıma geldikçe içim sıkışıyor. Bazen güçlü duruyorum bazen de dağılıyorum.",
    area: "grief",
  },
  {
    id: "T8",
    title: "Sağlık Kaygısı / Bedensel Belirtiler",
    text: "Bedensel belirtilerim olduğunda (ağrı, çarpıntı vb.) çok kaygılanıyorum. ‘Ya ciddi bir şeyse’ diye düşünüp internete bakıyorum ve daha da kötüleşiyorum.",
    area: "health_anxiety",
  },
  {
    id: "T9",
    title: "Yalnızlık ve Destek Eksikliği",
    text: "Kendimi yalnız hissediyorum. İnsanlarla çevriliyim ama gerçekten anlaşılmıyorum gibi. Bazen konuşacak kimse bulamıyorum.",
    area: "loneliness",
  },
  {
    id: "T10",
    title: "Öfke, Tahammülsüzlük ve Patlama",
    text: "Son zamanlarda küçük şeylere bile çok sinirleniyorum. Sonra pişman oluyorum. Sanki içimde birikmiş bir yük var.",
    area: "anger",
  },
];

const STARTERS = {
  T1: {
    empathic:
      "Bu baskı gerçekten yorucu olabilir. Şu an en çok hangi noktada tıkandığını ve bunun sende nasıl bir duygu yarattığını 3–4 cümleyle anlatır mısın?",
    informational:
      "Bunu daha netleştirelim. Şu an en acil görev ne, ne zamana yetişmesi gerekiyor ve seni en çok zorlayan adım hangisi? 3–4 cümle yaz.",
  },
  T2: {
    empathic:
      "Belirsizlik insanı çok yıpratır. En çok hangi anlarda kaygının yükseldiğini ve içinde neler olduğunu 3–4 cümleyle paylaşır mısın?",
    informational:
      "Durumu netleştirelim. Son dönemde iletişimde ne değişti, hangi konu tetikleyici ve senin hedefin ne (konuşmak mı, mesafe mi)? 3–4 cümle yaz.",
  },
  T3: {
    empathic:
      "Hayır demek zorlayıcı ve suçluluk da bunu ağırlaştırır. Ailenden gelen en baskın beklenti ne ve sende nasıl bir his bırakıyor, 3–4 cümleyle anlatır mısın?",
    informational:
      "Somutlaştıralım. Hangi konuda ‘hayır’ demekte zorlanıyorsun, en olası tepki ne olur ve sınırın tam olarak ne? 3–4 cümle yaz.",
  },
  T4: {
    empathic:
      "Değerlendirilme korkusu çok yorucu bir yük olabilir. En sık hangi ortamda oluyor ve o an aklından geçen düşünce ne, 3–4 cümleyle paylaşır mısın?",
    informational:
      "Haritalayalım. Hangi sosyal durum tetikliyor, en çok korktuğun ‘sonuç’ ne ve kaçınma davranışın ne oluyor? 3–4 cümle yaz.",
  },
  T5: {
    empathic:
      "Kendine karşı bu kadar sert olmak ağır gelebilir. Son günlerde bunu en çok hangi durumda hissettin ve iç sesin ne dedi, 3–4 cümleyle anlatır mısın?",
    informational:
      "Netleştirelim. Bu yetersizlik hissi en çok hangi alanda (iş/okul/görünüş/ilişki) çıkıyor ve hangi kanıtlar bunu destekliyor gibi geliyor? 3–4 cümle yaz.",
  },
  T6: {
    empathic:
      "Sürekli yorgunluk insanı umutsuzlaştırabilir. Bu yorgunluk gün içinde en çok ne zaman artıyor ve sende nasıl bir duygu yaratıyor, 3–4 cümleyle paylaşır mısın?",
    informational:
      "Analiz edelim. Uyku, beslenme, iş yükü ve dinlenme açısından son haftada en çok hangisi bozuldu? Gün içinde enerji düşüşü ne zaman? 3–4 cümle yaz.",
  },
  T7: {
    empathic:
      "Bu tür dönemlerde dalgalanma çok normal. Aklına geldiğinde bedeninde/duygunda ne oluyor, 3–4 cümleyle anlatmak ister misin?",
    informational:
      "Daha iyi anlamak için: Kayıp ne zaman oldu, şu an günlük hayatını en çok zorlayan şey ne ve seni kısa süreli de olsa rahatlatan bir şey var mı? 3–4 cümle yaz.",
  },
  T8: {
    empathic:
      "Belirtiler olduğunda korku çok hızlı büyüyebilir. O an aklına gelen en kötü senaryo ne ve bedeninde ne hissediyorsun, 3–4 cümleyle paylaşır mısın?",
    informational:
      "Netleştirelim. Hangi belirti ne sıklıkta oluyor, doktora başvurdun mu ve internete bakınca ne oluyor? 3–4 cümle yaz.",
  },
  T9: {
    empathic:
      "Kalabalık içinde yalnız hissetmek ağır olabilir. En çok ne zaman bu his geliyor ve ‘anlaşılmıyorum’ düşüncesi sende ne yaratıyor, 3–4 cümleyle anlatır mısın?",
    informational:
      "Somutlaştıralım. Gün içinde yalnızlık en çok hangi zamanlarda artıyor, sosyal temasın ne düzeyde ve daha çok neye ihtiyaç duyuyorsun? 3–4 cümle yaz.",
  },
  T10: {
    empathic:
      "Öfkenin altında çoğu zaman birikmiş bir yük olur. En son ne tetikledi, o anda içinde ne vardı, 3–4 cümleyle paylaşır mısın?",
    informational:
      "Haritalayalım. Tetikleyici olay neydi, öfke 0–10 kaçtı, ne yaptın ve sonrasında ne oldu? 3–4 cümle yaz.",
  },
};

// --- Token helpers (HMAC signed) ---
function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function unbase64url(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64").toString("utf8");
}
function signToken(payloadObj, secret) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  const sigUrl = sig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${payload}.${sigUrl}`;
}
function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (sig !== expected) return null;
  try {
    return JSON.parse(unbase64url(payload));
  } catch {
    return null;
  }
}

function getSystemPrompt(condition) {
  // Stil manipülasyonu net olsun diye kuralları keskinleştiriyorum
  if (condition === "empathic") {
    return [
      "You are a short-term emotional support chatbot (not a therapist).",
      "Respond in Turkish.",
      "Style: empathic, warm, validating, non-clinical.",
      "Do: reflect feelings, normalize, gentle supportive tone, ask ONE soft follow-up question.",
      "Do NOT: give medical/legal claims, diagnose, or say you are a therapist.",
      "Length: 80-130 words max.",
    ].join(" ");
  }
  return [
    "You are a short-term practical support chatbot (not a therapist).",
    "Respond in Turkish.",
    "Style: informational, structured, solution-focused, non-clinical.",
    "Do: summarize the issue briefly, ask 1 clarifying question, give 2-3 actionable steps.",
    "Do NOT: diagnose, moralize, or claim professional authority.",
    "Length: 80-130 words max.",
  ].join(" ");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { type } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY (Vercel env)" });
    }
    if (!process.env.EXPERIMENT_SECRET) {
      return res.status(500).json({ error: "Missing EXPERIMENT_SECRET (Vercel env)" });
    }

    // 1) Template list
    if (type === "templates") {
      return res.status(200).json({
        templates: TEMPLATES.map(({ id, title, text }) => ({ id, title, text })),
      });
    }

    // 2) Start: server assigns condition + returns starter + token
    if (type === "start") {
      const { sessionId, templateId } = req.body || {};
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (!t) return res.status(400).json({ error: "Bad request: invalid templateId" });

      const condition = Math.random() < 0.5 ? "empathic" : "informational";
      const starter = STARTERS?.[templateId]?.[condition] || "Merhaba. Kısaca anlatmak ister misin?";

      const payload = {
        v: 1,
        sessionId: String(sessionId || ""),
        templateId,
        condition,
        iat: Date.now(),
      };
      const token = signToken(payload, process.env.EXPERIMENT_SECRET);

      return res.status(200).json({
        token,
        condition, // istersen UI'da gösterme; sadece kayıt için kullan
        template: { id: t.id, title: t.title, text: t.text },
        reply: starter,
      });
    }

    // 3) Turn: token determines condition + template
    if (type === "turn") {
      const { token, messages } = req.body || {};
      if (!Array.isArray(messages)) return res.status(400).json({ error: "Bad request: messages" });

      const payload = verifyToken(token, process.env.EXPERIMENT_SECRET);
      if (!payload?.templateId || !payload?.condition) {
        return res.status(401).json({ error: "Invalid or missing token" });
      }

      const t = TEMPLATES.find((x) => x.id === payload.templateId);
      if (!t) return res.status(400).json({ error: "Template not found" });

      const systemPrompt = getSystemPrompt(payload.condition);

      const templateContext = [
        "CONTEXT (selected scenario):",
        `Title: ${t.title}`,
        `Scenario: ${t.text}`,
        "Instruction: Tailor your response to the user's details while staying consistent with the selected scenario and the required style.",
      ].join("\n");

      const modelMessages = [
        { role: "system", content: systemPrompt + "\n\n" + templateContext },
        ...messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: modelMessages,
          temperature: 0.6,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.error?.message || data?.message || "OpenAI API error";
        return res.status(500).json({ error: msg, details: data });
      }

      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return res.status(500).json({ error: "No reply from OpenAI", details: data });

      return res.status(200).json({ reply });
    }

    return res.status(400).json({ error: "Bad request: unknown type" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
