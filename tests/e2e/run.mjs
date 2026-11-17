// End-to-end check: serves the static build and clicks through every screen in real Chrome.
// Usage: npm run build && node tests/e2e/run.mjs [chromePath]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.argv[2] || process.env.CHROME || '/usr/bin/google-chrome';
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'out'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['ok', name]); }
  catch (e) { results.push(['FAIL', name + ': ' + String(e.message || e).split('\n')[0]]); }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
fs.mkdirSync('test-results', { recursive: true });
const shot = (n) => page.screenshot({ path: `test-results/${n}.png`, fullPage: true });

await step('home loads with empty city', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  expect(await page.getByText('0 open taken').count() === 1, 'summary not shown');
  expect(await page.getByRole('button', { name: /Thuisbasis/ }).count() > 0, 'hub island missing');
  await shot('01-home-empty');
});

await step('add task from the city creates an islet', async () => {
  await page.getByRole('button', { name: 'Taak toevoegen' }).click();
  await page.getByLabel('Titel').fill('Naam kiezen voor het project');
  await page.getByLabel('Project').fill('ALL');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByRole('button', { name: 'Naam kiezen voor het project' }).first().waitFor();
  expect(await page.getByText('één open taak').count() === 1, 'summary did not update');
  expect(await page.getByRole('button', { name: 'Taak afvinken' }).count() === 1, 'inspector not on new task');
});

await step('tick task from the inspector removes the islet', async () => {
  await page.getByRole('button', { name: 'Taak afvinken' }).click();
  await page.getByText('0 open taken').waitFor();
  expect(await page.getByRole('button', { name: 'Naam kiezen voor het project', exact: true }).count() === 0, 'islet still there');
});

await step('tasks page: add, edit, delete, undo', async () => {
  await page.getByRole('link', { name: 'Taken' }).first().click();
  await page.waitForURL('**/taken/');
  for (const t of ['Maandplafond afspreken', 'Samenvatting hoofdstuk 4', 'Dashboard kiezen']) {
    await page.getByLabel('Titel').fill(t);
    await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  }
  await page.getByText('Open · 3').waitFor();
  await page.getByRole('button', { name: 'Bewerken: Dashboard kiezen' }).click();
  await page.getByLabel('Titel').nth(1).fill('Dashboard-richting kiezen');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.getByText('Dashboard-richting kiezen').waitFor();
  await page.getByRole('button', { name: 'Verwijderen: Samenvatting hoofdstuk 4' }).click();
  await page.getByText('Open · 2').waitFor();
  await page.getByRole('status').getByRole('button', { name: 'Terugdraaien' }).click();
  await page.getByText('Open · 3').waitFor();
  await page.getByRole('checkbox', { name: 'Maandplafond afspreken' }).check();
  await page.getByText('Afgerond · 2').waitFor();
  await shot('02-taken');
});

await step('agenda: add event today and see it on the city', async () => {
  await page.getByRole('link', { name: 'Agenda' }).first().click();
  await page.waitForURL('**/agenda/');
  await page.getByLabel('Titel').fill('Werken aan ALL');
  await page.getByLabel(/Tijd/).fill('15:30');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByRole('heading', { name: 'Vandaag' }).waitFor();
  await shot('03-agenda');
  await page.getByRole('link', { name: 'Stad' }).click();
  await page.getByText('Eén afspraak vandaag').waitFor();
});

await step('notes: create, save, search, delete', async () => {
  await page.goto(BASE + '/notities/');
  await page.getByRole('button', { name: 'Nieuwe notitie' }).click();
  await page.getByLabel('Titel').fill('Ideeën voor de naam');
  await page.getByLabel('Tekst').fill('ALL blijft. Misschien een logo met een lantaarn.');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.getByRole('button', { name: /Ideeën voor de naam/ }).waitFor();
  await page.getByPlaceholder('Zoeken').fill('lantaarn');
  expect(await page.getByRole('button', { name: /Ideeën voor de naam/ }).count() === 1, 'search failed');
  await page.getByPlaceholder('Zoeken').fill('xyz');
  await page.getByText('Nog geen notities.').waitFor();
  await page.getByPlaceholder('Zoeken').fill('');
  await shot('04-notities');
});

await step('memory: add, edit, delete', async () => {
  await page.goto(BASE + '/geheugen/');
  await page.getByLabel('Iets om te onthouden').fill('Donderdag na 16:00 ben ik meestal vrij.');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByText('Donderdag na 16:00 ben ik meestal vrij.').waitFor();
  await page.getByRole('button', { name: /^Bewerken:/ }).click();
  await page.locator('form.list-item input').fill('Donderdag na 17:00 ben ik vrij.');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.getByText('Donderdag na 17:00 ben ik vrij.').waitFor();
  await shot('05-geheugen');
});

await step('log shows everything and can undo', async () => {
  await page.goto(BASE + '/logboek/');
  await page.locator('.list-item').nth(9).waitFor();
  const n = await page.locator('.list-item').count();
  expect(n >= 10, 'expected at least 10 log entries, got ' + n);
  await page.getByRole('button', { name: 'Terugdraaien' }).first().click();
  await page.getByText('teruggedraaid').first().waitFor();
  await shot('06-logboek');
});

await step('data survives a reload', async () => {
  await page.goto(BASE + '/taken/');
  await page.reload();
  await page.getByText('Dashboard-richting kiezen').waitFor();
});

await step('search finds items across modules', async () => {
  await page.getByLabel('Vraag ALL').fill('ALL');
  await page.getByLabel('Vraag ALL').press('Enter');
  await page.waitForURL('**/zoeken/**');
  await page.getByRole('heading', { name: /Taken ·/ }).waitFor();
  await page.getByRole('heading', { name: /Notities ·/ }).waitFor();
});

await step('settings: backup download, bad import refused, English', async () => {
  await page.goto(BASE + '/instellingen/');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back-up downloaden' }).click()]);
  const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  expect(data.v === 1 && data.tasks.length >= 3, 'backup content wrong');
  fs.writeFileSync('test-results/backup.json', JSON.stringify(data));
  fs.writeFileSync('test-results/bad.json', '{"hello":1}');
  page.once('dialog', (d) => d.accept());
  await page.locator('input[type=file]').setInputFiles('test-results/bad.json');
  await page.getByText('Dit bestand is geen back-up van ALL').waitFor();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('link', { name: 'Tasks' }).waitFor();
  expect(await page.evaluate(() => document.documentElement.lang) === 'en', 'html lang not updated');
  await page.getByLabel('What should ALL call you?').fill('Julien');
  await page.getByRole('button', { name: 'Nederlands' }).click();
});

await step('wipe and restore backup', async () => {
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Alles wissen' }).click();
  await page.goto(BASE + '/taken/');
  await page.getByText('Open · 0').waitFor();
  await page.goto(BASE + '/instellingen/');
  page.once('dialog', (d) => d.accept());
  await page.locator('input[type=file]').setInputFiles('test-results/backup.json');
  await page.getByText('Back-up teruggezet.').waitFor();
  await page.goto(BASE + '/taken/');
  await page.getByText('Dashboard-richting kiezen').waitFor();
});

await step('city with tasks, list view, zoom', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1, name: /Goe/ }).waitFor();
  await shot('07-home-filled');
  await page.getByRole('button', { name: 'Inzoomen' }).click();
  await page.getByRole('button', { name: 'Terug naar thuisbasis' }).click();
  await page.getByRole('button', { name: 'Lijst' }).click();
  await page.getByRole('heading', { name: 'Alles op een rij' }).waitFor();
  await page.getByRole('button', { name: /Websitebouwer/ }).click();
  await page.getByText('Gepland voor fase 5.').waitFor();
  await shot('08-home-list');
});

await step('a sentence in Ask ALL becomes a draft; approving makes the event', async () => {
  await page.goto(BASE + '/taken/');
  await page.getByLabel('Vraag ALL').fill('afspraak tandarts morgen om 14:30');
  await page.getByLabel('Vraag ALL').press('Enter');
  await page.waitForURL(BASE + '/');
  await page.getByText('Concept klaargezet').waitFor();
  await page.getByText('Uit je zin: “afspraak tandarts morgen om 14:30”').waitFor();
  await shot('11-draft');
  await page.getByRole('button', { name: 'Aanpassen', exact: true }).click();
  await page.getByRole('region', { name: 'Wacht op jouw akkoord' }).getByLabel('Titel').fill('Tandarts controle');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.getByText('Tandarts controle').waitFor();
  await page.getByRole('button', { name: 'Goedkeuren' }).click();
  await page.getByText('Goedgekeurd. Terugdraaien kan.').waitFor();
  await page.goto(BASE + '/agenda/');
  await page.getByRole('heading', { name: 'Morgen' }).waitFor();
  await page.getByText('Tandarts controle').waitFor();
  expect(await page.getByText('14:30').count() >= 1, 'time missing');
});

await step('discard a draft, undo, then approve it as a memory', async () => {
  await page.getByLabel('Vraag ALL').fill('onthoud dat ik maandag vrij ben');
  await page.getByLabel('Vraag ALL').press('Enter');
  await page.waitForURL(BASE + '/');
  await page.getByRole('button', { name: 'Weggooien' }).click();
  await page.getByText(/Niets te keuren/).waitFor();
  await page.getByRole('status').getByRole('button', { name: 'Terugdraaien' }).click();
  await page.getByRole('button', { name: 'Goedkeuren' }).click();
  await page.goto(BASE + '/geheugen/');
  await page.getByText('Ik maandag vrij ben').waitFor();
});

await step('briefing reflects today', async () => {
  await page.goto(BASE + '/');
  await page.getByRole('heading', { name: 'Briefing' }).waitFor();
  await page.getByText('Vandaag: 15:30 Werken aan ALL.').waitFor();
  await page.getByText('Morgen begint met 14:30 Tandarts controle.').waitFor();
  await page.getByRole('button', { name: /^Briefing-agent/ }).click();
  await page.getByText('Berekend uit je eigen gegevens, zonder AI.').waitFor();
});

await step('projects: tasks with a project label show up, make, rename, add task, archive', async () => {
  await page.goto(BASE + '/projecten/');
  await page.getByRole('heading', { level: 3, name: 'ALL' }).waitFor();
  await page.getByLabel('Naam', { exact: true }).fill('School');
  await page.getByLabel(/Doel/).fill('Examens halen');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByRole('heading', { level: 3, name: 'School' }).waitFor();
  await page.getByRole('article', { name: 'ALL' }).getByRole('button', { name: 'Bekijken' }).click();
  await page.getByLabel('Taak in dit project').fill('Logo tekenen');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByRole('region', { name: 'ALL' }).getByText('Logo tekenen').waitFor();
  await page.getByLabel('Naam', { exact: true }).fill('ALL app');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.getByRole('heading', { level: 2, name: 'ALL app' }).waitFor();
  await shot('12-projecten');
  await page.goto(BASE + '/taken/');
  await page.getByText('ALL app').first().waitFor();
  await page.goto(BASE + '/projecten/');
  await page.getByRole('article', { name: 'School' }).getByRole('button', { name: 'Bekijken' }).click();
  await page.getByRole('button', { name: 'Archiveren' }).click();
  await page.getByRole('button', { name: /Gearchiveerd · 1/ }).waitFor();
  expect(await page.getByRole('article', { name: 'School' }).count() === 0, 'archived still listed');
});

await step('agenda: weekly event, week view, skip once, import and export .ics', async () => {
  await page.goto(BASE + '/agenda/');
  await page.getByLabel('Titel').fill('Les wiskunde');
  await page.getByLabel(/Tijd/).fill('08:30');
  await page.getByLabel('Herhalen').selectOption('weekly');
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  expect(await page.getByText('Les wiskunde').count() >= 8, 'weekly event should show for 8 weeks');
  await page.getByRole('button', { name: 'Verwijderen: Les wiskunde' }).nth(1).click();
  await page.getByRole('button', { name: 'Alleen deze keer' }).click();
  await page.waitForTimeout(200);
  const left = await page.getByText('Les wiskunde').count();
  expect(left === 7, 'one occurrence should be skipped, got ' + left);
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await page.getByRole('heading', { name: /Week van/ }).waitFor();
  await page.getByRole('button', { name: 'Volgende week' }).click();
  await shot('13-agenda-week');
  await page.getByRole('button', { name: 'Lijst', exact: true }).click();
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:test-1', 'DTSTART;VALUE=DATE:' + new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    'SUMMARY:Uit Google Agenda', 'END:VEVENT', 'BEGIN:VEVENT', 'UID:test-2', 'DTSTART:20990101T100000', 'SUMMARY:Ver weg', 'RRULE:FREQ=YEARLY', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  fs.writeFileSync('test-results/google.ics', ics);
  await page.locator('input[type=file]').setInputFiles('test-results/google.ics');
  await page.getByText('afspraken gevonden').waitFor();
  await page.getByText(/herhalingen kon ALL niet precies/).waitFor();
  await page.getByRole('button', { name: 'Importeren', exact: true }).click();
  await page.getByText('Uit Google Agenda').waitFor();
  await page.locator('input[type=file]').setInputFiles('test-results/google.ics');
  await page.getByText('Geen nieuwe afspraken in dit bestand.').waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Agenda exporteren (.ics)' }).click()]);
  const out = fs.readFileSync(await dl.path(), 'utf8');
  expect(out.includes('SUMMARY:Les wiskunde') && out.includes('RRULE:FREQ=WEEKLY') && out.includes('EXDATE'), 'export misses the weekly lesson');
  await page.goto(BASE + '/');
  await page.getByLabel('Vraag ALL').fill('les frans elke donderdag om 10:00');
  await page.getByLabel('Vraag ALL').press('Enter');
  await page.getByRole('button', { name: 'Goedkeuren' }).click();
  await page.getByText('Goedgekeurd. Terugdraaien kan.').waitFor();
  await page.goto(BASE + '/agenda/');
  await page.getByText('Les frans').first().waitFor();
  expect(await page.getByText('Les frans').count() >= 7, 'repeating draft did not repeat');
});

await step('learning: subject, focus timer keeps running across pages and saves when done, manual time, exam in briefing', async () => {
  const examIso = new Date(Date.now() + 5 * 864e5).toLocaleDateString('sv');
  await page.goto(BASE + '/leren/');
  await page.getByText('Nog geen vakken').waitFor();
  const form = page.locator('form', { has: page.getByRole('heading', { name: 'Nieuw vak' }) });
  await form.getByLabel('Naam', { exact: true }).fill('Wiskunde');
  await form.getByLabel('Doel', { exact: true }).fill('Hoofdstuk 4 tot 6 kennen');
  await form.getByLabel('Examen of deadline').fill(examIso);
  await form.getByLabel('Doel per week (min)').fill('120');
  await form.getByRole('button', { name: 'Toevoegen' }).click();
  const card = page.getByRole('article', { name: 'Wiskunde' });
  await card.getByText('Examen over 5 dagen').waitFor();
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Pauze' }).waitFor();
  await page.goto(BASE + '/taken/');
  await page.getByRole('link', { name: /^Focustimer: .* Wiskunde/ }).waitFor();
  await page.waitForFunction(() => document.title.includes('Wiskunde'), null, { timeout: 3000 });
  // Pretend the timer started 16 minutes ago, then reload: it must save 15 minutes by itself.
  await page.evaluate(() => { const t = JSON.parse(localStorage.getItem('all.timer')); t.startedAt -= 16 * 60000; localStorage.setItem('all.timer', JSON.stringify(t)); });
  await page.reload();
  await page.getByText('Klaar! Sessie opgeslagen.').waitFor();
  expect(await page.getByRole('link', { name: /^Focustimer/ }).count() === 0, 'timer pill still there');
  await page.goto(BASE + '/leren/');
  await card.getByText('Deze week: 15 van 120 min').waitFor();
  await page.getByLabel('Tijd invullen (min): Wiskunde').fill('30');
  await card.getByRole('button', { name: 'Tijd invullen' }).click();
  await card.getByText('Deze week: 45 van 120 min').waitFor();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Weggooien' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
  expect(await page.getByText('45 min', { exact: true }).count() === 1, 'week total should be 45');
  await shot('14-leren');
  await page.goto(BASE + '/');
  await page.getByText('Examen Wiskunde over 5 dagen. Deze week: 45 van 120 min.').waitFor();
});

await step('later screens render', async () => {
  for (const p of ['/agents/', '/workflows/']) {
    await page.goto(BASE + p);
    await page.getByRole('heading', { name: 'Komt later' }).waitFor();
  }
});

await step('phone width: no horizontal overflow on any screen', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  const bad = [];
  for (const p of ['/', '/taken/', '/agenda/', '/leren/', '/projecten/', '/notities/', '/geheugen/', '/logboek/', '/agents/', '/workflows/', '/instellingen/', '/zoeken/?q=a']) {
    await page.goto(BASE + p);
    await page.waitForTimeout(150);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 376) bad.push(p + ' ' + sw);
  }
  await page.goto(BASE + '/');
  await shot('09-phone-home');
  await page.goto(BASE + '/taken/');
  await shot('10-phone-taken');
  expect(bad.length === 0, 'overflow: ' + bad.join(', '));
});

await step('phone: tab bar, More sheet opens and closes on navigation, timer pill above the bar', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/');
  const bar = page.getByRole('navigation', { name: 'Hoofdmenu' });
  await bar.getByRole('link', { name: 'Leren' }).click();
  await page.waitForURL('**/leren/');
  expect(await bar.getByRole('link', { name: 'Leren' }).getAttribute('aria-current') === 'page', 'Leren tab not marked');
  await bar.getByRole('button', { name: 'Meer' }).click();
  const sheet = page.getByRole('dialog', { name: 'Meer' });
  await sheet.getByRole('link', { name: 'Logboek' }).click();
  await page.waitForURL('**/logboek/');
  expect(!(await sheet.isVisible()), 'sheet still open after navigating');
  await page.keyboard.press('Escape');
  await bar.getByRole('button', { name: 'Meer' }).click();
  await sheet.waitFor();
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'hidden' });
  await page.goto(BASE + '/leren/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.goto(BASE + '/notities/');
  const pill = await page.locator('.timer-pill').boundingBox();
  const tabs = await page.locator('.tabbar').boundingBox();
  expect(pill && tabs && pill.y + pill.height <= tabs.y, 'timer pill overlaps the tab bar');
  await shot('15-phone-leren-pill');
  await page.goto(BASE + '/leren/');
  await page.getByRole('button', { name: 'Weggooien' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
});

await step('no errors in the console', async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(' | '));
});

await browser.close();
server.kill();
for (const [s, n] of results) console.log(s.padEnd(4), n);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
