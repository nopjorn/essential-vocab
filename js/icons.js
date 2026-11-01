'use strict';
// Drawn topic icons (1.130): one 24×24 line + soft-fill icon per topic (TOPICS in app.js), coloured by the topic hue
// (FEED_HUE in js/feed.js). Used where topics are shown as pictures: sticker book, level map, garden, album sets.
// topicIcon(id) falls back to the topic emoji. Classic script sharing globals with app.js (load order: index.html).

/* ---------- topic icons ---------- */
const TOPIC_SVG = {
  people: '<circle class="f" cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.8" cy="9.2" r="2.5"/><path d="M15.2 14.4a4.5 4.5 0 0 1 5.6 5.1"/>',
  anatomy: '<path class="f" d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/><path d="M7 12h2.5l1.5-2.5 2 5 1.5-2.5H17"/>',
  health: '<rect class="f" x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8v8M8 12h8"/>',
  food: '<path class="f" d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M14.5 3l-3 7.5M18.5 4l-4.5 6.5M9 20.5h6"/>',
  home: '<path class="f" d="M4 10.2 12 3.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
  clothes: '<path class="f" d="M8.5 4 3.5 6.8l1.8 3.7 2.7-1V20h8V9.5l2.7 1 1.8-3.7L15.5 4a3.5 3.5 0 0 1-7 0z"/>',
  animal: '<ellipse class="f" cx="12" cy="15.5" rx="4.2" ry="3.6"/><circle cx="6.3" cy="10.5" r="1.8"/><circle cx="9.6" cy="6.6" r="1.8"/><circle cx="14.4" cy="6.6" r="1.8"/><circle cx="17.7" cy="10.5" r="1.8"/>',
  plant: '<path class="f" d="M5 19C5 10.5 11 5 19.5 4.5 19.5 13 13.5 19 5 19z"/><path d="M5 19 14 10"/>',
  weather: '<circle cx="8.5" cy="8" r="3"/><path d="M8.5 2.5v1M3 8h1M4.6 4.1l.7.7"/><path class="f" d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7 1.2A2.9 2.9 0 0 0 8 19.5z"/>',
  places: '<path class="f" d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  transport: '<path class="f" d="M4 15.5v-3.2l2-4.6A2 2 0 0 1 7.8 6.5h8.4a2 2 0 0 1 1.8 1.2l2 4.6v3.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 12.3h16"/><circle cx="8" cy="16.8" r="1.9"/><circle cx="16" cy="16.8" r="1.9"/>',
  job: '<rect class="f" x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17M12 11.5v2"/>',
  money: '<circle class="f" cx="12" cy="12" r="8.5"/><path d="M14.6 9.2H11a1.8 1.8 0 0 0 0 3.6h2a1.8 1.8 0 0 1 0 3.6H9.4M12 7.3v1.9M12 16.4v1.9"/>',
  edu: '<path class="f" d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4c3 2.2 8 2.2 11 0v-4M21.5 9.5v5"/>',
  sci: '<path d="M9 3.5h6M10.2 3.5v6.2L4.8 18.3a1.5 1.5 0 0 0 1.3 2.2h11.8a1.5 1.5 0 0 0 1.3-2.2l-5.4-8.6V3.5"/><path class="f" d="M7 15h10l1.9 3.2a1.5 1.5 0 0 1-1.3 2.3H6.4a1.5 1.5 0 0 1-1.3-2.3z"/>',
  tech: '<rect class="f" x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18.5h18M10 8.5l-2 1.6 2 1.6M14 8.5l2 1.6-2 1.6"/>',
  comm: '<path class="f" d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v8a1.5 1.5 0 0 1-1.5 1.5h-9.5L6 20v-3.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M7 10h10M7 13h6"/>',
  arts: '<path class="f" d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2.1-1.1 1.6-2.3-.6-1.4.3-2.7 1.9-2.7H18a2.5 2.5 0 0 0 2.5-2.5A8.5 8.5 0 0 0 12 3.5z"/><circle cx="8" cy="11" r="1.1"/><circle cx="11.5" cy="7.6" r="1.1"/><circle cx="15.8" cy="9" r="1.1"/>',
  sport: '<circle class="f" cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-3.2 3.6-3.2 13.4 0 17M12 3.5c3.2 3.6 3.2 13.4 0 17"/>',
  gov: '<path class="f" d="M3 9.5 12 4l9 5.5z"/><path d="M5.5 11v7M9.8 11v7M14.2 11v7M18.5 11v7M3 20.5h18"/>',
  law: '<path d="M12 4v16M7.5 20.5h9M4.5 7h15M12 4l-1 1.5h2z"/><path class="f" d="M4.5 7 2 13a2.5 2.5 0 0 0 5 0zM19.5 7 17 13a2.5 2.5 0 0 0 5 0z"/>',
  social: '<circle class="f" cx="12" cy="12" r="8.5"/><path d="M4.2 9h15.6M4.2 15h15.6M12 3.5c-3 3.4-3 13.6 0 17M12 3.5c3 3.4 3 13.6 0 17"/>',
  clock: '<circle class="f" cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
  num: '<rect class="f" x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M10 7l-1.5 10M15.5 7 14 17M7 10h11M6.5 14h11"/>',
  qty: '<rect class="f" x="2.5" y="8" width="19" height="8" rx="1.6"/><path d="M6.5 8v3M10 8v4.2M13.5 8v3M17 8v4.2"/>',
  emo: '<circle class="f" cx="12" cy="12" r="8.5"/><path d="M8.3 14.2a4.3 4.3 0 0 0 7.4 0"/><circle cx="9" cy="9.8" r=".9"/><circle cx="15" cy="9.8" r=".9"/>',
  mind: '<path class="f" d="M9 16.8h6v-1.3c0-1.6 3.2-3.1 3.2-6.8a6.2 6.2 0 0 0-12.4 0c0 3.7 3.2 5.2 3.2 6.8z"/><path d="M10 20h4M12 12.5v-3l-1.5-1.2M12 9.5l1.5-1.2"/>',
  char: '<path class="f" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  move: '<circle cx="14.5" cy="4.8" r="1.9"/><path class="f" d="M13.2 8.2 10 12.5l3.2 2.3-1.4 5.7"/><path d="M13.2 8.2l3.3 3.1 3-.8M10 12.5l-4.3.9M13.2 14.8l4 1.4"/>',
  make: '<path class="f" d="M14.8 3.8a4.6 4.6 0 0 0-4.4 6L3.8 16.4l3.8 3.8 6.6-6.6a4.6 4.6 0 0 0 6-4.4l-2.8 2.8-2.9-.5-.5-2.9z"/>',
  act: '<path class="f" d="M13.5 3 5 13.5h6.2L10.3 21 19 10.5h-6.2z"/>',
  look: '<path class="f" d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  value: '<path class="f" d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9.5 4 12 20M14.5 4 12 20"/>',
  degree: '<path class="f" d="M3.5 17.5a8.5 8.5 0 0 1 17 0z"/><path d="M12 17.5l4.2-5.6M6.5 12.6l1 .8M12 9v1.3M17.5 12.6l-1 .8"/>',
  grammar: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
};
function topicIcon(id, cls = '') {
  const svg = TOPIC_SVG[id];
  if (!svg) return `<span class="tpi-emo ${cls}" aria-hidden="true">${(TOPICS.find((t) => t[0] === id) || [])[1] || ''}</span>`;
  const hue = typeof FEED_HUE !== 'undefined' && FEED_HUE[id] != null ? FEED_HUE[id] : 255;
  return `<svg class="tpi ${cls}" style="--hue:${hue}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${svg}</svg>`;
}
