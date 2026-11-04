"""Demo data, created through the real workflow so every signature and state is genuine.

Story: Rajan (web developer, Sydney) and Anusha (video editor, London) are Anchors. Rajan's team
already has Bikash (Level 3, two signed jobs) and Sita (Level 2, one job to do now). Harbour Café in
Melbourne is Rajan's client: Rajan writes its job agreements and Emma agrees to them; one new
agreement is waiting for Emma. Himal Threads in Toronto has posted an open video job. Pemba has asked
to join Anusha's team; Asha can still ask. All accounts use the demo password.
"""

from sqlmodel import Session, select

from app.auth import hash_password
from app.config import load_yaml
from app.models import AnchorClient, AnchorNote, JoinRequest, JuniorProfile, Pod, PodMember, User
from app.services import work

RAJAN_ID, ANUSHA_ID = "u-anchor-rajan", "u-anchor-anusha"
SITA_ID, BIKASH_ID, PEMBA_ID, ASHA_ID = "u-junior-sita", "u-junior-bikash", "u-junior-pemba", "u-junior-asha"
CAFE_ID, THREADS_ID = "u-client-cafe", "u-client-threads"
RAJAN_TEAM, ANUSHA_TEAM = "team-rajan-web", "team-anusha-video"
SITA_JOB, REVIEW_JOB, OPEN_JOB = "job-cafe-menu", "job-cafe-spam", "job-threads-reel"
AGREE_JOB = "job-cafe-hours"

RAJAN_NOTES = [
    "Buttons need to be at least 44px tall so they're easy to tap on a phone.",
    "Test the page at 375px wide before you send it. The menu table overflows on small screens.",
    "Images should be compressed WebP under 200KB each; the page must load fast on mobile data.",
    "Use the café's green #1F5B4B for buttons, not the default blue.",
    "Every form field needs a visible label, not just placeholder text.",
    "Add alt text to every image; describe the dish, not 'image1'.",
    "Don't leave console.log lines in the final code.",
    "Prices must line up on the right so customers can compare them quickly.",
    "Commit messages should say what changed, like 'Make menu table scroll on mobile'.",
    "Check the contact form actually sends: test with your own email before submitting.",
    "Keep CSS in the stylesheet, not inline style attributes.",
    "Opening hours must match the Google Maps listing exactly.",
]
ANUSHA_NOTES = [
    "Cut on the beat. The music and the cuts should feel like one thing.",
    "Captions must be on screen long enough to read: at least 1.5 seconds per line.",
    "Keep important text inside the safe area; Instagram's buttons cover the bottom 20%.",
    "The first 2 seconds decide if people keep watching. Start with the best shot.",
    "Colour-match the clips so skin tones look the same across shots.",
    "Export 1080×1920 at 30fps, H.264. Check the file plays on a phone before sending.",
    "Music must be royalty-free and credited in the description.",
    "Don't use more than two fonts in one video.",
]

JOB_CAFE_BOOKING = {
    "skill": "web", "title": "Add an online table booking form", "deliverables": ["Booking form on the Contact page"],
    "done_when": ["Form has name, date, time and guests fields", "Booking email arrives at the café inbox",
                  "Form works on a phone 375px wide"],
    "details": {"stack": "WordPress", "devices": "Mobile and desktop; Chrome, Safari"},
    "deadline_days": 5, "budget_minor": 12000, "revisions": 1,
}
JOB_CAFE_IMAGES = {
    "skill": "web", "title": "Speed up the homepage images", "deliverables": ["Compressed homepage images"],
    "done_when": ["Every homepage image is WebP under 200KB", "Lighthouse performance score above 80"],
    "details": {"stack": "WordPress", "devices": "Mobile and desktop"},
    "deadline_days": 3, "budget_minor": 6000, "revisions": 1,
}
JOB_CAFE_MENU = {
    "skill": "web", "title": "Make the café menu page work on phones",
    "deliverables": ["Updated menu page (HTML and CSS)"],
    "done_when": ["Menu table fits a phone 375px wide without sideways scrolling",
                  "Buttons are at least 44px tall", "Prices line up on the right",
                  "Uses the café green #1F5B4B for buttons"],
    "details": {"stack": "HTML and CSS", "devices": "Mobile first; Chrome and Safari",
                "repo": "https://github.com/harbour-cafe/site"},
    "references": [{"link": "https://www.example.com/menu-we-like", "note": "Clean list layout", "kind": "like"},
                   {"link": "https://www.example.com/menu-too-busy", "note": "Too many photos", "kind": "not_like"}],
    "deadline_days": 3, "budget_minor": 8000, "revisions": 1,
}
JOB_CAFE_SPAM = {
    "skill": "web", "title": "Stop spam on the contact form", "deliverables": ["Spam protection on the contact form"],
    "done_when": ["Form has a hidden honeypot field", "Real messages still arrive in the café inbox",
                  "Form field labels are visible"],
    "details": {"stack": "WordPress", "devices": "Mobile and desktop"},
    "deadline_days": 2, "budget_minor": 4000, "revisions": 1,
}
JOB_THREADS_REEL = {
    "skill": "video", "title": "30-second Dashain sale reel",
    "deliverables": ["One vertical video, 30 seconds", "Thumbnail image"],
    "done_when": ["Length is between 28 and 32 seconds", "Exported 1080×1920 MP4",
                  "Burned-in captions in English and Nepali", "Shows the 20% off offer in the first 3 seconds"],
    "details": {"length": "30 seconds", "format": "MP4, 9:16 vertical for Instagram Reels",
                "captions": "English and Nepali, burned in", "music": "Royalty-free, festive, no lyrics",
                "source": "https://drive.google.com/drive/folders/himal-threads-dashain"},
    "references": [{"link": "https://www.instagram.com/reel/example-like", "note": "Fast cuts, bright colours",
                    "kind": "like"}],
    "deadline_days": 4, "budget_minor": 5000, "revisions": 2,
}
JOB_CAFE_HOURS = {
    "skill": "web", "title": "Show opening hours and a map on the Contact page",
    "deliverables": ["Opening hours table on the Contact page", "Embedded Google Map"],
    "done_when": ["Hours match the Google Maps listing exactly", "Map shows the café pin on a phone 375px wide",
                  "Page loads with no console errors"],
    "details": {"stack": "WordPress", "devices": "Mobile and desktop; Chrome, Safari"},
    "deadline_days": 2, "budget_minor": 5000, "revisions": 1,
}
SPAM_FIX = """<form class="contact">
  <label for="name">Your name</label><input id="name" name="name" required>
  <label for="email">Email</label><input id="email" name="email" type="email" required>
  <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label for="msg">Message</label><textarea id="msg" name="message" required></textarea>
  <button type="submit">Send</button>
</form>
<!-- server: reject the message if the hidden honeypot field 'website' is filled -->
<!-- tested: real messages arrive in the café inbox -->"""


def _user(uid: str, role: str, name: str, headline: str, country: str, pw: str) -> User:
    email = f"{name.split()[0].lower()}@demo.sajhakaam"
    return User(id=uid, role=role, email=email, password_hash=pw, display_name=name, headline=headline, country=country)


def _agreed_and_started(session: Session, anchor: User, client: User, junior: User, spec: dict,
                        job_id: str | None = None):
    """Through the real steps: the Anchor writes it, the client agrees, the junior accepts the brief."""
    job = work.anchor_create_job(session, anchor, client.id, dict(spec), job_id=job_id)
    work.agree(session, client, job)
    work.assign(session, anchor, job, junior.id)
    return work.answer_brief(session, junior, job, accept=True)


def seed(session: Session) -> None:
    if session.exec(select(User)).first():
        return
    pw = hash_password(load_yaml("guthi.yaml")["demo_password"])
    rajan = _user(RAJAN_ID, "anchor", "Rajan Shrestha", "Web developer · Sydney", "Australia", pw)
    anusha = _user(ANUSHA_ID, "anchor", "Anusha Gurung", "Video editor · London", "United Kingdom", pw)
    sita = _user(SITA_ID, "junior", "Sita Thapa", "", "Nepal", pw)
    bikash = _user(BIKASH_ID, "junior", "Bikash Tamang", "", "Nepal", pw)
    pemba = _user(PEMBA_ID, "junior", "Pemba Sherpa", "", "Nepal", pw)
    asha = _user(ASHA_ID, "junior", "Asha Rai", "", "Nepal", pw)
    cafe = _user(CAFE_ID, "client", "Emma Clarke", "Harbour Café, Melbourne", "Australia", pw)
    threads = _user(THREADS_ID, "client", "Sunil Karki", "Himal Threads, Toronto", "Canada", pw)
    session.add_all([rajan, anusha, sita, bikash, pemba, asha, cafe, threads])
    session.flush()

    session.add_all([
        Pod(id=RAJAN_TEAM, anchor_id=RAJAN_ID, name="Rajan's Web Team", skill="web", seats_open=1,
            about="Websites for small businesses in Australia: cafés, salons, clinics.",
            test_task="In 3–5 sentences: how would you make a café menu page load fast on a slow phone?"),
        Pod(id=ANUSHA_TEAM, anchor_id=ANUSHA_ID, name="Anusha's Video Team", skill="video", seats_open=2,
            about="Short videos for shops and brands run by Nepalis abroad.",
            test_task="Describe the first 3 seconds of a 30-second sale reel for a clothing shop."),
        JuniorProfile(user_id=SITA_ID, about="BIT graduate. I like making pages fast and simple.", skills=["web"],
                      languages=["Nepali", "English"], tools=["HTML", "CSS", "JavaScript", "Git"],
                      samples=[{"title": "Homestay booking site", "link": "https://github.com/np-dev-07/homestay"}],
                      hours_per_week=20, education="BIT, Pokhara University", district="Kaski"),
        JuniorProfile(user_id=BIKASH_ID, about="Front-end developer and part-time designer.", skills=["web", "design"],
                      languages=["Nepali", "English", "Hindi"], tools=["WordPress", "React", "Figma"],
                      samples=[{"title": "Clinic website", "link": "https://github.com/np-dev-12/clinic"}],
                      hours_per_week=25, education="BSc CSIT, Tribhuvan University", district="Rupandehi"),
        JuniorProfile(user_id=PEMBA_ID, about="I edit trekking videos for local guides.", skills=["video"],
                      languages=["Nepali", "English", "Sherpa"], tools=["DaVinci Resolve", "CapCut"],
                      samples=[{"title": "Everest trail reel", "link": "https://youtu.be/k7Tr3kReel9"}],
                      hours_per_week=15, district="Solukhumbu"),
        JuniorProfile(user_id=ASHA_ID, about="Video and short captions for social media.", skills=["video", "writing"],
                      languages=["Nepali", "English"], tools=["Premiere Pro", "Canva"],
                      samples=[{"title": "Café promo", "link": "https://drive.google.com/file/d/1cafePromoClip"}],
                      hours_per_week=12, district="Sunsari"),
        PodMember(pod_id=RAJAN_TEAM, junior_id=BIKASH_ID, level=3),
        PodMember(pod_id=RAJAN_TEAM, junior_id=SITA_ID, level=2),
        AnchorClient(anchor_id=RAJAN_ID, client_id=CAFE_ID),
        AnchorClient(anchor_id=ANUSHA_ID, client_id=THREADS_ID),
        *[AnchorNote(anchor_id=RAJAN_ID, text=t, source="seed") for t in RAJAN_NOTES],
        *[AnchorNote(anchor_id=ANUSHA_ID, text=t, source="seed") for t in ANUSHA_NOTES],
        JoinRequest(pod_id=ANUSHA_TEAM, junior_id=PEMBA_ID, sample_link="https://youtu.be/k7Tr3kReel9",
                    note="I cut 20+ trekking reels on my phone and laptop; I want to learn client work.",
                    test_answer="Open on the brightest shirt with '20% OFF' big in the first second, then three quick "
                                "cuts of people wearing it, timed to the drum."),
    ])
    session.commit()

    # Bikash: two finished jobs for Harbour Café, approved first time, accepted, signed.
    for spec, work_link in ((JOB_CAFE_BOOKING, "https://github.com/harbour-cafe/site/pull/12"),
                            (JOB_CAFE_IMAGES, "https://github.com/harbour-cafe/site/pull/15")):
        job = _agreed_and_started(session, rajan, cafe, bikash, spec)
        sub = work.submit(session, bikash, job, link="", content=f"Done: {'; '.join(spec['done_when'])}",
                          note=f"PR: {work_link}")
        sub.link = work_link
        session.add(sub)
        session.commit()
        work.approve(session, rajan, sub.id)
        work.accept(session, cafe, job, show_client=True)

    # Sita: a job to do now (the live demo).
    _agreed_and_started(session, rajan, cafe, sita, JOB_CAFE_MENU, job_id=SITA_JOB)

    # Bikash: work waiting on Rajan's desk.
    spam = _agreed_and_started(session, rajan, cafe, bikash, JOB_CAFE_SPAM, job_id=REVIEW_JOB)
    work.submit(session, bikash, spam, link="", content=SPAM_FIX, note="Tested with my own email.")

    # Harbour Café: a new agreement Rajan wrote after a call, waiting for Emma to agree.
    work.anchor_create_job(session, rajan, CAFE_ID, dict(JOB_CAFE_HOURS), job_id=AGREE_JOB)

    # Himal Threads: an open video job any video Anchor can take.
    work.create_job(session, threads, dict(JOB_THREADS_REEL), None, job_id=OPEN_JOB)
