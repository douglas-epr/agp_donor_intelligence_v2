"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/actions";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string) || "");
      setUserId(user.id);

      // Load avatar_url from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    setUploading(true);
    setError("");
    const supabase = createClient();

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError("Failed to upload image: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    // Add cache-buster so the browser picks up the new image
    const urlWithCacheBust = publicUrl + "?t=" + Date.now();
    setAvatarUrl(urlWithCacheBust);

    const result = await updateProfile(fullName, publicUrl);
    if (result?.error) {
      setError(result.error);
    } else {
      window.dispatchEvent(new CustomEvent("profile-updated", {
        detail: { full_name: fullName, avatar_url: urlWithCacheBust },
      }));
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    const result = await updateProfile(fullName, avatarUrl ?? undefined);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      window.dispatchEvent(new CustomEvent("profile-updated", {
        detail: { full_name: fullName, avatar_url: avatarUrl ?? null },
      }));
    }
    setSaving(false);
  }

  const initials = getInitials(fullName || email.split("@")[0] || "?");

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Manage your display name, picture, and account information.
        </p>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6 pb-6" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                {loading ? "…" : initials}
              </div>
            )}
            {/* Camera button overlay */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || loading}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--color-secondary)" }}
              title="Change picture"
            >
              {uploading ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2H3a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H7.5L7 1H5l-.5 1Z" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="5.5" r="1.5" stroke="white" strokeWidth="1.1" />
                </svg>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{fullName || "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{email}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Click the camera icon to change your picture (max 2MB)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: "#FEF2F2", color: "var(--color-error)", border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: "rgba(158,220,75,0.1)", color: "#5a8a1e", border: "1px solid rgba(158,220,75,0.4)" }}>
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 text-sm rounded-md border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text-muted)", cursor: "not-allowed" }}
            />
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              To change your email, go to <a href="/settings" style={{ color: "var(--color-secondary)" }}>Settings</a>.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60 self-start"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
