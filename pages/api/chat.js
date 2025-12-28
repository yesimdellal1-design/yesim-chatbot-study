export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a supportive, non-therapeutic chatbot used in an academic study. Do not give therapy or medical advice.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("OpenAI API error:", data);
      return res.status(r.status).json({ error: data });
    }

    const reply = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: "API error" });
  }
}
