import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Auth check — middleware only redirects browsers; return 401 for programmatic clients
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 });

  const { type, model, api_key } = await req.json();

  try {
    if (type === "Claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: "user", content: "ok" }],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        return NextResponse.json({ valid: false, error: d.error?.message ?? "Invalid API key or model." });
      }
      return NextResponse.json({ valid: true });
    }

    if (type === "OpenAI") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${api_key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: "user", content: "ok" }],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        return NextResponse.json({ valid: false, error: d.error?.message ?? "Invalid API key or model." });
      }
      return NextResponse.json({ valid: true });
    }

    if (type === "Gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ok" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        return NextResponse.json({ valid: false, error: d.error?.message ?? "Invalid API key or model." });
      }
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: "Unknown provider." });
  } catch (e: unknown) {
    return NextResponse.json({
      valid: false,
      error: e instanceof Error ? e.message : "Validation failed.",
    });
  }
}
