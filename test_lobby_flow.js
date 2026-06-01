const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console errors
  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });

  // ─── Step 1: Main menu ───
  console.log('\n=== STEP 1: Navigate to main menu ===');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/multiplayer-snake-worktree/screenshots/step1_main_menu.png', fullPage: true });

  // Check that the menu heading is visible
  const hasMenuHeading = await page.locator('h2').first().isVisible();
  console.log(`Main menu h2 visible: ${hasMenuHeading}`);

  const menuText = await page.locator('h2').first().textContent();
  console.log(`Menu heading text: "${menuText}"`);

  // Check the Multiplayer button exists
  const multiBtnExists = await page.locator('#multi').isVisible();
  console.log(`Multiplayer button visible: ${multiBtnExists}`);

  // ─── Step 2: Click Multiplayer → lobby UI ───
  console.log('\n=== STEP 2: Click "Multiplayer" ===');
  await page.click('#multi');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/multiplayer-snake-worktree/screenshots/step2_lobby.png', fullPage: true });

  // Check lobby elements
  const lobbyVisible = await page.locator('#lobby').isVisible();
  console.log(`Lobby div visible: ${lobbyVisible}`);

  const createRoomBtn = await page.locator('#create-room').isVisible();
  console.log(`"Create Room" button visible: ${createRoomBtn}`);

  const roomTableExists = await page.locator('#room-table').isVisible();
  console.log(`Room list table visible: ${roomTableExists}`);

  // ─── Step 3: Click Create Room → game screen ───
  console.log('\n=== STEP 3: Click "Create Room" ===');
  await page.click('#create-room');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/multiplayer-snake-worktree/screenshots/step3_game.png', fullPage: true });

  // Check that we navigated into the game (canvas should be visible, lobby hidden)
  const canvasVisible = await page.locator('#canvas').isVisible();
  console.log(`Game canvas visible: ${canvasVisible}`);

  const lobbyHidden = !(await page.locator('#lobby').isVisible());
  console.log(`Lobby is now hidden: ${lobbyHidden}`);

  // ─── Step 4: Console errors ───
  console.log('\n=== CONSOLE ERRORS ===');
  if (jsErrors.length === 0) {
    console.log('No JavaScript errors in browser console.');
  } else {
    jsErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  // ─── Summary ───
  console.log('\n=== SUMMARY ===');
  const passed = [];
  if (hasMenuHeading && multiBtnExists)          passed.push('Main menu loads with Multiplayer button');
  if (lobbyVisible && createRoomBtn && roomTableExists) passed.push('Lobby UI appears after clicking Multiplayer');
  if (canvasVisible && lobbyHidden)               passed.push('Game screen loads after clicking Create Room');
  if (jsErrors.length === 0)                      passed.push('No JavaScript console errors');

  const checks = [hasMenuHeading, multiBtnExists, lobbyVisible, createRoomBtn, roomTableExists, canvasVisible, lobbyHidden];
  if (checks.every(Boolean)) {
    console.log('✅ All checks PASSED — lobby flow works end-to-end.');
  } else {
    console.log('❌ Some checks FAILED. See details above.');
  }

  await browser.close();
})();
