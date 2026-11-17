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

await step('later screens render', async () => {
  for (const p of ['/agents/', '/workflows/']) {
    await page.goto(BASE + p);
    await page.getByRole('heading', { name: 'Komt later' }).waitFor();
  }
});

await step('phone width: no horizontal overflow on any screen', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  const bad = [];
  for (const p of ['/', '/taken/', '/agenda/', '/notities/', '/geheugen/', '/logboek/', '/agents/', '/workflows/', '/instellingen/', '/zoeken/?q=a']) {
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

await step('no errors in the console', async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(' | '));
});

await browser.close();
server.kill();
for (const [s, n] of results) console.log(s.padEnd(4), n);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
