// End-to-end check of login, two-step verification and sync between devices,
// against tests/e2e/mock_supabase.py. Needs a build made with the mock's URL:
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npx next build
//   node tests/e2e/cloud.mjs [outDir] [chromePath]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const OUT = process.argv[2] || 'out';
const CHROME = process.argv[3] || process.env.CHROME || '/usr/bin/google-chrome';
const APP = 'http://127.0.0.1:4174';
const SB = 'http://127.0.0.1:54321';
const web = spawn('python3', ['-m', 'http.server', '4174', '--bind', '127.0.0.1', '-d', OUT], { stdio: 'ignore' });
const mock = spawn('python3', ['tests/e2e/mock_supabase.py', '54321'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 1000));

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['ok', name]); }
  catch (e) { results.push(['FAIL', name + ': ' + String(e.message || e).split('\n')[0]]); }
};
const expect = (c, m) => { if (!c) throw new Error(m); };
const cloud = async () => (await fetch(SB + '/__state')).json();
const rowOf = async () => Object.values((await cloud()).rows)[0];
const waitFor = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return; await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('timed out');
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--no-proxy-server'] });
const errors = [];
async function device(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => localStorage.setItem('all.toured', '1')); // the welcome tour has its own test
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  if (seed) {
    // Data that was on this device before the cloud existed; set once, like a real earlier visit.
    await page.goto(APP + '/');
    await page.evaluate((s) => localStorage.setItem('all.v1', s), JSON.stringify(seed));
  }
  return page;
}
const seed = (title) => ({ v: 1, tasks: [{ id: 'seed-' + title, title, project: '', due: '', done: false, createdAt: '2026-11-17T08:00:00Z', doneAt: '' }], notes: [], events: [], memories: [], log: [], settings: { lang: 'nl', name: '' } });
async function login(page, email, pw) {
  await page.goto(APP + '/');
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord').fill(pw);
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
}
const EMAIL = 'julien@example.com';
const PW = 'heel-sterk-wachtwoord';

const A = await device(seed('Taak van voor de cloud'));

await step('login screen instead of the app', async () => {
  await A.goto(APP + '/');
  await A.getByRole('heading', { name: 'Welkom bij ALL' }).waitFor();
  expect(await A.getByRole('navigation').count() === 0, 'menu visible before login');
});

await step('short password is refused at sign-up', async () => {
  await A.getByRole('button', { name: /Account maken/ }).click();
  await A.getByLabel('E-mailadres').fill(EMAIL);
  await A.getByLabel('Wachtwoord').fill('kort');
  await A.getByRole('button', { name: 'Account maken', exact: true }).click();
  expect((await cloud()).users.length === 0, 'account was created');
});

await step('sign up uploads the tasks already on this device', async () => {
  await A.getByLabel('Wachtwoord').fill(PW);
  await A.getByRole('button', { name: 'Account maken', exact: true }).click();
  await A.getByRole('heading', { level: 1, name: /Goe/ }).waitFor();
  await waitFor(async () => (await rowOf())?.state.tasks.some((t) => t.title === 'Taak van voor de cloud'));
});

await step('a change on device A reaches the cloud', async () => {
  await A.goto(APP + '/taken/');
  await A.getByLabel('Titel').fill('Gemaakt op de computer');
  await A.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await waitFor(async () => (await rowOf()).state.tasks.some((t) => t.title === 'Gemaakt op de computer'));
});

const B = await device();
await step('wrong password on device B is refused', async () => {
  await login(B, EMAIL, 'fout-wachtwoord-123');
  await B.getByText('Inloggen lukt niet').waitFor();
});

await step('device B (empty) downloads everything', async () => {
  await B.getByLabel('Wachtwoord').fill(PW);
  await B.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await B.getByRole('heading', { level: 1, name: /Goe/ }).waitFor();
  await B.goto(APP + '/taken/');
  await B.getByText('Gemaakt op de computer').waitFor();
  await B.getByText('Taak van voor de cloud').waitFor();
});

await step('a change on B shows up on A after returning to the app', async () => {
  await B.getByLabel('Titel').fill('Gemaakt op de telefoon');
  await B.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await waitFor(async () => (await rowOf()).state.tasks.some((t) => t.title === 'Gemaakt op de telefoon'));
  await A.evaluate(() => window.dispatchEvent(new Event('focus')));
  await A.getByText('Gemaakt op de telefoon').waitFor();
});

const C = await device(seed('Andere taak op toestel C'));
await step('device C with different data asks which to keep, and keeps the cloud', async () => {
  await login(C, EMAIL, PW);
  await C.getByRole('heading', { name: 'Welke gegevens houd je?' }).waitFor();
  await C.getByRole('button', { name: 'Cloud gebruiken' }).click();
  await C.goto(APP + '/taken/');
  await C.getByText('Gemaakt op de telefoon').waitFor();
  expect(await C.getByText('Andere taak op toestel C').count() === 0, 'local data was kept');
});

await step('two-step verification can be turned on', async () => {
  await A.goto(APP + '/instellingen/');
  await A.getByText('Ingelogd als').waitFor();
  await A.getByRole('button', { name: 'Tweestapsverificatie aanzetten' }).click();
  await A.getByRole('img', { name: 'QR' }).waitFor();
  await A.getByLabel('Code').fill('000000');
  await A.getByRole('button', { name: 'Bevestigen' }).click();
  await A.getByText('Die code klopt niet').waitFor();
  await A.getByLabel('Code').fill('123 456');
  await A.getByRole('button', { name: 'Bevestigen' }).click();
  await A.getByText(/^Aan\./).waitFor();
});

await step('sign out clears this device', async () => {
  await A.getByRole('button', { name: 'Uitloggen' }).click();
  await A.getByRole('heading', { name: 'Welkom bij ALL' }).waitFor();
  expect(await A.evaluate(() => localStorage.getItem('all.v1')) === null, 'local copy not cleared');
});

await step('signing in now asks for the code, and data opens after it', async () => {
  await login(A, EMAIL, PW);
  await A.getByRole('heading', { name: 'Tweestapsverificatie' }).waitFor();
  await A.getByLabel('Code').fill('123456');
  await A.getByRole('button', { name: 'Bevestigen' }).click();
  await A.getByRole('heading', { level: 1, name: /Goe/ }).waitFor();
  await A.goto(APP + '/taken/');
  await A.getByText('Gemaakt op de telefoon').waitFor();
});

await step('forgot password sends a reset mail', async () => {
  const D = await device();
  await D.goto(APP + '/');
  await D.getByRole('button', { name: 'Wachtwoord vergeten?' }).click();
  await D.getByLabel('E-mailadres').fill(EMAIL);
  await D.getByRole('button', { name: 'Stuur herstelmail' }).click();
  await D.getByText('staat er nu een mail').waitFor();
});

await step('no errors in the page', async () => expect(errors.length === 0, errors.slice(0, 3).join(' | ')));

await browser.close();
web.kill();
mock.kill();
for (const [s, n] of results) console.log(s.padEnd(4), n);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
