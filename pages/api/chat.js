// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const type = body.type; // "init" | "turn"
    const condition = body.condition || "informational"; // "informational" | "empathic"
    const template = body.template || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Basit doğrulama
    if (type !== "init" && type !== "turn") {
      return res.status(400).json({ error: "Invalid type" });
    }

    // Template’den kısa özet üret
    const t = {
      area: (template.area || "").trim(),
      emotion: (template.emotion || "").trim(),
      thought: (template.thought || "").trim(),
      hardMoment: (template.hardMoment || "").trim(),
      tried: (template.tried || "").trim(),
    };

    const templateSummary = [
      t.area ? `Alan: ${t.area}` : null,
      t.emotion ? `Duygu: ${t.emotion}` : null,
      t.thought ? `Düşünce: ${t.thought}` : null,
      t.hardMoment ? `Zor an: ${t.hardMoment}` : null,
      t.tried ? `Denediğin: ${t.tried}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // INIT: ilk bot mesajı
    if (type === "init") {
      const reply =
        condition === "empathic"
          ? `Merhaba. Burada kısa bir sohbet yapacağız. İstersen şu an seni en çok zorlayan şeyi 1-2 cümleyle yaz.\n${
              templateSummary ? `\n(Şablon özeti: ${templateSummary})` : ""
            }`
          : `Merhaba. Kısa bir araştırma sohbeti yapacağız. Lütfen şu an seni zorlayan durumu 1-2 cümleyle tanımla.\n${
              templateSummary ? `\n(Şablon özeti: ${templateSummary})` : ""
            }`;

      return res.status(200).json({ reply });
    }

    // TURN: son kullanıcı mesajını bul
    const lastUser = [...messages].reverse().find((m) => m && m.role === "user" && String(m.content || "").trim());
    const userText = String(lastUser?.content || "").trim();

    if (!userText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Çok basit mock yanıt mantığı (condition’a göre ton değişiyor)
    const reply = makeMockReply({ condition, userText, template: t });

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: e?.message });
  }
}

function makeMockReply({ condition, userText, template }) {
  const hasEmotion = !!template.emotion;
  const hasThought = !!template.thought;

  // Empatik kondisyon: duygu yansıtma + açık uçlu soru
  if (condition === "empathic") {
    const a = [];
    a.push("Anladım. Bu konu senin için zorlayıcı geliyor.");
    if (hasEmotion) a.push(`Şablonda “${template.emotion}” duygusundan bahsetmişsin, bu duyguyu biraz açmak ister misin.`);
    a.push("Şu an bu durum en çok hangi anda tetikleniyor.");
    a.push("İstersen bir örnek anı kısaca anlat, ben de oradan birlikte netleştireyim.");
    return a.join(" ");
  }

  // Bilgilendirici kondisyon: yapılandırma + netleştirici soru
  const b = [];
  b.push("Teşekkürler, not aldım.");
  b.push("Bunu daha net anlamak için iki şey soracağım.");
  if (hasThought) b.push(`Aklından geçen ana düşünce şuna benziyor mu: “${template.thought}”.`);
  b.push("1) Bu durum en son ne zaman oldu ve ne oldu.");
  b.push("2) Sonuçta ne olmasından korkuyorsun.");
  return b.join(" ");
}
