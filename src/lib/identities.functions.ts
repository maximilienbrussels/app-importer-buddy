/**
 * Server functions voor de beveiligingsinstellingen: welke inlogmethodes zijn
 * gekoppeld, en het veilig ontkoppelen daarvan.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";

export type IdentityProviderId = "google" | "github" | "mastodon";

export type MyIdentities = {
  providers: IdentityProviderId[];
  hasPassword: boolean;
};

export const getMyIdentities = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyIdentities> => {
    const mod = await import("@/lib/identities.server");
    const [identities, password] = await Promise.all([
      mod.listIdentities(context.userId),
      mod.hasPassword(context.userId),
    ]);
    return { providers: identities.map((i) => i.provider), hasPassword: password };
  });

export const unlinkMyIdentity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ provider: z.enum(["google", "github", "mastodon"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const mod = await import("@/lib/identities.server");
    const result = await mod.unlinkIdentity(context.userId, data.provider);
    if (!result.ok) {
      throw new Error(
        "Je kunt deze inlogmethode niet ontkoppelen omdat je anders niet meer kunt inloggen. Stel eerst een wachtwoord in of koppel een ander account.",
      );
    }
    return { ok: true as const };
  });
