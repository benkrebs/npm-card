const de = {
  title: "Nginx Proxy Manager",
  count_total: "verfügbar",
  count_enabled: "aktiv",
  count_disabled: "deaktiviert",
  count_unavailable: "nicht erreichbar",
  filter_hint: "Tippen zum Filtern",
  state_enabled: "Aktiv",
  state_disabled: "Deaktiviert",
  state_unavailable: "Nicht erreichbar",
  type_proxy: "Proxy-Host",
  type_redirect: "Weiterleitung",
  type_stream: "Stream",
  type_dead: "404-Host",
  group_proxy: "Proxy-Hosts",
  group_redirect: "Weiterleitungen",
  group_stream: "Streams",
  group_dead: "404-Hosts",
  more_domains: "+{count} weitere",
  cert_days: "{days} T",
  cert_expires: "Zertifikat läuft in {days} Tagen ab",
  cert_expires_today: "Zertifikat läuft heute ab",
  cert_expired: "Zertifikat abgelaufen",
  cert_unknown: "Zertifikat",
  toggle_enable: "{name} aktivieren",
  toggle_disable: "{name} deaktivieren",
  confirm_disable: "Deaktivieren?",
  yes: "Ja",
  no: "Nein",
  search: "Suchen …",
  no_hosts: "Keine NPM-Hosts gefunden. Installiere die Integration „NPM Switches“ oder wähle Hosts im Karteneditor.",
  no_match: "Keine Hosts für diesen Filter.",
  show_all: "Alle anzeigen",
  toggle_failed: "{name} konnte nicht geschaltet werden",
};

export type TranslationKey = keyof typeof de;

const en: Record<TranslationKey, string> = {
  title: "Nginx Proxy Manager",
  count_total: "available",
  count_enabled: "active",
  count_disabled: "disabled",
  count_unavailable: "unavailable",
  filter_hint: "Tap to filter",
  state_enabled: "Active",
  state_disabled: "Disabled",
  state_unavailable: "Unavailable",
  type_proxy: "Proxy host",
  type_redirect: "Redirection",
  type_stream: "Stream",
  type_dead: "404 host",
  group_proxy: "Proxy hosts",
  group_redirect: "Redirections",
  group_stream: "Streams",
  group_dead: "404 hosts",
  more_domains: "+{count} more",
  cert_days: "{days} d",
  cert_expires: "Certificate expires in {days} days",
  cert_expires_today: "Certificate expires today",
  cert_expired: "Certificate expired",
  cert_unknown: "Certificate",
  toggle_enable: "Enable {name}",
  toggle_disable: "Disable {name}",
  confirm_disable: "Disable?",
  yes: "Yes",
  no: "No",
  search: "Search …",
  no_hosts: "No NPM hosts found. Install the “NPM Switches” integration or pick hosts in the card editor.",
  no_match: "No hosts match this filter.",
  show_all: "Show all",
  toggle_failed: "Could not switch {name}",
};

const translations: Record<string, Record<TranslationKey, string>> = { de, en };

export function localize(language: string | undefined, key: TranslationKey, vars?: Record<string, string | number>): string {
  const lang = (language ?? "en").split("-")[0].toLowerCase();
  let text = (translations[lang] ?? en)[key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
