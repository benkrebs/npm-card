import type { HassEntityRegistryEntry, HassEntityState, HomeAssistant } from "../src/types";

interface Spec {
  id: string;
  state: string;
  name: string;
  attributes?: Record<string, unknown>;
  platform?: string;
  device?: string;
}

const DAY = 86_400_000;

/**
 * Fake `hass` that looks like the NPM Switches integration (InTheDaylight14/nginx-proxy-manager-switches)
 * with an instance titled "NPM": switches "NPM Proxy …", "NPM Redirect …", "NPM Stream …", "NPM 404 …".
 */
export function npmHass(overrides: Record<string, string> = {}, now = Date.now()): HomeAssistant {
  const proxy = (slug: string, domains: string[], state = "on", id = 1): Spec => ({
    id: `switch.npm_proxy_${slug}`,
    state,
    name: `NPM Proxy ${domains[0].replace(/\./g, " ").replace(/^./, (c) => c.toUpperCase())}`,
    attributes: { id, domain_names: domains },
  });
  const specs: Spec[] = [
    proxy("cloud_example_com", ["cloud.example.com"], "on", 1),
    proxy("home_example_com", ["home.example.com", "ha.example.com"], "on", 2),
    proxy("jellyfin_example_com", ["jellyfin.example.com"], "off", 3),
    proxy("grafana_example_com", ["grafana.example.com"], "on", 4),
    proxy("proxy_example_com", ["proxy.example.com"], "on", 5),
    {
      id: "switch.npm_redirect_www_example_com",
      state: "on",
      name: "NPM Redirect Www example com",
      attributes: { id: 6, domain_names: ["www.example.com"] },
    },
    {
      id: "switch.npm_stream_8443",
      state: "on",
      name: "NPM Stream 8443",
      attributes: { id: 1, forwarding_host: "192.168.1.10", forwarding_port: 443 },
    },
    {
      id: "switch.npm_404_old_example_com",
      state: "off",
      name: "NPM 404 Old example com",
      attributes: { id: 1, domain_names: ["old.example.com"] },
    },
    { id: "sensor.npm_proxy_hosts_enabled", state: "4", name: "NPM Proxy Hosts Enabled" },
    { id: "sensor.npm_proxy_hosts_disabled", state: "1", name: "NPM Proxy Hosts Disabled" },
    {
      id: "sensor.npm_cert_1",
      state: new Date(now + 60 * DAY).toISOString(),
      name: "NPM Certificate *.example.com",
      attributes: { device_class: "timestamp", domain_names: ["*.example.com", "example.com"] },
    },
    {
      id: "sensor.npm_cert_2",
      state: new Date(now + 5 * DAY + 3_600_000).toISOString(),
      name: "NPM Certificate cloud.example.com",
      attributes: { device_class: "timestamp", domain_names: ["cloud.example.com"] },
    },
    { id: "switch.kitchen", state: "on", name: "Kitchen", platform: "hue", device: "dev_hue" },
  ];

  const states: Record<string, HassEntityState> = {};
  const entities: Record<string, HassEntityRegistryEntry> = {};
  for (const s of specs) {
    states[s.id] = {
      entity_id: s.id,
      state: overrides[s.id] ?? s.state,
      attributes: { friendly_name: s.name, ...s.attributes },
    };
    entities[s.id] = { entity_id: s.id, platform: s.platform ?? "npm_switches", device_id: s.device ?? "dev_npm" };
  }

  return {
    states,
    entities,
    devices: {
      dev_npm: { id: "dev_npm", name: "NPM" },
      dev_hue: { id: "dev_hue", name: "Hue" },
    },
    language: "de",
    user: { is_admin: true },
    callService: async () => undefined,
  };
}

/** Adds a second NPM instance ("NPM Office") with one proxy host. */
export function addSecondInstance(hass: HomeAssistant): void {
  const id = "switch.npm_office_proxy_intranet_office_lan";
  hass.states[id] = {
    entity_id: id,
    state: "on",
    attributes: { friendly_name: "NPM Office Proxy Intranet office lan", id: 1, domain_names: ["intranet.office.lan"] },
  };
  hass.entities[id] = { entity_id: id, platform: "npm_switches", device_id: "dev_office" };
  hass.devices.dev_office = { id: "dev_office", name: "NPM Office" };
}
