import { useEffect, useState } from "react";
import { isPasskeyCancelled, isPasskeySupported } from "@/lib/auth/passkey";
import { Check, Fingerprint, Loader2, Pencil, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT, localeFor, type Lang } from "@/lib/i18n";
import {
  listMyPasskeys,
  deleteMyPasskey,
  renameMyPasskey,
  startPasskeyRegistration,
  finishPasskeyRegistration,
} from "@/lib/webauthn.functions";

type Passkey = {
  id: string;
  device_name: string | null;
  transports: string[] | null;
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
};


type PkCopy = {
  title: string;
  description: string;
  notSupported: string;
  loading: string;
  none: string;
  add: string;
  addedOn: (d: string) => string;
  lastUsed: (d: string) => string;
  unknownDevice: string;
  neverUsed: string;
  removeLabel: string;
  renameLabel: string;
  renamePlaceholder: string;
  save: string;
  cancel: string;
  renamed: string;
  renameFailed: string;
  fetchFailed: string;
  added: string;
  removed: string;
  removeFailed: string;
  cancelled: string;
  createFailed: string;
  genericError: string;
};

const PK_COPY: Record<Lang, PkCopy> = {
  nl: {
    title: "Passkeys",
    description:
      "Log sneller en veiliger in met Face ID, vingerafdruk of je toestel-pincode — geen wachtwoord nodig.",
    notSupported: "Passkeys worden niet ondersteund op dit toestel of in deze browser.",
    loading: "Passkeys laden…",
    none: "Je hebt nog geen passkeys toegevoegd.",
    add: "🔑 Passkey Registreren",
    addedOn: (d) => `Toegevoegd op ${d}`,
    lastUsed: (d) => `Laatst gebruikt: ${d}`,
    unknownDevice: "Onbekend toestel",
    neverUsed: "Nog nooit gebruikt",
    removeLabel: "Passkey verwijderen",
    renameLabel: "Naam wijzigen",
    renamePlaceholder: "Naam van dit toestel",
    save: "Opslaan",
    cancel: "Annuleren",
    renamed: "Naam bijgewerkt.",
    renameFailed: "Kon de naam niet wijzigen.",
    fetchFailed: "Kon je passkeys niet ophalen.",
    added: "Passkey toegevoegd!",
    removed: "Passkey verwijderd.",
    removeFailed: "Kon deze passkey niet verwijderen.",
    cancelled: "Actie geannuleerd of niet toegestaan door je toestel.",
    createFailed: "Deze passkey kon niet worden aangemaakt.",
    genericError: "Er ging iets mis met de passkey-actie.",
  },
  fr: {
    title: "Passkeys",
    description:
      "Connectez-vous plus vite et plus sûrement avec Face ID, l'empreinte digitale ou le code de votre appareil — sans mot de passe.",
    notSupported: "Les passkeys ne sont pas pris en charge sur cet appareil ou dans ce navigateur.",
    loading: "Chargement des passkeys…",
    none: "Vous n'avez encore ajouté aucun passkey.",
    add: "🔑 Enregistrer un passkey",
    addedOn: (d) => `Ajouté le ${d}`,
    lastUsed: (d) => `Dernière utilisation : ${d}`,
    unknownDevice: "Appareil inconnu",
    neverUsed: "Jamais utilisé",
    removeLabel: "Supprimer le passkey",
    renameLabel: "Renommer",
    renamePlaceholder: "Nom de cet appareil",
    save: "Enregistrer",
    cancel: "Annuler",
    renamed: "Nom mis à jour.",
    renameFailed: "Impossible de renommer ce passkey.",
    fetchFailed: "Impossible de charger vos passkeys.",
    added: "Passkey ajouté !",
    removed: "Passkey supprimé.",
    removeFailed: "Impossible de supprimer ce passkey.",
    cancelled: "Action annulée ou refusée par votre appareil.",
    createFailed: "Ce passkey n'a pas pu être créé.",
    genericError: "Une erreur s'est produite lors de l'action passkey.",
  },
  en: {
    title: "Passkeys",
    description:
      "Sign in faster and more securely with Face ID, fingerprint or your device PIN — no password needed.",
    notSupported: "Passkeys are not supported on this device or in this browser.",
    loading: "Loading passkeys…",
    none: "You haven't added any passkeys yet.",
    add: "🔑 Register passkey",
    addedOn: (d) => `Added on ${d}`,
    lastUsed: (d) => `Last used: ${d}`,
    unknownDevice: "Unknown device",
    neverUsed: "Never used",
    removeLabel: "Remove passkey",
    renameLabel: "Rename",
    renamePlaceholder: "Name of this device",
    save: "Save",
    cancel: "Cancel",
    renamed: "Name updated.",
    renameFailed: "Could not rename this passkey.",
    fetchFailed: "Could not load your passkeys.",
    added: "Passkey added!",
    removed: "Passkey removed.",
    removeFailed: "Could not remove this passkey.",
    cancelled: "Action cancelled or not allowed by your device.",
    createFailed: "This passkey could not be created.",
    genericError: "Something went wrong with the passkey action.",
  },
};

function friendlyPasskeyError(err: unknown, c: PkCopy): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError") return c.cancelled;
  const msg = err instanceof Error ? err.message : "";
  if (msg) return msg;
  return c.genericError;
}

function formatDate(iso: string | null, lang: Lang, c: PkCopy): string {
  if (!iso) return c.neverUsed;
  return new Date(iso).toLocaleDateString(localeFor(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PasskeySection() {
  const { lang } = useT();
  const c = PK_COPY[lang] ?? PK_COPY.nl;
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isPasskeySupported());
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listMyPasskeys();
      setPasskeys(data as Passkey[]);
    } catch {
      toast.error(c.fetchFailed);
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setAdding(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await startPasskeyRegistration();
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (err) {
        // Prompt weggeklikt: gewoon stoppen, geen storende foutmelding.
        if (isPasskeyCancelled(err)) return;
        throw new Error(c.createFailed);
      }
      const deviceName =
        typeof navigator !== "undefined" &&
        (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform
          ? (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData
              ?.platform
          : undefined;
      await finishPasskeyRegistration({ data: { response: attResp, deviceName } });
      toast.success(c.added);
      await refresh();
    } catch (err) {
      toast.error(friendlyPasskeyError(err, c));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMyPasskey({ data: { id } });
      toast.success(c.removed);
      setPasskeys((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch {
      toast.error(c.removeFailed);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRename(id: string) {
    const name = editName.trim();
    if (!name) return;
    setSavingRename(true);
    try {
      await renameMyPasskey({ data: { id, name } });
      setPasskeys((prev) => prev?.map((p) => (p.id === id ? { ...p, device_name: name } : p)) ?? null);
      setEditingId(null);
      toast.success(c.renamed);
    } catch {
      toast.error(c.renameFailed);
    } finally {
      setSavingRename(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="h-4 w-4 text-primary" />
          {c.title}
        </CardTitle>
        <CardDescription>
          {c.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">
            {c.notSupported}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {c.loading}
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    {editingId === pk.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={c.renamePlaceholder}
                          className="h-8 w-44 text-sm"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={savingRename}
                          aria-label={c.save}
                          onClick={() => void handleRename(pk.id)}
                        >
                          {savingRename ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={c.cancel}
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="truncate font-medium">{pk.device_name || c.unknownDevice}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.addedOn(formatDate(pk.created_at, lang, c))} ·{" "}
                      {c.lastUsed(formatDate(pk.last_used_at, lang, c))}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={c.renameLabel}
                  onClick={() => {
                    setEditingId(pk.id);
                    setEditName(pk.device_name ?? "");
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === pk.id}
                  onClick={() => handleDelete(pk.id)}
                  aria-label={c.removeLabel}
                >
                  {deletingId === pk.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{c.none}</p>
        )}

        <Button
          type="button"
          onClick={handleAdd}
          disabled={adding || !supported}
          className="w-full sm:w-auto"
        >
          {adding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Fingerprint className="mr-2 h-4 w-4" />
          )}
          {c.add}
        </Button>
      </CardContent>
    </Card>
  );
}
