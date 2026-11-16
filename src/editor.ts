import { PLATFORM } from "./discovery";
import type { CardConfig } from "./types";

type Schema = Record<string, unknown>;

const LABELS: Record<"de" | "en", Record<string, string>> = {
  de: {
    title: "Titel",
    entities: "Hosts (leer = alle automatisch)",
    exclude_entities: "Ausgeblendete Hosts",
    devices: "NPM-Instanzen (leer = alle)",
    host_types: "Host-Typen",
    header: "Kopfzeile",
    show_header: "Kopfzeile anzeigen",
    show_title: "Titel",
    show_total: "Anzahl verfügbar",
    show_enabled: "Anzahl aktiv",
    show_disabled: "Anzahl deaktiviert",
    header_filter: "Zähler filtern die Liste",
    show_search: "Suchfeld",
    rows: "Einträge",
    show_icon: "Icon",
    show_type: "Host-Typ",
    show_status: "Status-Text",
    show_all_domains: "Alle Domains statt „+2 weitere“",
    show_instance: "NPM-Instanz",
    show_certificate: "Zertifikat-Ablauf",
    show_toggle: "Schalter",
    group_by_type: "Nach Host-Typ gruppieren",
    hide_domain_suffix: "Domain-Endung ausblenden (z. B. example.com)",
    behavior: "Sortierung & Verhalten",
    sort: "Sortierung",
    filter: "Filter beim Laden",
    tap_action: "Tippen auf Icon / Zusatzzeile",
    link_names: "Name als Link (öffnet neues Browserfenster)",
    confirm_disable: "Vor dem Deaktivieren nachfragen",
    show_orphaned: "Verwaiste Einträge anzeigen (in NPM gelöscht)",
    allow_delete: "Löschen verwaister Entitäten anbieten (nur Admins)",
    cert_warning_days: "Zertifikat-Warnung ab",
    colors: "Farben",
    enabled: "Aktiv",
    disabled: "Deaktiviert",
    unavailable: "Nicht erreichbar",
    orphaned: "Verwaist",
    type_proxy: "Proxy-Hosts",
    type_redirect: "Weiterleitungen",
    type_stream: "Streams",
    type_dead: "404-Hosts",
    sort_name: "Nach Name",
    sort_enabled_first: "Aktive zuerst",
    sort_disabled_first: "Deaktivierte zuerst",
    sort_config: "Wie konfiguriert",
    filter_all: "Alle",
    filter_enabled: "Nur aktive",
    filter_disabled: "Nur deaktivierte",
    filter_orphaned: "Nur verwaiste",
    tap_more_info: "Details anzeigen",
    tap_open: "Domain im Browser öffnen",
    tap_none: "Nichts",
    days: "Tage",
    hide_domain_suffix_helper: "„cloud.example.com“ wird zu „cloud“. Mehrere Endungen möglich.",
    entities_helper: "Reihenfolge = Anzeigereihenfolge bei Sortierung „Wie konfiguriert“.",
  },
  en: {
    title: "Title",
    entities: "Hosts (empty = all, discovered automatically)",
    exclude_entities: "Hidden hosts",
    devices: "NPM instances (empty = all)",
    host_types: "Host types",
    header: "Header",
    show_header: "Show header",
    show_title: "Title",
    show_total: "Count available",
    show_enabled: "Count active",
    show_disabled: "Count disabled",
    header_filter: "Counters filter the list",
    show_search: "Search field",
    rows: "Rows",
    show_icon: "Icon",
    show_type: "Host type",
    show_status: "Status text",
    show_all_domains: "All domains instead of “+2 more”",
    show_instance: "NPM instance",
    show_certificate: "Certificate expiry",
    show_toggle: "Switch",
    group_by_type: "Group by host type",
    hide_domain_suffix: "Hide domain suffix (e.g. example.com)",
    behavior: "Sorting & behavior",
    sort: "Sort order",
    filter: "Filter on load",
    tap_action: "Tap on icon / second line",
    link_names: "Name as link (opens a new browser window)",
    confirm_disable: "Ask before disabling",
    show_orphaned: "Show orphaned entries (deleted in NPM)",
    allow_delete: "Offer to delete orphaned entities (admins only)",
    cert_warning_days: "Certificate warning from",
    colors: "Colors",
    enabled: "Active",
    disabled: "Disabled",
    unavailable: "Unavailable",
    orphaned: "Orphaned",
    type_proxy: "Proxy hosts",
    type_redirect: "Redirections",
    type_stream: "Streams",
    type_dead: "404 hosts",
    sort_name: "By name",
    sort_enabled_first: "Active first",
    sort_disabled_first: "Disabled first",
    sort_config: "As configured",
    filter_all: "All",
    filter_enabled: "Active only",
    filter_disabled: "Disabled only",
    filter_orphaned: "Orphaned only",
    tap_more_info: "Show details",
    tap_open: "Open domain in browser",
    tap_none: "Nothing",
    days: "days",
    hide_domain_suffix_helper: "“cloud.example.com” becomes “cloud”. Several suffixes allowed.",
    entities_helper: "Order = display order with sort order “As configured”.",
  },
};

function labels(): Record<string, string> {
  const lang = (document.documentElement.lang || navigator.language || "en").slice(0, 2).toLowerCase();
  return lang === "de" ? LABELS.de : LABELS.en;
}

/** Schema for Home Assistant's built-in form editor (`getConfigForm`). */
export function configForm() {
  const l = labels();
  const options = (prefix: string, values: string[]) => values.map((value) => ({ value, label: l[prefix + value.replace("-", "_")] }));
  const toggles = (names: string[]): Schema => ({
    type: "grid",
    name: "",
    schema: names.map((name) => ({ name, selector: { boolean: {} }, default: true })),
  });
  const npmSwitches = { entity: { multiple: true, filter: { integration: PLATFORM, domain: "switch" } } };

  const schema: Schema[] = [
    { name: "title", selector: { text: {} } },
    { name: "entities", selector: npmSwitches },
    {
      type: "expandable",
      name: "",
      title: l.header,
      schema: [
        toggles(["show_header", "show_title", "show_total", "show_enabled", "show_disabled", "header_filter"]),
        { name: "show_search", selector: { boolean: {} } },
      ],
    },
    {
      type: "expandable",
      name: "",
      title: l.rows,
      schema: [
        toggles(["show_icon", "show_type", "show_status", "show_certificate", "show_instance", "show_toggle", "group_by_type"]),
        { name: "show_all_domains", selector: { boolean: {} } },
        { name: "hide_domain_suffix", selector: { text: { multiple: true } } },
      ],
    },
    {
      type: "expandable",
      name: "",
      title: l.behavior,
      schema: [
        {
          name: "host_types",
          selector: { select: { multiple: true, mode: "list", options: options("type_", ["proxy", "redirect", "stream", "dead"]) } },
        },
        { name: "exclude_entities", selector: npmSwitches },
        { name: "devices", selector: { device: { multiple: true, filter: { integration: PLATFORM } } } },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "sort",
              selector: { select: { mode: "dropdown", options: options("sort_", ["name", "enabled_first", "disabled_first", "config"]) } },
            },
            { name: "filter", selector: { select: { mode: "dropdown", options: options("filter_", ["all", "enabled", "disabled", "orphaned"]) } } },
            {
              name: "tap_action",
              selector: { select: { mode: "dropdown", options: options("tap_", ["more-info", "open", "none"]) } },
            },
            {
              name: "cert_warning_days",
              selector: { number: { min: 0, max: 90, mode: "box", unit_of_measurement: l.days } },
            },
          ],
        },
        toggles(["link_names"]),
        { name: "confirm_disable", selector: { boolean: {} } },
        toggles(["show_orphaned", "allow_delete"]),
      ],
    },
    {
      type: "expandable",
      name: "colors",
      title: l.colors,
      schema: [
        {
          type: "grid",
          name: "",
          column_min_width: "140px",
          schema: ["enabled", "disabled", "unavailable", "orphaned"].map((name) => ({ name, selector: { ui_color: {} } })),
        },
      ],
    },
  ];

  return {
    schema,
    computeLabel: (field: { name: string; label?: string }) => field.label ?? l[field.name],
    computeHelper: (field: { name: string }) =>
      field.name === "hide_domain_suffix"
        ? l.hide_domain_suffix_helper
        : field.name === "entities"
          ? l.entities_helper
          : undefined,
    assertConfig: (config: CardConfig) => {
      if (config.entities?.some((e) => typeof e !== "string")) {
        throw new Error("`entities` with per-host options can only be edited in YAML.");
      }
    },
  };
}
