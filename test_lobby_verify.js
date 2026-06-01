#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = '/tmp/lobby_test_screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const consoleErrors = [];
  const consoleMessages = [];

  // Use the full chromium build (headless-shell is missing libglib on this host)
  const executablePath = '/home/turnstone/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Collect ALL console messages and errors separately
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), type: msg.type() });
    } else {
      consoleMessages.push(msg.text());
    }
  });

  // ---- Step 1: Open the app ----
  console.log('[STEP 1] Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const ss1 = path.join(SCREENSHOTS_DIR, 'step1_main_menu.png');
  await page.screenshot({ path: ss1, fullPage: true });
  console.log(`  Screenshot saved: ${ss1}`);

  const body1 = await page.innerHTML('body');
  const hasMultiplayerBtn = /multiplayer/i.test(body1) || /#multi/.test(body1);
  console.log(`  Body contains 'multiplayer' button: ${hasMultiplayerBtn}`);

  // ---- Step 2: Click Multiplayer (toggles UI visibility, no navigation) ----
  console.log('[STEP 2] Clicking "Multiplayer" button ...');
  try {
    await page.click('#multi', { timeout: 5000 });
  } catch (e) {
    console.log(`  Fallback click attempt...`);
    await page.click('h3.menu', { timeout: 3000 });
  }

  // Wait for the JS toggle to render — no network activity, so don't use networkidle
  await page.waitForTimeout(500);

  const ss2 = path.join(SCREENSHOTS_DIR, 'step2_lobby.png');
  await page.screenshot({ path: ss2, fullPage: true });
  console.log(`  Screenshot saved: ${ss2}`);

  // Verify lobby div is now visible
  const lobbyVisible = await page.isVisible('#lobby', { timeout: 3000 });
  const hasCreateBtn = await page.isVisible('#create-room', { timeout: 3000 });
  console.log(`  Lobby div visible: ${lobbyVisible}`);
  console.log(`  Create Room button visible: ${hasCreateBtn}`);

  // ---- Step 3: Click Create Room ----
  console.log('[STEP 3] Clicking "Create Room" ...');
  try {
    await page.click('#create-room', { timeout: 5000 });
  } catch (e) {
    console.log(`  Fallback click attempt...`);
    await page.click('text=Create Room', { timeout: 3000, force: true });
  }

  // Wait for game initialization (WebSocket connect + welcome message triggers UI change)
  await page.waitForTimeout(3000);

  const ss3 = path.join(SCREENSHOTS_DIR, 'step3_game.png');
  await page.screenshot({ path: ss3, fullPage: true });
  console.log(`  Screenshot saved: ${ss3}`);

  // Verify game elements — canvas or game area should be visible now
  const hasCanvas = /<canvas/i.test(await page.innerHTML('body'));
  const lobbyStillVisible = await page.isVisible('#lobby', { timeout: 2000 }).catch(() => false);
  console.log(`  Game canvas in DOM: ${hasCanvas}`);
  console.log(`  Lobby still visible (should be hidden after game starts): ${lobbyStillVisible}`);

  // ---- Step 4: Console errors ----
  console.log('\n[STEP 4] Browser console JavaScript errors:');
  if (consoleErrors.length > 0) {
    for (const err of consoleErrors) console.log(`  ERROR: ${err.text}`);
  } else {
    console.log('  No JavaScript errors found.');
  }

  // Print other console messages too
  console.log('\n[STEP 4b] Other console messages:');
  if (consoleMessages.length > 0) {
    for (const msg of consoleMessages) console.log(`  INFO: ${msg}`);
  } else {
    console.log('  No other console messages.');
  }

  await browser.close();

  // ---- Summary ----
  console.log('\n=== SUMMARY ===');
  if (consoleErrors.length > 0) {
    console.log(`  Console errors detected (${consoleErrors.length}).`);
  } else {
    console.log('  No console errors.');
  }
  console.log(`  Screenshots saved to ${SCREENSHOTS_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
