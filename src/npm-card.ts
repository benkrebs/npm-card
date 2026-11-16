import { mdiClose, mdiDeleteOutline, mdiLockAlertOutline, mdiLockClock, mdiMagnify } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import {
  buildViews,
  countViews,
  filterViews,
  groupViews,
  resolveCertificates,
  resolveHosts,
  sortViews,
} from "./discovery";
import { configForm } from "./editor";
import { localize, type TranslationKey } from "./localize";
import { cardStyles } from "./styles";
import { CERT_COLORS, DEFAULT_STATE_COLORS, resolveColor, TYPE_ICONS } from "./theme";
import type { CardConfig, HomeAssistant, HostCounts, HostFilter, HostState, HostView, NpmHost } from "./types";

declare const __VERSION__: string | undefined;
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "dev";
const CARD_TAG = "npm-card";
/** How long a toggle waits for the switch to report its new state before it gives up. */
const PENDING_TIMEOUT_MS = 15_000;
const DEFAULT_CERT_WARNING_DAYS = 30;

export class NpmCard extends LitElement {
  static override styles = cardStyles;
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
    _filter: { state: true },
    _search: { state: true },
    _pending: { state: true },
    _confirm: { state: true },
    _deleting: { state: true },
  };

  hass?: HomeAssistant;
  private _config?: CardConfig;
  private _filter: HostFilter = "all";
  private _search = "";
  /** Entity id → state the switch was asked to take. */
  private _pending: Record<string, "on" | "off"> = {};
  /** Action waiting for confirmation: `disable:<entity>`, `delete:<entity>` or `delete-all`. */
  private _confirm?: string;
  private _deleting = false;

  private _hosts: NpmHost[] = [];
  private _certIds: string[] = [];
  private _watched: string[] = [];
  private _resolvedFrom?: { entities: unknown; devices: unknown; config: CardConfig };
  private _timers: Record<string, number> = {};

  static getConfigForm() {
    return configForm();
  }

  static getStubConfig(): Partial<CardConfig> {
    return {};
  }

  setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    for (const key of ["entities", "exclude_entities", "devices", "host_types", "hide_domain_suffix"] as const) {
      if (config[key] !== undefined && !Array.isArray(config[key])) throw new Error(`\`${key}\` must be a list`);
    }
    if (this._config?.filter !== config.filter) this._filter = config.filter ?? "all";
    this._config = config;
  }

  getCardSize(): number {
    return 1 + Math.ceil(Math.max(this._hosts.length, 1) * 0.8);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const timer of Object.values(this._timers)) clearTimeout(timer);
    this._timers = {};
    this._pending = {};
  }

  private _t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return localize(this.hass?.language, key, vars);
  }

  /** Re-run discovery only when the registries or the configuration changed. */
  private _resolve(): void {
    const hass = this.hass;
    const config = this._config;
    if (!hass || !config) return;
    const from = this._resolvedFrom;
    if (from && from.entities === hass.entities && from.devices === hass.devices && from.config === config) return;
    this._resolvedFrom = { entities: hass.entities, devices: hass.devices, config };
    this._hosts = resolveHosts(hass, config);
    this._certIds = config.show_certificate === false ? [] : resolveCertificates(hass).map((c) => c.entityId);
    this._watched = [...this._hosts.map((h) => h.entityId), ...this._certIds];
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    if (changed.size > 1 || !changed.has("hass")) return true;
    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    const hass = this.hass;
    if (!oldHass || !hass) return true;
    if (oldHass.entities !== hass.entities || oldHass.devices !== hass.devices || oldHass.language !== hass.language) {
      return true;
    }
    return this._watched.some((id) => oldHass.states[id] !== hass.states[id]);
  }

  protected override willUpdate(): void {
    this._resolve();
    this._settlePending();
  }

  /** Drop pending toggles once the switch reports the requested state. */
  private _settlePending(): void {
    const hass = this.hass;
    if (!hass) return;
    const settled = Object.entries(this._pending).filter(([id, target]) => hass.states[id]?.state === target);
    if (!settled.length) return;
    const next = { ...this._pending };
    for (const [id] of settled) {
      delete next[id];
      clearTimeout(this._timers[id]);
      delete this._timers[id];
    }
    this._pending = next;
  }

  private _setPending(entityId: string, target?: "on" | "off"): void {
    const next = { ...this._pending };
    clearTimeout(this._timers[entityId]);
    delete this._timers[entityId];
    if (target) {
      next[entityId] = target;
      this._timers[entityId] = window.setTimeout(() => this._setPending(entityId), PENDING_TIMEOUT_MS);
    } else {
      delete next[entityId];
    }
    this._pending = next;
  }

  private _fire(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _tap(host: NpmHost): void {
    const action = this._config?.tap_action ?? "more-info";
    if (action === "open" && host.url) window.open(host.url, "_blank", "noopener");
    else if (action === "more-info") this._fire("hass-more-info", { entityId: host.entityId });
  }

  private _onToggle(view: HostView): void {
    const enable = this._effectiveState(view) !== "enabled";
    if (!enable && this._config?.confirm_disable) {
      this._confirm = `disable:${view.host.entityId}`;
      return;
    }
    void this._switch(view.host, enable);
  }

  private async _switch(host: NpmHost, enable: boolean): Promise<void> {
    this._confirm = undefined;
    if (!this.hass) return;
    this._setPending(host.entityId, enable ? "on" : "off");
    try {
      await this.hass.callService("switch", enable ? "turn_on" : "turn_off", {}, { entity_id: host.entityId }, false);
    } catch {
      this._setPending(host.entityId);
      this._fire("hass-notification", { message: this._t("toggle_failed", { name: host.name }) });
    }
  }

  /** Administrators may remove orphaned entities from the entity registry. */
  private _canDelete(): boolean {
    return this._config?.allow_delete !== false && !!this.hass?.user?.is_admin;
  }

  /** Remove entities that NPM Switches no longer provides from the entity registry. */
  private async _delete(hosts: NpmHost[]): Promise<void> {
    this._confirm = undefined;
    const hass = this.hass;
    if (!hass || !hosts.length || !this._canDelete()) return;
    this._deleting = true;
    const results = await Promise.allSettled(
      hosts.map((h) => hass.callWS({ type: "config/entity_registry/remove", entity_id: h.entityId })),
    );
    this._deleting = false;
    const failed = hosts.filter((_, i) => results[i].status === "rejected");
    const done = hosts.length - failed.length;
    const message = failed.length
      ? this._t("delete_failed", { names: failed.map((h) => h.name).join(", ") })
      : done === 1
        ? this._t("deleted_one")
        : this._t("deleted", { count: done });
    this._fire("hass-notification", { message });
    if (!failed.length && this._filter === "orphaned") this._filter = "all";
  }

  /** State shown on the switch: the requested one while a toggle is in flight. */
  private _effectiveState(view: HostView): HostState {
    const pending = this._pending[view.host.entityId];
    if (!pending || view.state === "unavailable" || view.state === "orphaned") return view.state;
    return pending === "on" ? "enabled" : "disabled";
  }

  private _icon(custom: string | undefined, path: string): TemplateResult {
    if (custom?.includes(":")) return html`<ha-icon .icon=${custom}></ha-icon>`;
    return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${custom || path}></path></svg>`;
  }

  private _setFilter(filter: HostFilter): void {
    this._filter = this._filter === filter ? "all" : filter;
  }

  private _renderCount(filter: HostFilter, count: number, label: string, color: string): TemplateResult {
    const interactive = this._config?.header_filter !== false;
    const active = interactive && this._filter === filter && filter !== "all";
    const content = html`<span class="dot"></span><strong>${count}</strong><span>${label}</span>`;
    return interactive
      ? html`<button
          class="count ${active ? "active" : ""}"
          style="--count-color: ${color}"
          aria-pressed=${active ? "true" : "false"}
          title=${this._t("filter_hint")}
          @click=${() => this._setFilter(filter)}
        >
          ${content}
        </button>`
      : html`<span class="count" style="--count-color: ${color}">${content}</span>`;
  }

  private _renderHeader(counts: HostCounts, colors: Record<HostState, string>): TemplateResult | typeof nothing {
    const config = this._config!;
    if (config.show_header === false) return nothing;
    const showTitle = config.show_title !== false;
    const chips = [
      config.show_total !== false
        ? this._renderCount("all", counts.total, this._t("count_total"), "var(--primary-color)")
        : nothing,
      config.show_enabled !== false
        ? this._renderCount("enabled", counts.enabled, this._t("count_enabled"), colors.enabled)
        : nothing,
      config.show_disabled !== false
        ? this._renderCount("disabled", counts.disabled, this._t("count_disabled"), colors.disabled)
        : nothing,
      counts.unavailable
        ? html`<span class="count" style="--count-color: ${colors.unavailable}">
            <span class="dot"></span><strong>${counts.unavailable}</strong><span>${this._t("count_unavailable")}</span>
          </span>`
        : nothing,
      counts.orphaned && config.show_orphaned !== false
        ? this._renderCount("orphaned", counts.orphaned, this._t("count_orphaned"), colors.orphaned)
        : nothing,
    ];
    const hasChips = chips.some((c) => c !== nothing);
    if (!showTitle && !hasChips) return nothing;
    return html`
      <div class="header">
        ${showTitle ? html`<div class="title">${config.title ?? this._t("title")}</div>` : nothing}
        ${hasChips ? html`<div class="counts">${chips}</div>` : nothing}
      </div>
    `;
  }

  /** Hint with "Delete all" when hosts were deleted in NPM but their entities are still around. */
  private _renderOrphanBanner(orphans: NpmHost[]): TemplateResult | typeof nothing {
    if (!orphans.length || !this._canDelete()) return nothing;
    const count = orphans.length;
    const confirming = this._confirm === "delete-all";
    return html`
      <div class="orphans" title=${this._t("orphaned_tooltip")}>
        <span>
          ${confirming
            ? count === 1
              ? this._t("confirm_delete_one")
              : this._t("confirm_delete_all", { count })
            : count === 1
              ? this._t("orphaned_hint_one")
              : this._t("orphaned_hint", { count })}
        </span>
        ${confirming
          ? html`<button class="yes" ?disabled=${this._deleting} @click=${() => this._delete(orphans)}>${this._t("yes")}</button>
              <button class="no" @click=${() => (this._confirm = undefined)}>${this._t("no")}</button>`
          : html`<button class="delete-all" ?disabled=${this._deleting} @click=${() => (this._confirm = "delete-all")}>
              ${this._icon(undefined, mdiDeleteOutline)}<span>${count === 1 ? this._t("delete") : this._t("delete_all")}</span>
            </button>`}
      </div>
    `;
  }

  private _renderSearch(): TemplateResult | typeof nothing {
    if (!this._config?.show_search) return nothing;
    return html`
      <label class="search">
        ${this._icon(undefined, mdiMagnify)}
        <input
          type="search"
          .value=${this._search}
          placeholder=${this._t("search")}
          aria-label=${this._t("search")}
          @input=${(e: Event) => (this._search = (e.target as HTMLInputElement).value)}
        />
        ${this._search
          ? html`<button class="clear" aria-label="✕" @click=${() => (this._search = "")}>${this._icon(undefined, mdiClose)}</button>`
          : nothing}
      </label>
    `;
  }

  private _renderCertificate(view: HostView): TemplateResult | typeof nothing {
    const cert = view.certificate;
    if (!cert || this._config?.show_certificate === false || cert.days === undefined) return nothing;
    const warningDays = this._config?.cert_warning_days ?? DEFAULT_CERT_WARNING_DAYS;
    if (cert.days > warningDays) return nothing;
    const expired = cert.days < 0;
    const title = expired
      ? this._t("cert_expired")
      : cert.days === 0
        ? this._t("cert_expires_today")
        : this._t("cert_expires", { days: cert.days });
    const color = expired ? CERT_COLORS.expired : cert.days <= Math.min(7, warningDays) ? CERT_COLORS.warning : CERT_COLORS.ok;
    return html`<button
      class="cert"
      style="--cert-color: ${color}"
      title=${title}
      aria-label=${title}
      @click=${() => this._fire("hass-more-info", { entityId: cert.entityId })}
    >
      ${this._icon(undefined, expired ? mdiLockAlertOutline : mdiLockClock)}
      <span>${expired ? "!" : this._t("cert_days", { days: cert.days })}</span>
    </button>`;
  }

  private _renderSecondary(view: HostView, showType: boolean, multipleInstances: boolean): TemplateResult {
    const config = this._config!;
    const host = view.host;
    const state = this._effectiveState(view);
    const parts: (TemplateResult | string)[] = [];
    if (config.show_status !== false) parts.push(html`<span class="status">${this._t(`state_${state}`)}</span>`);
    if (showType) parts.push(this._t(`type_${host.type}`));
    if (host.forward) parts.push(`→ ${host.forward}`);
    const primary = host.domains[0];
    const shownDomains = host.name === primary || primary.startsWith(`${host.name}.`) ? host.domains.slice(1) : host.domains;
    if (host.type !== "stream" && shownDomains.length) {
      parts.push(
        config.show_all_domains || shownDomains.length === 1
          ? shownDomains.join(", ")
          : this._t("more_domains", { count: shownDomains.length }),
      );
    }
    if (config.show_instance !== false && multipleInstances && host.instance) parts.push(host.instance);
    return html`${parts.map((p, i) => html`${i ? html`<span class="sep">·</span>` : nothing}${p}`)}`;
  }

  private _renderToggle(view: HostView): TemplateResult | typeof nothing {
    const host = view.host;
    const confirm = (question: TranslationKey, action: () => void) => html`<div class="confirm">
      <span>${this._t(question)}</span>
      <button class="yes" ?disabled=${this._deleting} @click=${action}>${this._t("yes")}</button>
      <button class="no" @click=${() => (this._confirm = undefined)}>${this._t("no")}</button>
    </div>`;
    if (this._confirm === `disable:${host.entityId}`) return confirm("confirm_disable", () => this._switch(host, false));
    if (this._confirm === `delete:${host.entityId}`) return confirm("confirm_delete", () => this._delete([host]));
    if (view.state === "orphaned") {
      if (!this._canDelete()) return nothing;
      const label = this._t("delete_entity", { name: host.name });
      return html`<button
        class="delete"
        title=${label}
        aria-label=${label}
        ?disabled=${this._deleting}
        @click=${() => (this._confirm = `delete:${host.entityId}`)}
      >
        ${this._icon(undefined, mdiDeleteOutline)}
      </button>`;
    }
    if (this._config?.show_toggle === false) return nothing;
    const state = this._effectiveState(view);
    const on = state === "enabled";
    const pending = !!this._pending[host.entityId];
    return html`<button
      class="toggle ${on ? "on" : ""} ${pending ? "pending" : ""}"
      role="switch"
      aria-checked=${on ? "true" : "false"}
      aria-label=${this._t(on ? "toggle_disable" : "toggle_enable", { name: host.name })}
      title=${this._t(on ? "toggle_disable" : "toggle_enable", { name: host.name })}
      ?disabled=${state === "unavailable" || pending}
      @click=${() => this._onToggle(view)}
    >
      <span class="thumb"></span>
    </button>`;
  }

  private _renderRow(view: HostView, colors: Record<HostState, string>, showType: boolean, multipleInstances: boolean): TemplateResult {
    const config = this._config!;
    const host = view.host;
    const state = this._effectiveState(view);
    const tappable = (config.tap_action ?? "more-info") !== "none" && !(config.tap_action === "open" && !host.url);
    const title =
      host.domains.join("\n") +
      (host.forward ? `\n→ ${host.forward}` : "") +
      (view.state === "orphaned" ? `\n${this._t("orphaned_tooltip")}` : "");
    return html`
      <div class="row ${state}" style="--state-color: ${colors[state]}">
        ${config.show_icon !== false
          ? html`<button class="icon" title=${title} ?disabled=${!tappable} @click=${() => this._tap(host)}>
              ${this._icon(host.icon, TYPE_ICONS[host.type])}
            </button>`
          : nothing}
        <div class="info">
          ${config.link_names !== false && host.url && view.state !== "orphaned"
            ? html`<a class="name" href=${host.url} target="_blank" rel="noopener noreferrer" title=${host.url}>${host.name}</a>`
            : html`<button class="name" title=${title} ?disabled=${!tappable} @click=${() => this._tap(host)}>${host.name}</button>`}
          <button class="secondary" title=${title} ?disabled=${!tappable} @click=${() => this._tap(host)}>
            ${this._renderSecondary(view, showType, multipleInstances)}
          </button>
        </div>
        ${this._renderCertificate(view)} ${this._renderToggle(view)}
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const colors: Record<HostState, string> = {
      enabled: resolveColor(config.colors?.enabled, DEFAULT_STATE_COLORS.enabled),
      disabled: resolveColor(config.colors?.disabled, DEFAULT_STATE_COLORS.disabled),
      unavailable: resolveColor(config.colors?.unavailable, DEFAULT_STATE_COLORS.unavailable),
      orphaned: resolveColor(config.colors?.orphaned, DEFAULT_STATE_COLORS.orphaned),
    };
    const certs = this._certIds.length ? resolveCertificates(hass, this._certIds) : [];
    const allViews = buildViews(hass, this._hosts, certs);
    const counts = countViews(allViews);
    const orphans = allViews.filter((v) => v.state === "orphaned").map((v) => v.host);
    const views = config.show_orphaned === false ? allViews.filter((v) => v.state !== "orphaned") : allViews;
    const visible = sortViews(filterViews(views, this._filter, this._search), config);
    const groups = config.group_by_type !== false ? groupViews(visible) : [];
    const grouped = groups.length > 1;
    const multipleInstances = new Set(this._hosts.map((h) => h.deviceId)).size > 1;
    // The type is redundant under a group heading, or when the card only holds one type.
    const showType = config.show_type !== false && !grouped && new Set(this._hosts.map((h) => h.type)).size > 1;
    const header = this._renderHeader(counts, colors);
    const row = (v: HostView) => this._renderRow(v, colors, showType, multipleInstances);

    let list: TemplateResult;
    if (!views.length) {
      list = html`<div class="empty">${this._t("no_hosts")}</div>`;
    } else if (!visible.length) {
      list = html`<div class="empty">
        ${this._t("no_match")}
        <button class="link" @click=${() => ((this._filter = "all"), (this._search = ""))}>${this._t("show_all")}</button>
      </div>`;
    } else if (grouped) {
      list = html`${groups.map(
        (g) => html`<div class="group">
          <div class="group-title">${this._t(`group_${g.type}`)}<span>${g.views.length}</span></div>
          ${g.views.map(row)}
        </div>`,
      )}`;
    } else {
      list = html`${visible.map(row)}`;
    }

    return html`
      <ha-card class=${header === nothing ? "header-hidden" : ""}>
        ${header} ${this._renderOrphanBanner(orphans)} ${this._renderSearch()}
        <div class="list">${list}</div>
      </ha-card>
    `;
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, NpmCard);
  const w = window as unknown as { customCards?: unknown[] };
  w.customCards = w.customCards || [];
  w.customCards.push({
    type: CARD_TAG,
    name: "NPM Card",
    description: "All Nginx Proxy Manager hosts with a switch to enable or disable them (NPM Switches integration).",
    preview: true,
    documentationURL: "https://github.com/benkrebs/npm-card",
  });
  console.info(`%c NPM-CARD %c ${VERSION} `, "color:#fff;background:#f15833;font-weight:700", "color:#f15833");
}
