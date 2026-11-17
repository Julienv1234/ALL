// Accessibility scan (axe-core, WCAG 2.1 AA + best practices) of every screen, filled with data,
// in several states, on desktop and phone. Usage: node tests/e2e/a11y.mjs <axe.min.js> [outDir]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const AXE = fs.readFileSync(process.argv[2], 'utf8');
const OUT = process.argv[3] || 'out';
const BASE = 'http://127.0.0.1:4181';
const web = spawn('python3', ['-m', 'http.server', '4181', '--bind', '127.0.0.1', '-d', OUT], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (n) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
const now = new Date().toISOString();
const task = (id, title, project, due, done = false) => ({ id, title, project, due, done, createdAt: now, doneAt: done ? now : '' });
const seed = {
  v: 1,
  tasks: [task('t1', 'Naam kiezen', 'ALL', day(-2)), task('t2', 'Budget bespreken', 'ALL', day(0)), task('t3', 'Hoofdstuk 4 samenvatten', 'School', day(3)),
    task('t4', 'Sporttas klaarzetten', '', ''), task('t5', 'Oud', 'ALL', '', true)],
  notes: [{ id: 'n1', title: 'Ideeën voor de naam', body: 'ALL blijft.', createdAt: now, updatedAt: now }],
  events: [{ id: 'e1', title: 'Les geschiedenis', date: day(0), time: '09:00', place: 'School', createdAt: now },
    { id: 'e2', title: 'Tandarts', date: day(1), time: '14:30', place: '', createdAt: now },
    { id: 'e3', title: 'Verjaardag oma', date: day(-3), time: '', place: '', createdAt: now }],
  memories: [{ id: 'm1', text: 'Donderdag na 16:00 ben ik vrij.', createdAt: now, updatedAt: now }],
  drafts: [{ id: 'd1', kind: 'event', title: 'Voetbal', date: day(2), time: '18:00', project: '', body: '', source: 'voetbal overmorgen 18u', createdAt: now }],
  subjects: [{ id: 's1', name: 'Wiskunde', goal: 'Hoofdstuk 4 tot 6', exam: day(4), weeklyMinutes: 120, archived: false, createdAt: now },
    { id: 's2', name: 'Frans', goal: '', exam: '', weeklyMinutes: 0, archived: false, createdAt: now },
    { id: 's3', name: 'Oud vak', goal: '', exam: '', weeklyMinutes: 0, archived: true, createdAt: now }],
  sessions: [{ id: 'x1', subjectId: 's1', date: day(0), minutes: 25, note: '', createdAt: now }, { id: 'x2', subjectId: 's2', date: day(-1), minutes: 40, note: '', createdAt: now }],
  log: [{ id: 'l1', at: now, text: 'Taak toegevoegd: “Naam kiezen”', collection: 'tasks', undo: { type: 'remove', collection: 'tasks', id: 't1' } }],
  settings: { lang: 'nl', name: 'Julien' },
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
const found = new Map();
async function scan(page, label) {
  await page.waitForTimeout(250);
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) }));
  });
  for (const v of res) {
    const k = v.id;
    if (!found.has(k)) found.set(k, { ...v, where: [] });
    found.get(k).where.push(label);
  }
}

for (const [vw, vh, tag] of [[1440, 1000, 'desktop'], [375, 800, 'phone']]) {
  for (const lang of ['nl', 'en']) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await page.evaluate((s) => localStorage.setItem('all.v1', s), JSON.stringify({ ...seed, settings: { ...seed.settings, lang } }));
    for (const p of ['/', '/taken/', '/agenda/', '/leren/', '/projecten/', '/notities/', '/geheugen/', '/logboek/', '/agents/', '/workflows/', '/instellingen/', '/zoeken/?q=a']) {
      await page.goto(BASE + p);
      await scan(page, `${tag}/${lang}${p}`);
    }
    // extra states
    await page.goto(BASE + '/');
    const listBtn = page.getByRole('button', { name: lang === 'nl' ? 'Lijst' : 'List', exact: true });
    if (await listBtn.isVisible()) { await listBtn.click(); await scan(page, `${tag}/${lang}/ list view`); }
    await page.getByRole('button', { name: lang === 'nl' ? 'Taak toevoegen' : 'Add task' }).click();
    await scan(page, `${tag}/${lang}/ task dialog`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: lang === 'nl' ? 'Aanpassen' : 'Edit', exact: true }).first().click();
    await scan(page, `${tag}/${lang}/ draft edit`);
    await page.goto(BASE + '/leren/');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, `${tag}/${lang}/leren timer running`);
    await page.goto(BASE + '/taken/');
    await scan(page, `${tag}/${lang}/ timer pill`);
    await page.goto(BASE + '/leren/');
    await page.getByRole('button', { name: lang === 'nl' ? 'Weggooien' : 'Discard' }).click();
    await page.getByRole('button', { name: lang === 'nl' ? 'Bewerken: Wiskunde' : 'Edit: Wiskunde' }).click();
    await scan(page, `${tag}/${lang}/leren edit subject`);
    if (tag === 'phone') {
      await page.getByRole('button', { name: lang === 'nl' ? 'Meer' : 'More' }).click();
      await scan(page, `${tag}/${lang}/ more sheet`);
      await page.keyboard.press('Escape');
    }
    await page.goto(BASE + '/notities/');
    await page.getByRole('button', { name: /Ideeën/ }).click();
    await scan(page, `${tag}/${lang}/notities editor`);
    await ctx.close();
  }
}
await browser.close();
web.kill();
if (!found.size) console.log('No accessibility violations.');
for (const v of found.values()) {
  console.log(`\n[${v.impact}] ${v.id}: ${v.help}\n  in ${v.where.length} views, e.g. ${v.where.slice(0, 3).join(', ')}`);
  v.nodes.forEach((n) => console.log('   - ' + n));
}
