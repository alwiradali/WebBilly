# SMARTin SCIENCE — the timetable, from Rod's Google Calendar

Rod keeps his class dates in a Google Calendar on his phone. The timetable
page reads that calendar and draws a month grid from it, so he adds a class
and the site shows it. One direction only: the site never writes to his
calendar, never books anything, and never asks a visitor to sign in.

**This is set up and working.** What follows is what was done, how to change
it, and the two things that are still waiting on something else.

## What is wired up

| | |
| --- | --- |
| Calendar | `SMARTin Science website classes`, in Rod's own Workspace account, public |
| Calendar ID | `c_acb9133c2ddc099403dd16903402dd8524924fe57dc083194d729d78a40c23db@group.calendar.google.com` |
| API key | in `templates/smartin/timetable.html`, restricted (below) |
| Page | `/timetable` |

Both values are attributes on `#timetable-body` in the timetable page. The
build can override them from `SMARTIN_GCAL_ID` and `SMARTIN_GCAL_KEY` if those
repository secrets exist, so the key can be rotated without a code change;
neither being set is the ordinary case.

## Why the key is in the page

Because that is where Google expects a browser key to be, and because it
cannot do anything that was not already possible. The calendar is public — its
`.ics` feed is readable by anyone who has the address — and the key is
restricted to the Calendar API and to Rod's two domains. Checked from outside:

```
https://smartinscience.co.uk/        200   reads the calendar
https://www.smartinscience.co.uk/    200   reads the calendar
https://billydigitals.com/           403   blocked
no referer at all                    403   blocked
```

**Do not remove those restrictions.** Unrestricted, the key is readable in the
page source and usable by anyone, against Rod's quota. Restricted, it reads
one public calendar from one site.

If it ever does need replacing: new key in the same Google Cloud project,
restrict it the same way, put it in the page (or in `SMARTIN_GCAL_KEY` and
leave the page alone), then delete the old one.

## Naming events

The grid filters by year group, so put the year in the title:

| He types | Parents see |
| --- | --- |
| `Y10 Biology — Week 1` | under **Year 10**, chip reads "Biology — Week 1" |
| `Y9-Y11 Masterclass: Required Practicals` | under **all three** years — a range is read as a range |
| `STEM club at Alwoodley Primary` | under **Other sessions** |
| `Off — half term` (all-day) | that day is struck through, no session drawn |

Nothing is dropped for not matching a pattern: a title with no year still
appears, under "Other sessions". Repeating events are fine — Google expands
them, so "every Tuesday for four weeks" lists as four dates, and cancelling a
single occurrence removes just that date from the site. The **location** field
is shown; the description is not.

Tapping a session takes the parent to the enquiry form with that year group
already selected. The grid opens on the first month that has something in it,
so an empty current month during the holidays never reads as "no classes".

**Nothing in that calendar is private.** If a student's name goes in an event
title, that name is on the internet. Titles are the class, never the child.

## The two things still waiting

**It is not visible anywhere yet.** The key deliberately does not allow
`billydigitals.com`, so the preview copy keeps the "Confirmed when you
enquire" wording — correctly, that is the restriction working. The only place
it can appear is `smartinscience.co.uk`, and that domain has never had a
deploy: the workflow's deploy step is skipped because
`CLOUDFLARE_API_TOKEN_SMARTIN` and `CLOUDFLARE_ACCOUNT_ID_SMARTIN` are not set.
Set those two and his site goes up with the calendar on it.

To see it on the preview before then, add `https://billydigitals.com/*` to the
key's website restrictions in Google Cloud, and take it off again afterwards.

**The calendar is empty.** Until Rod puts a class in it, the page has nothing
to show and keeps its existing wording — which is the intended behaviour, not
a failure.

## Checking it

The build says what the page carries, without printing the key:

```
  timetable reads his Google Calendar
  no calendar in the timetable page — it keeps "confirmed when you enquire"
```

On the page, the heading changes from *Confirmed when you enquire* to *What is
running, and when* only once real dates are on screen. If it has not changed,
nothing was listed — the browser console says why, as
`[timetable] calendar not shown — …`.

Likely causes, in order: the calendar is genuinely empty for the next six
months (the window the page asks for, set by `data-months`); the page is being
viewed on a domain the key does not allow; the key was replaced without the
restrictions being reapplied; the calendar stopped being public.
