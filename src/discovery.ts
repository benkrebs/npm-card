import type {
  CardConfig,
  Certificate,
  HassEntityState,
  HomeAssistant,
  HostConfig,
  HostCounts,
  HostFilter,
  HostState,
  HostType,
  HostView,
  NpmHost,
} from "./types";

export const PLATFORM = "npm_switches";
export const HOST_TYPES: HostType[] = ["proxy", "redirect", "stream", "dead"];

const domainOf = (entityId: string): string => entityId.split(".", 1)[0];

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof value === "string" && value) return [value];
  return [];
}

function deviceName(hass: HomeAssistant, deviceId?: string | null): string | undefined {
  if (!deviceId) return undefined;
  const device = hass.devices?.[deviceId];
  return device?.name_by_user || device?.name || undefined;
}

const TYPE_WORDS: Record<string, HostType> = { proxy: "proxy", redirect: "redirect", stream: "stream", "404": "dead" };

/**
 * Host type of an NPM Switches switch. The integration names its switches "Proxy …", "Redirect …",
 * "Stream …" and "404 …"; streams also carry `forwarding_port`.
 */
export function hostType(hass: HomeAssistant, entityId: string, deviceId?: string | null): HostType {
  const attributes = hass.states[entityId]?.attributes ?? {};
  if (attributes.forwarding_port !== undefined || attributes.forwarding_host !== undefined) return "stream";

  let friendly = String(attributes.friendly_name ?? "").trim();
  const device = deviceName(hass, deviceId);
  if (device && friendly.toLowerCase().startsWith(device.toLowerCase())) friendly = friendly.slice(device.length).trim();
  const word = /^(proxy|redirect|stream|404)\s/i.exec(friendly)?.[1].toLowerCase();
  if (word) return TYPE_WORDS[word];

  const fromId = /_(proxy|redirect|stream|404)_/.exec(entityId.split(".", 2)[1] ?? "")?.[1];
  if (fromId) return TYPE_WORDS[fromId];
  return "proxy";
}

/** Remove configured suffixes like `example.com` from a domain (`cloud.example.com` → `cloud`). */
export function shortenDomain(domain: string, suffixes: string[] | undefined): string {
  for (const raw of suffixes ?? []) {
    const suffix = raw.trim().replace(/^\.+/, "").toLowerCase();
    if (!suffix) continue;
    if (domain.toLowerCase().endsWith(`.${suffix}`)) return domain.slice(0, -suffix.length - 1);
  }
  return domain;
}

function isNpmSwitch(hass: HomeAssistant, entityId: string): boolean {
  const entry = hass.entities?.[entityId];
  if (entry) return entry.platform === PLATFORM && domainOf(entityId) === "switch";
  // Without registry entry (e.g. YAML switches): accept anything that looks like an NPM host.
  const attributes = hass.states[entityId]?.attributes ?? {};
  return attributes.domain_names !== undefined || attributes.forwarding_port !== undefined;
}

function buildHost(hass: HomeAssistant, entityId: string, cfg: HostConfig | undefined, order: number, config: CardConfig): NpmHost {
  const state = hass.states[entityId] as HassEntityState | undefined;
  const attributes = state?.attributes ?? {};
  const deviceId = hass.entities?.[entityId]?.device_id ?? undefined;
  const type = hostType(hass, entityId, deviceId);

  let domains = stringList(attributes.domain_names);
  let forward: string | undefined;
  if (type === "stream") {
    const port = attributes.incoming_port ?? /stream\s+(\d+)/i.exec(String(attributes.friendly_name ?? ""))?.[1];
    domains = port !== undefined ? [`Port ${port}`] : domains;
    if (attributes.forwarding_host !== undefined) {
      forward = `${attributes.forwarding_host}${attributes.forwarding_port !== undefined ? `:${attributes.forwarding_port}` : ""}`;
    }
  }
  if (!domains.length) domains = [String(attributes.friendly_name ?? entityId)];

  const name = cfg?.name || (type === "stream" ? domains[0] : shortenDomain(domains[0], config.hide_domain_suffix));
  const url = cfg?.url || (type === "stream" ? undefined : `https://${domains[0]}`);
  return {
    entityId,
    type,
    domains,
    name,
    forward,
    deviceId,
    instance: deviceName(hass, deviceId),
    icon: cfg?.icon,
    url,
    order,
  };
}

/** Hosts of the card: the configured `entities`, or every NPM Switches switch. */
export function resolveHosts(hass: HomeAssistant, config: CardConfig): NpmHost[] {
  const configured = (config.entities ?? [])
    .map((e) => (typeof e === "string" ? { entity: e } : e))
    .filter((e): e is HostConfig => !!e && typeof e.entity === "string" && domainOf(e.entity) === "switch");
  const exclude = new Set(config.exclude_entities ?? []);
  const types = new Set(config.host_types?.length ? config.host_types : HOST_TYPES);
  const devices = config.devices?.length ? new Set(config.devices) : undefined;

  let candidates: { id: string; cfg?: HostConfig }[];
  if (configured.length) {
    candidates = configured.map((cfg) => ({ id: cfg.entity, cfg }));
  } else {
    candidates = Object.keys(hass.states)
      .filter((id) => domainOf(id) === "switch" && isNpmSwitch(hass, id) && !hass.entities?.[id]?.hidden)
      .sort()
      .map((id) => ({ id }));
  }

  const seen = new Set<string>();
  const hosts: NpmHost[] = [];
  candidates.forEach(({ id, cfg }, order) => {
    if (seen.has(id) || exclude.has(id) || !hass.states[id]) return;
    seen.add(id);
    const host = buildHost(hass, id, cfg, order, config);
    if (!types.has(host.type)) return;
    if (devices && (!host.deviceId || !devices.has(host.deviceId))) return;
    hosts.push(host);
  });
  return hosts;
}

/** Certificate sensors of NPM Switches (`sensor.<instance>_cert_<id>`, timestamp with `domain_names`). */
export function resolveCertificates(hass: HomeAssistant, entityIds: string[] = Object.keys(hass.states)): Certificate[] {
  const certs: Certificate[] = [];
  for (const entityId of entityIds) {
    const state = hass.states[entityId];
    if (!state || domainOf(entityId) !== "sensor") continue;
    const entry = hass.entities?.[entityId];
    if (entry && entry.platform !== PLATFORM) continue;
    if (!entry && !/_cert_\d+$/.test(entityId)) continue;
    const domains = stringList(state.attributes.domain_names).map((d) => d.toLowerCase());
    if (!domains.length || state.attributes.device_class !== "timestamp") continue;
    const time = Date.parse(state.state);
    certs.push({ entityId, domains, expires: Number.isNaN(time) ? undefined : new Date(time) });
  }
  return certs;
}

function domainMatches(pattern: string, domain: string): boolean {
  if (pattern === domain) return true;
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return domain.endsWith(`.${base}`) && !domain.slice(0, -base.length - 1).includes(".");
  }
  return false;
}

/** The certificate that covers the first domain of the host (exact match preferred over wildcard). */
export function certificateFor(host: NpmHost, certs: Certificate[]): Certificate | undefined {
  if (host.type === "stream") return undefined;
  const domain = host.domains[0]?.toLowerCase();
  if (!domain) return undefined;
  return (
    certs.find((c) => c.domains.includes(domain)) ?? certs.find((c) => c.domains.some((p) => domainMatches(p, domain)))
  );
}

export function hostState(hass: HomeAssistant, entityId: string): HostState {
  const state = hass.states[entityId]?.state;
  return state === "on" ? "enabled" : state === "off" ? "disabled" : "unavailable";
}

export function buildViews(hass: HomeAssistant, hosts: NpmHost[], certs: Certificate[], now = Date.now()): HostView[] {
  return hosts.map((host) => {
    const cert = certificateFor(host, certs);
    return {
      host,
      state: hostState(hass, host.entityId),
      certificate: cert
        ? { entityId: cert.entityId, days: cert.expires ? Math.floor((cert.expires.getTime() - now) / 86_400_000) : undefined }
        : undefined,
    };
  });
}

export function countViews(views: HostView[]): HostCounts {
  const counts: HostCounts = { total: views.length, enabled: 0, disabled: 0, unavailable: 0 };
  for (const v of views) counts[v.state] += 1;
  return counts;
}

export function filterViews(views: HostView[], filter: HostFilter, search = ""): HostView[] {
  const query = search.trim().toLowerCase();
  return views.filter(
    (v) =>
      (filter === "all" || v.state === filter) &&
      (!query ||
        v.host.name.toLowerCase().includes(query) ||
        v.host.domains.some((d) => d.toLowerCase().includes(query)) ||
        (v.host.forward ?? "").toLowerCase().includes(query)),
  );
}

const STATE_RANK: Record<HostState, number> = { enabled: 0, disabled: 1, unavailable: 2 };
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function sortViews(views: HostView[], config: CardConfig): HostView[] {
  const mode = config.sort ?? (config.entities?.length ? "config" : "name");
  const byName = (a: HostView, b: HostView) => collator.compare(a.host.name, b.host.name) || a.host.order - b.host.order;
  const sorted = [...views];
  switch (mode) {
    case "config":
      return sorted.sort((a, b) => a.host.order - b.host.order);
    case "enabled_first":
      return sorted.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || byName(a, b));
    case "disabled_first":
      return sorted.sort((a, b) => STATE_RANK[b.state] - STATE_RANK[a.state] || byName(a, b));
    default:
      return sorted.sort(byName);
  }
}

/** Group views by host type in the order proxy, redirect, stream, 404. */
export function groupViews(views: HostView[]): { type: HostType; views: HostView[] }[] {
  return HOST_TYPES.map((type) => ({ type, views: views.filter((v) => v.host.type === type) })).filter((g) => g.views.length);
}
