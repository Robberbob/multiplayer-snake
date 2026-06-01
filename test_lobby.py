#!/usr/bin/env python3
"""Test the multiplayer lobby flow end-to-end using Playwright."""

import time
from playwright.sync_api import sync_playwright

SCREENSHOTS = "/tmp/lobby_test_screenshots/"

def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text()) if msg.type() == "error" else None)

        # ---- Step 1: Open the app ----
        print("[STEP 1] Navigating to http://localhost:3000 ...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=f"{SCREENSHOTS}step1_main_menu.png")
        print(f"  Screenshot saved: {SCREENSHOTS}step1_main_menu.png")

        # Check for main menu elements
        body_text = page.inner_html("body", timeout=3000) if page.is_visible("body", timeout=2000) else ""
        has_multiplayer_button = "multiplayer" in body_text.lower() or "#multiplayer" in body_text
        print(f"  Body contains 'multiplayer' button: {has_multiplayer_button}")

        # ---- Step 2: Click Multiplayer ----
        print("[STEP 2] Clicking 'Multiplayer' button ...")
        try:
            page.click("#multiplayer", timeout=5000)
        except Exception as e:
            print(f"  WARNING: Could not click #multiplayer — {e}")
            # Try text-based fallback
            page.click("text=Multiplayer", timeout=3000)

        time.sleep(1)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=f"{SCREENSHOTS}step2_lobby.png")
        print(f"  Screenshot saved: {SCREENSHOTS}step2_lobby.png")

        # Verify lobby UI elements
        body_text = page.inner_html("body", timeout=3000) if page.is_visible("body", timeout=2000) else ""
        has_room_table = "room" in body_text.lower() or "#roomTable" in body_text
        has_create_button = "create" in body_text.lower() or "#createRoomBtn" in body_text
        print(f"  Lobby shows room table: {has_room_table}")
        print(f"  Lobby shows Create Room button: {has_create_button}")

        # ---- Step 3: Click Create Room ----
        print("[STEP 3] Clicking 'Create Room' ...")
        try:
            page.click("#createRoomBtn", timeout=5000)
        except Exception as e:
            print(f"  WARNING: Could not click #createRoomBtn — {e}")
            page.click("text=Create Room", timeout=3000)

        time.sleep(2)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=f"{SCREENSHOTS}step3_game.png")
        print(f"  Screenshot saved: {SCREENSHOTS}step3_game.png")

        # Verify game elements
        body_text = page.inner_html("body", timeout=3000) if page.is_visible("body", timeout=2000) else ""
        has_canvas = "<canvas" in body_text or "#gameCanvas" in body_text
        print(f"  Game canvas visible: {has_canvas}")

        # ---- Step 4: Console errors ----
        print("\n[STEP 4] Browser console JavaScript errors:")
        if console_errors:
            for err in console_errors:
                print(f"  ERROR: {err}")
                errors.append(err)
        else:
            print("  No JavaScript errors found.")

        browser.close()

    # ---- Summary ----
    print("\n=== SUMMARY ===")
    if errors:
        print(f"  Console errors detected ({len(errors)}).")
    else:
        print("  No console errors.")
    print(f"  Screenshots saved to {SCREENSHOTS}")

if __name__ == "__main__":
    import os
    os.makedirs(SCREENSHOTS, exist_ok=True)
    main()
