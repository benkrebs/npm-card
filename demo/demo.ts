/** Standalone preview with a fake NPM Switches `hass` (used for development and README screenshots). */
import "../src/npm-card";
import { addOrphan, npmHass } from "../test/fixtures";
import type { CardConfig, HomeAssistant } from "../src/types";

customElements.define(
  "ha-card",
  class extends HTMLElement {
    connectedCallback() {
      this.style.display = "block";
    }
  },
);

interface DemoCard extends HTMLElement {
  hass: HomeAssistant;
  setConfig(config: CardConfig): void;
}

function mount(container: string, config: Partial<CardConfig> = {}, orphans = false) {
  let hass = npmHass();
  if (orphans) addOrphan(hass);
  const card = document.createElement("npm-card") as DemoCard;
  hass.callService = async (_domain, service, _data, target) => {
    const id = String(target?.entity_id);
    await new Promise((resolve) => setTimeout(resolve, 600));
    hass = { ...hass, states: { ...hass.states, [id]: { ...hass.states[id], state: service === "turn_on" ? "on" : "off" } } };
    card.hass = hass;
  };
  hass.callWS = async (message) => {
    const id = String(message.entity_id);
    const { [id]: _state, ...states } = hass.states;
    const { [id]: _entry, ...entities } = hass.entities;
    hass = { ...hass, states, entities };
    card.hass = hass;
    return undefined as never;
  };
  card.setConfig({ type: "custom:npm-card", ...config });
  card.hass = hass;
  document.querySelector(container)!.append(card);
}

mount("#light-a");
mount("#light-b", {
  title: "Proxy Hosts",
  host_types: ["proxy"],
  hide_domain_suffix: ["example.com"],
  show_search: true,
  sort: "disabled_first",
  confirm_disable: true,
}, true);
mount("#dark-a");
mount("#dark-b", {
  title: "Proxy Hosts",
  host_types: ["proxy"],
  hide_domain_suffix: ["example.com"],
  show_search: true,
  sort: "disabled_first",
  confirm_disable: true,
}, true);
