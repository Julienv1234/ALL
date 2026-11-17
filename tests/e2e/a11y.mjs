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
  habits: [{ id: 'h1', name: 'Lezen', days: [], done: [day(-1), day(-2)], archived: false, createdAt: now },
    { id: 'h2', name: 'Gitaar', days: [5], done: [], archived: false, createdAt: now }],
  rules: [{ id: 'r1', name: 'Week plannen', when: { type: 'weekly', weekday: 6 }, kind: 'task', title: 'Mijn week plannen', project: '', dueIn: 0, direct: false, enabled: true, runs: [], createdAt: now },
    { id: 'r2', name: 'Uit', when: { type: 'daily' }, kind: 'note', title: 'x', project: '', dueIn: -1, direct: true, enabled: false, runs: [], createdAt: now }],
  sites: [{ id: 'w1', name: 'Mijn band', template: 'neon', accent: '#FF4D6D', title: 'De Neonkatten', tagline: 'Garagerock', about: 'Wij spelen luid.', sections: [{ heading: 'Optredens', text: 'Zaterdag.' }], links: [{ label: 'Luister', url: 'javascript:x' }], footer: '', createdAt: now, updatedAt: now }],
  agents: [{ id: 'a1', name: 'Ochtendbriefing', template: 'briefing', instructions: 'Maak een briefing.', can: { tasks: 'read', agenda: 'read', notes: 'none', memory: 'none', learn: 'read', habits: 'read' }, schedule: '23:59', enabled: true, lastRun: '', createdAt: now },
    { id: 'a2', name: 'Studiecoach', template: 'coach', instructions: '', can: { tasks: 'draft', agenda: 'none', notes: 'none', memory: 'none', learn: 'read', habits: 'none' }, schedule: '', enabled: false, lastRun: '', createdAt: now }],
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
    await ctx.addInitScript(() => localStorage.setItem('all.toured', '1'));
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await page.evaluate((s) => localStorage.setItem('all.v1', s), JSON.stringify({ ...seed, settings: { ...seed.settings, lang } }));
    for (const p of ['/', '/taken/', '/agenda/', '/leren/', '/projecten/', '/notities/', '/geheugen/', '/logboek/', '/gewoontes/', '/agents/', '/workflows/', '/websites/', '/instellingen/', '/zoeken/?q=a']) {
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
    await page.goto(BASE + '/gewoontes/');
    await page.getByRole('button', { name: lang === 'nl' ? 'Bewerken: Lezen' : 'Edit: Lezen' }).click();
    await scan(page, `${tag}/${lang}/gewoontes edit`);
    await page.goto(BASE + '/workflows/');
    await page.getByRole('button', { name: lang === 'nl' ? 'Bewerken: Week plannen' : 'Edit: Week plannen' }).click();
    await scan(page, `${tag}/${lang}/workflows edit`);
    await page.goto(BASE + '/websites/');
    await page.getByRole('button', { name: lang === 'nl' ? 'Openen: Mijn band' : 'Open: Mijn band' }).click();
    await page.getByRole('region', { name: 'Mijn band' }).waitFor();
    await scan(page, `${tag}/${lang}/websites editor`);
    await page.goto(BASE + '/agents/');
    await page.getByRole('button', { name: lang === 'nl' ? 'Bewerken: Ochtendbriefing' : 'Edit: Ochtendbriefing' }).click();
    await page.getByRole('button', { name: lang === 'nl' ? /Proefdraaien/ : /Try it/ }).first().click();
    await scan(page, `${tag}/${lang}/agents edit + try`);
    await page.locator('.agent-tpl').first().click();
    await scan(page, `${tag}/${lang}/agents new form`);
    await page.evaluate(() => window.dispatchEvent(new Event('all:tour')));
    await page.getByRole('dialog').first().waitFor();
    await scan(page, `${tag}/${lang}/ tour`);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.dispatchEvent(new Event('all:command')));
    await page.getByRole('combobox').fill('le');
    await scan(page, `${tag}/${lang}/ command window`);
    await page.keyboard.press('Escape');
    if (tag === 'desktop') {
      await page.keyboard.press('?');
      await scan(page, `${tag}/${lang}/ shortcuts`);
      await page.keyboard.press('Escape');
    }
    await ctx.close();
  }
}
// First visit on an empty device: the welcome invitation and the tour itself.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.getByRole('complementary').filter({ hasText: 'Welkom bij ALL' }).waitFor();
  await scan(page, 'phone/nl/ first visit invitation');
  await page.getByRole('button', { name: 'Rondleiding starten' }).click();
  await scan(page, 'phone/nl/ first visit tour');
  await ctx.close();
}
await browser.close();
web.kill();
if (!found.size) console.log('No accessibility violations.');
for (const v of found.values()) {
  console.log(`\n[${v.impact}] ${v.id}: ${v.help}\n  in ${v.where.length} views, e.g. ${v.where.slice(0, 3).join(', ')}`);
  v.nodes.forEach((n) => console.log('   - ' + n));
}
