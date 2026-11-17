/**
 * Turns a Site into one self-contained HTML file: no scripts, no outside fonts or trackers,
 * every bit of your text escaped. Pure function, so it is easy to test.
 */
import type { Site } from './types';

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Only web and mail links; anything else (javascript:, data:, files) is dropped. */
export function safeUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/^mailto:[^\s<>"]+@[^\s<>"]+$/i.test(u)) return u;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u;
  try {
    const p = new URL(withScheme);
    if (p.protocol !== 'https:' && p.protocol !== 'http:') return null;
    if (!p.hostname.includes('.')) return null;
    return p.href;
  } catch {
    return null;
  }
}

/** Text with blank lines becomes paragraphs; single line breaks stay. */
export function paras(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/** Black or white, whichever reads better on this background colour. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#0b0b10' : '#ffffff';
}

const THEMES: Record<Site['template'], (a: string, ink: string) => string> = {
  neon: (a, ink) => `
:root{--a:${a};--ink:#ece8f5;--mute:#a9a2be;--bg:#0c0a13;--card:#15111f;--line:#2a2338}
body{background:var(--bg);color:var(--ink);font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
body::before{content:"";position:fixed;inset:0;background:radial-gradient(60% 40% at 80% 0%,color-mix(in srgb,var(--a) 22%,transparent),transparent 70%),repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.015) 3px 4px);pointer-events:none;z-index:-1}
header{padding:96px 0 56px}
h1{font:800 clamp(40px,8vw,76px)/1.02 ui-monospace,"Cascadia Mono","Courier New",monospace;letter-spacing:-.02em;margin:0;text-shadow:0 0 18px color-mix(in srgb,var(--a) 70%,transparent)}
.tag{color:var(--mute);font-size:20px;margin:18px 0 0;max-width:40ch}
h2{font:700 15px/1.3 ui-monospace,"Courier New",monospace;text-transform:uppercase;letter-spacing:.12em;color:var(--a);margin:0 0 10px}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px 28px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px}
.links a{background:var(--a);color:${ink};border-radius:999px;padding:10px 18px;box-shadow:0 0 18px color-mix(in srgb,var(--a) 45%,transparent)}
footer{border-top:1px solid var(--line);color:var(--mute)}`,
  licht: (a, ink) => `
:root{--a:${a};--ink:#14161c;--mute:#5b6070;--bg:#ffffff;--line:#e4e6ec}
body{background:var(--bg);color:var(--ink);font:18px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:110px 0 64px;border-bottom:1px solid var(--line)}
header .wrap::before{content:"";display:block;width:56px;height:6px;border-radius:3px;background:var(--a);margin-bottom:28px}
h1{font:700 clamp(38px,7vw,68px)/1.05 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:-.035em;margin:0;max-width:16ch}
.tag{color:var(--mute);font-size:21px;margin:20px 0 0;max-width:42ch}
h2{font:650 24px/1.25 system-ui,sans-serif;letter-spacing:-.015em;margin:0 0 10px}
section{padding:8px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:40px 56px}
.links a{background:var(--a);color:${ink};border-radius:10px;padding:11px 18px}
footer{border-top:1px solid var(--line);color:var(--mute)}`,
  krant: (a) => `
:root{--a:${a};--ink:#111111;--mute:#4a4a4a;--bg:#f3f3f1;--line:#111111}
body{background:var(--bg);color:var(--ink);font:18px/1.6 Georgia,"Times New Roman",serif}
header{padding:56px 0 28px;border-bottom:4px double var(--line);text-align:center}
.kick{font:700 13px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--a);margin:0 0 18px}
h1{font:900 clamp(44px,9vw,92px)/.95 Georgia,"Times New Roman",serif;letter-spacing:-.03em;margin:0}
.tag{font-style:italic;font-size:21px;margin:18px auto 0;max-width:46ch;color:var(--mute)}
h2{font:800 26px/1.15 Georgia,serif;margin:0 0 8px;border-top:2px solid var(--line);padding-top:12px}
.about{columns:2 300px;column-gap:40px;column-rule:1px solid #bbb}
.about p:first-child::first-letter{float:left;font:900 64px/.8 Georgia,serif;margin:6px 8px 0 0;color:var(--a)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:28px 36px}
.links a{border:2px solid var(--line);color:var(--ink);padding:9px 16px;font-family:system-ui,sans-serif;font-weight:700}
.links a:hover{background:var(--a);border-color:var(--a);color:#fff}
footer{border-top:4px double var(--line);color:var(--mute);text-align:center}`,
};

export function siteHtml(site: Site, lang: 'nl' | 'en' = 'nl'): string {
  const title = site.title.trim() || site.name.trim() || 'Website';
  const accent = /^#[0-9a-fA-F]{6}$/.test(site.accent) ? site.accent : '#FF4D6D';
  const links = site.links
    .map((l) => ({ label: l.label.trim(), url: safeUrl(l.url) }))
    .filter((l): l is { label: string; url: string } => !!l.url && !!l.label);
  const sections = site.sections.filter((x) => x.heading.trim() || x.text.trim());
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${site.tagline.trim() ? `<meta name="description" content="${esc(site.tagline.trim())}">\n` : ''}<meta name="generator" content="ALL websitebouwer">
<style>
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0}
.wrap{width:min(960px,calc(100% - 40px));margin:0 auto}
main{display:flex;flex-direction:column;gap:48px;padding:48px 0 72px}
p{margin:0 0 12px;max-width:68ch}p:last-child{margin-bottom:0}
a{color:inherit}
.links{display:flex;flex-wrap:wrap;gap:12px;list-style:none;margin:0;padding:0}
.links a{display:inline-block;text-decoration:none;font-weight:600;transition:transform .15s ease}
.links a:hover{transform:translateY(-1px)}.links a:focus-visible{outline:3px solid currentColor;outline-offset:3px}
footer{padding:24px 0 40px;font-size:15px}
@media (prefers-reduced-motion:reduce){.links a{transition:none}}
${THEMES[site.template](accent, inkOn(accent))}
</style>
</head>
<body>
<header><div class="wrap">
${site.template === 'krant' ? `<p class="kick">${esc(new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>\n` : ''}<h1>${esc(title)}</h1>
${site.tagline.trim() ? `<p class="tag">${esc(site.tagline.trim())}</p>` : ''}
</div></header>
<main class="wrap">
${site.about.trim() ? `<div class="about">${paras(site.about)}</div>` : ''}
${sections.length ? `<div class="grid">\n${sections.map((x) => `<section>${x.heading.trim() ? `<h2>${esc(x.heading.trim())}</h2>` : ''}${paras(x.text)}</section>`).join('\n')}\n</div>` : ''}
${links.length ? `<nav aria-label="Links"><ul class="links">${links.map((l) => `<li><a href="${esc(l.url)}" rel="noopener noreferrer">${esc(l.label)}</a></li>`).join('')}</ul></nav>` : ''}
</main>
<footer><div class="wrap">${esc(site.footer.trim() || `© ${year} ${title}`)}</div></footer>
</body>
</html>
`;
}

export function siteFileName(site: Site): string {
  const slug = (site.name || site.title || 'website').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${slug || 'website'}.html`;
}
