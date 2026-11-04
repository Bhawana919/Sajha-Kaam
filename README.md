# Sajha Kaam · साझा काम

**Nepali professionals abroad mentor young Nepalis at home on real client work, and every job
they sign off becomes proof that builds the member's career.**

It works like pilot training: a trainee flies beside an instructor who signs their logbook, and
step by step they are trusted to fly alone.

- **Team Leader:** a Nepali professional abroad who leads a team, brings clients and checks work.
- **Member:** a young Nepali in the team who does the work and builds a verified Work Record.
- **Client:** a business that agrees to a job agreement (written by their Team Leader from a fixed template), or posts one.

Badges, from new to experienced: ★ Starter · ★★ Learner · ★★★ Trusted · ★★★★ Pro · ★★★★★ Mentor.

## What's in this folder

| Folder | What it is |
|---|---|
| `backend` | API: FastAPI + SQLite. 52 automated tests. |
| `mobile` | App: Expo (phone and web browser), English and Nepali. |
| `config` | Skills, badges, the job agreement template, fair minimum budgets. |
| `shared` | The API contract the app's types are generated from. |

Tested: backend on Python 3.10 and 3.12; app type check, lint and translation checks pass;
the full demo story clicked through in a browser.

## Run on Windows

### 1. Before you start (once)

1. Unzip to a short folder **outside OneDrive**, for example `C:\dev\sajha-kaam`.
   OneDrive locks and syncs thousands of package files, which breaks installs.
2. Open **PowerShell** and allow local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2. Backend (PowerShell window 1)

```powershell
cd C:\dev\sajha-kaam\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\start.ps1
```

Open http://localhost:8000/docs to see the API. Leave this window open.
If Windows Firewall asks about Python, allow **Private networks**.

### 3. App (PowerShell window 2)

Expo SDK 58 supports Node 22.13+, 24.3+ or 26+. Node 25 may show `EBADENGINE` warnings;
if the app won't start, install Node 24 LTS from nodejs.org.

```powershell
cd C:\dev\sajha-kaam\mobile
npm install
Copy-Item .env.example .env
npx expo start -c
```

- **In the browser (easiest for the demo):** press `w`.
- **On a phone with Expo Go:** in `mobile\.env`, change `localhost` to your laptop's IPv4
  address from `ipconfig` (phone on the same Wi-Fi), then restart with `npx expo start -c`
  and scan the QR code.

### 4. Tests (optional)

```powershell
cd C:\dev\sajha-kaam\backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q

cd C:\dev\sajha-kaam\mobile
npm run check
```

## Host it free (one link for the demo)

The [Dockerfile](Dockerfile) builds the web app and the API into one container, so the app and API share one
address. On [Render](https://render.com): sign in with GitHub → **New** → **Blueprint** → pick this repo.
[render.yaml](render.yaml) sets everything up on the Starter plan, which never sleeps. The first build takes
about 10 minutes.

- No card or credit? Change `plan: starter` to `plan: free`. The free plan sleeps after 15 minutes without
  visitors and takes about a minute to wake, so open the link a few minutes before presenting.
- **Video uploads** (Mentors applying for a job): add the environment variable `CLOUDINARY_URL` on Render,
  copied from the Cloudinary dashboard ("API environment variable", `cloudinary://key:secret@cloud`). Videos go
  straight from the phone to Cloudinary; the server only signs each upload, so the secret stays on Render.
  Without it, members paste a YouTube, Google Drive, Vimeo or Loom link instead.
- The database is temporary on purpose: every deploy or restart brings back fresh demo data
  (or reset any time: `POST /demo/reset`).

## Android app (APK)

GitHub builds the Android app by itself whenever the app changes ([workflow](.github/workflows/android-apk.yml)),
and attaches it to the **Android app (latest)** release of this repo. To install: open the release page on
an Android phone, tap **sajha-kaam.apk**, then **Install** (allow "install unknown apps" if asked: it's a
test app, not from the Play Store). The app uses the live server, so it shows the same data as the website.
iPhones use the website.

## Demo people

**The story:** Himalayan Momo House, a Nepali family restaurant in Sydney, opens a second branch in
Parramatta on 21 November. The owner needs opening-week captions, an opening reel and a new website,
each made by a team in Nepal led by a Nepali professional abroad.

On the welcome screen, tap a person to sign in. Password for all: `kaam-demo`.

| Person | Role |
|---|---|
| Sunita Basnet | Client · Himalayan Momo House, Sydney · the website is ready for her; the reel has applicants; an agreement waits for her |
| Rajan Shrestha | Team Leader · digital marketer, Sydney · Social Media Team (copywriting) |
| Anusha Gurung | Team Leader · video editor, London · 2 open spots, 1 team application waiting |
| Nima Lama | Team Leader · web developer, Toronto · Web Team |
| Sita Thapa | Member · copywriting · ★★ Learner (2 verified jobs) · writing the opening-week captions now |
| Bikash Tamang | Member · web · ★★★ Trusted (5 verified jobs, all first time) · built the new website |
| Pemba Sherpa | Member · video · ★★★★★ Mentor (20 verified jobs over five months) · can apply for the reel |
| Asha Rai | Member · video · has asked to join Anusha's team (the waiting application) |
| Emma Clarke, Sunil Karki | Earlier clients (Harbour Café, Melbourne; Himal Threads, Toronto) whose jobs earned the badges |

Fresh sample data at any time: `curl.exe -X POST http://localhost:8000/demo/reset`
(hosted: open `/docs`, then **POST /demo/reset → Try it out → Execute**).

## The 5-minute demo

1. **The captions, checked live.** **Sita** opens "Instagram captions for our opening week" and pastes her
   first draft (in [backend/app/seed.py](backend/app/seed.py) as `CAPTIONS_V1`): five captions without a
   Nepali line or the hashtag. The quick check shows **2 of 4** and quotes **Rajan's own advice**:
   "Every post needs one line in Nepali…" and "Every caption ends with #MomoHouseParramatta…".
2. **Rajan** asks for changes with a short note. **Sita** pastes the fixed version (`CAPTIONS_V2`):
   **4 of 4**. Rajan approves.
3. **Sunita** reads the captions and taps **Accept**. The demo money is paid out: Sita gets 60% as
   ★★ Learner. **Sita's Work Record** shows the verified job with a QR code.
4. **The reel, posted to everyone.** **Pemba** (★★★★★ Mentor) opens "30-second opening reel for our new
   branch", uploads his 2-minute video and taps **Apply**. **Sunita** compares Pemba and Anusha's team
   (badges, verified jobs, video), chooses Pemba and pays. Pemba gets 80%; Anusha still checks his work.
5. **The website, from scratch.** **Sunita** opens "A one-page website for our Parramatta branch",
   taps **Open the work** (a real page, served at `/samples/momo-house`) and accepts it.
6. **The job room.** Once the agreement is final, each job gets a **Room** tab: the deadline, a task list
(it starts from the agreement's deliverables; the member and the Team Leader add, tick and date tasks)
and files (links, photos and videos). The client follows the tasks and the deadline; drafts stay between
the member and the Leader, and the client sees the work once the Leader approves it.

**Work limits.** Nobody can promise more than they can do well:

| Who | Limit |
|---|---|
| Member, jobs in hand at once | ★ 1 · ★★ 2 · ★★★ 2 · ★★★★ 3 · ★★★★★ 3, and at most one per 10 hours a week they said they have |
| Team Leader, jobs supervised at once | 8 (at most 2 of them by Starters) |
| Team size | 8 members |

Screens show it as "1/2 jobs in hand" and "supervising 1 of 8". The numbers are in [config/guthi.yaml](config/guthi.yaml).

**Fair by design.** **Rajan → Team**: badges go up by the rules, what each member needs next, and how
   jobs were shared. Tap **नेपाली** to show the whole app in Nepali.

## How the main parts work

**Clients join** by a Team Leader's invite code (main way at the start) or directly. They don't install
anything: the client side works in a browser.

**The agreement comes first.** Usually the Team Leader writes it after a call with the client and the client
taps Agree; a client can also write it and send it to their Team Leader, who agrees. Whoever wrote the
latest version waits for the other side. No member sees a job before both agree. After that, a new
deadline or budget is an amendment the client must accept. The member gets a short job offer (what to
deliver, "finished when", deadline, their share, no client details) and taps "I accept" before starting.

**A job posted to everyone.** A client can also post a job without choosing a Team Leader. Team Leaders
with that skill, and members who are ★★★★★ Mentor in a team with that skill, can apply; nobody else sees
it. Applying means agreeing to the agreement as written. The client sees who applied (badge, verified jobs,
a Mentor's Work Record) and chooses one. A chosen Team Leader gives it to their team as usual; a chosen
Mentor starts straight away, and their own Team Leader still checks the work before the client sees it.

**The agreement template** is a fixed form like a Europass CV, with extra questions per skill, "like
this / not like this" examples, and a rule check for missing parts, vague "finished when"
items and budgets below the fair minimum.

**Members join a team**, not a single job. Opening spots notifies everyone with the skill. The
Team Leader reviews requests blind: no name, district, about-me text or mother tongue.

**Badges go up automatically** (★ Starter, ★★ Learner, ★★★ Trusted, ★★★★ Pro, ★★★★★ Mentor). When a client
accepts a job, the member's record in that skill, across all teams, is checked against public rules
([config/guthi.yaml](config/guthi.yaml)):

| Badge | Rule |
|---|---|
| ★★ Learner | 2 verified jobs |
| ★★★ Trusted | 5 verified jobs, the last 3 approved first time |
| ★★★★ Pro | 10 verified jobs, 80% approved first time, the last 5 on time |
| ★★★★★ Mentor | 20 verified jobs, 90% approved first time, the last 10 on time |

Nothing lowers a badge automatically. The Team Leader can only **lower** a badge or **pause the next
promotion once**, both with a written reason the member sees. Members see what they still need for the
next badge.

**Pay follows the badge.** Sajha Kaam always takes 15%; the member's share rises with their badge and the
rest goes to the Team Leader who checks the work (more checking and teaching for newer members):

| Badge on the job | Member | Team Leader (checker) | Sajha Kaam |
|---|---|---|---|
| ★ Starter | 50% | 35% | 15% |
| ★★ Learner | 60% | 25% | 15% |
| ★★★ Trusted | 70% | 15% | 15% |
| ★★★★ Pro | 78% | 7% | 15% |
| ★★★★★ Mentor | 80% | 5% | 15% |

**Fair by design.** A Team Leader supervises at most 2 jobs by Starters at once (like an instructor's limit
of student pilots), and everyone in the team sees how many jobs each member got in the last 30 days.

**The quick check** is plain rules: it compares the work with the "finished when" list and quotes the
Leader's closest past note. Only the Leader decides.

**Money (demo, no real payments).** After agreeing, the client taps Pay: the budget shows as held until
they accept the work, then as paid out in the split for the member's badge (table above). Once
paid, only the deadline can change, not the budget. The Team Leader's Today screen shows deadlines for
every job in progress and the team's earnings; each member sees what they have earned.

## Troubleshooting

| Problem | Fix |
|---|---|
| `running scripts is disabled on this system` | Run the `Set-ExecutionPolicy` line in step 1. |
| `py` is not recognized | Use `python -m venv .venv` instead. |
| App says it can't reach Sajha Kaam | Is the backend window still running? On a phone: correct IP in `mobile\.env`, same Wi-Fi, firewall allows Python, then `npx expo start -c`. |
| Port 8000 already in use | `.\start.ps1 -Port 8001`, and use `:8001` in `mobile\.env`. |
| `EPERM`, `EBUSY` or "Long Path" errors | The folder is inside OneDrive or too deep. Move it to `C:\dev\sajha-kaam`. |
| Laptop slows down (8 GB RAM) | Close other apps; start with `npx expo start -c --max-workers 2`. |
| Old data after code changes | Stop the backend, delete `backend\sajha_kaam.db`, start again. |

## Notes

- New Nepali text is a draft for a Nepali reviewer.
- Not built yet: real payments, team investment by Team Leaders, a time-zone calendar file, Viber or
  WhatsApp messages.
