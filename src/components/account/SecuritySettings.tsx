/**
 * Beveiliging: welke inlogmethodes zijn aan dit account gekoppeld?
 *
 * Per aanbieder (Google, GitHub, Mastodon) tonen we de status en een knop om
 * te koppelen of te ontkoppelen. Ontkoppelen is geblokkeerd wanneer het de
 * laatste manier is om in te loggen.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleIcon, GitHubIcon, MastodonIcon } from "@/components/auth/ProviderIcons";
import { MastodonInstanceDialog } from "@/components/auth/MastodonInstanceDialog";
import { PasskeySection } from "@/components/account/PasskeySection";
import { startOAuth } from "@/lib/oauth-status";
import {
  getMyIdentities,
  unlinkMyIdentity,
  type IdentityProviderId,
} from "@/lib/identities.functions";

const PROVIDERS: {
  id: IdentityProviderId;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
  { id: "mastodon", label: "Mastodon", Icon: MastodonIcon },
];

export function SecuritySettings() {
  const qc = useQueryClient();
  const [mastodonOpen, setMastodonOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-identities"],
    queryFn: () => getMyIdentities(),
  });

  const unlink = useMutation({
    mutationFn: (provider: IdentityProviderId) => unlinkMyIdentity({ data: { provider } }),
    onSuccess: () => {
      toast.success("Inlogmethode ontkoppeld.");
      void qc.invalidateQueries({ queryKey: ["my-identities"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Ontkoppelen is mislukt."),
  });

  const linked = new Set(data?.providers ?? []);
  const canUnlink = (provider: IdentityProviderId) =>
    Boolean(data?.hasPassword) || linked.size > 1 || !linked.has(provider);

  function link(provider: IdentityProviderId) {
    if (provider === "mastodon") {
      setMastodonOpen(true);
      return;
    }
    startOAuth(provider, "/account");
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Inlogmethodes laden…</p>
      ) : (
        PROVIDERS.map(({ id, label, Icon }) => {
          const isLinked = linked.has(id);
          const blocked = isLinked && !canUnlink(id);
          return (
            <div
              key={id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isLinked ? "🟢 Gekoppeld" : "⚪ Niet gekoppeld"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={isLinked ? "outline" : "secondary"}
                disabled={unlink.isPending}
                className="min-h-[44px] shrink-0 rounded-full px-4 text-xs"
                onClick={() => {
                  if (!isLinked) return link(id);
                  if (blocked) {
                    toast.error(
                      "Je kunt deze inlogmethode niet ontkoppelen omdat je anders niet meer kunt inloggen. Stel eerst een wachtwoord in of koppel een ander account.",
                    );
                    return;
                  }
                  unlink.mutate(id);
                }}
              >
                {unlink.isPending && unlink.variables === id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLinked ? "Ontkoppelen" : "Koppelen"}
              </Button>
            </div>
          );
        })
      )}

      <MastodonInstanceDialog
        open={mastodonOpen}
        onOpenChange={setMastodonOpen}
        onConfirm={(instance) => startOAuth("mastodon", "/account", instance)}
      />

      <PasskeySection />
    </div>
  );
}
