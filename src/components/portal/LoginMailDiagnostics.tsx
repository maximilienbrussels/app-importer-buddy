import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ShieldAlert, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { diagnoseLoginAndMail, type DiagnosticCheck } from "@/lib/login-diagnostics.functions";
import { getMissingI18nKeys } from "@/lib/i18n";
import { getMissingPortalI18nKeys } from "@/lib/portal-i18n";
import { cn } from "@/lib/utils";

const ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: ShieldAlert,
} as const;

const TONE = {
  ok: "text-success",
  warn: "text-warning-foreground",
  fail: "text-destructive",
} as const;

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const Icon = ICON[check.status];
  return (
    <li className="flex gap-3 rounded-lg border border-border/70 p-3">
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[check.status])} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{check.label}</p>
        <p className="text-sm break-words text-muted-foreground">{check.detail}</p>
        {check.hint ? (
          <p className="mt-1 text-xs break-words text-muted-foreground/80">{check.hint}</p>
        ) : null}
      </div>
    </li>
  );
}

/** Diagnose van klantenlogin en mailverzending, met de nodige redirect-URI's. */
export function LoginMailDiagnostics() {
  const run = useServerFn(diagnoseLoginAndMail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["login-mail-diagnostics"],
    queryFn: () => run(),
    retry: false,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Stethoscope className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-bold">Inloggen &amp; mail — diagnose</h2>
      </div>

      {isLoading ? <p className="mt-3 text-sm text-muted-foreground">Controleren…</p> : null}
      {error ? (
        <p className="mt-3 text-sm text-destructive">{(error as Error).message}</p>
      ) : null}

      {data ? (
        <>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>

          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <p className="font-semibold">Redirect-URI's bij Google / GitHub / GitLab</p>
              <ul className="mt-1 space-y-1 font-mono break-all text-muted-foreground">
                {data.redirectUris.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Toegestane origins in Neon Auth</p>
              <ul className="mt-1 space-y-1 font-mono break-all text-muted-foreground">
                {data.origins.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}

      <MissingTranslationsReport />
    </section>
  );
}

/** Toont welke vertaalsleutels tijdens deze sessie ontbraken (per taal, na terugval). */
function MissingTranslationsReport() {
  const [site, setSite] = useState(getMissingI18nKeys());
  const [portal, setPortal] = useState(getMissingPortalI18nKeys());

  useEffect(() => {
    const id = window.setInterval(() => {
      setSite(getMissingI18nKeys());
      setPortal(getMissingPortalI18nKeys());
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const langs: Array<{ key: "nl" | "fr" | "en"; label: string }> = [
    { key: "nl", label: "NL" },
    { key: "fr", label: "FR" },
    { key: "en", label: "EN" },
  ];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm font-bold">Ontbrekende vertalingen (deze sessie)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sleutels die niet gevonden werden in de aangeklikte taal en teruggevallen zijn op Engels
        of Nederlands.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(
          [
            { label: "Publieke site", data: site },
            { label: "Beheerportaal", data: portal },
          ] as const
        ).map((group) => (
          <div key={group.label} className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold">{group.label}</p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {langs.map((l) => {
                const keys = group.data[l.key];
                return (
                  <li key={l.key}>
                    <span className="font-mono font-semibold">{l.label}</span>{" "}
                    {keys.length === 0 ? (
                      <span className="text-muted-foreground">geen</span>
                    ) : (
                      <span className="break-all text-muted-foreground">{keys.join(", ")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
