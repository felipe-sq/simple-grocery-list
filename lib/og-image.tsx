import { ImageResponse } from 'next/og';

/**
 * The 1200x630 share card, rendered at build time by `app/opengraph-image.tsx`.
 * There is deliberately no `app/twitter-image.tsx`: Next falls back to the
 * Open Graph image for `twitter:image`, so a second file would only build a
 * byte-identical PNG under a second URL.
 *
 * Two deliberate departures from the house style, both forced by Satori
 * (the renderer behind ImageResponse) rather than chosen:
 *
 * - Inline styles, not Tailwind. Satori resolves a small CSS subset itself and
 *   never sees the stylesheet, so utility classes would render as nothing. The
 *   hex values below are copied from the `:root` light tokens in `globals.css`.
 * - `display: flex` is set explicitly on every element with more than one
 *   child. Satori has no block layout and errors out without it.
 */

const BACKGROUND = '#f2f2f7';
const CARD = '#ffffff';
const FOREGROUND = '#000000';
const MUTED = '#8e8e93';
const BORDER = '#e5e5ea';
const PRIMARY = '#007aff';
const ACCENT = '#34c759';
const SEPARATOR = '#c6c6c8';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';
export const OG_ALT = 'Simple Grocery List — a fast, backend-free grocery list demo';

const SAMPLE_ITEMS: ReadonlyArray<{ name: string; checked: boolean }> = [
  { name: 'Olive oil', checked: true },
  { name: 'Sourdough', checked: false },
  { name: 'Coffee beans', checked: false },
];

function Check({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={CARD}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: 56,
          background: BACKGROUND,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '56px 64px',
            borderRadius: 28,
            border: `1px solid ${BORDER}`,
            background: CARD,
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 76,
                  height: 76,
                  marginRight: 24,
                  borderRadius: 20,
                  background: PRIMARY,
                }}
              >
                <Check size={42} />
              </div>
              <div style={{ fontSize: 62, fontWeight: 700, color: FOREGROUND, letterSpacing: -1.5 }}>
                Simple Grocery List
              </div>
            </div>
            <div style={{ marginTop: 22, fontSize: 31, color: MUTED }}>
              A fast, backend-free grocery list app.
            </div>
          </div>

          {/* A few rows of the actual list UI, so the card previews the product */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            {SAMPLE_ITEMS.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
                {item.checked ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 38,
                      height: 38,
                      marginRight: 22,
                      borderRadius: 19,
                      background: ACCENT,
                    }}
                  >
                    <Check size={22} />
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      width: 38,
                      height: 38,
                      marginRight: 22,
                      borderRadius: 19,
                      border: `3px solid ${SEPARATOR}`,
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: 34,
                    color: item.checked ? MUTED : FOREGROUND,
                    textDecoration: item.checked ? 'line-through' : 'none',
                  }}
                >
                  {item.name}
                </div>
              </div>
            ))}
          </div>

          {/* Same honesty as the in-app banner: this is a demo, and it says so */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 34,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ fontSize: 25, color: MUTED }}>
              Demo build — lists live in one browser tab
            </div>
            <div style={{ fontSize: 27, fontWeight: 600, color: PRIMARY }}>felipesq.dev</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
