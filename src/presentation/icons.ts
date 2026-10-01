const paths: Record<string, string> = {
  cell: '<path d="M19 5c-4-4-12-1-14 4s0 11 5 12 12-5 11-10-1-5-2-6Z"/><circle cx="12" cy="12" r="3"/>',
  habitat: '<path d="M3 18c4 0 3-12 9-12s5 12 9 12M3 21h18M5 13l-2-3m15 0 3-3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  jaw: '<path d="M4 5c0 12 4 15 8 15s8-3 8-15M4 5l4 6 4-6 4 6 4-6M8 17l4-5 4 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 16c0 2 1 3 3 3"/>',
  wave: '<path d="M2 7c4-6 5 6 10 0s6 6 10 0M2 12c4-6 5 6 10 0s6 6 10 0M2 17c4-6 5 6 10 0s6 6 10 0"/>',
  branch:
    '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4m-7 4v-4h14v4"/>',
  book: '<path d="M12 5C8 2 3 4 3 4v16s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v16"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  settings:
    '<path d="m12 3 3 3h4v4l2 2-2 2v4h-4l-3 3-3-3H5v-4l-2-2 2-2V6h4l3-3Z"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3h.01"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  heart: '<path d="M12 21S2 15 2 8c0-6 8-7 10-1 2-6 10-5 10 1 0 7-10 13-10 13Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
  feather: '<path d="M4 20 17 7m-6 7h7c5-6 3-11 3-11s-7-2-13 6v7L4 20Z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  battery:
    '<rect x="3" y="6" width="16" height="12" rx="3"/><path d="M21 10v4M7 10v4m4-4v4m4-4v4"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  sound: '<path d="m11 4-5 5H2v6h4l5 5V4Zm5 4a7 7 0 0 1 0 8m3-12a12 12 0 0 1 0 16"/>',
  terminal: '<path d="m4 6 6 6-6 6m9 0h7"/>',
};
export function icon(name: string, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.cell}</svg>`;
}
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
