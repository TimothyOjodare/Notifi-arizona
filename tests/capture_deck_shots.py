"""Capture polished screenshots for the deck."""
import asyncio, subprocess, time, os
from pathlib import Path
from playwright.async_api import async_playwright

OUT = "/tmp/nz_deck_shots"
os.makedirs(OUT, exist_ok=True)


async def main():
    server = subprocess.Popen(
        ["python3", "-m", "http.server", "8767"],
        cwd=str(Path(__file__).parent.parent / "app"),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch()
            ctx = await browser.new_context(viewport={"width": 1400, "height": 900}, device_scale_factor=2)
            page = await ctx.new_page()
            await page.goto("http://localhost:8767/index.html")
            await page.wait_for_selector(".role-card")

            # Sign in clinician
            await page.click('.role-card[data-role="clinician"]')
            await page.wait_for_selector(".identity-tile")
            await page.click('.identity-tile[data-id="dr-reyes"]')
            await page.wait_for_selector("#view-ehr.active")

            # 1) EHR with selected reportable patient (chart open with banner)
            await page.wait_for_selector(".reportable-banner", timeout=4000)
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{OUT}/01-ehr-chart.png", full_page=False)
            print("✓ EHR")

            # 2) Reporter with destinations + risk widget
            await page.click(".rb-launch")
            await page.wait_for_selector(".risk-widget")
            await page.wait_for_timeout(900)
            await page.screenshot(path=f"{OUT}/02-reporter-full.png", full_page=False)
            print("✓ Reporter")

            # 3) Insights overview (top section, predictor)
            await page.click('.mode-btn[data-view="insights"]')
            await page.wait_for_selector("#view-insights.active")
            await page.wait_for_timeout(1500)
            # Scroll to predictor section
            await page.evaluate("document.getElementById('ins-predictor').scrollIntoView({block:'start'})")
            await page.wait_for_timeout(700)
            await page.screenshot(path=f"{OUT}/03-insights-predictor.png", full_page=False)
            print("✓ Insights predictor")

            # 4) ROC alone
            await page.evaluate("document.querySelector('#chart-roc').scrollIntoView({block:'center'})")
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{OUT}/04-roc.png", full_page=False)
            print("✓ ROC zoom")

            # 5) RAG section
            await page.evaluate("document.getElementById('ins-rag').scrollIntoView({block:'start'})")
            await page.wait_for_timeout(500)
            await page.fill("#rag-input", "fever cough soil dust southern arizona")
            await page.click("#rag-go")
            await page.wait_for_selector(".rag-result")
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{OUT}/05-rag.png", full_page=False)
            print("✓ RAG")

            # 6) Sign out, sign in as investigator, capture inbox
            await page.click("#sign-out")
            await page.wait_for_selector(".role-card")
            await page.click('.role-card[data-role="investigator"]')
            await page.wait_for_selector(".identity-tile")
            await page.click('.identity-tile[data-id="adhs-1"]')
            await page.wait_for_selector("#view-investigator.active")
            await page.wait_for_timeout(700)
            await page.screenshot(path=f"{OUT}/06-investigator.png", full_page=False)
            print("✓ Investigator")

            await browser.close()
    finally:
        server.terminate()
        server.wait()


asyncio.run(main())
