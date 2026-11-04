"""Screenshots of the Harbour Café page (after the change) for the promo video Bikash uploads."""
from pathlib import Path
from playwright.sync_api import sync_playwright
page = (Path(__file__).resolve().parents[1] / "backend/app/samples/harbour_cafe.html").as_uri() + "?v=2"
out = Path(__file__).resolve().parent / "out"
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    p = b.new_page(viewport={"width": 540, "height": 960}, device_scale_factor=2)
    p.goto(page); p.wait_for_timeout(2000)
    p.screenshot(path=str(out / "promo_a.png"))
    p.mouse.wheel(0, 700); p.wait_for_timeout(700)
    p.screenshot(path=str(out / "promo_b.png"))
    b.close()
