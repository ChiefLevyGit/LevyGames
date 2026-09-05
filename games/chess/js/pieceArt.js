// ציור הכלים בסגנון "ממלכת קסמים" - כל כלי כדמות אגדתית, מצויר כ-SVG.
// שתי ממלכות: "ממלכת הזהב" (בהיר) ו"ממלכת הליל" (כהה).

const PALETTE = {
  w: { body: '#fff3dc', trim: '#e0a83e', dark: '#a86f1e', skin: '#ffd9b3', accent: '#f4667a' },
  b: { body: '#4a3b78', trim: '#d9def2', dark: '#241a44', skin: '#e7c9a3', accent: '#7ee0c9' },
};

function face(cx, cy, p) {
  return `
    <circle cx="${cx - 6}" cy="${cy}" r="2.6" fill="#2b2033"/>
    <circle cx="${cx + 6}" cy="${cy}" r="2.6" fill="#2b2033"/>
    <circle cx="${cx - 6.8}" cy="${cy - 0.8}" r="0.8" fill="#fff"/>
    <circle cx="${cx + 5.2}" cy="${cy - 0.8}" r="0.8" fill="#fff"/>
    <path d="M ${cx - 5} ${cy + 6} Q ${cx} ${cy + 9} ${cx + 5} ${cy + 6}" stroke="#2b2033" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="${cx - 10}" cy="${cy + 4}" r="2.4" fill="${p.accent}" opacity="0.55"/>
    <circle cx="${cx + 10}" cy="${cy + 4}" r="2.4" fill="${p.accent}" opacity="0.55"/>
  `;
}

function robe(p, widthTop = 26, widthBottom = 17) {
  return `<path d="M ${50 - widthBottom} 94 L ${50 - widthTop} 58 Q 50 46 ${50 + widthTop} 58 L ${50 + widthBottom} 94 Z"
    fill="${p.body}" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function head(p, r = 15, cy = 42) {
  return `<circle cx="50" cy="${cy}" r="${r}" fill="${p.skin}" stroke="${p.dark}" stroke-width="2.2"/>`;
}

function pawn(p) {
  return `
    ${robe(p, 16, 14)}
    ${head(p, 12, 46)}
    ${face(50, 46, p)}
    <path d="M 40 34 Q 50 22 60 34 Q 50 30 40 34 Z" fill="${p.trim}" stroke="${p.dark}" stroke-width="1.5"/>
  `;
}

function rook(p) {
  return `
    <rect x="30" y="60" width="40" height="32" rx="4" fill="${p.body}" stroke="${p.dark}" stroke-width="2.5"/>
    <path d="M 32 60 L 32 40 L 40 40 L 40 48 L 46 48 L 46 40 L 54 40 L 54 48 L 60 48 L 60 40 L 68 40 L 68 60 Z"
      fill="${p.body}" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="50" cy="74" r="6" fill="${p.trim}" stroke="${p.dark}" stroke-width="1.5"/>
    <path d="M 44 70 L 56 70 M 44 78 L 56 78" stroke="${p.dark}" stroke-width="1.2" opacity="0.5"/>
    <path d="M 50 40 L 50 32" stroke="${p.dark}" stroke-width="2"/>
    <path d="M 50 30 Q 55 30 55 26 Q 50 27 50 30 Z" fill="${p.accent}"/>
  `;
}

function knight(p) {
  return `
    ${robe(p, 22, 16)}
    <path d="M 38 60
      C 33 50 33 38 39 30
      C 43 22 50 17 59 18
      C 67 19 72 25 70 31
      C 76 30 79 34 75 38
      C 79 41 76 46 71 44
      C 70 49 64 52 59 50
      L 60 60 Z"
      fill="${p.skin}" stroke="${p.dark}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M 40 32 L 33 20 L 45 26 Z" fill="${p.skin}" stroke="${p.dark}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 40 34 Q 46 28 54 30 Q 48 32 44 38" fill="${p.trim}" opacity="0.8"/>
    <circle cx="56" cy="29" r="2.4" fill="#2b2033"/>
    <ellipse cx="70" cy="35" rx="2.2" ry="1.6" fill="${p.dark}"/>
    <path d="M 46 20 Q 50 15 55 18" stroke="${p.trim}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  `;
}

function bishop(p) {
  return `
    ${robe(p, 24, 16)}
    ${head(p, 13, 44)}
    ${face(50, 44, p)}
    <path d="M 50 16 L 58 40 Q 50 34 42 40 Z" fill="${p.trim}" stroke="${p.dark}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="50" cy="13" r="3.4" fill="${p.accent}" stroke="${p.dark}" stroke-width="1.4"/>
    <path d="M 44 40 Q 50 44 56 40" stroke="${p.dark}" stroke-width="1.6" fill="none"/>
  `;
}

function queen(p) {
  return `
    ${robe(p, 27, 19)}
    ${head(p, 14, 44)}
    ${face(50, 44, p)}
    <path d="M 36 32 L 40 20 L 46 30 L 50 18 L 54 30 L 60 20 L 64 32 Q 50 26 36 32 Z"
      fill="${p.trim}" stroke="${p.dark}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="40" cy="20" r="2" fill="${p.accent}"/>
    <circle cx="50" cy="18" r="2.4" fill="${p.accent}"/>
    <circle cx="60" cy="20" r="2" fill="${p.accent}"/>
  `;
}

function king(p) {
  return `
    ${robe(p, 28, 20)}
    ${head(p, 14, 46)}
    ${face(50, 46, p)}
    <path d="M 35 33 L 65 33 L 62 22 L 55 28 L 50 16 L 45 28 L 38 22 Z"
      fill="${p.trim}" stroke="${p.dark}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 50 10 L 50 18 M 46 14 L 54 14" stroke="${p.accent}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="35" cy="33" r="2" fill="${p.accent}"/>
    <circle cx="65" cy="33" r="2" fill="${p.accent}"/>
  `;
}

const BUILDERS = { p: pawn, r: rook, n: knight, b: bishop, q: queen, k: king };

export function pieceSVG(type, color) {
  const p = PALETTE[color];
  const inner = BUILDERS[type](p);
  return `<svg viewBox="0 0 100 100" class="piece-svg" aria-hidden="true">${inner}</svg>`;
}

export const PIECE_NAMES_HE = {
  p: 'שוליה', n: 'אביר', b: 'קוסם/ת', r: 'מגדל קסום', q: 'מלכה', k: 'מלך',
};
