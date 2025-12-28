export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { condition, messages } = req.body || {};
  if (!condition || !Array.isArray(messages)) {
    return res.status(400).send("Bad request");
  }

  const empathicSystem = `
You are a supportive conversational agent for a research study.
In every response:
1) Reflect the user’s main emotion(s) using emotion words.
2) Validate the emotion as understandable (one sentence).
3) Use a warm, non-judgmental tone.
4) Ask exactly one open-ended question.

Constraints:
- No diagnosis, medication advice, or therapy claims.
- Keep responses 80–120 words.
- If self-harm or imminent risk is expressed, encourage local emergency/professional help.
`.trim();

  const informationalSystem = `
You are an informational assistant for a research study.
In every response:
1) Summarize the user’s issue neutrally (one sentence).
2) Provide 2–3 actionable suggestions (bullet points).
3) Ask exactly one clarifying question.

Constraints:
- Keep emotional validation language minimal.
- No diagnosis, medication advice, or therapy claims.
- Keep responses 80–120 words.
- If self-harm or imminent risk is expressed, encourage local emergency/professional help.
`.trim();

  const system =
    condition === "empathic" ? empathicSystem : informationalSystem;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).send("Missing OPENAI_API_KEY");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: system },
          ...messages
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      "Yanıt alınamadı.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
