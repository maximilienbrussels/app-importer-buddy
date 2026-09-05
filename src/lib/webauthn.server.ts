/**
 * Server-only WebAuthn (passkey) helpers. Bundelvriendelijk: alle logica
 * hier importeert dbAdmin lazily binnen de functies die het nodig
 * hebben, zodat dit bestand nooit in een browserbundel terechtkomt.
 */
import { getRequestHeaders } from "@tanstack/react-start/server";

const CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * Bepaalt rpID/rpName/origin op basis van de lopende aanvraag, zodat
 * passkeys ook correct werken in preview-omgevingen en niet enkel op het
 * canonieke productiedomein.
 */
export async function webauthnContext(): Promise<{ rpID: string; rpName: string; origin: string }> {
  const headers = new Headers(getRequestHeaders() as unknown as Record<string, string>);
  const originHeader = headers.get("origin");
  let origin: string;
  if (originHeader && /^https?:\/\//.test(originHeader)) {
    origin = originHeader.replace(/\/+$/, "");
  } else {
    const host = headers.get("host");
    origin = host ? `https://${host}` : "https://maximilien.brussels";
  }
  let rpID: string;
  try {
    rpID = new URL(origin).hostname;
  } catch {
    rpID = "maximilien.brussels";
  }
  return { rpID, rpName: "La Ferme du Parc Maximilien", origin };
}

/** Slaat een nieuwe challenge op met een korte vervaltijd. */
export async function storeChallenge(opts: {
  challenge: string;
  purpose: "registration" | "authentication";
  email?: string | null;
  userId?: string | null;
}): Promise<void> {
  const { dbAdmin } = await import("@/lib/db-admin.server");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString();
  const { error } = await dbAdmin.from("webauthn_challenges").insert({
    challenge: opts.challenge,
    purpose: opts.purpose,
    email: opts.email ?? null,
    user_id: opts.userId ?? null,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

/**
 * Haalt de meest recente, niet-verlopen challenge op voor een bepaald doel
 * en verwijdert daarna alle challenges met hetzelfde doel/identificatie
 * (eenmalig gebruik).
 */
export async function consumeChallenge(opts: {
  purpose: "registration" | "authentication";
  email?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const { dbAdmin } = await import("@/lib/db-admin.server");
  let query = dbAdmin
    .from("webauthn_challenges")
    .select("id, challenge, expires_at")
    .eq("purpose", opts.purpose)
    .order("created_at", { ascending: false })
    .limit(1);

  if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  } else if (opts.email) {
    query = query.eq("email", opts.email);
  } else {
    query = query.is("user_id", null).is("email", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  // Eenmalig gebruik: verwijder de challenge meteen, ongeacht of ze geldig blijkt.
  await dbAdmin.from("webauthn_challenges").delete().eq("id", data.id);

  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.challenge;
}
