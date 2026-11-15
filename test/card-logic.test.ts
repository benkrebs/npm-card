import { describe, expect, it } from "vitest";
import {
  buildViews,
  certificateFor,
  countViews,
  filterViews,
  groupViews,
  hostType,
  resolveCertificates,
  resolveHosts,
  shortenDomain,
  sortViews,
} from "../src/discovery";
import { localize } from "../src/localize";
import { resolveColor } from "../src/theme";
import type { CardConfig } from "../src/types";
import { addSecondInstance, npmHass } from "./fixtures";

const base: CardConfig = { type: "custom:npm-card" };
const NOW = Date.UTC(2026, 10, 15, 12);

describe("discovery", () => {
  it("finds every NPM Switches switch and nothing else", () => {
    const hosts = resolveHosts(npmHass(), base);
    expect(hosts.map((h) => h.entityId)).not.toContain("switch.kitchen");
    expect(hosts).toHaveLength(8);
  });

  it("detects the host type from name, entity id and attributes", () => {
    const hass = npmHass();
    const types = Object.fromEntries(resolveHosts(hass, base).map((h) => [h.entityId, h.type]));
    expect(types).toMatchObject({
      "switch.npm_proxy_cloud_example_com": "proxy",
      "switch.npm_proxy_proxy_example_com": "proxy",
      "switch.npm_redirect_www_example_com": "redirect",
      "switch.npm_stream_8443": "stream",
      "switch.npm_404_old_example_com": "dead",
    });
    // Renamed entity: falls back to the entity id.
    hass.states["switch.npm_redirect_www_example_com"].attributes.friendly_name = "Website";
    expect(hostType(hass, "switch.npm_redirect_www_example_com", "dev_npm")).toBe("redirect");
  });

  it("uses domain_names for the name and describes streams by port and target", () => {
    const hosts = resolveHosts(npmHass(), base);
    const home = hosts.find((h) => h.entityId === "switch.npm_proxy_home_example_com")!;
    expect(home).toMatchObject({
      name: "home.example.com",
      domains: ["home.example.com", "ha.example.com"],
      url: "https://home.example.com",
      instance: "NPM",
    });
    const stream = hosts.find((h) => h.type === "stream")!;
    expect(stream).toMatchObject({ name: "Port 8443", forward: "192.168.1.10:443", url: undefined });
  });

  it("hides domain suffixes", () => {
    expect(shortenDomain("cloud.example.com", ["example.com"])).toBe("cloud");
    expect(shortenDomain("cloud.example.com", [".example.com"])).toBe("cloud");
    expect(shortenDomain("example.com", ["example.com"])).toBe("example.com");
    expect(shortenDomain("cloud.other.org", ["example.com"])).toBe("cloud.other.org");
    const names = resolveHosts(npmHass(), { ...base, hide_domain_suffix: ["example.com"] }).map((h) => h.name);
    expect(names).toContain("jellyfin");
  });

  it("respects entities, per-host options, exclusions, host types and instances", () => {
    const hass = npmHass();
    addSecondInstance(hass);
    const picked = resolveHosts(hass, {
      ...base,
      entities: [
        "switch.npm_proxy_grafana_example_com",
        { entity: "switch.npm_proxy_cloud_example_com", name: "Nextcloud", icon: "mdi:cloud", url: "https://x.test" },
        "switch.kitchen_light_missing",
      ],
    });
    expect(picked.map((h) => h.name)).toEqual(["grafana.example.com", "Nextcloud"]);
    expect(picked[1]).toMatchObject({ icon: "mdi:cloud", url: "https://x.test" });

    const proxiesOnly = resolveHosts(hass, {
      ...base,
      host_types: ["proxy"],
      exclude_entities: ["switch.npm_proxy_jellyfin_example_com"],
      devices: ["dev_npm"],
    });
    expect(proxiesOnly.map((h) => h.type)).toEqual(["proxy", "proxy", "proxy", "proxy"]);
    expect(proxiesOnly.map((h) => h.entityId)).not.toContain("switch.npm_proxy_jellyfin_example_com");
    expect(resolveHosts(hass, { ...base, devices: ["dev_office"] }).map((h) => h.instance)).toEqual(["NPM Office"]);
  });

  it("skips hidden switches during discovery", () => {
    const hass = npmHass();
    hass.entities["switch.npm_404_old_example_com"].hidden = true;
    expect(resolveHosts(hass, base).map((h) => h.entityId)).not.toContain("switch.npm_404_old_example_com");
  });
});

describe("certificates", () => {
  it("matches exact domains before wildcards and computes the days left", () => {
    const hass = npmHass({}, NOW);
    const certs = resolveCertificates(hass);
    expect(certs.map((c) => c.entityId).sort()).toEqual(["sensor.npm_cert_1", "sensor.npm_cert_2"]);
    const hosts = resolveHosts(hass, base);
    const byId = (id: string) => hosts.find((h) => h.entityId === id)!;
    expect(certificateFor(byId("switch.npm_proxy_cloud_example_com"), certs)?.entityId).toBe("sensor.npm_cert_2");
    expect(certificateFor(byId("switch.npm_proxy_grafana_example_com"), certs)?.entityId).toBe("sensor.npm_cert_1");
    expect(certificateFor(byId("switch.npm_stream_8443"), certs)).toBeUndefined();

    const views = buildViews(hass, hosts, certs, NOW);
    expect(views.find((v) => v.host.entityId === "switch.npm_proxy_cloud_example_com")?.certificate?.days).toBe(5);
    expect(views.find((v) => v.host.entityId === "switch.npm_proxy_grafana_example_com")?.certificate?.days).toBe(60);
  });

  it("does not let a wildcard cover deeper subdomains", () => {
    const hass = npmHass({}, NOW);
    const [host] = resolveHosts(hass, { ...base, entities: ["switch.npm_proxy_grafana_example_com"] });
    const deep = { ...host, domains: ["a.b.example.com"] };
    expect(certificateFor(deep, resolveCertificates(hass))).toBeUndefined();
  });
});

describe("state, counts, filter, sort", () => {
  it("counts available, active, disabled and unavailable hosts", () => {
    const hass = npmHass({ "switch.npm_proxy_grafana_example_com": "unavailable" });
    const counts = countViews(buildViews(hass, resolveHosts(hass, base), []));
    expect(counts).toEqual({ total: 8, enabled: 5, disabled: 2, unavailable: 1 });
  });

  it("filters by state and search text", () => {
    const hass = npmHass();
    const views = buildViews(hass, resolveHosts(hass, base), []);
    expect(filterViews(views, "disabled").map((v) => v.host.name).sort()).toEqual(["jellyfin.example.com", "old.example.com"]);
    expect(filterViews(views, "all", "HA.EXAMPLE").map((v) => v.host.name)).toEqual(["home.example.com"]);
    expect(filterViews(views, "all", "192.168").map((v) => v.host.type)).toEqual(["stream"]);
    expect(filterViews(views, "enabled", "jelly")).toEqual([]);
  });

  it("sorts by name, state or configuration", () => {
    const hass = npmHass();
    const views = buildViews(hass, resolveHosts(hass, base), []);
    expect(sortViews(views, base).map((v) => v.host.name).slice(0, 3)).toEqual([
      "cloud.example.com",
      "grafana.example.com",
      "home.example.com",
    ]);
    expect(sortViews(views, { ...base, sort: "disabled_first" }).slice(0, 2).map((v) => v.state)).toEqual([
      "disabled",
      "disabled",
    ]);
    expect(sortViews(views, { ...base, sort: "enabled_first" }).at(-1)?.state).toBe("disabled");

    const configured = { ...base, entities: ["switch.npm_stream_8443", "switch.npm_proxy_cloud_example_com"] };
    const configuredViews = buildViews(hass, resolveHosts(hass, configured), []);
    expect(sortViews(configuredViews, configured).map((v) => v.host.type)).toEqual(["stream", "proxy"]);
  });

  it("groups by host type in a fixed order", () => {
    const hass = npmHass();
    const groups = groupViews(buildViews(hass, resolveHosts(hass, base), []));
    expect(groups.map((g) => [g.type, g.views.length])).toEqual([
      ["proxy", 5],
      ["redirect", 1],
      ["stream", 1],
      ["dead", 1],
    ]);
  });
});

describe("helpers", () => {
  it("resolves theme color names and CSS colors", () => {
    expect(resolveColor("red", "x")).toBe("var(--red-color)");
    expect(resolveColor("#123456", "x")).toBe("#123456");
    expect(resolveColor(undefined, "fallback")).toBe("fallback");
  });

  it("localizes with fallback to English", () => {
    expect(localize("de", "count_total")).toBe("verfügbar");
    expect(localize("fr", "count_disabled")).toBe("disabled");
    expect(localize("en-GB", "more_domains", { count: 2 })).toBe("+2 more");
  });
});
