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
| `backend` | API: FastAPI + SQLite. 31 automated tests. |
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
address. On [Render](https://render.com) (free plan, no card): sign in with GitHub → **New** → **Blueprint** →
pick this repo. [render.yaml](render.yaml) sets everything up. The first build takes about 10 minutes.

- The free plan sleeps after 15 minutes without visitors; the next visit takes about a minute. Open the
  link a few minutes before presenting.
- The database is temporary: every restart brings back fresh demo data.

## Demo people

On the welcome screen, tap a person to sign in. Password for all: `kaam-demo`.

| Person | Role |
|---|---|
| Rajan Shrestha | Team Leader · web developer, Sydney · team: Bikash (★★★ Trusted), Sita (★★ Learner) |
| Anusha Gurung | Team Leader · video editor, London · 2 open spots, 1 team application waiting |
| Sita Thapa | Member · has a café menu job to do now |
| Bikash Tamang | Member · 2 verified jobs, 1 waiting for Rajan's check |
| Pemba Sherpa | Member · ★★★★★ Mentor in Anusha's video team, 2 verified jobs · can apply for open client jobs |
| Asha Rai | Member · video · has asked to join Anusha's team (the waiting application) |
| Emma Clarke | Client · Harbour Café, Melbourne (Rajan's client) · 1 agreement waiting for her |
| Sunil Karki | Client · Himal Threads, Toronto · posted an open video job that Anusha or Pemba can apply for |

Fresh sample data at any time: `curl.exe -X POST http://localhost:8000/demo/reset`

## The 3-minute demo

1. **Sita** opens "Make the café menu page work on phones" and pastes weak work:
   `<button>Order</button> <table class='menu'>prices</table>`.
   The quick check flags all four "finished when" points and **quotes Rajan's own past notes**
   for each.
2. **Rajan** opens his Today screen, checks the work and asks for changes with a note.
   The note is also added to his notes for future checks.
3. **Sita** fixes it and sends again; the check now shows 4 of 4.
4. **Rajan** approves. **Emma** (the café) accepts.
5. **Sita's Work Record** shows a verified job: "Done as ★★ Learner · approved by Rajan Shrestha ·
   accepted by a client in Australia", with a QR code. Open the link to see the public page.
6. **The agreement first:** on Rajan's Today screen, "Show opening hours and a map" is waiting for the
   client. **Emma** opens it and taps **Agree** (or asks for changes). **Rajan** gives it to
   Sita; **Sita** sees a job offer with her share ($37.50) but not the client's name, and taps
   **I accept**. Rajan can then propose a new deadline or budget, which Emma must accept.
7. Show **Anusha's blind team applications** ("Applicant A", no name) and **Rajan's Team** screen
   (badges with the facts behind them, invite a client).
8. **A job posted to everyone:** **Pemba** (★★★★★ Mentor) opens "30-second Dashain sale reel" on his home
   screen and taps **Apply**; **Anusha** can apply too. **Sunil** sees both under "Choose who does it",
   with badges, verified jobs and Pemba's Work Record, and chooses Pemba. Pemba starts straight away,
   and Anusha still checks his work before Sunil sees it.

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

**Badges** (★ Starter, ★★ Learner, ★★★ Trusted, ★★★★ Pro, ★★★★★ Mentor) change only when the Team Leader decides,
using facts the app shows.

**The quick check** is plain rules: it compares the work with the "finished when" list and quotes the
Leader's closest past note. Only the Leader decides.

**Money (demo, no real payments).** After agreeing, the client taps Pay: the budget shows as held until
they accept the work, then as paid out in the split (75% member, 10% Team Leader, 15% platform). Once
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
