const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  // Override config to use alternate ports for testing
  const configPath = 'server/config.json';
  const origConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  fs.writeFileSync(configPath, JSON.stringify({ ...origConfig, httpPort: 3099 }, null, 2));

  // Start the server process
  const server = spawn('node', ['server/index.js'], { cwd: __dirname });
  server.stderr.on('data', d => process.stdout.write(d));

  // Wait for ports to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('http://localhost:3099');
  await page.waitForLoadState('networkidle');

  console.log('[test] Page loaded, screenshot...');
  await page.screenshot({ path: '/tmp/step1_lobby.png' });

  // Click the Multiplayer button to show lobby
  await page.click('#multi');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/step2_lobby_shown.png' });

  // Click "Create Room"
  await page.click('#create-room');
  console.log('[test] Clicked Create Room, waiting for game transition...');

  // Wait up to 5 seconds for the lobby to disappear (game screen should appear)
  let success = false;
  for (let i = 0; i < 20; i++) {
    const el = await page.$('#lobby');
    const visible = el ? await el.isVisible() : false;
    if (!visible) {
      success = true;
      break;
    }
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: '/tmp/step3_after_create.png' });

  if (success) {
    console.log('[test] PASS — lobby disappeared, game screen should be visible');
  } else {
    console.log('[test] FAIL — lobby still visible after 5s');
  }

  // Print any relevant console messages
  const errors = logs.filter(l => l.includes('error') || l.includes('Error'));
  if (errors.length) {
    console.log('[test] Console errors:', errors);
  } else {
    console.log('[test] No console errors');
  }

  await browser.close();
  server.kill();

  // Restore original config
  fs.writeFileSync(configPath, JSON.stringify(origConfig, null, 2));
})();
