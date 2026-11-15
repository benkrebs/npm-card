import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
  }
  ha-card {
    overflow: hidden;
  }
  svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    display: block;
  }
  ha-icon {
    --mdc-icon-size: 22px;
    display: flex;
  }
  button {
    font: inherit;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
  }
  button:disabled {
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Header */
  .header {
    padding: 16px 16px 8px;
  }
  .title {
    font-size: var(--ha-font-size-xl, 20px);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: 1.2;
    color: var(--primary-text-color);
  }
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .title + .counts {
    margin-top: 10px;
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px 0 10px;
    border-radius: 15px;
    border: 1px solid transparent;
    background: color-mix(in srgb, var(--count-color) 12%, transparent);
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 13px);
    white-space: nowrap;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .count strong {
    font-weight: var(--ha-font-weight-bold, 600);
    font-variant-numeric: tabular-nums;
  }
  .count span:last-child {
    color: var(--secondary-text-color);
  }
  .count .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--count-color);
  }
  button.count:hover {
    background: color-mix(in srgb, var(--count-color) 20%, transparent);
  }
  .count.active {
    border-color: var(--count-color);
    background: color-mix(in srgb, var(--count-color) 24%, transparent);
  }

  /* Search */
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 16px 8px;
    padding: 0 8px 0 12px;
    min-height: 40px;
    border-radius: 20px;
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    color: var(--secondary-text-color);
  }
  .search svg {
    width: 20px;
    height: 20px;
    flex: none;
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    font: inherit;
    font-size: var(--ha-font-size-m, 14px);
    color: var(--primary-text-color);
  }
  .search input::-webkit-search-cancel-button {
    display: none;
  }
  .search .clear {
    display: flex;
    padding: 4px;
    border-radius: 50%;
  }

  /* List */
  .list {
    padding: 0 8px 8px;
  }
  .header-hidden .list {
    padding-top: 8px;
  }
  .group + .group {
    margin-top: 6px;
  }
  .group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 8px 4px;
    font-size: var(--ha-font-size-xs, 11px);
    font-weight: var(--ha-font-weight-medium, 500);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .group-title span {
    opacity: 0.7;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    border-radius: 12px;
    transition: background-color 0.2s;
  }
  .row + .row {
    margin-top: 2px;
  }
  .row:hover {
    background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
  }
  .icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--state-color);
    background: color-mix(in srgb, var(--state-color) 16%, transparent);
    transition: color 0.2s, background-color 0.2s;
  }
  .icon svg {
    width: 22px;
    height: 22px;
  }
  .info {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  .info:disabled,
  .icon:disabled {
    cursor: default;
  }
  .name {
    font-size: var(--ha-font-size-m, 14px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--primary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: opacity 0.2s;
  }
  .row.disabled .name {
    opacity: 0.6;
  }
  .secondary {
    font-size: var(--ha-font-size-s, 12px);
    color: var(--secondary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .secondary .sep {
    margin: 0 5px;
    opacity: 0.6;
  }
  .secondary .status {
    color: var(--state-color);
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .row.disabled .secondary .status {
    color: var(--secondary-text-color);
  }

  /* Certificate */
  .cert {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px 2px 4px;
    border-radius: 10px;
    color: var(--cert-color);
    background: color-mix(in srgb, var(--cert-color) 12%, transparent);
    font-size: var(--ha-font-size-xs, 11px);
    font-weight: var(--ha-font-weight-medium, 500);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .cert svg {
    width: 16px;
    height: 16px;
  }

  /* Switch */
  .toggle {
    --track-width: 40px;
    --track-height: 22px;
    flex: none;
    position: relative;
    width: var(--track-width);
    height: var(--track-height);
    margin: 0 4px;
    border-radius: calc(var(--track-height) / 2);
    background: color-mix(in srgb, var(--secondary-text-color) 35%, transparent);
    transition: background-color 0.2s, opacity 0.2s;
  }
  .toggle .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: calc(var(--track-height) - 6px);
    height: calc(var(--track-height) - 6px);
    border-radius: 50%;
    background: var(--card-background-color, #fff);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
  }
  .toggle.on {
    background: var(--state-color);
  }
  .toggle.on .thumb {
    transform: translateX(calc(var(--track-width) - var(--track-height)));
    background: #fff;
  }
  .toggle:disabled {
    opacity: 0.4;
  }
  .toggle.pending {
    opacity: 0.6;
    animation: pulse 1s ease-in-out infinite;
  }

  /* Confirm */
  .confirm {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--ha-font-size-s, 12px);
    color: var(--secondary-text-color);
  }
  .confirm button {
    padding: 5px 10px;
    border-radius: 14px;
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .confirm .yes {
    background: var(--error-color, #db4437);
    color: var(--text-primary-color, #fff);
  }
  .confirm .no {
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    color: var(--primary-text-color);
  }

  .empty {
    padding: 12px 8px;
    color: var(--secondary-text-color);
  }
  .link {
    margin-left: 4px;
    color: var(--primary-color);
    font-weight: var(--ha-font-weight-medium, 500);
  }

  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toggle.pending {
      animation: none;
    }
  }
`;
