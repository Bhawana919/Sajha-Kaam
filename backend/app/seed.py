"""Demo data, created through the real workflow so every signature, payment and badge is genuine.

Story: Himalayan Momo House, a Nepali family restaurant in Sydney, is opening a second branch in
Parramatta on 21 November. The owner, Sunita Basnet, needs three things, each done by a team in Nepal
led by a Nepali professional abroad:
  1. Opening-week Instagram captions: Rajan's social media team (Sydney), done by Sita (★★ Learner).
     This is the live demo: her first draft misses two points and the quick check quotes Rajan's advice.
  2. A 30-second opening reel, posted to everyone: Anusha (video, London) and Pemba (★★★★★ Mentor) apply.
  3. A one-page website from scratch: Nima's web team (Toronto), built by Bikash (★★★ Trusted), approved
     by Nima and waiting for Sunita to accept. The site itself is served at /samples/momo-house.
Every badge was earned by the automatic rules while the history below was replayed through the real
steps (earlier clients: Harbour Café in Melbourne and Himal Threads in Toronto): Sita 2 jobs, Bikash 5
first-time jobs, Pemba 20 first-time, on-time videos over five months. Asha has asked to join Anusha's
team. All accounts use the demo password.
"""

from datetime import date, timedelta

from sqlalchemy import delete, or_
from sqlmodel import Session, select

from app.auth import hash_password
from app.config import load_yaml
from app.models import (
    AnchorClient,
    AnchorNote,
    Invite,
    Job,
    JobApplication,
    JoinRequest,
    JuniorProfile,
    LevelChange,
    LogEntry,
    Notification,
    Pod,
    PodMember,
    RoomFile,
    RoomMessage,
    RoomTask,
    Submission,
    User,
    Withdrawal,
)
from app.services import room, work

RAJAN_ID, ANUSHA_ID, NIMA_ID = "u-anchor-rajan", "u-anchor-anusha", "u-anchor-nima"
SITA_ID, BIKASH_ID, PEMBA_ID, ASHA_ID = "u-junior-sita", "u-junior-bikash", "u-junior-pemba", "u-junior-asha"
MOMO_ID, CAFE_ID, THREADS_ID = "u-client-momo", "u-client-cafe", "u-client-threads"
RAJAN_TEAM, ANUSHA_TEAM, NIMA_TEAM = "team-rajan-social", "team-anusha-video", "team-nima-web"
SITA_JOB, REVIEW_JOB, OPEN_JOB = "job-momo-captions", "job-momo-website", "job-momo-reel"
AGREE_JOB = "job-momo-event"
SITE_URL_PATH = "/samples/momo-house"

RAJAN_NOTES = [
    "Every post needs one line in Nepali; our customers love seeing their own language.",
    "Every caption ends with #MomoHouseParramatta, the branch hashtag, so people can find all the posts.",
    "Say the date and the place in every post; people share one post without the others.",
    "Keep each caption under 150 characters; people read on their phones.",
    "Open with the dish people will taste, not with the business: no 'We are pleased to announce'.",
    "One emoji at most per caption. Let the words do the work.",
    "Write like you are talking to a neighbour, not like an advert.",
    "Check the Nepali spelling twice, in Devanagari and in Roman letters.",
    "Never promise a discount the client didn't agree to in writing.",
    "Give the client two options for the most important post, so they can choose.",
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
NIMA_NOTES = [
    "Buttons need to be at least 44px tall so they're easy to tap on a phone.",
    "Test every page at 375px wide before you send it.",
    "Images should be compressed WebP under 200KB each; the page must load fast on mobile data.",
    "Every form field needs a visible label, not just placeholder text.",
    "Add alt text to every image; describe the dish, not 'image1'.",
    "Opening hours must match the Google Maps listing exactly.",
    "Prices must line up on the right so customers can compare them quickly.",
]

# ---------- the main story: Himalayan Momo House, Parramatta branch ----------

JOB_MOMO_CAPTIONS = {
    "skill": "writing", "title": "Instagram captions for our opening week",
    "deliverables": ["Five Instagram captions, one for each day of opening week"],
    "done_when": ["Five captions, one for each day of opening week", "Every caption has one line in Nepali",
                  "Says the opening date, 21 November", "Ends with #MomoHouseParramatta"],
    "details": {"words": "Five captions, under 150 characters each",
                "audience": "Nepali and Australian families in Western Sydney",
                "tone": "Warm and festive; simple English", "keywords": "'Parramatta', 'momo'"},
    "references": [{"link": "https://www.instagram.com/p/example-warm-post", "note": "Warm, food first", "kind": "like"},
                   {"link": "https://www.instagram.com/p/example-hard-sell", "note": "Too salesy", "kind": "not_like"}],
    "deadline_days": 3, "budget_minor": 6000, "revisions": 1,
}
# Sita's first draft (the live demo): no Nepali lines and no hashtag yet.
CAPTIONS_V1 = """Day 1: Steaming jhol momo, made the way our family makes them. Opening 21 November in Parramatta!
Day 2: Bring your family for buff and chicken momo. Opening week in Parramatta from 21 November.
Day 3: Our chilli sauce is ready. Are you? See you in Parramatta.
Day 4: Vegetarian momo for everyone at the table. Opening week, Parramatta.
Day 5: Last day of opening week. Thank you, Parramatta, for coming hungry!"""
# Her fixed version, after the quick check and Rajan's note.
CAPTIONS_V2 = """Five captions, one for each day of opening week.
Day 1: Steaming jhol momo, made the way our family makes them. Opening 21 November in Parramatta!
Nepali line: परिवारको स्वादमा तातो झोल मम। #MomoHouseParramatta
Day 2: Bring your family for buff and chicken momo. Opening week from 21 November.
Nepali line: सबै परिवारलाई स्वागत छ! #MomoHouseParramatta
Day 3: Our chilli sauce is ready. Are you? Opening 21 November.
Nepali line: पिरो अचार तयार छ। #MomoHouseParramatta
Day 4: Vegetarian momo for everyone at the table. Opening week from 21 November.
Nepali line: सबैका लागि शाकाहारी मम। #MomoHouseParramatta
Day 5: Last day of opening week. Thank you for coming hungry! Opened 21 November.
Nepali line: धन्यवाद, पारामाटा! #MomoHouseParramatta"""

JOB_MOMO_EVENT = {
    "skill": "writing", "title": "Facebook event text for opening day",
    "deliverables": ["Facebook event title and description", "Short invitation message for WhatsApp groups"],
    "done_when": ["Event title is under 60 characters", "Description says the date, time and address",
                  "Invitation has one line in Nepali"],
    "details": {"words": "Event description 120–180 words; invitation under 40 words",
                "audience": "Nepali community groups in Sydney", "tone": "Friendly and clear"},
    "deadline_days": 2, "budget_minor": 4000, "revisions": 1,
}
# What Sita sends for the Facebook event job in the live recording (scores 3 of 3 on the quick check).
EVENT_TEXT = """Event title: Momo House Parramatta opening day (under 60 characters)
Description with the date, time and address: Join us on Saturday 21 November, 11:30 am to 9 pm, at Church Street, Parramatta NSW 2150. Steaming jhol momo, free tea for the first 50 families, and music all afternoon.
Invitation: Our new branch opens Saturday 21 November at 11:30 am, Church Street, Parramatta. See you there!
Nepali line: शनिबार भेटौँ, सबैलाई स्वागत छ!"""

JOB_MOMO_REEL = {
    "skill": "video", "title": "30-second opening reel for our new branch",
    "deliverables": ["One vertical video, 30 seconds", "Cover image"],
    "done_when": ["Length is between 28 and 32 seconds", "Exported 1080×1920 MP4",
                  "Shows steaming momos in the first 2 seconds", "Says 'Opening 21 November' in English and Nepali"],
    "details": {"length": "30 seconds", "format": "MP4, 9:16 vertical for Instagram Reels",
                "captions": "English and Nepali, burned in", "music": "Royalty-free, festive madal, no lyrics",
                "source": "https://drive.google.com/drive/folders/momo-house-parramatta-footage"},
    "references": [{"link": "https://www.instagram.com/reel/example-food-reel", "note": "Close-ups, steam, fast cuts",
                    "kind": "like"}],
    "deadline_days": 5, "budget_minor": 8000, "revisions": 2,
}
JOB_MOMO_WEBSITE = {
    "skill": "web", "title": "A one-page website for our Parramatta branch",
    "deliverables": ["One-page website: menu, opening hours, map and an order button"],
    "done_when": ["Shows the menu with prices", "Shows the opening hours and a map",
                  "Has an Order online button", "Works on a phone 375px wide"],
    "details": {"stack": "Plain HTML and CSS, hosted for free", "devices": "Phones first; Chrome and Safari"},
    "deadline_days": 7, "budget_minor": 25000, "revisions": 2,
}
WEBSITE_NOTE = """Built from scratch: menu with prices, opening hours, a map and an Order online button.
Tested on a phone 375px wide. Buttons are 48px tall; all photos have alt text."""

# ---------- earlier work (the history that earned the badges) ----------

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
JOB_THREADS_TIHAR = {
    "skill": "video", "title": "15-second Tihar lights teaser",
    "deliverables": ["One vertical video, 15 seconds"],
    "done_when": ["Length is between 14 and 16 seconds", "Exported 1080×1920 MP4", "Shop logo shows in the last 2 seconds"],
    "details": {"length": "15 seconds", "format": "MP4, 9:16 vertical", "source": "https://drive.google.com/drive/folders/himal-threads-tihar"},
    "deadline_days": 3, "budget_minor": 3000, "revisions": 1,
}
JOB_THREADS_UNBOX = {
    "skill": "video", "title": "Unboxing video for the new dhaka scarves",
    "deliverables": ["One vertical video, 45 seconds"],
    "done_when": ["Length is between 40 and 50 seconds", "Burned-in English captions", "Exported 1080×1920 MP4"],
    "details": {"length": "45 seconds", "format": "MP4, 9:16 vertical", "source": "https://drive.google.com/drive/folders/himal-threads-scarves"},
    "deadline_days": 4, "budget_minor": 4500, "revisions": 1,
}


def _web(title: str, deliverable: str, done_when: list[str], budget: int, days: int = 3) -> dict:
    return {"skill": "web", "title": title, "deliverables": [deliverable], "done_when": done_when,
            "details": {"stack": "WordPress", "devices": "Mobile and desktop; Chrome, Safari"},
            "deadline_days": days, "budget_minor": budget, "revisions": 1}


def _writing(title: str, deliverable: str, done_when: list[str], budget: int, words: str) -> dict:
    return {"skill": "writing", "title": title, "deliverables": [deliverable], "done_when": done_when,
            "details": {"words": words, "audience": "Café customers in Melbourne", "tone": "Warm and simple"},
            "deadline_days": 3, "budget_minor": budget, "revisions": 1}


# Bikash's earlier jobs (with the two above): five accepted first time -> Trusted.
BIKASH_MORE = [
    _web("Add a photo gallery of the café", "Gallery page with 12 photos",
         ["Gallery shows 12 photos in a grid", "Each photo has alt text describing the dish", "Page loads in under 3 seconds"], 7000),
    _web("Fix the broken footer links", "Working footer links", ["All 8 footer links open the right page",
         "Footer looks the same on a phone 375px wide"], 3000, 2),
    _web("Add a newsletter sign-up box", "Sign-up box on the homepage", ["Box asks for email only",
         "Sign-up arrives in the café's Mailchimp list", "Box has a visible label"], 5000),
]
# Sita's first two writing jobs: accepted -> Learner.
SITA_EARLIER = [
    _writing("Three Facebook posts for the winter menu", "Three Facebook posts",
             ["Three posts, one per new dish", "Each post names the dish and how it is cooked"], 4000, "Three posts, 40–60 words each"),
    _writing("Google Business description for the café", "Business description",
             ["Between 150 and 250 words", "Mentions 'Fitzroy' and 'Nepali coffee'"], 3000, "150–250 words"),
]
# Pemba's twenty video jobs for Himal Threads, over five months: first time, on time -> Mentor.
_PRODUCTS = ["Dhaka topi", "pashmina shawl", "felt slippers", "hemp backpack", "singing bowl", "Tihar candles",
             "lokta notebooks", "Thangka prints", "yak-wool socks", "Dashain gift box", "brass diyo", "silk scarf",
             "prayer flags", "Newari jewellery", "Teej bangles", "khukuri keyring", "tea gift set", "wool beanie",
             "cotton kurta", "handmade soap"]


def _reel(product: str) -> dict:
    return {"skill": "video", "title": f"15-second reel: {product}", "deliverables": ["One vertical video, 15 seconds"],
            "done_when": ["Length is between 14 and 16 seconds", "Exported 1080×1920 MP4",
                          f"Shows the {product} in the first 2 seconds", "Shop logo shows in the last 2 seconds"],
            "details": {"length": "15 seconds", "format": "MP4, 9:16 vertical",
                        "source": "https://drive.google.com/drive/folders/himal-threads-products"},
            "deadline_days": 3, "budget_minor": 3000, "revisions": 1}


def _user(uid: str, role: str, name: str, headline: str, country: str, pw: str) -> User:
    email = f"{name.split()[0].lower()}@demo.sajhakaam"
    return User(id=uid, role=role, email=email, password_hash=pw, display_name=name, headline=headline, country=country)


def _agreed_and_started(session: Session, anchor: User, client: User, junior: User, spec: dict,
                        job_id: str | None = None):
    """Through the real steps: the Anchor writes it, the client agrees and pays (demo), the junior accepts."""
    job = work.anchor_create_job(session, anchor, client.id, dict(spec), job_id=job_id)
    work.agree(session, client, job)
    work.pay(session, client, job)
    work.assign(session, anchor, job, junior.id)
    return work.answer_brief(session, junior, job, accept=True)


def _finished(session: Session, anchor: User, client: User, junior: User, spec: dict, link: str, days_ago: int) -> None:
    """A job done right the first time, on time, and accepted: the real steps, then dated in the past so the
    team's "jobs in the last 30 days" view is realistic. Accepting it may raise the badge by the rules."""
    job = _agreed_and_started(session, anchor, client, junior, spec)
    sub = work.submit(session, junior, job, link="", content=f"Done: {'; '.join(spec['done_when'])}", note="")
    sub.link = link  # added after the check, so seeding never tries to open these sample links
    session.add(sub)
    session.commit()
    work.approve(session, anchor, sub.id)
    work.accept(session, client, job, show_client=True)
    job.assigned_at = job.assigned_at - timedelta(days=days_ago)
    session.add(job)
    session.commit()


DEMO_DOMAIN = "@demo.sajhakaam"


def reset_demo(session: Session) -> None:
    """Remove the demo people and everything tied to them, and nothing else: real accounts, their teams
    and their jobs stay. Then seed() puts the demo back as new."""
    demo = [u.id for u in session.exec(select(User).where(User.email.endswith(DEMO_DOMAIN))).all()]
    if not demo:
        return
    pods = [p.id for p in session.exec(select(Pod).where(Pod.anchor_id.in_(demo))).all()]
    jobs = [j.id for j in session.exec(select(Job).where(
        or_(Job.client_id.in_(demo), Job.junior_id.in_(demo), Job.pod_id.in_(pods)))).all()]
    steps = [
        delete(JobApplication).where(or_(JobApplication.job_id.in_(jobs), JobApplication.applicant_id.in_(demo),
                                         JobApplication.pod_id.in_(pods))),
        delete(Submission).where(Submission.job_id.in_(jobs)),
        delete(LogEntry).where(LogEntry.job_id.in_(jobs)),
        delete(RoomTask).where(RoomTask.job_id.in_(jobs)),
        delete(RoomFile).where(RoomFile.job_id.in_(jobs)),
        delete(RoomMessage).where(RoomMessage.job_id.in_(jobs)),
        delete(Job).where(Job.id.in_(jobs)),
        delete(JoinRequest).where(or_(JoinRequest.pod_id.in_(pods), JoinRequest.junior_id.in_(demo))),
        delete(PodMember).where(or_(PodMember.pod_id.in_(pods), PodMember.junior_id.in_(demo))),
        delete(LevelChange).where(or_(LevelChange.pod_id.in_(pods), LevelChange.junior_id.in_(demo))),
        delete(AnchorClient).where(or_(AnchorClient.anchor_id.in_(demo), AnchorClient.client_id.in_(demo))),
        delete(Invite).where(or_(Invite.anchor_id.in_(demo), Invite.used_by.in_(demo))),
        delete(AnchorNote).where(AnchorNote.anchor_id.in_(demo)),
        delete(Withdrawal).where(Withdrawal.user_id.in_(demo)),
        delete(Notification).where(Notification.user_id.in_(demo)),
        delete(JuniorProfile).where(JuniorProfile.user_id.in_(demo)),
        delete(Pod).where(Pod.id.in_(pods)),
        delete(User).where(User.id.in_(demo)),
    ]
    for stmt in steps:
        session.exec(stmt)
    session.commit()


def seed(session: Session) -> None:
    """Create the demo people and their story, unless they are there already."""
    if session.get(User, RAJAN_ID):
        return
    pw = hash_password(load_yaml("guthi.yaml")["demo_password"])
    rajan = _user(RAJAN_ID, "anchor", "Rajan Shrestha", "Digital marketer · Sydney", "Australia", pw)
    anusha = _user(ANUSHA_ID, "anchor", "Anusha Gurung", "Video editor · London", "United Kingdom", pw)
    nima = _user(NIMA_ID, "anchor", "Nima Lama", "Web developer · Toronto", "Canada", pw)
    sita = _user(SITA_ID, "junior", "Sita Thapa", "", "Nepal", pw)
    bikash = _user(BIKASH_ID, "junior", "Bikash Tamang", "", "Nepal", pw)
    pemba = _user(PEMBA_ID, "junior", "Pemba Sherpa", "", "Nepal", pw)
    asha = _user(ASHA_ID, "junior", "Asha Rai", "", "Nepal", pw)
    momo = _user(MOMO_ID, "client", "Sunita Basnet", "Himalayan Momo House, Sydney", "Australia", pw)
    cafe = _user(CAFE_ID, "client", "Emma Clarke", "Harbour Café, Melbourne", "Australia", pw)
    threads = _user(THREADS_ID, "client", "Sunil Karki", "Himal Threads, Toronto", "Canada", pw)
    session.add_all([rajan, anusha, nima, sita, bikash, pemba, asha, momo, cafe, threads])
    session.flush()

    session.add_all([
        Pod(id=RAJAN_TEAM, anchor_id=RAJAN_ID, name="Rajan's Social Media Team", skill="writing", seats_open=1,
            about="Captions, posts and website words for Nepali-run businesses in Australia.",
            test_task="Write one Instagram caption (under 150 characters) for a momo restaurant's opening day."),
        Pod(id=ANUSHA_TEAM, anchor_id=ANUSHA_ID, name="Anusha's Video Team", skill="video", seats_open=2,
            about="Short videos for shops and brands run by Nepalis abroad.",
            test_task="Describe the first 3 seconds of a 30-second opening reel for a restaurant."),
        Pod(id=NIMA_TEAM, anchor_id=NIMA_ID, name="Nima's Web Team", skill="web", seats_open=1,
            about="Simple, fast websites for small businesses, built from scratch.",
            test_task="In 3–5 sentences: how would you make a restaurant menu page load fast on a slow phone?"),
    ])
    session.flush()  # the teams first: Postgres checks that a member's or request's team exists
    session.add_all([
        JuniorProfile(user_id=SITA_ID, about="BBS graduate. I write posts for my family's shop and love words.",
                      skills=["writing"], languages=["Nepali", "English"], tools=["Google Docs", "Canva", "Meta Business Suite"],
                      samples=[{"title": "Posts for a Pokhara homestay", "link": "https://docs.google.com/document/d/homestay-posts"}],
                      hours_per_week=20, education="BBS, Pokhara University", district="Kaski"),
        JuniorProfile(user_id=BIKASH_ID, about="Front-end developer and part-time designer.", skills=["web", "design"],
                      languages=["Nepali", "English", "Hindi"], tools=["HTML", "CSS", "WordPress", "Figma"],
                      samples=[{"title": "Clinic website", "link": "https://github.com/np-dev-12/clinic"}],
                      hours_per_week=25, education="BSc CSIT, Tribhuvan University", district="Rupandehi"),
        JuniorProfile(user_id=PEMBA_ID, about="I edit trekking videos for local guides.", skills=["video"],
                      languages=["Nepali", "English", "Sherpa"], tools=["DaVinci Resolve", "CapCut"],
                      samples=[{"title": "Everest trail reel", "link": "https://youtu.be/k7Tr3kReel9"}],
                      hours_per_week=15, district="Solukhumbu"),
        JuniorProfile(user_id=ASHA_ID, about="Short videos and reels for social media.", skills=["video"],
                      languages=["Nepali", "English"], tools=["Premiere Pro", "Canva"],
                      samples=[{"title": "Café promo", "link": "https://drive.google.com/file/d/1cafePromoClip"}],
                      hours_per_week=12, district="Sunsari"),
        PodMember(pod_id=RAJAN_TEAM, junior_id=SITA_ID, level=1),  # badges are earned below, by the rules
        PodMember(pod_id=NIMA_TEAM, junior_id=BIKASH_ID, level=1),
        PodMember(pod_id=ANUSHA_TEAM, junior_id=PEMBA_ID, level=1),
        AnchorClient(anchor_id=RAJAN_ID, client_id=MOMO_ID), AnchorClient(anchor_id=NIMA_ID, client_id=MOMO_ID),
        AnchorClient(anchor_id=RAJAN_ID, client_id=CAFE_ID), AnchorClient(anchor_id=NIMA_ID, client_id=CAFE_ID),
        AnchorClient(anchor_id=ANUSHA_ID, client_id=THREADS_ID),
        *[AnchorNote(anchor_id=RAJAN_ID, text=t, source="seed") for t in RAJAN_NOTES],
        *[AnchorNote(anchor_id=ANUSHA_ID, text=t, source="seed") for t in ANUSHA_NOTES],
        *[AnchorNote(anchor_id=NIMA_ID, text=t, source="seed") for t in NIMA_NOTES],
        JoinRequest(pod_id=ANUSHA_TEAM, junior_id=ASHA_ID, sample_link="https://drive.google.com/file/d/1cafePromoClip",
                    note="I make short promos for cafés and shops; I want to learn client work.",
                    test_answer="Open on steam rising from a plate of momos, then three quick cuts of families "
                                "laughing at the table, timed to the madal."),
    ])
    session.commit()

    # The history, replayed through the real steps. Badges go up by themselves as clients accept work.
    bikash_jobs = [(JOB_CAFE_BOOKING, "https://github.com/harbour-cafe/site/pull/12"),
                   (JOB_CAFE_IMAGES, "https://github.com/harbour-cafe/site/pull/15"),
                   *[(spec, f"https://github.com/harbour-cafe/site/pull/{20 + i}") for i, spec in enumerate(BIKASH_MORE)]]
    for i, (spec, link) in enumerate(bikash_jobs):
        _finished(session, nima, cafe, bikash, spec, link, days_ago=80 - i * 15)
    for i, spec in enumerate(SITA_EARLIER):
        _finished(session, rajan, cafe, sita, spec, f"https://docs.google.com/document/d/cafe-posts-{i}", days_ago=20 - i * 8)
    pemba_jobs = [(JOB_THREADS_TIHAR, "https://drive.google.com/file/d/tiharTeaserFinal"),
                  (JOB_THREADS_UNBOX, "https://drive.google.com/file/d/scarfUnboxingFinal"),
                  *[(_reel(p), f"https://drive.google.com/file/d/reel-{i}") for i, p in enumerate(_PRODUCTS[:18])]]
    for i, (spec, link) in enumerate(pemba_jobs):
        _finished(session, anusha, threads, pemba, spec, link, days_ago=150 - i * 7)

    # 1. The live demo: Sita writes Sunita's opening-week captions (agreed and paid; she has accepted).
    captions = _agreed_and_started(session, rajan, momo, sita, JOB_MOMO_CAPTIONS, job_id=SITA_JOB)
    # Its room: the tasks they keep together, and the photos Rajan shared from Sunita.
    room.tasks(session, captions)
    first = room.add_task(session, sita, captions, "Read Sunita's menu and the opening offer", "")
    room.update_task(session, sita, captions, first.id, done=True, title=None, due_date=None)
    room.add_task(session, sita, captions, "Write the five English captions", str(date.today() + timedelta(days=1)))
    room.add_task(session, rajan, captions, "Add one Nepali line to each caption", str(date.today() + timedelta(days=2)))
    room.add_file(session, rajan, captions, "Photos of the new branch (from Sunita)",
                  "https://drive.google.com/drive/folders/momo-house-parramatta-photos")
    room.add_message(session, rajan, captions, "Sunita loves the jhol momo photo. Start the week with that one.")
    room.add_message(session, sita, captions, "Got it! I'll send the five captions tomorrow morning.")

    # 3. Bikash built the website from scratch; Nima approved it; it waits for Sunita to accept.
    site = _agreed_and_started(session, nima, momo, bikash, JOB_MOMO_WEBSITE, job_id=REVIEW_JOB)
    sub = work.submit(session, bikash, site, link="", content=WEBSITE_NOTE, note="")
    sub.link = SITE_URL_PATH  # the sample site the server hosts, so "Open the work" shows a real page
    session.add(sub)
    session.commit()
    work.approve(session, nima, sub.id)
    for task in room.tasks(session, site):
        room.update_task(session, bikash, site, task.id, done=True, title=None, due_date=None)
    for title in ("Menu with prices", "Opening hours and map", "Test on a phone 375px wide"):
        t = room.add_task(session, bikash, site, title, "")
        room.update_task(session, bikash, site, t.id, done=True, title=None, due_date=None)
    room.add_file(session, bikash, site, "First draft of the homepage", "https://www.figma.com/file/momo-house-draft")
    site.agreed_at = site.agreed_at - timedelta(days=5)  # agreed last week; due in 2 days
    session.add(site)
    session.commit()

    # Rajan wrote the next agreement after a call with Sunita; it waits for her to agree.
    work.anchor_create_job(session, rajan, MOMO_ID, dict(JOB_MOMO_EVENT), job_id=AGREE_JOB)

    # 2. Sunita posted the opening reel to everyone: Anusha (Team Leader) and Pemba (Mentor) can apply.
    work.create_job(session, momo, dict(JOB_MOMO_REEL), None, job_id=OPEN_JOB)

    # The history above is "already seen": the bell starts quiet, so it lights up only for the live demo.
    demo_ids = [u.id for u in session.exec(select(User).where(User.email.endswith(DEMO_DOMAIN))).all()]
    for n in session.exec(select(Notification).where(Notification.user_id.in_(demo_ids))).all():
        n.read = True
        session.add(n)
    session.commit()
