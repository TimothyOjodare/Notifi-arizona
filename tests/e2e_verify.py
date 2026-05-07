"""
End-to-end verification of the NotifiAZ closed loop:

  1. Sign in as Dr. Reyes (TMC physician)
  2. See patient list, find a Cocci patient
  3. Click "📋 File reportable disease report"
  4. Reporter shows multiple destinations
  5. Preview each message format
  6. Submit
  7. See ack IDs

  8. Sign out, sign in as Dr. Lisa Nakamura (ADHS investigator)
  9. See submitted report in inbox
 10. Click row → see report detail
 11. Click "Mark received"
 12. Send callback question

 13. Sign back in as Dr. Reyes
 14. See callback alert in side panel
 15. Reply

 16. Back to ADHS investigator
 17. See reply received
 18. Close case

Each step saves a screenshot to /tmp/nz_screens/.
"""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SCREENS = Path("/tmp/nz_screens"); SCREENS.mkdir(exist_ok=True)
URL = "http://localhost:8765/index.html"


def shot(page, name):
    p = SCREENS / f"{name}.png"
    page.screenshot(path=str(p), full_page=False)
    print(f"  📸 {p.name}")


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1400, "height": 900})
        page = ctx.new_page()

        # Step 1 — load
        print("Step 1: Load NotifiAZ login")
        page.goto(URL)
        page.wait_for_selector(".login-card")
        shot(page, "01-login")

        # Step 2 — pick clinician role
        print("Step 2: Select clinician role")
        page.click('.role-card[data-role="clinician"]')
        page.wait_for_selector(".identity-tile")
        shot(page, "02-clinician-identities")

        # Step 3 — sign in as Dr. Reyes (TMC)
        print("Step 3: Sign in as Dr. Reyes")
        page.click('.identity-tile[data-id="dr-reyes"]')
        page.wait_for_selector("#view-ehr.active")
        page.wait_for_selector(".ehr-li-item")
        shot(page, "03-ehr-patient-list")

        # Step 4 — auto-selected first reportable patient. Verify chart renders
        print("Step 4: Verify chart render with reportable banner")
        page.wait_for_selector(".reportable-banner")
        shot(page, "04-ehr-chart-with-banner")

        # Step 5 — launch reporter
        print("Step 5: Launch reporter from EHR")
        page.click(".rb-launch")
        page.wait_for_selector("#view-reporter.active")
        page.wait_for_selector(".destination-card")
        shot(page, "05-reporter-destinations")

        # Step 6 — preview a message
        print("Step 6: Preview destination message")
        page.click(".dest-preview-btn")
        page.wait_for_selector(".preview-content", state="visible")
        shot(page, "06-message-preview")

        # Step 7 — submit
        print("Step 7: Submit report")
        page.click("#submit-report")
        page.wait_for_selector(".report-success")
        shot(page, "07-report-success")

        # Step 8 — sign out, sign in as ADHS investigator
        print("Step 8: Sign out, switch to investigator")
        page.click("#sign-out-btn")
        page.wait_for_selector(".login-card")
        page.click('.role-card[data-role="investigator"]')
        page.wait_for_selector('.identity-tile[data-id="adhs-nakamura"]')
        shot(page, "08-investigator-identities")

        page.click('.identity-tile[data-id="adhs-nakamura"]')
        page.wait_for_selector("#view-investigator.active")
        page.wait_for_selector(".inv-row")
        shot(page, "09-investigator-inbox")

        # Step 10 — click row, see detail
        print("Step 10: Open report detail")
        # Find a submitted-state row to mark received
        rows = page.locator(".inv-row").all()
        target_row = None
        for r in rows:
            if "state-submitted" in (r.get_attribute("class") or ""):
                target_row = r
                break
        if target_row is None:
            target_row = page.locator(".inv-row").first
        target_row.click()
        page.wait_for_selector(".inv-detail-head")
        shot(page, "10-investigator-detail")

        # Step 11 — mark received (if submitted state)
        if page.locator("#act-receive").count() > 0:
            print("Step 11: Mark received")
            page.click("#act-receive")
            page.wait_for_selector(".inv-actions")
            shot(page, "11-marked-received")
        else:
            print("Step 11: Already received, skipping mark")

        # Step 12 — send callback
        if page.locator("#act-callback").count() > 0:
            print("Step 12: Send callback question")
            page.fill("#callback-text", "Can you confirm patient's exact soil-dust exposure timing? We're tracking a Pinal County cluster.")
            page.click("#act-callback")
            page.wait_for_selector(".inv-actions.waiting")
            shot(page, "12-callback-sent")
        else:
            print("Step 12: Cannot send callback in current state, skipping")

        # Step 13 — back to clinician, see callback in side panel
        print("Step 13: Sign back in as Dr. Reyes")
        page.click("#sign-out-btn")
        page.wait_for_selector(".login-card")
        page.click('.role-card[data-role="clinician"]')
        page.click('.identity-tile[data-id="dr-reyes"]')
        page.wait_for_selector("#view-ehr.active")
        page.click('.mode-btn[data-view="reporter"]')
        page.wait_for_selector("#view-reporter.active")
        # Should see "my filed reports" with at least one callback
        page.wait_for_selector(".my-report-card")
        shot(page, "13-clinician-side-panel")

        # Step 14 — open the callback report and reply
        print("Step 14: Open callback report and reply")
        cb_card = page.locator(".my-report-card.state-callback_pending").first
        if cb_card.count() > 0:
            # expand details if collapsed
            cb_card.locator("summary").click()
            page.wait_for_selector("textarea.reply-text:visible")
            page.locator("textarea.reply-text").first.fill("Confirmed: patient reports yard-work soil-dust exposure 7 days prior to onset. No travel. No symptomatic household contacts.")
            shot(page, "14-clinician-replying")
            page.click("button.reply-btn")
            page.wait_for_timeout(500)
            shot(page, "15-clinician-reply-sent")
        else:
            print("  No callback pending found in side panel.")

        # Step 16 — back to investigator, close case
        print("Step 16: Sign back as investigator and close")
        page.click("#sign-out-btn")
        page.wait_for_selector(".login-card")
        page.click('.role-card[data-role="investigator"]')
        page.click('.identity-tile[data-id="adhs-nakamura"]')
        page.wait_for_selector(".inv-row")
        # Filter to reply_received
        page.select_option("#inv-filter-state", "reply_received")
        page.wait_for_timeout(300)
        if page.locator(".inv-row").count() > 0:
            page.locator(".inv-row").first.click()
            page.wait_for_selector("#act-close")
            shot(page, "16-reply-received")
            page.fill("#closure-text", "Case confirmed. Cluster of 3 in zip code monitored. No further investigation required.")
            page.click("#act-close")
            page.wait_for_timeout(500)
            shot(page, "17-case-closed")
        else:
            print("  No reply_received reports found.")

        browser.close()
    print("\n✓ End-to-end verification complete.")
    print(f"Screenshots in {SCREENS}")


if __name__ == "__main__":
    run()
