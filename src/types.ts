/** Minimal subset of the Home Assistant frontend `hass` object used by this card. */
export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    device_class?: string;
    icon?: string;
  };
  last_changed?: string;
  last_updated?: string;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  name?: string | null;
  device_id?: string | null;
  area_id?: string | null;
  platform?: string;
  translation_key?: string | null;
  entity_category?: string | null;
  hidden?: boolean;
}

export interface HassDevice {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
  area_id?: string | null;
  model?: string | null;
  manufacturer?: string | null;
}

export interface HomeAssistant {
  states: Record<string, HassEntityState>;
  entities: Record<string, HassEntityRegistryEntry>;
  devices: Record<string, HassDevice>;
  language: string;
  user?: { name?: string; is_admin?: boolean; is_owner?: boolean };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean,
  ): Promise<unknown>;
  callWS<T = unknown>(message: Record<string, unknown>): Promise<T>;
}

/** NPM host types, as created by the NPM Switches integration. */
export type HostType = "proxy" | "redirect" | "stream" | "dead";

/**
 * Switch state of a host in NPM. `orphaned`: the entity is still in the entity registry, but NPM Switches no longer
 * provides it (the host was deleted in NPM); Home Assistant marks its restored state with `restored: true`.
 */
export type HostState = "enabled" | "disabled" | "unavailable" | "orphaned";

/** Header counter / list filter. */
export type HostFilter = "all" | "enabled" | "disabled" | "orphaned";

export type SortMode = "name" | "enabled_first" | "disabled_first" | "config";

export type TapAction = "more-info" | "open" | "none";

/** One host as written in the card YAML (`entities`). */
export interface HostConfig {
  entity: string;
  /** Name shown instead of the domain. */
  name?: string;
  /** `mdi:` icon instead of the icon of the host type. */
  icon?: string;
  /** URL opened by `tap_action: open`. Default `https://<first domain>`. */
  url?: string;
}

export interface CardConfig {
  type: string;
  title?: string;
  /** Switches to show, in this order. Empty = every switch of NPM Switches. */
  entities?: (HostConfig | string)[];
  /** Switches to leave out of the automatic discovery. */
  exclude_entities?: string[];
  /** NPM instances (device ids) to show. Empty = all. */
  devices?: string[];
  /** Host types to show. Default: all. */
  host_types?: HostType[];

  show_header?: boolean;
  show_title?: boolean;
  show_total?: boolean;
  show_enabled?: boolean;
  show_disabled?: boolean;
  /** Counters in the header filter the list when tapped. */
  header_filter?: boolean;
  show_search?: boolean;

  show_icon?: boolean;
  show_type?: boolean;
  show_status?: boolean;
  show_all_domains?: boolean;
  show_instance?: boolean;
  show_certificate?: boolean;
  show_toggle?: boolean;
  /** Headings per host type when more than one type is shown. */
  group_by_type?: boolean;

  /** Domain suffixes removed from the shown name, e.g. `example.com`. */
  hide_domain_suffix?: string[];
  sort?: SortMode;
  /** Filter that is active when the card loads. */
  filter?: HostFilter;
  tap_action?: TapAction;
  /** Ask before a host is disabled. */
  confirm_disable?: boolean;
  /** List entities of hosts that no longer exist in NPM. Default true. */
  show_orphaned?: boolean;
  /** Offer administrators to delete those entities. Default true. */
  allow_delete?: boolean;
  /** Days before expiry from which a certificate is shown as warning. */
  cert_warning_days?: number;
  colors?: Partial<Record<HostState, string>>;
}

export interface Certificate {
  entityId: string;
  domains: string[];
  expires?: Date;
}

/** A host after discovery. */
export interface NpmHost {
  entityId: string;
  type: HostType;
  /** Domain names (proxy / redirect / 404) or `Port <n>` (stream). */
  domains: string[];
  /** Shown name. */
  name: string;
  /** Forwarding target of a stream, `host:port`. */
  forward?: string;
  deviceId?: string;
  instance?: string;
  icon?: string;
  url?: string;
  /** Position in the configuration / discovery order. */
  order: number;
}

export interface HostView {
  host: NpmHost;
  state: HostState;
  certificate?: { entityId: string; days?: number };
}

export interface HostCounts {
  total: number;
  enabled: number;
  disabled: number;
  unavailable: number;
  orphaned: number;
}
