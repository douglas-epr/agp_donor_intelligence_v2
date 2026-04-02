"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "./server";
import type { AIProvider } from "./types";

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(email: string) {
  const supabase = await createClient();

  // NEXT_PUBLIC_SITE_URL is set in Vercel env vars → always produces the correct
  // production URL. Falls back to the request host for local dev.
  let redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/reset-password`
    : null;

  if (!redirectTo) {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    redirectTo = `${protocol}://${host}/reset-password`;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { error: error.message };
  return { success: true };
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function updateProfile(fullName: string, avatarUrl?: string | null) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (authError) return { error: authError.message };

  const updatePayload: Record<string, unknown> = {
    full_name: fullName,
  };
  if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  return { success: true };
}

// ── Account Security ──────────────────────────────────────────────────────────

export async function updateEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}

// ── AI Settings ───────────────────────────────────────────────────────────────

export type AISettingInput = {
  type: AIProvider;
  model: string;
  api_key: string;
  selected: boolean;
};

export async function saveAISettings(settings: AISettingInput[]) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  // Ensure only one is selected
  const selectedCount = settings.filter((s) => s.selected).length;
  if (selectedCount > 1) return { error: "Only one AI provider can be selected at a time" };

  for (const setting of settings) {
    // Manual upsert: select then insert or update (avoids needing a unique constraint)
    const { data: existing } = await supabase
      .from("ai_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", setting.type)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("ai_settings")
        .update({
          model: setting.model,
          api_key: setting.api_key,
          selected: setting.selected,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { error: `Failed to update ${setting.type}: ${error.message}` };
    } else {
      const { error } = await supabase
        .from("ai_settings")
        .insert({
          user_id: user.id,
          type: setting.type,
          model: setting.model,
          api_key: setting.api_key,
          selected: setting.selected,
        });
      if (error) return { error: `Failed to save ${setting.type}: ${error.message}` };
    }
  }

  return { success: true };
}

// ── Uploads ───────────────────────────────────────────────────────────────────

export async function updateUploadFilename(id: string, filename: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("uploads")
    .update({ filename })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteUpload(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("uploads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}

// ── Prompt ────────────────────────────────────────────────────────────────────

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function saveChatMessage(
  role: "user" | "assistant",
  content: string,
  uploadId: string | null,
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };
  const { error } = await supabase.from("chat").insert({
    user_id: user.id,
    upload_id: uploadId ?? null,
    role,
    message: content,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export async function savePrompt(name: string, description: string) {
  if (!name?.trim() || name.length > 200) return { error: "Agent name must be 1–200 characters" };
  if (!description?.trim() || description.length > 5000) return { error: "Description must be 1–5000 characters" };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("prompts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("prompts")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("prompts")
      .insert({ user_id: user.id, name, description });
    if (error) return { error: error.message };
  }
  return { success: true };
}
