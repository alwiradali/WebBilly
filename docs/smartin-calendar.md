# SMARTin SCIENCE — the timetable, from Rod's Google Calendar

Rod keeps class dates in Google Calendar. The timetable page reads that
calendar and lists the sessions in it, so the page shows real dates instead of
saying they are confirmed on enquiry. He adds a class on his phone; the site
shows it within minutes.

**One direction only.** The site never writes to his calendar, never books
anything, and never asks a visitor to sign in. Nothing of his is stored on
the site.

## Until it is set up, nothing changes

The two values below are absent by default. Without them the page fetches
nothing and keeps exactly the words it has today. A build with no calendar is
not a broken build, and the site never shows an empty timetable under a
heading promising dates — if the calendar is unreachable, empty, or the answer
is not what we expect, the page silently stays as it was.

## Step 1 — a calendar made for this, not his own

**Make a new calendar. Do not use his personal one.** The calendar has to be
public for the site to read it, and public means anyone who finds the address
can read every event in it — every title, every time. His own diary will have
things in it that are nobody's business.

In Google Calendar, on a computer:

1. **Other calendars → + → Create new calendar.** Name it something like
   `SMARTin SCIENCE classes`. Create it.
2. Open **Settings for that calendar** → **Access permissions for events** →
   tick **Make available to public**. Leave it on *See all event details*.
3. Same page, **Integrate calendar** → copy the **Calendar ID**. It looks like
   `abc123...@group.calendar.google.com`.

Then put the classes in it. The page draws a month grid with a filter per
year group, so **put the year in the title**:

| He types | Parents see |
| --- | --- |
| `Y10 Biology — Week 1` | under **Year 10**, chip reads "Biology — Week 1" |
| `Y9-Y11 Masterclass: Required Practicals` | under **all three** years — a range is read as a range |
| `STEM club at Alwoodley Primary` | under **Other sessions** |
| `Off — half term` (all-day) | that day is struck through, no session drawn |

Nothing is ever dropped for not matching a pattern: a title with no year still
appears, under "Other sessions". Repeating events are fine — Google expands
them, so "every Tuesday for four weeks" is listed as four dates, and
cancelling a single occurrence removes just that date from the site.

Tapping a session takes the parent to the enquiry form with that year group
already selected.

The grid opens on the first month that has something in it, so an empty
current month during the holidays never reads as "no classes".

## Step 2 — an API key

The page reads the calendar through Google's Calendar API, which needs a key.

1. <https://console.cloud.google.com> → create a project (any name).
2. **APIs & Services → Library →** enable **Google Calendar API**.
3. **Credentials → Create credentials → API key.**
4. **Restrict the key** before leaving the page. Both restrictions matter:
   - **API restrictions:** Google Calendar API only.
   - **Application restrictions:** Websites, and add
     `https://smartinscience.co.uk/*` and `https://www.smartinscience.co.uk/*`.
     Add `https://billydigitals.com/*` too if the preview copy should show the
     timetable as well.

A key restricted that way can do one thing: read a calendar that is already
public, from his own site. It is served in the page, which is how Google
intends this to work — but it still does not belong in the repository, for the
same reason no other client credential does.

## Step 3 — tell the build

Two repository secrets, in GitHub → Settings → Secrets and variables →
Actions:

| Secret | Value |
| --- | --- |
| `SMARTIN_GCAL_ID` | the Calendar ID from step 1 |
| `SMARTIN_GCAL_KEY` | the API key from step 2 |

The deploy workflow passes both to the build, which writes them into the
timetable page. Push anything, and the next deploy has it.

## Checking it worked

The build says which state it is in, without ever printing the key:

```
  timetable reads his Google Calendar (id ends ...)
  no calendar configured — the timetable keeps "confirmed when you enquire"
```

On the page itself, the heading changes from *Confirmed when you enquire* to
*What is running, and when* only once real dates are on the screen. If the heading
has not changed, nothing was listed — open the browser console, where the
reason is logged as `[timetable] calendar not shown — …`.

Common causes: the calendar is not actually public; the key is restricted to
the wrong domain; the API is not enabled on the project; or there is genuinely
nothing in the next six months (the window the page asks for, set by
`data-months` on the page).

## A caveat worth saying out loud to him

Everything in that calendar is public the moment he adds it. If he puts a
student's name in an event title, that name is on the internet. Titles should
be the class, never the child.
