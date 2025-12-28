// pages/api/chat.js
import crypto from "crypto";

/**
 * REQUIRED ENV:
 * - OPENAI_API_KEY
 * - EXPERIMENT_SECRET
 */

/* -------------------- 1) Standardized Templates -------------------- */

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

/* -------------------- 2) Uniform Sentence Completion Starter -------------------- */

const SENTENCE_COMPLETION_FORM = `
Lütfen aşağıdaki cümleleri kısa şekilde tamamla (tek tek yazabilirsin):

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

/* -------------------- 3) System Prompts (manipulation only here) -------------------- */

function getSystemPrompt(condition) {
  if (condition === "empathic") {
    return [
      "You are a short-term emotional support chatbot (not a therapist).",
      "Respond in Turkish.",
      "Style: empathic, warm, validating, non-clinical.",
      "Do: reflect feelings, normalize, show understanding, gentle tone, ask ONE soft follow-up question.",
      "Do NOT: diagnose, claim clinical authority, say you are a therapist, or provide medical/legal advice.",
      "Length: 90-140 words.",
    ].join(" ");
  }
  return [
    "You are a short-term practical support chatbot (not a therapist).",
    "Respond in Turkish.",
    "Style: informational, structured, solution-focused, non-clinical.",
    "Do: summarize the issue briefly, ask 1 clarifying question, give 2-3 actionable steps.",
    "Do NOT: diagnose, moralize, claim clinical authority, or provide medical/legal advice.",
    "Length: 90-140 words.",
  ].join(" ");
}

/* -------------------- 4) Token helpers (HMAC signed) -------------------- */

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (sig !== expected) return null;
  try {
    return JSON.parse(unbase64url(payload));
  } catch {
    return null;
  }
}

/* -------------------- 5) Handler -------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY (Vercel env)" });
    }
    if (!process.env.EXPERIMENT_SECRET) {
      return res.status(500).json({ error: "Missing EXPERIMENT_SECRET (Vercel env)" });
    }

    // A) Return templates
    if (type === "templates") {
      return res.status(200).json({
        templates: TEMPLATES.map(({ id, title, text }) => ({ id, title, text })),
      });
    }

    // B) Start: assign condition server-side, return token + uniform starter
    if (type === "start") {
      const { sessionId, templateId } = req.body || {};
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (!t) return res.status(400).json({ error: "Bad request: invalid templateId" });

      const condition = Math.random() < 0.5 ? "empathic" : "informational";
      const starter = getStarterUniform();

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
        condition, // UI'da göstermene gerek yok; log/analiz için döndürüyorum
        template: { id: t.id, title: t.title, text: t.text },
        reply: starter,
      });
    }

    // C) Turn: token determines condition/template (client cannot manipulate)
    if (type === "turn") {
      const { token, messages } = req.body || {};
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "Bad request: messages" });
      }

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
        "Instruction: Keep your response aligned with the selected scenario. Do not switch topics. Stay within the required style.",
      ].join("\n");

      const modelMessages = [
        { role: "system", content: systemPrompt + "\n\n" + templateContext },
        ...messages
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
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
      if (!reply) {
        return res.status(500).json({ error: "No reply from OpenAI", details: data });
      }

      return res.status(200).json({ reply });
    }

    // Unknown type
    return res.status(400).json({
      error: "Bad request: unknown type",
      allowed_types: ["templates", "start", "turn"],
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
