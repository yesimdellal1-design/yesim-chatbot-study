export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { type, messages } = req.body || {};

    // Basit test: API çalışıyor mu
    if (type === "ping") {
      return res.status(200).json({ reply: "API OK - ping" });
    }

    // Turn mesajı zorunluluğu
    if (type === "turn") {
      const userMsgs = (messages || []).filter((m) => m?.role === "user" && (m?.content || "").trim());
      if (userMsgs.length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
    }

    return res.status(200).json({ reply: "API OK - v2" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
