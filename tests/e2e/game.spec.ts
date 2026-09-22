import { test, expect, type Page } from '@playwright/test';
import { createGame } from '../../packages/engine/src/engine';
import { createCharacter } from '../../packages/engine/src/characters';
import { getCampaign } from '../../packages/content/src';
import { makeSave } from '../../packages/protocol/src/schema';

async function createHero(page: Page, name = 'Astrid') {
  await page.getByRole('button', { name: 'Börja ett nytt äventyr' }).click();
  await page.getByLabel(/Din hjältes namn/).fill(name);
  await page.getByRole('button', { name: /Dvärg Härdad/ }).click();
  await page.getByRole('button', { name: 'Börja äventyret', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vägen mot Gråskogen', exact: true }),
  ).toBeVisible();
}
async function choose(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: false }).click();
}
async function winCombat(page: Page) {
  for (let i = 0; i < 100; i++) {
    if (await page.getByRole('heading', { name: 'En seger att minnas.' }).isVisible()) {
      await page.getByRole('button', { name: 'Fortsätt äventyret', exact: true }).click();
      return;
    }
    await expect(page.getByRole('button', { name: 'Anfall', exact: true })).toBeVisible();
    const hp = await page.locator('.character-summary .bar-label strong').first().innerText();
    const [current, max] = hp.split('/').map(Number);
    if (current < max * 0.6) {
      const details = page.locator('details.tactics');
      if (!(await details.getAttribute('open'))) await details.locator('summary').click();
      const potion = page.getByRole('button', { name: /Läkebrygd \(/ });
      if (await potion.isEnabled()) {
        await potion.click();
        continue;
      }
    }
    const special = page.getByRole('button', { name: 'Kraftslag', exact: true });
    await (
      (await special.isEnabled())
        ? special
        : page.getByRole('button', { name: 'Anfall', exact: true })
    ).click();
  }
  throw new Error('Combat exceeded 100 player turns.');
}
test('full solo adventure, save reload, final consequences, desktop and mobile layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        return array;
      }
      return Reflect.apply(original, crypto, [array]) as T;
    };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ditt nästa äventyr väntar.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  await createHero(page);
  await choose(page, 'Gå in på värdshuset');
  await choose(page, 'Gå till fönstret');
  await choose(page, 'Smyg ut genom köket');
  await page.screenshot({ path: 'artifacts/combat-desktop.png', fullPage: true });
  await winCombat(page);
  await choose(page, 'Vila kort');
  await choose(page, 'Följ vägen mot tornet');
  await choose(page, 'Undersök den övergivna lägerplatsen');
  await choose(page, 'Fortsätt mot tornet');
  await page.getByRole('button', { name: 'Öppna sparningar', exact: true }).click();
  await page.getByRole('button', { name: 'Spara på plats 1', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sparat på plats 1');
  await page.getByRole('button', { name: 'Stäng', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Fortsätt med Astrid/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Det fallna vakttornet', exact: true }),
  ).toBeVisible();
  await choose(page, 'Använd repet');
  await choose(page, 'Gå ner i tornets inre');
  await choose(page, 'Tänd ljus');
  await winCombat(page);
  await choose(page, 'Lämna platsen tills vidare');
  await choose(page, 'Återvänd mot Skogsby');
  await choose(page, 'Möt jägaren');
  await choose(page, 'Berätta allt');
  await choose(page, 'Gå vidare in i Skogsby');
  await choose(page, 'Erbjud er att hjälpa');
  await choose(page, 'Sök upp den gamle');
  await choose(page, 'Berätta varför');
  await choose(page, 'Låt kvällen');
  await choose(page, 'Sitt kvar');
  await choose(page, 'Gå till vila');
  await expect(page.getByRole('button', { name: /Hämta Mira/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hämta Edric/ })).toBeVisible();
  await choose(page, 'Hämta Mira');
  await choose(page, 'Fortsättning följer');
  await expect(page.getByRole('heading', { name: 'Berättelsen lever vidare.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/game-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('save import validation, export and keyboard dialog dismissal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sparningar', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.locator('.error-inline')).toBeVisible();
  const game = createGame(
    getCampaign('skogsby'),
    [createCharacter({ name: 'Importerad', race: 'elf', class: 'mage', talent: 'keen' }, 'hero')],
    42,
    'import-test',
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(makeSave(game, 'Importerad'))),
  });
  await expect(
    page.getByRole('heading', { name: 'Kapitel 1 – Skogsby', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Öppna sparningar', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportera JSON' }).click();
  expect((await download).suggestedFilename()).toContain('drakvalvet-skogsby');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('two authenticated browsers cooperate, reject impersonation and reconnect to persisted state', async ({
  browser,
}) => {
  const host = await browser.newContext(),
    guest = await browser.newContext();
  const a = await host.newPage(),
    b = await guest.newPage();
  const errors: string[] = [];
  a.on('pageerror', (e) => errors.push(e.message));
  b.on('pageerror', (e) => errors.push(e.message));
  await a.goto('/');
  await a.getByRole('button', { name: 'Spela tillsammans', exact: true }).click();
  await a.getByRole('button', { name: 'Skapa rum', exact: true }).click();
  await expect(a.locator('.room-code')).toBeVisible();
  const code = await a.locator('.room-code').innerText();
  await b.goto('/');
  await b.getByRole('button', { name: 'Spela tillsammans', exact: true }).click();
  await b.getByLabel('Rumskod', { exact: true }).fill(code);
  await b.getByRole('button', { name: 'Gå med i sällskapet' }).click();
  for (const [page, name] of [
    [a, 'Arvid'],
    [b, 'Bryn'],
  ] as const) {
    await page.getByRole('button', { name: 'Skapa din rollperson' }).click();
    await page.getByLabel(/Din hjältes namn/).fill(name);
    await page.getByRole('button', { name: 'Gör mig redo' }).click();
  }
  await expect(a.getByRole('button', { name: 'Starta äventyret' })).toBeEnabled();
  await a.getByRole('button', { name: 'Starta äventyret' }).click();
  await expect(b.getByRole('heading', { name: 'Vägen mot Gråskogen', exact: true })).toBeVisible();
  await choose(b, 'Gå in på värdshuset');
  await expect(
    a.getByRole('heading', { name: 'Värdshuset Tre Lyktor', exact: true }),
  ).toBeVisible();
  await b.reload();
  await b.getByRole('button', { name: 'Spela tillsammans', exact: true }).click();
  await expect(b.getByRole('button', { name: new RegExp(code) })).toBeVisible();
  await b.getByRole('button', { name: new RegExp(code) }).click();
  await expect(
    b.getByRole('heading', { name: 'Värdshuset Tre Lyktor', exact: true }),
  ).toBeVisible();
  await choose(a, 'Dra vapnet');
  await expect(b.getByRole('region', { name: 'Strid' })).toBeVisible();
  const aAttack = a.getByRole('button', { name: 'Anfall', exact: true }),
    bAttack = b.getByRole('button', { name: 'Anfall', exact: true });
  await expect
    .poll(async () => Number(await aAttack.isEnabled()) + Number(await bAttack.isEnabled()))
    .toBe(1);
  const active = (await aAttack.isEnabled()) ? a : b;
  await active.getByRole('button', { name: 'Anfall', exact: true }).click();
  await expect
    .poll(async () => {
      const x = await a.locator('.combat-log').innerText(),
        y = await b.locator('.combat-log').innerText();
      return x === y;
    })
    .toBe(true);
  const outsider = await browser.newContext();
  const req = await outsider.request.post('http://localhost:3000/api/auth/guest', { data: {} });
  expect(req.ok()).toBe(true);
  expect((await outsider.request.get(`http://localhost:3000/api/rooms/${code}`)).ok()).toBe(false);
  expect(errors).toEqual([]);
  await outsider.close();
  await host.close();
  await guest.close();
});

test('account registration, cloud save ownership, login and cross-device restore', async ({
  browser,
}) => {
  const first = await browser.newContext(),
    second = await browser.newContext();
  const a = await first.newPage(),
    b = await second.newPage();
  const email = `test-${Date.now()}@drakvalvet.test`,
    password = 'Test-losenord-12345';
  await a.goto('/');
  await a.getByRole('button', { name: 'Äventyrare', exact: true }).click();
  await a.getByRole('button', { name: 'Ny här? Skapa ett konto' }).click();
  await a.getByLabel('E-postadress').fill(email);
  await a.getByLabel(/Lösenord/).fill(password);
  await a.getByRole('button', { name: 'Skapa konto', exact: true }).click();
  await expect(a.getByRole('dialog')).toHaveCount(0);
  await createHero(a, 'Kontohjälte');
  await choose(a, 'Gå in på värdshuset');
  await a.getByRole('button', { name: 'Öppna sparningar', exact: true }).click();
  await a.getByRole('button', { name: 'Spara på kontot', exact: true }).click();
  await expect(a.locator('.success-inline')).toContainText('Sparat på ditt konto');
  await b.goto('/');
  await b.getByRole('button', { name: 'Äventyrare', exact: true }).click();
  await b.getByLabel('E-postadress').fill(email);
  await b.getByLabel(/Lösenord/).fill(password);
  await b.getByRole('button', { name: 'Logga in', exact: true }).click();
  await expect(b.getByRole('dialog')).toHaveCount(0);
  await b.getByRole('button', { name: 'Sparningar', exact: true }).click();
  await b.getByRole('button', { name: 'Ladda från kontot' }).click();
  await expect(
    b.getByRole('heading', { name: 'Värdshuset Tre Lyktor', exact: true }),
  ).toBeVisible();
  await expect(b.locator('.character-name')).toContainText('Kontohjälte');
  await first.close();
  await second.close();
});
