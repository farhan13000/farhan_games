import { expect, test, type Page } from '@playwright/test';

const status = (page: Page) => page.getByTestId('status-message');
const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);

/** Reads the accessible label of every board cell, e.g. "Row 1, column 1: X". */
async function boardLabels(page: Page): Promise<string[]> {
  return page
    .locator('[data-cell]')
    .evaluateAll((cells) =>
      cells.map((c) => (c.getAttribute('aria-label') ?? '').replace(/, last move/, '')),
    );
}

async function move(player: Page, opponent: Page, index: number) {
  await expect(status(player)).toHaveText('Your turn');
  await cell(player, index).click();
  // The opponent receives the authoritative update in real time.
  await expect(cell(opponent, index)).toHaveAttribute('aria-label', /: [XO]/);
}

test('two friends play a full private-room match with rematch and reconnection', async ({
  browser,
}) => {
  const aliceCtx = await browser.newContext();
  const bobCtx = await browser.newContext();
  const alice = await aliceCtx.newPage();
  let bob = await bobCtx.newPage();

  // 1. Player A creates a room as a guest.
  await alice.goto('/create');
  await alice.getByLabel('Your display name').fill('Alice');
  await alice.getByRole('button', { name: 'Create private room' }).click();
  await expect(alice.getByRole('heading', { name: /invite your partner/i })).toBeVisible();
  const roomCode = (await alice.getByTestId('room-code').textContent())!.trim();
  expect(roomCode).toMatch(/^[A-Z2-9]{6}$/);

  // 2. Player B joins using the invite code.
  await bob.goto('/join');
  await bob.getByLabel('Room code or invite link').fill(roomCode);
  await bob.getByLabel('Your display name').fill('Bob');
  await bob.getByRole('button', { name: 'Join game' }).click();
  await expect(bob).toHaveURL(new RegExp(`/room/${roomCode}$`));
  await expect(status(bob)).toHaveText("Alice's turn");
  await expect(status(alice)).toHaveText('Your turn');

  // 3. Alternating moves; Bob cannot move out of turn.
  await expect(cell(bob, 0)).toHaveAttribute('aria-disabled', 'true');
  await move(alice, bob, 0);
  await move(bob, alice, 3);
  await move(alice, bob, 1);
  await move(bob, alice, 4);

  // 4. Both browsers show identical state.
  expect(await boardLabels(alice)).toEqual(await boardLabels(bob));

  // 5. Alice wins.
  await move(alice, bob, 2);
  await expect(status(alice)).toHaveText('You won this round!');
  await expect(status(bob)).toHaveText('Alice won this round.');
  await expect(alice.getByRole('gridcell', { name: /winning line/ })).toHaveCount(3);
  expect(await boardLabels(alice)).toEqual(await boardLabels(bob));

  // 6. Both players agree to a rematch; marks swap so Bob opens round 2.
  await alice.getByRole('button', { name: /^rematch$/i }).click();
  await expect(bob.getByText(/alice wants to play again/i)).toBeVisible();
  await bob.getByRole('button', { name: /let's play/i }).click();
  await expect(status(bob)).toHaveText('Your turn');
  await expect(status(alice)).toHaveText("Bob's turn");
  await expect(alice.getByTestId('move-count')).toHaveText('0');
  await move(bob, alice, 4);

  // 7a. A page refresh restores the same seat (no new identity or duplicate slot).
  await bob.reload();
  await expect(status(bob)).toHaveText("Alice's turn");
  await expect(cell(bob, 4)).toHaveAttribute('aria-label', /: X/);
  await expect(bob.getByRole('region', { name: /player x: bob \(you\)/i })).toBeVisible();

  // 7b. A temporary disconnect: Bob's tab goes away, Alice sees the reconnecting state...
  await bob.close();
  await expect(
    alice.getByRole('region', { name: /player x: bob/i }).getByText(/reconnecting/i),
  ).toBeVisible();
  await move(alice, alice, 0); // the game continues server-side

  // ...and Bob returns within the grace period to the exact same state.
  bob = await bobCtx.newPage();
  await bob.goto(`/room/${roomCode}`);
  await expect(status(bob)).toHaveText('Your turn');
  await expect(
    alice.getByRole('region', { name: /player x: bob/i }).getByText(/online|thinking/i),
  ).toBeVisible();
  expect(await boardLabels(bob)).toEqual(await boardLabels(alice));
  await move(bob, alice, 8);

  await aliceCtx.close();
  await bobCtx.close();
});

test('rejects a third player and invalid codes', async ({ browser }) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [host, guest, third] = await Promise.all(contexts.map((c) => c.newPage()));

  await host!.goto('/create?game=four-in-a-row');
  await host!.getByLabel('Your display name').fill('Host');
  await host!.getByRole('button', { name: 'Create private room' }).click();
  const roomCode = (await host!.getByTestId('room-code').textContent())!.trim();

  await guest!.goto(`/room/${roomCode}`);
  await guest!.getByLabel('Your display name').fill('Guest');
  await guest!.getByRole('button', { name: 'Join game' }).click();
  await expect(guest!.getByRole('group', { name: /four in a row board/i })).toBeVisible();

  await third!.goto('/join');
  await third!.getByLabel('Your display name').fill('Third');
  await third!.getByLabel('Room code or invite link').fill('ZZZ-ZZZ');
  await third!.getByRole('button', { name: 'Join game' }).click();
  await expect(third!.getByText(/that room does not exist/i)).toBeVisible();

  await third!.getByLabel('Room code or invite link').fill(roomCode);
  await third!.getByRole('button', { name: 'Join game' }).click();
  await expect(third!.getByText(/already started/i)).toBeVisible();

  await Promise.all(contexts.map((c) => c.close()));
});

test('one room, many games: switch to Rock Paper Scissors and keep secrets hidden', async ({
  browser,
}) => {
  const aCtx = await browser.newContext();
  const bCtx = await browser.newContext();
  const a = await aCtx.newPage();
  const b = await bCtx.newPage();

  await a.goto('/create');
  await a.getByLabel('Your display name').fill('Mia');
  // Change the first game from the waiting room.
  await a.getByRole('button', { name: 'Create private room' }).click();
  const roomCode = (await a.getByTestId('room-code').textContent())!.trim();
  await a.getByRole('button', { name: /change game/i }).click();
  await a
    .getByRole('dialog')
    .getByRole('button', { name: /memory match/i })
    .click();
  await expect(a.getByRole('heading', { name: /memory match/i })).toBeVisible();

  await b.goto(`/room/${roomCode}`);
  await b.getByLabel('Your display name').fill('Leo');
  await b.getByRole('button', { name: 'Join game' }).click();
  await expect(b.getByRole('heading', { level: 1, name: 'Memory Match' })).toBeVisible();
  await expect(b.locator('[data-card]')).toHaveCount(20);

  // Mid-round switch needs both players to agree.
  await a.getByRole('button', { name: /switch game/i }).click();
  await a
    .getByRole('dialog')
    .getByRole('button', { name: /rock paper scissors/i })
    .click();
  await expect(b.getByText(/mia wants to switch to rock paper scissors/i)).toBeVisible();
  await b.getByRole('button', { name: /let's play/i }).click();
  await expect(a.getByRole('heading', { level: 1, name: 'Rock Paper Scissors' })).toBeVisible();
  await expect(b.getByRole('heading', { level: 1, name: 'Rock Paper Scissors' })).toBeVisible();

  // Leo throws first; Mia only sees that he locked in.
  await b.getByRole('button', { name: /paper/i }).click();
  await expect(b.getByText(/locked in!/i)).toBeVisible();
  await expect(a.getByText(/leo has locked in/i)).toBeVisible();
  await expect(a.getByText(/throw 1/i)).toHaveCount(0); // nothing revealed yet

  await a.getByRole('button', { name: /rock/i }).click();
  await expect(b.getByText(/you take it/i)).toBeVisible();
  await expect(a.getByText(/leo takes it/i)).toBeVisible();

  await aCtx.close();
  await bCtx.close();
});
