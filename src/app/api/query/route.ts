import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

export const runtime = "edge";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

export async function POST(req: Request) {
  const { question, uploadId } = await req.json() as { question: string; uploadId?: string };
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "No question provided" }), { status: 400 });
  }

  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Load agent prompt
  const { data: promptRow } = await supabase
    .from("prompts")
    .select("name, description")
    .eq("user_id", user.id)
    .single();

  const systemPrompt = promptRow?.description
    ?? "You are an expert nonprofit fundraising analyst. Answer questions about donor data accurately and concisely. Always base your answers on the data context provided.";

  // Load selected AI setting
  const { data: aiSetting } = await supabase
    .from("ai_settings")
    .select("type, model, api_key")
    .eq("user_id", user.id)
    .eq("selected", true)
    .single();

  // Build donor data context — scoped to selected upload if provided
  let resolvedUploadId = uploadId;
  if (!resolvedUploadId) {
    const { data: latest } = await supabase
      .from("uploads")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedUploadId = latest?.id;
  }

  let giftsQuery = supabase
    .from("donor_gifts")
    .select("donor_id, gift_amount, gift_date, campaign, segment, channel, region")
    .eq("user_id", user.id)
    .eq("is_valid", true)
    .order("gift_date", { ascending: false })
    .limit(500);

  if (resolvedUploadId) {
    giftsQuery = giftsQuery.eq("upload_id", resolvedUploadId);
  }

  const { data: gifts } = await giftsQuery;

  const context = buildContext(gifts ?? []);

  const userMessage = `${context}\n\nQuestion: ${question}`;

  // Select provider
  const provider = aiSetting?.type ?? "Claude";
  const model = aiSetting?.model ?? "claude-sonnet-4-6";
  const apiKey = aiSetting?.api_key ?? process.env.ANTHROPIC_API_KEY ?? "";

  if (provider === "Claude") {
    return streamClaude(systemPrompt, userMessage, model, apiKey);
  } else if (provider === "OpenAI") {
    return streamOpenAI(systemPrompt, userMessage, model, apiKey);
  } else {
    return streamGemini(systemPrompt, userMessage, model, apiKey);
  }
}

function buildContext(gifts: Array<{
  donor_id: string;
  gift_amount: number;
  gift_date: string;
  campaign: string | null;
  segment: string | null;
  channel: string | null;
  region: string | null;
}>) {
  if (!gifts.length) return "No donor data available yet.";

  const totalRaised = gifts.reduce((s, g) => s + Number(g.gift_amount), 0);
  const uniqueDonors = new Set(gifts.map((g) => g.donor_id)).size;
  const avgGift = totalRaised / gifts.length;

  const campaignMap: Record<string, number> = {};
  const segmentMap: Record<string, number> = {};
  const channelMap: Record<string, number> = {};
  const recentGifts: string[] = [];

  for (const g of gifts) {
    if (g.campaign) campaignMap[g.campaign] = (campaignMap[g.campaign] ?? 0) + Number(g.gift_amount);
    if (g.segment) segmentMap[g.segment] = (segmentMap[g.segment] ?? 0) + 1;
    if (g.channel) channelMap[g.channel] = (channelMap[g.channel] ?? 0) + Number(g.gift_amount);
  }

  const topCampaigns = Object.entries(campaignMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, v]) => `${c}: $${Math.round(v).toLocaleString()}`)
    .join(", ");

  const segmentBreakdown = Object.entries(segmentMap)
    .sort((a, b) => b[1] - a[1])
    .map(([s, c]) => `${s}: ${c} donors`)
    .join(", ");

  const topChannels = Object.entries(channelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, v]) => `${c}: $${Math.round(v).toLocaleString()}`)
    .join(", ");

  for (const g of gifts.slice(0, 5)) {
    recentGifts.push(`${g.donor_id} | $${g.gift_amount} | ${g.gift_date} | ${g.campaign ?? "-"} | ${g.segment ?? "-"}`);
  }

  return `--- DONOR DATA CONTEXT ---
Total Records: ${gifts.length}
Unique Donors: ${uniqueDonors}
Total Raised: $${Math.round(totalRaised).toLocaleString()}
Average Gift: $${Math.round(avgGift).toLocaleString()}

Top Campaigns by Revenue: ${topCampaigns}
Segment Breakdown: ${segmentBreakdown}
Top Channels by Revenue: ${topChannels}

Recent Gifts (donor_id | amount | date | campaign | segment):
${recentGifts.join("\n")}
--- END CONTEXT ---`;
}

async function streamClaude(system: string, message: string, model: string, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.delta?.text ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip */ }
        }
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

async function streamOpenAI(system: string, message: string, model: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.choices?.[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip */ }
        }
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

async function streamGemini(system: string, message: string, model: string, apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip */ }
        }
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}
