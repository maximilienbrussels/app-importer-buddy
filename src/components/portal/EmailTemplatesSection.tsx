/**
 * Sjabloonbibliotheek in het portaal: teamsjablonen (nieuwsbrief, uitnodiging,
 * persbericht …) én alle systeemmails, per taal te bekijken, te kopiëren en als
 * HTML te downloaden voor Infomaniak Mail/Newsletter.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, ExternalLink, FileCode2, LayoutTemplate, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MailLang } from "@/lib/email-copy";
import {
  TEAM_EMAIL_TEMPLATES,
  TEAM_TEMPLATE_CATEGORY_LABEL,
  teamTemplateFilename,
  type TeamTemplateCategory,
} from "@/lib/team-email-templates";
import { fetchSystemEmailPreviews, type SystemEmailPreviewDto } from "@/lib/email-admin.functions";

const LANGS: MailLang[] = ["nl", "fr", "en"];

type Item = {
  key: string;
  group: "team" | "system";
  category: string;
  name: string;
  description?: string;
  placeholders?: string[];
  subject: string;
  html: string;
  filename: string;
};

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openInTab(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  window.open(URL.createObjectURL(blob), "_blank", "noopener");
}

export function EmailTemplatesSection() {
  const [lang, setLang] = useState<MailLang>("nl");
  const [group, setGroup] = useState<"team" | "system">("team");
  const [selected, setSelected] = useState<string | null>(null);

  const previewsFn = useServerFn(fetchSystemEmailPreviews);
  const systemQuery = useQuery({
    queryKey: ["email-previews", lang],
    queryFn: () => previewsFn({ data: { langs: [lang] } }),
    enabled: group === "system",
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Item[]>(() => {
    if (group === "team") {
      return TEAM_EMAIL_TEMPLATES.map((t) => {
        const built = t.build(lang);
        return {
          key: `team:${t.id}`,
          group: "team",
          category: TEAM_TEMPLATE_CATEGORY_LABEL[t.category as TeamTemplateCategory][lang],
          name: t.name[lang],
          description: t.description[lang],
          placeholders: t.placeholders,
          subject: built.subject,
          html: built.html,
          filename: teamTemplateFilename(t.id, lang),
        };
      });
    }
    const previews: SystemEmailPreviewDto[] = systemQuery.data?.previews ?? [];
    return previews.map((p) => ({
      key: `system:${p.id}`,
      group: "system",
      category: "Systeemmail",
      name: p.name,
      subject: p.subject,
      html: p.html,
      filename: `maximilien-systeem-${p.id}-${p.lang}.html`,
    }));
  }, [group, lang, systemQuery.data]);

  const active = items.find((i) => i.key === selected) ?? items[0] ?? null;

  const copyHtml = async (html: string) => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML gekopieerd — plak in Infomaniak (Newsletter › HTML-editor).");
    } catch {
      toast.error("Kopiëren lukte niet; gebruik de download.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">E-mailsjablonen</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Kant-en-klare mails in de huisstijl (logo, voettekst, alle sociale kanalen) in NL/FR/EN.
            Download de HTML en upload ze in Infomaniak Newsletter, of kopieer de code in de
            HTML-editor. Plaatshouders zoals <code className="rounded bg-muted px-1">[[Voornaam]]</code>{" "}
            vervang je door je eigen tekst of door de Infomaniak-variabele.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["team", "system"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGroup(g);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  group === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "team" ? "Teamsjablonen" : "Systeemmails"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase transition-colors",
                  lang === l ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lijst */}
        <div className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
          {group === "system" && systemQuery.isLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Voorbeelden laden…
            </div>
          ) : null}
          {group === "system" && systemQuery.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {(systemQuery.error as Error).message}
            </p>
          ) : null}
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => setSelected(it.key)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                active?.key === it.key
                  ? "border-primary/40 bg-primary/5"
                  : "border-transparent hover:border-border hover:bg-muted/50",
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {it.category}
              </div>
              <div className="mt-0.5 text-sm font-semibold leading-tight">{it.name}</div>
              {it.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.description}</div>
              ) : null}
            </button>
          ))}
        </div>

        {/* Voorbeeld */}
        {active ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border border-border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Onderwerp
                </div>
                <div className="truncate text-sm font-medium">{active.subject}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openInTab(active.html)}>
                  <ExternalLink className="size-3.5" /> Open
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyHtml(active.html)}>
                  <Copy className="size-3.5" /> Kopieer HTML
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => downloadHtml(active.filename, active.html)}>
                  <Download className="size-3.5" /> Download .html
                </Button>
              </div>
            </div>
            <iframe
              key={active.key + lang}
              title={active.name}
              srcDoc={active.html}
              sandbox=""
              className="h-[640px] w-full rounded-b-xl border border-t-0 border-border bg-background"
            />
            {active.placeholders?.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <FileCode2 className="size-3.5" />
                <span>Plaatshouders:</span>
                {active.placeholders.map((ph) => (
                  <code key={ph} className="rounded bg-muted px-1.5 py-0.5">
                    [[{ph}]]
                  </code>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <details className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">
          Zo gebruik je een sjabloon in Infomaniak
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Kies het sjabloon en de taal, klik op <strong>Download .html</strong>.</li>
          <li>
            <strong>Newsletter:</strong> Infomaniak Newsletter › Sjablonen › Importeren › kies het
            .html-bestand. Vervang daarna de plaatshouders (bv. <code>[[Voornaam]]</code> →{" "}
            <code>{"{{firstname}}"}</code>) en de uitschrijflink door de Infomaniak-variabele.
          </li>
          <li>
            <strong>Gewone mail (Infomaniak Mail):</strong> open het bestand in je browser, selecteer
            alles (Ctrl/Cmd+A), kopieer en plak in een nieuw bericht — de opmaak blijft behouden.
          </li>
          <li>
            Logo en iconen laden vanaf <code>maximilien.brussels/assets/email/…</code>; ze werken dus in elk
            mailprogramma zonder bijlagen.
          </li>
        </ol>
      </details>
    </section>
  );
}
