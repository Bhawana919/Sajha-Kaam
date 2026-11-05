"""Records the real app playing the Harbour Café story on four phones (Rajan, Emma, Sita, Bikash).

Every on-screen step is the real app: real forms typed into, real buttons, real server. A few setup calls
(new member accounts, the second job) go through the API off camera. Output: one clip per step in
recording/out/clips and a manifest for the film (film/public/demo/manifest.json).

    python recording/record_demo.py http://localhost:8765          # local run (files shared as links)
    python recording/record_demo.py https://sajha-kaam.onrender.com --upload promo.mp4   # live, real upload
"""

import argparse
import base64
import json
import re
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
VIEW = {"width": 390, "height": 844}
PW = "kaam-demo"
TYPE_DELAY = 45  # ms per key: readable typing
BLANK_JPEG = 30_000  # bytes: below this a 780×1688 screen is an empty, loading page

TOUCH_JS = """
// Links to outside apps (WhatsApp, a work link) open nothing here: the film animates that hand-off.
window.open = (u) => { window.__opened = u; return null; };
addEventListener('pointerdown', e => {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:${e.clientX-22}px;top:${e.clientY-22}px;width:44px;height:44px;border-radius:50%;
    background:rgba(168,19,43,.22);border:2px solid rgba(168,19,43,.55);pointer-events:none;z-index:2147483647;
    transition:transform .5s ease-out, opacity .5s ease-out`;
  document.documentElement.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = 'scale(1.7)'; d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 600);
}, true);
"""


# ---------- API (off camera) ----------
class Api:
    def __init__(self, base: str):
        self.base = base.rstrip("/")

    def call(self, method: str, path: str, body=None, token: str | None = None):
        req = urllib.request.Request(self.base + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Content-Type": "application/json",
                                              **({"Authorization": f"Bearer {token}"} if token else {})})
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return json.loads(raw) if raw else None

    def login(self, email: str, password: str = PW) -> str:
        return self.call("POST", "/v1/auth/login", {"email": email, "password": password})["access_token"]


# ---------- a phone ----------
class Phone:
    def __init__(self, browser, name: str, base: str):
        self.name, self.base = name, base
        self.ctx = browser.new_context(viewport=VIEW, device_scale_factor=2, is_mobile=True, has_touch=True)
        self.ctx.add_init_script(TOUCH_JS)
        self.page: Page = self.ctx.new_page()
        self.t0 = time.monotonic()
        self.page.set_default_timeout(30000)
        # Our own screen capture (Chrome's screencast): exact timing, so a still screen is held, not dropped.
        self.cdp = self.ctx.new_cdp_session(self.page)
        self.frames: list[tuple[float, bytes]] | None = None
        self.cdp.on("Page.screencastFrame", self._frame)

    def _frame(self, ev):
        if self.frames is not None:
            self.frames.append((time.monotonic(), base64.b64decode(ev["data"])))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:
            pass

    def start_rec(self):
        self.frames = []
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 88, "maxWidth": 780, "maxHeight": 1688,
                                               "everyNthFrame": 1})
        self.rec_start = time.monotonic()
        self.page.wait_for_timeout(150)

    def stop_rec(self, path: Path) -> float:
        end = time.monotonic()
        self.cdp.send("Page.stopScreencast")
        frames, self.frames = self.frames or [], None
        if not frames:
            raise RuntimeError(f"no frames captured on {self.name}")
        # A screen that is still loading is a blank cream page: a tiny JPEG. Hold the last real frame
        # through it instead, and start the clip on the first real one.
        real = [f for f in frames if len(f[1]) >= BLANK_JPEG]
        self.dropped = (len(frames) - len(real), min(len(f[1]) for f in frames) // 1000)
        if real:
            self.rec_start = max(self.rec_start, real[0][0]) if len(frames[0][1]) < BLANK_JPEG else self.rec_start
            frames = real
        path.parent.mkdir(parents=True, exist_ok=True)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-i", "-",
                               "-vf", "scale=780:1688:force_original_aspect_ratio=decrease,pad=780:1688:(ow-iw)/2:0:color=0xF7F0E4",
                               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(path)], stdin=subprocess.PIPE)
        i, t, fps = 0, self.rec_start, 1 / 30
        while t < end:
            while i + 1 < len(frames) and frames[i + 1][0] <= t:
                i += 1
            ff.stdin.write(frames[i][1])
            t += fps
        ff.stdin.close()
        ff.wait()
        return end - self.rec_start

    def now(self) -> float:
        return time.monotonic() - self.t0

    def go(self, path: str):
        self.page.goto(self.base + path, wait_until="load")
        try:
            self.page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass  # a page that keeps a connection open (fonts, polling) is still ready
        self.pause(0.6)

    def pause(self, s: float = 0.5):
        self.page.wait_for_timeout(int(s * 1000))

    def see(self, text: str, timeout: float = 30):
        self.page.get_by_text(text, exact=False).first.wait_for(state="visible", timeout=timeout * 1000)

    def _loc(self, name: str, role: str | None):
        p = self.page
        if role:
            return p.get_by_role(role, name=name).first
        for r in ("button", "switch", "link", "checkbox"):
            loc = p.get_by_role(r, name=name)
            if loc.count():
                return loc.first
        return p.get_by_text(name, exact=False).first

    def tap(self, name: str, role: str | None = None, after: float = 0.8):
        loc = self._loc(name, role)
        loc.wait_for(state="visible")
        loc.scroll_into_view_if_needed()
        self.pause(0.35)
        loc.click()
        self.pause(after)

    def type(self, label: str, text: str, enter: bool = False):
        loc = self.page.get_by_label(label, exact=True).first
        loc.scroll_into_view_if_needed()
        self.pause(0.25)
        loc.click()
        loc.press("Control+A")
        loc.press("Backspace")
        loc.press_sequentially(text, delay=TYPE_DELAY)
        if enter:
            loc.press("Enter")
        self.pause(0.35)

    def scroll(self, dy: int = 400):
        self.page.mouse.wheel(0, dy)
        self.pause(0.6)

    def sign_in(self, email: str):
        self.go("/sign-in")
        self.type("Email", email)
        self.type("Password", PW)
        self.tap("Sign in", role="button", after=1.5)


# ---------- the run ----------
STEPS: list[dict] = []
CHAPTER = [1]  # the film's chapter for the steps that follow


def chapter(n: int):
    CHAPTER[0] = n


class step:
    """Marks one clip: who, the line shown beside it, and its time range on that phone's video."""

    def __init__(self, phone: Phone, line: str, pair: bool = False, hold: float = 1.2):
        self.phone, self.line, self.pair, self.hold = phone, line, pair, hold

    def __enter__(self):
        self.phone.start_rec()
        return self.phone

    def __exit__(self, *exc):
        if exc[0] is None:
            self.phone.pause(self.hold)  # let the result sit on screen
            n = len(STEPS) + 1
            secs = self.phone.stop_rec(OUT / "clips" / f"step{n:02d}.mp4")
            STEPS.append({"who": self.phone.name, "line": self.line, "seconds": round(secs, 2), "pair": self.pair,
                          "chapter": CHAPTER[0]})
            d, smallest = getattr(self.phone, "dropped", (0, 0))
            print(f"  ✓ {self.phone.name}: {self.line} ({secs:.1f} s, {d} blank frames held over, smallest {smallest} KB)",
                  flush=True)
        else:
            self.phone.frames = None
        return False


def shoot(phone: Phone, tag: str):
    (OUT / "shots").mkdir(parents=True, exist_ok=True)
    try:
        phone.page.screenshot(path=str(OUT / "shots" / f"{tag}-{phone.name}.png"), timeout=8000)
    except Exception:
        pass  # a stuck page must not hide the real error


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base", nargs="?", default="http://localhost:8765")
    ap.add_argument("--upload", help="a promo video file Bikash uploads (needs Cloudinary on the server)")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    api = Api(base)
    stamp = str(int(time.time()))[-6:]
    shutil.rmtree(OUT / "clips", ignore_errors=True)
    site = "https://sajha-kaam.onrender.com/samples/harbour-cafe"

    # Off camera: a fresh demo, and two new members with no paid work yet.
    api.call("POST", "/demo/reset")
    members = {}
    for key, name, skill, sample in (("sita", "Sita Thapa", "web", "https://github.com/sita-thapa/portfolio"),
                                     ("bikash", "Bikash Tamang", "video", "https://vimeo.com/76979871")):
        email = f"{key}.{stamp}@film.example"
        tok = api.call("POST", "/v1/auth/register", {"role": "junior", "display_name": name, "email": email,
                                                       "password": PW})["access_token"]
        api.call("PUT", "/v1/me/profile", {"skills": [skill], "languages": ["Nepali", "English"], "hours_per_week": 20,
                                           "about": f"{name.split()[0]} from Nepal.",
                                           "samples": [{"title": "My work", "link": sample}]}, tok)
        members[key] = {"email": email, "token": tok}
    rajan_tok = api.login("rajan@demo.sajhakaam")
    emma_email = f"emma.{stamp}@harbourcafe.example"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        phones = [Phone(browser, n, base) for n in ("rajan", "emma", "sita", "bikash", "pemba", "review", "anusha")]
        rajan, emma, sita, bikash, pemba, review, anusha = phones
        rajan.sign_in("rajan@demo.sajhakaam")
        sita.sign_in(members["sita"]["email"])
        bikash.sign_in(members["bikash"]["email"])
        pemba.sign_in("pemba@demo.sajhakaam")
        review.sign_in("sajha@demo.sajhakaam")
        anusha.sign_in("anusha@demo.sajhakaam")
        try:
            run(api, rajan, emma, sita, bikash, rajan_tok, members, emma_email, site, args.upload)
            records(sita, rajan)
            client_posts(api, emma, anusha, pemba, api.login(emma_email))
            leaders(api, pemba, review)
        except Exception:
            for p in phones:
                shoot(p, "fail")
            raise
        finally:
            for p in phones:
                p.ctx.close()
            browser.close()
    cut(base)


def run(api, rajan, emma, sita, bikash, rajan_tok, members, emma_email, site, upload):
    chapter(1)
    # 1. Rajan writes the landing-page job and makes an invite link for Emma.
    rajan.go("/anchor/desk")
    with step(rajan, "Rajan writes the job for Emma's café"):
        rajan.tap("Write a job")
        rajan.tap("A new client (send a link)", role="switch")
        rajan.tap("Web development", role="switch")
        rajan.type("Job title", "Harbour Café landing page")
        rajan.type("What will be delivered", "A one-page website for the café", enter=True)
        rajan.type("What will be delivered", "Menu, opening hours and map", enter=True)
        rajan.tap("Page works on a phone 375px wide")
        rajan.type("“Finished when” items", "Emma can change the menu prices herself", enter=True)
        rajan.type("Technology", "Simple HTML page")
        rajan.type("Devices and browsers", "Phones and laptops")
        rajan.type("Days to finish", "5")
        rajan.type("Budget (USD)", "250")
    with step(rajan, "One link, sent to Emma on WhatsApp"):
        rajan.tap("Check and make the invite link", after=1.5)
        rajan.see("Send on WhatsApp")
        code = re.search(r"/join/([A-Za-z0-9_-]+)", rajan.page.content()).group(1)
        rajan.tap("Send on WhatsApp", after=1.0)

    # 2. Emma joins from the link, agrees and pays (held).
    with step(emma, "Emma opens the link and joins"):
        emma.go(f"/join/{code}")
        emma.type("Your name", "Emma Clarke")
        emma.type("Business name and city", "Harbour Café, Melbourne")
        emma.type("Country", "Australia")
        emma.type("Email", emma_email)
        emma.type("Password", PW)
        emma.tap("Join and see the agreement", role="button", after=2.0)
    emma_tok = api.login(emma_email)
    web_job = next(j for j in api.call("GET", "/v1/client/home", token=emma_tok)["to_agree"])["id"]
    with step(emma, "She reads the terms and agrees"):
        emma.go(f"/job/{web_job}")
        emma.scroll(500)
        emma.tap("Agree", role="button", after=1.5)
    with step(emma, "She pays: held until she accepts"):
        emma.tap("Pay $250 (demo)", role="button", after=1.5)

    # The promo video job, for the same client (off camera), then agreed and paid on camera.
    emma_id = api.call("GET", "/v1/me", token=emma_tok)["id"]
    video = api.call("POST", "/v1/anchor/jobs", {
        "client_id": emma_id, "skill": "video", "title": "Harbour Café promo video",
        "deliverables": ["One 30-second vertical promo video (MP4)"],
        "done_when": ["Exported as MP4, 9:16", "Shows the coffee, the food and the harbour view"],
        "details": {"length": "30 seconds", "format": "MP4, 9:16 vertical for Instagram Reels",
                    "source": "Photos and clips from Emma (shared in the room)"},
        "references": [], "deadline_days": 5, "budget_minor": 15000, "revisions": 1}, rajan_tok)
    video_job = video["id"]
    with step(emma, "And the promo video: agree, pay"):
        emma.go(f"/job/{video_job}")
        emma.scroll(500)
        emma.tap("Agree", role="button", after=1.2)
        emma.tap("Pay $150 (demo)", role="button", after=1.5)

    chapter(2)
    # 3. Rajan finds people with the skill.
    with step(rajan, "Rajan finds people with the skill", pair=True):
        rajan.go(f"/job/{web_job}")
        rajan.tap("Find people", role="button", after=1.2)
        rajan.go(f"/job/{video_job}")
        rajan.tap("Find people", role="button", after=1.2)

    # 4. Sita and Bikash hear about it, see their share, ask to join.
    for who, job, note, line in ((sita, web_job, "I built two shop websites in Pokhara.", "Sita sees her share and asks to join"),
                                 (bikash, video_job, "I film and edit Kathmandu cafés for fun.", "Bikash asks to join the video")):
        with step(who, line, pair=True):
            who.go("/notifications")
            who.tap("A new project matches your skills", after=1.5)
            who.type("Note for the client (optional)", note)
            who.tap("Ask to join", role="button", after=1.2)

    # 5. Rajan approves both.
    with step(rajan, "Rajan approves them"):
        rajan.go(f"/job/{web_job}")
        rajan.tap("Approve Sita", role="button", after=1.2)
        rajan.go(f"/job/{video_job}")
        rajan.tap("Approve Bikash", role="button", after=1.2)

    chapter(3)
    # 6. The job room: tasks, messages, files.
    with step(sita, "One room for the work: tasks and messages", pair=True):
        sita.go(f"/job/{web_job}?tab=room")
        sita.type("Message", "Thank you! First draft by Thursday.")
        sita.tap("Send", role="button", after=1.2)
    with step(rajan, "Rajan answers in the room", pair=True):
        rajan.go(f"/job/{web_job}?tab=room")
        rajan.type("Message", "Great. Emma loves her latte art, use it in the hero.")
        rajan.tap("Send", role="button", after=1.2)

    with step(bikash, "Bikash uploads the promo video"):
        bikash.go(f"/job/{video_job}?tab=room")
        if upload:
            bikash.tap("Add a file", after=0.6)
            with bikash.page.expect_file_chooser() as fc:
                bikash.tap("Upload a photo or video", role="button", after=0.2)
            fc.value.set_files(upload)
            bikash.see(Path(upload).stem, timeout=180)
            bikash.pause(0.8)
        else:
            bikash.tap("Add a file", after=0.6)
            bikash.type("What is it?", "Promo video, first cut")
            bikash.type("Link", "https://vimeo.com/76979871")
            bikash.tap("Add link", role="button", after=1.0)
    room = api.call("GET", f"/v1/jobs/{video_job}/room", token=members["bikash"]["token"])
    video_link = room["files"][0]["link"]

    chapter(4)
    # 7. They send their work for checking.
    for who, job, link, note, line in (
            (sita, web_job, f"{site}", "Works on a phone 375px wide. Emma can change the menu prices herself.",
             "Sita sends her page for checking"),
            (bikash, video_job, video_link, "Exported as MP4, 9:16. Shows the coffee, the food and the harbour view.",
             "Bikash sends the video")):
        with step(who, line, pair=True):
            who.go(f"/job/{job}")
            who.type("Link to the work", link)
            who.type("Or paste text", note)
            who.tap("Send for checking", role="button", after=1.5)

    # 8. Rajan checks: asks Sita for one change, approves the video.
    with step(rajan, "Rajan checks: one change, please"):
        rajan.go("/anchor/desk")
        rajan.tap("Check Sita", after=1.5)
        rajan.type("What to change", "Use the latte art photo in the hero, please.")
        rajan.tap("Ask for changes", role="button", after=1.5)
    with step(sita, "Sita fixes it and sends again"):
        sita.go(f"/job/{web_job}")
        sita.see("asked for changes")
        sita.type("Link to the work", f"{site}?v=2")
        sita.type("Or paste text", "Latte art now in the hero. Works on a phone 375px wide. Emma can change the menu prices herself.")
        sita.tap("Send for checking", role="button", after=1.5)
    with step(rajan, "Approved and sent to Emma"):
        rajan.go("/anchor/desk")
        rajan.tap("Check Sita", after=1.5)
        rajan.tap("Approve and send to client", role="button", after=1.5)
        rajan.go("/anchor/desk")
        rajan.tap("Check Bikash", after=1.5)
        rajan.tap("Approve and send to client", role="button", after=1.5)

    chapter(5)
    # 9. Emma sees the work and accepts: the money is released.
    with step(emma, "Emma sees her new page"):
        emma.go(f"{''}/samples/harbour-cafe?v=2")
        emma.pause(1.2)
        emma.scroll(500)
        emma.scroll(500)
    with step(emma, "Accept and release"):
        emma.go(f"/job/{web_job}")
        emma.tap("Accept and release", role="button", after=2.0)
        emma.go(f"/job/{video_job}")
        emma.tap("Accept and release", role="button", after=2.0)

    chapter(6)
    # 10. First pay: wallet and withdraw.
    for who, method, phone, line in ((sita, "eSewa", "9801234567", "Sita's first pay, to eSewa"),
                                     (bikash, "Khalti", "9807654321", "Bikash's first pay, to Khalti")):
        with step(who, line, pair=True, hold=2.0):
            who.go("/notifications")
            who.pause(1.0)
            who.go("/wallet")
            who.tap(method, role="switch")
            who.type("Wallet phone number", phone)
            who.tap(f"to {method}", role="button", after=1.8)
    with step(rajan, "Rajan's share, for checking the work", hold=2.0):
        rajan.go("/wallet")
        rajan.pause(1.5)


def client_posts(api, emma, anusha, pemba, emma_tok):
    """The other way in: a client posts a job directly; verified Leaders and Mentors with the skill apply."""
    chapter(8)
    with step(emma, "Emma posts a job herself"):
        emma.go("/client/home")
        emma.tap("Post a new job", after=1.0)
        emma.tap("Video editing", role="switch")
        emma.type("Job title", "Opening week reel")
        emma.type("What will be delivered", "One 30-second reel for Instagram", enter=True)
        emma.tap("Exported as MP4, 9:16")
        emma.type("Final length", "30 seconds")
        emma.type("Format and aspect ratio", "MP4, 9:16 vertical")
        emma.type("Where the raw footage is", "Our photos from opening week")
        emma.type("Days to finish", "4")
        emma.type("Budget (USD)", "120")
        emma.tap("Check and post", role="button", after=2.0)
    home = api.call("GET", "/v1/client/home", token=emma_tok)
    jobs = [j for k in ("to_agree", "to_choose", "in_progress") for j in home.get(k, [])]
    reel = next(j for j in jobs if j["title"] == "Opening week reel")["id"]
    with step(anusha, "Anusha, a verified Leader, applies", pair=True):
        anusha.go(f"/job/{reel}")
        anusha.type("Note for the client (optional)", "My team made reels for three Melbourne cafés.")
        anusha.tap("Apply", role="button", after=1.5)
    with step(pemba, "Pemba, a Mentor, applies with her video", pair=True):
        pemba.go(f"/job/{reel}")
        # With uploads on, the form offers "Upload my video" and a link field under another label.
        video_field = ("Or paste a link instead (YouTube, Google Drive, Vimeo, Loom)"
                       if pemba.page.get_by_text("Upload my video").count() else "Your 2-minute video (link)")
        pemba.type(video_field, "https://vimeo.com/76979871")
        pemba.type("Note for the client (optional)", "I film cafés and treks in Kathmandu.")
        pemba.tap("Apply", role="button", after=1.5)
    with step(emma, "Emma compares them and chooses", hold=1.8):
        emma.go(f"/job/{reel}")
        emma.scroll(450)
        emma.tap("Choose Anusha", role="button", after=2.0)


def records(sita, rajan):
    chapter(7)
    # Work Record and badge progress: the experience Sita never had.
    with step(sita, "Sita's first verified job, on her Work Record", hold=1.8):
        sita.go("/junior/home")
        sita.scroll(450)
        sita.go("/junior/logbook")
    with step(rajan, "Badges grow by public rules, not by the Leader", hold=1.8):
        rajan.go("/anchor/team")
        rajan.scroll(350)


def leaders(api, pemba, review):
    chapter(9)
    # A Mentor becomes a verified Team Leader by her record.
    with step(pemba, "Pemba, a ★★★★★ Mentor, starts her own team", hold=1.8):
        pemba.go("/junior/home")
        pemba.tap("Become a Team Leader", after=1.2)
        pemba.type("Team name", "Pemba's Trek Films")
        pemba.tap("Start my team", role="button", after=2.0)
    # Someone without a Mentor record sends proof; Sajha Kaam checks it.
    asha = api.login("asha@demo.sajhakaam")
    api.call("POST", "/v1/leader/apply", {"skill": "video", "team_name": "Asha's Reels",
                                          "about": "Three years editing wedding films in Dharan.",
                                          "proof": ["https://vimeo.com/76979871"]}, asha)
    with step(review, "Others send proof; Sajha Kaam verifies them", hold=1.8):
        review.go("/review")
        review.pause(1.0)
        review.tap("Approve as Team Leader", role="button", after=1.5)


def cut(base: str):
    """The film's manifest, and the clips copied next to it."""
    clips = OUT / "clips"
    manifest = [{"clip": f"demo/step{i:02d}.mp4", "who": s["who"], "line": s["line"], "seconds": s["seconds"],
                 "chapter": s["chapter"], **({"pair": True} if s["pair"] else {})} for i, s in enumerate(STEPS, 1)]
    (OUT / "manifest.json").write_text(json.dumps({"source": base, "steps": manifest}, indent=2, ensure_ascii=False),
                                       encoding="utf-8")
    film = HERE.parent / "film" / "public" / "demo"
    if film.parent.exists():
        film.mkdir(exist_ok=True)
        for f in film.glob("step*.mp4"):
            f.unlink()
        for f in clips.glob("*.mp4"):
            shutil.copy(f, film / f.name)
        shutil.copy(OUT / "manifest.json", film / "manifest.json")
    print(f"{len(manifest)} clips, {sum(m['seconds'] for m in manifest):.0f} s → {clips}")


if __name__ == "__main__":
    main()
