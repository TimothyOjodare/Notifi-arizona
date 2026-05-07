"""
E2E verification: the Insights view + risk widget added in package A/B/C.

Boots the static server, signs in as a clinician, opens a chart with a
reportable disease, navigates to Insights, then loads the reporter to
verify the risk widget renders.

Run: python3 tests/e2e_insights.py
"""

import asyncio
import subprocess
import time
from pathlib import Path

import os
os.makedirs("/tmp/nz_screens_v2", exist_ok=True)


async def main():
    from playwright.async_api import async_playwright

    server = subprocess.Popen(
        ["python3", "-m", "http.server", "8766"],
        cwd=str(Path(__file__).parent.parent / "app"),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch()
            ctx = await browser.new_context(viewport={"width": 1400, "height": 1000})
            page = await ctx.new_page()
            errors = []
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.on("console", lambda m: errors.append(f"CONSOLE.{m.type}: {m.text}") if m.type in ("error",) else None)

            await page.goto("http://localhost:8766/index.html")
            await page.wait_for_selector(".role-card")
            print("✓ Login loaded")

            # Sign in as a clinician
            await page.click('.role-card[data-role="clinician"]')
            await page.wait_for_selector(".identity-tile")
            await page.click('.identity-tile[data-id="dr-reyes"]')
            await page.wait_for_selector("#view-ehr.active")
            print("✓ Signed in as Dr Reyes")

            # Click on Insights tab
            await page.click('.mode-btn[data-view="insights"]')
            await page.wait_for_selector("#view-insights.active")
            await page.wait_for_timeout(1500)  # let D3 transitions complete
            await page.screenshot(path="/tmp/nz_screens_v2/01-insights-overview.png", full_page=True)
            print("✓ Insights tab rendered")

            # Verify charts present
            for sel in ["#chart-disease-dist svg", "#chart-county-dist svg",
                        "#chart-subject-donut svg", "#card-metrics .big-metric",
                        "#chart-roc svg", "#chart-importance svg", "#conf-mat .cm-grid"]:
                el = await page.query_selector(sel)
                assert el is not None, f"Missing: {sel}"
            print("✓ All charts rendered")

            # Test RAG search
            await page.fill("#rag-input", "fever cough soil dust southern arizona")
            await page.click("#rag-go")
            await page.wait_for_selector(".rag-result")
            await page.screenshot(path="/tmp/nz_screens_v2/02-rag-search.png", full_page=False)
            results = await page.query_selector_all(".rag-result")
            print(f"✓ RAG returned {len(results)} results")

            # Click a sample chip to verify those work
            chips = await page.query_selector_all(".sample-chip")
            if chips:
                await chips[2].click()
                await page.wait_for_timeout(500)
                print("✓ Sample chip works")

            # Now switch to EHR, open a chart, launch reporter, verify risk widget
            await page.click('.mode-btn[data-view="ehr"]')
            await page.wait_for_selector(".ehr-li-item.reportable.selected", timeout=3000)
            print("✓ EHR auto-selected reportable patient")

            await page.click(".rb-launch")
            await page.wait_for_selector(".risk-widget")
            await page.wait_for_timeout(800)  # for meter animation
            await page.screenshot(path="/tmp/nz_screens_v2/03-reporter-with-risk.png", full_page=True)

            tag = await page.text_content(".risk-tag")
            label = await page.text_content(".rw-meter-label")
            print(f"✓ Risk widget: {tag} | {label}")

            # Verify factors are listed
            factors = await page.query_selector_all(".rw-factors li")
            print(f"✓ Risk factors shown: {len(factors)}")

            # Print any console errors
            if errors:
                print("\n⚠️ Console issues:")
                for e in errors[:10]: print(f"  - {e}")
            else:
                print("\n✓ No console errors")

            await browser.close()
    finally:
        server.terminate()
        server.wait()


if __name__ == "__main__":
    asyncio.run(main())
