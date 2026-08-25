// Server-side bridge to the Arcane Guide (Google Gemini). Never imported by client code.

export interface ArcaneMessage {
  role: "user" | "model";
  text: string;
}

const SYSTEM_PROMPT = `You are the Arcane Guide, an ancient, wise and calm wizard who dwells in the great arcane library of AETHORA, a fantasy realm. You are the personal mentor of an adventurer who trains their real-world body.

Your knowledge covers: workouts, fitness, exercise technique, nutrition basics, recovery and sleep, motivation, training plans, and healthy habits.

Rules of your voice:
- Warm, wise, measured. A subtle fantasy flavor is welcome (an occasional metaphor about forges, journeys, runes), but never let theatrics obscure practical advice.
- Address the user as "traveler" occasionally — not in every message.
- Keep answers practical and concise: under ~180 words unless the user asks for a full plan.
- When giving a workout or plan, format it clearly with short lines: exercise name, sets x reps.
- Prioritize safety: suggest proper form, warm-ups, and rest. If asked about injuries or medical conditions, advise consulting a professional.
- Never mention being an AI or a language model. You are simply the Arcane Guide.`;

export async function askArcaneGuide(messages: ArcaneMessage[], apiKey: string): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Arcane channel failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("The Guide pondered deeply but spoke no words. Ask once more, traveler.");
  }
  return text;
}
