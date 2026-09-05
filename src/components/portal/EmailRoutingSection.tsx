import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Loader2, RefreshCw, Save } from "lucide-react";
import {
  fetchEmailRoutingSettings,
  resendSubmission,
  saveFallbackEmailFn,
  type FormSubmission,
} from "@/lib/email-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; style: string }> = {
  sent: { label: "Verzonden", style: "bg-success/12 text-success border-success/30" },
  fallback_used: {
    label: "Via vangnet",
    style: "bg-warning/20 text-warning-foreground border-warning/40",
  },
  email_pending: { label: "In wachtrij", style: "bg-muted text-muted-foreground border-border" },
  email_failed: { label: "Mislukt", style: "bg-destructive/10 text-destructive border-destructive/30" },
};

function moment(iso: string): string {
  return new Date(iso).toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Globaal vangnetadres + logboek van élke formulierinzending. Zo blijft een
 * bericht bewaard, ook wanneer de mailverzending tijdelijk hapert.
 */
export function EmailRoutingSection() {
  const queryClient = useQueryClient();
  const load = useServerFn(fetchEmailRoutingSettings);
  const saveFallback = useServerFn(saveFallbackEmailFn);
  const resend = useServerFn(resendSubmission);

  const { data, isLoading, error } = useQuery({
    queryKey: ["email-routing"],
    queryFn: () => load(),
    retry: false,
  });

  const [fallback, setFallback] = useState("");
  useEffect(() => {
    if (data?.fallback) setFallback(data.fallback);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveFallback({ data: { email: fallback.trim() } }),
    onSuccess: () => {
      toast.success("Vangnetadres opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["email-routing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => resend({ data: { id } }),
    onSuccess: (res) => {
      if (res.status === "sent_brevo") toast.success("Opnieuw verstuurd via Brevo");
      else if (res.status === "sent_smtp_fallback") toast.success("Verstuurd via SMTP-terugval");
      else toast.error(res.error ?? "Verzenden mislukt");
      queryClient.invalidateQueries({ queryKey: ["email-routing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submissions: FormSubmission[] = data?.submissions ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-bold">E-mail &amp; notificaties</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["email-routing"] })}
        >
          <RefreshCw className="size-4" />
          <span className="hidden sm:inline">Vernieuwen</span>
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Komt een melding niet aan bij de gekozen mailbox, dan gaat ze automatisch naar dit
        vangnetadres met <strong>[HERSTEL/FALLBACK]</strong> in het onderwerp. Elke inzending blijft
        hieronder bewaard.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:max-w-md">
        <Label htmlFor="fallback-email">Globaal vangnetadres</Label>
        <div className="flex gap-2">
          <Input
            id="fallback-email"
            type="email"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="contact@maximilien.brussels"
          />
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !fallback.trim()}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Bewaren
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Laatste inzendingen
        </p>
        {isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Laden…
          </p>
        ) : submissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nog geen inzendingen bewaard.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {submissions.map((s) => {
              const st = STATUS[s.status] ?? STATUS["email_pending"]!;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="text-xs text-muted-foreground">{moment(s.created_at)}</span>
                  <span className="font-semibold">{s.subject || s.form}</span>
                  <span className="text-xs text-muted-foreground">{s.email}</span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                      st.style,
                    )}
                  >
                    {st.label}
                  </span>
                  {s.recipients.length ? (
                    <span className="text-xs text-muted-foreground">→ {s.recipients.join(", ")}</span>
                  ) : null}
                  {s.error ? (
                    <span className="w-full text-xs text-destructive">{s.error}</span>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    disabled={resendMutation.isPending}
                    onClick={() => resendMutation.mutate(s.id)}
                  >
                    Opnieuw versturen
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
