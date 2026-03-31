import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

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
  const { question, uploadId, history = [] } = await req.json() as {
    question: string;
    uploadId?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  if (!question?.trim()) {
    return Response.json({ error: "No question provided" }, { status: 400 });
  }
  if (question.length > 2000) {
    return Response.json({ error: "Question exceeds 2000 character limit" }, { status: 400 });
  }
  if (!Array.isArray(history) || history.length > 40) {
    return Response.json({ error: "Invalid history" }, { status: 400 });
  }
  const safeHistory = history
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));

  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
  const fullSystem = `${systemPrompt}\n\n${context}`;

  // Build full messages array: prior conversation history + new question
  const historyMessages = safeHistory.map(m => ({ role: m.role, content: m.content }));
  const allMessages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...historyMessages,
    { role: "user", content: question },
  ];

  // Select provider
  const provider = aiSetting?.type ?? "Claude";
  const model = aiSetting?.model ?? "claude-sonnet-4-6";
  const apiKey = aiSetting?.api_key ?? process.env.ANTHROPIC_API_KEY ?? "";

  // Call AI provider (non-streaming)
  let content: string;
  let aiError: string | null = null;

  try {
    if (provider === "Claude") {
      content = await callClaude(fullSystem, allMessages, model, apiKey);
    } else if (provider === "OpenAI") {
      content = await callOpenAI(fullSystem, allMessages, model, apiKey);
    } else {
      content = await callGemini(fullSystem, allMessages, model, apiKey);
    }
  } catch (err) {
    aiError = err instanceof Error ? err.message : "AI provider error";
    return Response.json({ error: aiError }, { status: 500 });
  }

  // Save both messages to chat table (server-side, scoped to the upload at call time)
  await supabase.from("chat").insert([
    {
      user_id: user.id,
      upload_id: resolvedUploadId ?? null,
      role: "user" as const,
      message: question,
    },
    {
      user_id: user.id,
      upload_id: resolvedUploadId ?? null,
      role: "assistant" as const,
      message: content,
    },
  ]);

  return Response.json({ content });
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

function extractApiError(raw: string, provider: string): string {
  try {
    const parsed = JSON.parse(raw);
    const msg =
      parsed?.error?.message ||           // Anthropic / OpenAI shape
      parsed?.error?.error?.message ||     // nested
      parsed?.message ||
      null;
    if (msg) return `${provider} API error: ${msg}`;
  } catch { /* not JSON */ }
  return `${provider} API error. Please check your API key and try again.`;
}

async function callClaude(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 1024, stream: false, system, messages }),
  });
  if (!res.ok) throw new Error(extractApiError(await res.text(), "Claude"));
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function callOpenAI(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(extractApiError(await res.text(), "OpenAI"));
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );
  if (!res.ok) throw new Error(extractApiError(await res.text(), "Gemini"));
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
