// Supabase Edge Function: tutor-help
// Deploy: supabase functions deploy tutor-help
// Secret: supabase secrets set OPENAI_API_KEY=sk-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      system,
      childName,
      message,
      imageBase64,
      history = [],
    } = body as {
      system?: string;
      childName?: string;
      message?: string;
      imageBase64?: string;
      history?: { role: string; text: string }[];
    };

    const content: Array<Record<string, unknown>> = [];
    if (message) content.push({ type: "text", text: message });
    if (imageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith("data:")
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`,
        },
      });
    }
    if (content.length === 0) {
      content.push({
        type: "text",
        text: `${childName ?? "Niño"} pide ayuda con su tarea.`,
      });
    }

    const messages = [
      {
        role: "system",
        content:
          system ??
          "Eres el tutor de ONE KIDS. Guía paso a paso en español. Nunca des la respuesta final de golpe.",
      },
      ...history.slice(-8).map((h) => ({
        role: h.role === "tutor" ? "assistant" : "user",
        content: h.text,
      })),
      { role: "user", content },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 400,
        messages,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "Vamos paso a paso. ¿Qué parte te trabó?";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
