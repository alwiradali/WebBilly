#!/usr/bin/env python3
"""
Build the HeatFix area pages.

Fifteen of them, one per place he actually works, at /boiler-repair-<area>.
They are deliberately NOT linked from the site: nothing in the nav, the footer
or the areas grid points at them. They exist to be found in a search for
"boiler repair didsbury", which is what people type, and they reach Google
through the sitemap instead of through the menu.

Why a script rather than fifteen hand-written files: the wrapper is identical
on every page and the wrapper is not the point. What has to differ is the
writing, and it does -- each area carries its own housing stock, its own
heating consequence of that housing, its own postcodes and its own opening
paragraph. Fifteen pages with a town name swapped into the same sentences is
the thing Google calls doorway pages, and it can pull down the whole site.

The AREAS table below is the content. Add an entry, run the script, then add
the slug to HEATFIX_PAGES and HEATFIX_PUBLIC in worker.js.

    python3 scripts/build-heatfix-areas.py
"""

import html
import json
import os
import re

OUT = "templates"
SITE = "https://heatfixmcrlimited.co.uk"
PHONE_LINK = "+447890452629"
PHONE = "07890 452629"
GAS_SAFE = "627019"

# --- the content ------------------------------------------------------------
# name      what the place is called
# postcodes the ones that actually cover it
# kick      the single line under the h1
# intro     opening paragraph, unique to the area
# housing   heading + paragraph + four bullets about what is in those streets
# second    heading + paragraph + four bullets, the job that follows from it
# near      slugs of neighbouring area pages, for the "nearby" line
AREAS = [
    {
        "slug": "didsbury", "name": "Didsbury", "postcodes": "M20",
        "kick": "Boilers, heating and gas work across Didsbury.",
        "intro": "Didsbury runs from the big Victorian and Edwardian villas along Wilmslow Road "
                 "to the 1930s semis behind them, and a good number of those villas were divided "
                 "into flats years ago. The two are completely different heating problems in the "
                 "same postcode, and they are both a short drive from us.",
        "h2a": "Big old houses and converted flats",
        "pa": "A house built for one family and later split into three has pipework that grew "
              "the same way: long runs, a boiler wherever there was space for a flue, and a "
              "combi asked to serve a bathroom two floors above it. In the villas that stayed "
              "whole, the usual trouble is the opposite, a boiler chosen on price rather than on "
              "the number of radiators it has to fill. Both get the same answer: the heat "
              "requirement is worked out for the property, not guessed from the size of the old one.",
        "la": ["Combis in converted flats, long runs and weak pressure",
               "Correctly sized boilers for large Victorian houses",
               "Radiator counts and balancing across three floors",
               "Old gravity systems converted to fully pumped"],
        "h2b": "Servicing, safety certificates and repairs",
        "pb": "Plenty of Didsbury is let, either whole or as flats, so landlord gas safety "
              "certificates are a regular part of the week here. If you own one property or "
              "fifteen, the certificate is the same certificate and it is issued on the visit.",
        "lb": ["Boiler breakdowns and repairs",
               "Annual servicing, recorded for the warranty",
               "Landlord gas safety certificates (CP12)",
               "New boilers, quoted in writing before anything starts"],
        "near": ["withington", "chorlton", "burnage"],
    },
    {
        "slug": "chorlton", "name": "Chorlton", "postcodes": "M21",
        "kick": "Boilers, heating and gas work across Chorlton.",
        "intro": "Chorlton is mostly Victorian and Edwardian: terraces and semis with bay "
                 "windows, cellars, and heating systems that have been added to by four "
                 "different people over ninety years. It is one of the areas we are in most weeks.",
        "h2a": "Old houses, newer boilers, older pipework",
        "pa": "The boiler in a Chorlton terrace is usually the newest thing in the system. "
              "Behind it there is often original steel or cast iron pipework, a cellar with the "
              "stopcock in it, and radiators that have been moved for a kitchen extension. That "
              "is why a house here can have a five-year-old combi and still run cold at one end: "
              "the fault is rarely the boiler, and replacing it would not have fixed it.",
        "la": ["Cold radiators, sludge and power flushing",
               "Back boilers removed and replaced with a combi",
               "Cellar pipework, stopcocks and frozen runs",
               "Systems rebalanced after an extension"],
        "h2b": "What we get called out for here",
        "pb": "A terrace with a cellar has its own emergencies. A burst on old pipework empties "
              "into the cellar rather than through a ceiling, so it can run for a long time "
              "before anybody notices. Find your stopcock before you need it, and if water is "
              "running now, ring rather than fill in a form.",
        "lb": ["Boiler breakdowns and no heating or hot water",
               "Leaks and burst pipework traced and repaired",
               "Annual servicing and gas safety certificates",
               "Cookers, hobs and gas fires connected and tested"],
        "near": ["didsbury", "withington", "sale"],
    },
    {
        "slug": "withington", "name": "Withington", "postcodes": "M20 and M14",
        "kick": "Boilers, heating and landlord certificates in Withington.",
        "intro": "Withington is terraces and semis, and a large share of it is let, much of it "
                 "to students on a September-to-June year. That shapes the work here more than "
                 "the buildings do.",
        "h2a": "Let houses, and the summer window",
        "pa": "In a house that changes tenants every summer, the boiler gets a hard year and a "
              "quiet fortnight. That fortnight is when the servicing, the certificate and any "
              "repair should happen, because the alternative is a call-out in November with six "
              "people in the house and no hot water. Book the empty weeks and you buy yourself "
              "the whole year.",
        "la": ["Landlord gas safety certificates (CP12), issued on the visit",
               "Servicing and repairs booked into the void weeks",
               "Every gas appliance covered, cookers and fires included",
               "Certificates and invoices sent the same way every time"],
        "h2b": "Repairs and replacements",
        "pb": "The rest is the same work as anywhere: boilers that lock out, radiators cold at "
              "the top, hot water that has gone lukewarm. Nothing here is charged for looking, "
              "and you get told whether it is worth repairing before it is repaired.",
        "lb": ["Boiler breakdowns and fault codes",
               "New boilers and combi conversions",
               "Radiators, valves and thermostats",
               "Leaks, taps, toilets and showers"],
        "near": ["didsbury", "fallowfield", "burnage"],
    },
    {
        "slug": "burnage", "name": "Burnage", "postcodes": "M19",
        "kick": "Boilers, heating and gas work across Burnage.",
        "intro": "Burnage is mostly interwar: 1930s semis, some later estate housing, kitchens "
                 "and garages that have had a boiler in them since long before combis were "
                 "normal. It is five minutes from us and one of the areas we cover every week.",
        "h2a": "1930s semis and what is left in them",
        "pa": "A house of this age has usually been through two or three boilers, and each one "
              "was fitted around whatever was already there. The flue goes where the last flue "
              "went, the pipework is a mix of ages, and there is often a hot water cylinder "
              "sitting redundant in the airing cupboard. None of that is a problem in itself, "
              "but it is worth knowing about before anybody quotes for a swap.",
        "la": ["Boiler swaps in kitchens and garages",
               "Back boilers and old floor-standing units removed",
               "Redundant cylinders and tanks taken out",
               "Pipework upgraded where the old runs will not do"],
        "h2b": "Servicing, repairs and certificates",
        "pb": "The yearly service is the thing that keeps the warranty alive and catches the "
              "fault before January does. If you let the property, the gas safety certificate is "
              "a legal requirement every twelve months and it covers the cooker and the fire too.",
        "lb": ["Annual boiler servicing",
               "Breakdowns, no heating and no hot water",
               "Landlord gas safety certificates (CP12)",
               "Radiators, valves and power flushing"],
        "near": ["levenshulme", "withington", "heaton-moor"],
    },
    {
        "slug": "levenshulme", "name": "Levenshulme", "postcodes": "M19",
        "kick": "Boilers, heating and gas work across Levenshulme.",
        "intro": "Levenshulme is Victorian terraces, a lot of them let, with small kitchens and "
                 "systems that have been patched rather than replaced. It is on our doorstep, "
                 "which is what makes a same-day visit realistic here.",
        "h2a": "Terraces, small kitchens and old systems",
        "pa": "The heating in a Levenshulme terrace is usually working around a shortage of "
              "space. The boiler is in the only cupboard that would take it, the flue had to go "
              "out of one particular wall, and the pipework runs the long way to get there. When "
              "one of these houses runs cold at the far end, the cause is normally that long run "
              "and the sludge sitting in it, not the boiler on the wall.",
        "la": ["Cold radiators, sludge and power flushing",
               "Boiler replacements where space is tight",
               "Old back boilers removed",
               "Thermostats and controls that actually get used"],
        "h2b": "Landlords and letting agents",
        "pb": "A good share of the street is rented, and a certificate that runs out is not a "
              "small problem. If you hold more than one property here, send the list and it comes "
              "back as one quote covering the lot rather than a stack of separate call-outs.",
        "lb": ["Landlord gas safety certificates (CP12)",
               "Checks and services planned around your renewal dates",
               "Every gas appliance in the property",
               "Copies for you and for the tenant"],
        "near": ["burnage", "heaton-chapel", "fallowfield"],
    },
    {
        "slug": "fallowfield", "name": "Fallowfield", "postcodes": "M14",
        "kick": "Landlord certificates, boilers and gas work in Fallowfield.",
        "intro": "Fallowfield is one of the most heavily let parts of Manchester, and most of "
                 "the gas work here is on houses somebody else lives in. That changes what "
                 "matters: dates, access, and paperwork that arrives in the same format every "
                 "time.",
        "h2a": "Houses in multiple occupation",
        "pa": "A shared house has more gas appliances, more people using them and more wear on "
              "all of it than a family home. The certificate has to cover every appliance, not "
              "just the boiler, and that includes the cooker in the kitchen and any fire that "
              "has been left in a bedroom. Where an appliance is unsafe it gets capped and you "
              "are told why, in writing, on the day.",
        "la": ["Gas safety certificates covering every appliance",
               "Cookers, hobs and gas fires checked and tested",
               "Unsafe appliances capped, with the reason in writing",
               "Access arranged around the tenants, not against them"],
        "h2b": "Repairs between tenancies",
        "pb": "The empty weeks in summer are the sensible time for anything that is not urgent. "
              "Servicing, a boiler that has been struggling, radiators that never warmed up "
              "properly last winter: all easier with nobody in the house.",
        "lb": ["Annual servicing recorded for the warranty",
               "Boiler repairs and replacements",
               "Radiators, valves and balancing",
               "Leaks, taps, toilets and showers"],
        "near": ["withington", "levenshulme", "didsbury"],
    },
    {
        "slug": "stockport", "name": "Stockport", "postcodes": "SK1, SK2 and SK3",
        "kick": "Boilers, heating and gas work across Stockport.",
        "intro": "Stockport covers more kinds of housing than anywhere else we work: town centre "
                 "apartments, Victorian terraces on the hill, postwar semis and everything "
                 "converted in between. Half of what we do is on this side of the border.",
        "h2a": "Apartments, terraces and everything between",
        "pa": "An apartment and a terrace fail in different ways. In a flat it is usually the "
              "combi struggling with a shower two rooms away, or an unvented cylinder that has "
              "lost the charge in its expansion vessel and started dripping at the tundish. In "
              "the older houses it is the system rather than the appliance: sludge, a pump on "
              "its way out, or a boiler quietly losing pressure through a valve on an outside wall.",
        "la": ["Unvented cylinders installed and serviced",
               "Boilers losing pressure, traced rather than topped up",
               "Combi replacements in flats and apartments",
               "Power flushing and system cleaning"],
        "h2b": "Repairs, servicing and certificates",
        "pb": "Everything else is the ordinary work: a service that keeps the warranty valid, a "
              "breakdown seen the same day where there is a gap, and landlord certificates "
              "issued on the visit. Quoting is free and there is no charge for coming to look.",
        "lb": ["Boiler breakdowns and fault finding",
               "New boilers, quoted in writing",
               "Annual servicing",
               "Landlord gas safety certificates (CP12)"],
        "near": ["heaton-moor", "heaton-chapel", "cheadle"],
    },
    {
        "slug": "heaton-moor", "name": "Heaton Moor", "postcodes": "SK4",
        "kick": "Boilers, heating and gas work in Heaton Moor and the Heatons.",
        "intro": "Heaton Moor and the streets around it are large Victorian and Edwardian family "
                 "houses, most of them still whole rather than divided. Big houses have big "
                 "heating systems, and that is a different job from a two-bedroom flat.",
        "h2a": "Bigger houses, more radiators, more hot water",
        "pa": "Fifteen radiators and two bathrooms is more than most combis are built for. A "
              "house this size is usually better on a system boiler and a properly sized "
              "unvented cylinder, so two showers can run at once without either of them going "
              "cold. That is a calculation, not an opinion, and you get shown the working before "
              "you decide.",
        "la": ["System boilers and unvented cylinders sized properly",
               "Two bathrooms running at once without losing pressure",
               "Zoned heating and controls for larger houses",
               "Radiator sizing and balancing across three floors"],
        "h2b": "Servicing and repairs",
        "pb": "An unvented cylinder needs servicing every year, the same as the boiler, and it "
              "needs an engineer with the separate qualification for it. If the tundish above "
              "yours has started running, that is nearly always the expansion vessel rather than "
              "the cylinder itself.",
        "lb": ["Annual boiler and cylinder servicing",
               "Breakdowns and fault codes",
               "Landlord gas safety certificates (CP12)",
               "Leaks, valves and pipework"],
        "near": ["heaton-chapel", "stockport", "burnage"],
    },
    {
        "slug": "heaton-chapel", "name": "Heaton Chapel", "postcodes": "SK4",
        "kick": "Boilers, heating and gas work in Heaton Chapel.",
        "intro": "Heaton Chapel is a mix: Victorian and Edwardian terraces near the station, "
                 "interwar semis behind them, and a fair number of houses that have been "
                 "extended out the back. We are here most weeks.",
        "h2a": "What an extension does to the heating",
        "pa": "A kitchen extension adds a room the boiler was never sized for and moves at least "
              "one radiator. The house then runs cold in the room furthest from the pump, and "
              "everybody blames the boiler. Usually the fix is balancing, a correctly sized "
              "radiator in the new room, and cleaning the system, not a replacement.",
        "la": ["Systems rebalanced after an extension",
               "Radiators sized for the room they are actually in",
               "Underfloor heating and new zones tied in",
               "Power flushing and inhibitor"],
        "h2b": "Boilers, servicing and certificates",
        "pb": "The rest is the usual: annual servicing recorded so the warranty stands, "
              "breakdowns seen the same day where there is a gap, and certificates for anybody "
              "letting a property here.",
        "lb": ["Boiler breakdowns and repairs",
               "New boilers and combi conversions",
               "Annual servicing",
               "Landlord gas safety certificates (CP12)"],
        "near": ["heaton-moor", "levenshulme", "stockport"],
    },
    {
        "slug": "cheadle", "name": "Cheadle", "postcodes": "SK8",
        "kick": "Boilers, heating and gas work across Cheadle.",
        "intro": "Cheadle is largely interwar and postwar semis with a steady amount of newer "
                 "housing mixed in, which makes it the most straightforward kind of boiler work "
                 "there is. It is also one of the closest places to us, so same-day is realistic.",
        "h2a": "Straight swaps, done properly",
        "pa": "A combi in the same position as the old one is normally a one-day job. What "
              "separates a good one from a cheap one is not the day itself: it is whether the "
              "system was cleaned first, whether an inhibitor and a filter went in, and whether "
              "the Benchmark checklist was filled in and signed, because without that last one "
              "the manufacturer's warranty is worth very little.",
        "la": ["Combi swaps in the same position, usually one day",
               "System cleaned, inhibitor and magnetic filter fitted",
               "Benchmark checklist completed and signed on the day",
               "Registered with the manufacturer before we leave"],
        "h2b": "Servicing and repairs",
        "pb": "Then the yearly service keeps it valid, and catches the blocked condensate or the "
              "tired seal in October rather than on Christmas Eve. Breakdowns are diagnosed "
              "before anything is bought, and you are told whether the repair is worth doing.",
        "lb": ["Annual servicing",
               "Boiler breakdowns and fault finding",
               "Radiators, valves and thermostats",
               "Landlord gas safety certificates (CP12)"],
        "near": ["cheadle-hulme", "gatley", "stockport"],
    },
    {
        "slug": "cheadle-hulme", "name": "Cheadle Hulme", "postcodes": "SK8",
        "kick": "Boilers, heating and gas work in Cheadle Hulme.",
        "intro": "Cheadle Hulme leans towards larger semis and detached houses, a good number of "
                 "them with more than one bathroom. That is the detail that decides what should "
                 "go on the wall.",
        "h2a": "More than one bathroom changes the answer",
        "pa": "A combi heats water as it flows, so two outlets at once means half the flow each. "
              "In a house with two bathrooms and a decent-sized family, a system boiler with a "
              "properly sized unvented cylinder is usually the better arrangement, and it is not "
              "always the more expensive one once you count how long the old one has left. Either "
              "way it should be a calculation you are shown, not a recommendation you are given.",
        "la": ["System boilers with unvented cylinders",
               "Combi versus cylinder, worked out for your house",
               "Zoned heating and modern controls",
               "Showers, pumps and pressure problems"],
        "h2b": "Servicing, safety and repairs",
        "pb": "An unvented cylinder is a pressure vessel and needs its yearly check as much as "
              "the boiler does, by somebody holding the separate qualification for it. Both can "
              "be done on the same visit.",
        "lb": ["Boiler and cylinder servicing on one visit",
               "Breakdowns, no heating and no hot water",
               "Landlord gas safety certificates (CP12)",
               "Cookers, hobs and gas fires"],
        "near": ["cheadle", "gatley", "stockport"],
    },
    {
        "slug": "gatley", "name": "Gatley", "postcodes": "SK8",
        "kick": "Boilers, heating and gas work across Gatley.",
        "intro": "Gatley is settled residential housing, mostly semis, with the kind of heating "
                 "systems that have been in place long enough to need attention rather than "
                 "rescue. Close enough to us that a morning call often gets an afternoon visit.",
        "h2a": "Systems that have been in a while",
        "pa": "A system that has run for fifteen years without being cleaned is carrying "
              "magnetite, and that is what wears out pumps and blocks the narrow ways through a "
              "modern heat exchanger. If the radiators are cold along the bottom and the boiler "
              "is short-cycling, that is the system telling you, and it is cheaper to answer it "
              "before the boiler gives up.",
        "la": ["Power flushing and system cleaning",
               "Magnetic filters fitted and cleaned yearly",
               "Pumps, valves and diverter valves",
               "Radiators cold at the bottom or the top"],
        "h2b": "Boilers, servicing and certificates",
        "pb": "New boilers are quoted in writing with what is included in it, and nothing starts "
              "until you have agreed the price. The yearly service keeps the manufacturer's "
              "warranty valid, which is the part most people find out about too late.",
        "lb": ["New boilers, quoted in writing",
               "Annual servicing",
               "Breakdowns and repairs",
               "Landlord gas safety certificates (CP12)"],
        "near": ["cheadle", "cheadle-hulme", "didsbury"],
    },
    {
        "slug": "sale", "name": "Sale", "postcodes": "M33",
        "kick": "Boilers, heating and gas work across Sale.",
        "intro": "Sale runs from Victorian terraces near the centre out to interwar and postwar "
                 "semis, and there is a good deal of rented property in between. We cover it "
                 "regularly, and if you are a little outside it the answer is usually still yes.",
        "h2a": "Two kinds of house, two kinds of job",
        "pa": "In the older terraces the work is usually the system: pipework of three different "
              "ages, radiators moved at some point, and sludge sitting where the run is longest. "
              "In the semis it is more often the appliance itself, a boiler at the end of its "
              "life that is being kept going by topping the pressure up every week. Topping it "
              "up weekly is not maintenance, it is a leak you have not found yet.",
        "la": ["Boilers losing pressure, traced properly",
               "Power flushing and system cleaning",
               "Combi conversions from tank and cylinder",
               "Radiators, valves and balancing"],
        "h2b": "Servicing, repairs and certificates",
        "pb": "Breakdowns get diagnosed before parts are bought, and you are told plainly whether "
              "a repair is worth doing on a boiler of that age. Quoting is free and there is no "
              "charge for coming to look.",
        "lb": ["Boiler breakdowns and fault codes",
               "New boilers and installations",
               "Annual servicing",
               "Landlord gas safety certificates (CP12)"],
        "near": ["chorlton", "urmston", "didsbury"],
    },
    {
        "slug": "salford", "name": "Salford", "postcodes": "M5, M6 and M7",
        "kick": "Boilers, heating and gas work across Salford.",
        "intro": "Salford is terraces, postwar housing and a growing number of apartments, with "
                 "a lot of it rented. The work splits fairly evenly between homeowners and the "
                 "people who look after property for other people.",
        "h2a": "Apartments and older housing side by side",
        "pa": "In an apartment the boiler is usually a combi in a cupboard with a flue that runs "
              "a long way to an outside wall, and the common faults are pressure and the diverter "
              "valve. In the older housing it is the system: original runs, a cylinder that may "
              "or may not still be doing anything, and radiators that have never been balanced.",
        "la": ["Combi repairs and replacements in flats",
               "Diverter valves, pressure and hot water faults",
               "Old cylinders and tanks removed",
               "Systems cleaned and balanced"],
        "h2b": "Landlords and letting agents",
        "pb": "If you hold several properties across Salford, they can be quoted together and "
              "planned around your renewal dates rather than booked one at a time. Certificates "
              "are issued on the visit, with copies for you and for the tenant.",
        "lb": ["Landlord gas safety certificates (CP12)",
               "Portfolios quoted as one job",
               "Every gas appliance covered",
               "Emergency call-outs, day or night"],
        "near": ["eccles", "chorlton", "urmston"],
    },
    {
        "slug": "eccles", "name": "Eccles", "postcodes": "M30",
        "kick": "Boilers, heating and gas work across Eccles.",
        "intro": "Eccles is Victorian terraces and interwar semis, plenty of them still running "
                 "systems that were designed around a hot water tank in the airing cupboard. "
                 "Converting one of those properly is most of what we do here.",
        "h2a": "Coming off the tank and cylinder",
        "pa": "Taking a house from a tank-and-cylinder system to a combi is not a swap, it is a "
              "rebuild: the tanks come out of the loft, the cylinder out of the cupboard, the "
              "gravity pipework is either reused or replaced depending on what it is, and the "
              "gas supply has to be right for the new appliance. It is usually two days rather "
              "than one, and you are told which yours is when it is quoted, not halfway through "
              "the second day.",
        "la": ["Tank and cylinder systems converted to a combi",
               "Back boilers removed and made safe",
               "Loft tanks taken out, airing cupboard freed up",
               "Gas supply checked for the new appliance"],
        "h2b": "Repairs, servicing and certificates",
        "pb": "For everything short of that: breakdowns, a service that keeps the warranty alive, "
              "radiators that have never warmed up properly, and landlord certificates issued on "
              "the visit.",
        "lb": ["Boiler breakdowns and repairs",
               "Annual servicing",
               "Radiators, valves and power flushing",
               "Landlord gas safety certificates (CP12)"],
        "near": ["salford", "urmston", "chorlton"],
    },
    {
        "slug": "urmston", "name": "Urmston", "postcodes": "M41",
        "kick": "Boilers, heating and gas work across Urmston.",
        "intro": "Urmston is mostly interwar and postwar semis, family housing that has had the "
                 "same heating layout for decades. Straightforward work, done to the standard "
                 "the warranty needs rather than the standard that gets it finished by three.",
        "h2a": "The parts of a boiler swap nobody sees",
        "pa": "Two installers can quote the same boiler at very different prices, and the "
              "difference is nearly always in what is not on the wall: whether the system was "
              "flushed before the new heat exchanger was connected to it, whether an inhibitor "
              "and a filter went in, whether the gas supply was checked and the flue is where the "
              "manufacturer says it should be. Every one of those is what makes the warranty "
              "stand up when you need it.",
        "la": ["System flushed before the new boiler goes on",
               "Inhibitor and magnetic filter fitted",
               "Flue and clearances to the manufacturer's figures",
               "Benchmark completed, signed and left with you"],
        "h2b": "Servicing, repairs and certificates",
        "pb": "After that the yearly service is what keeps it valid, and it catches the small "
              "faults while they are still small. Breakdowns are diagnosed before parts are "
              "ordered, so you are not paying for a guess.",
        "lb": ["Annual servicing",
               "Breakdowns and fault finding",
               "New boilers, quoted in writing",
               "Landlord gas safety certificates (CP12)"],
        "near": ["sale", "eccles", "chorlton"],
    },
]

BY_SLUG = {a["slug"]: a for a in AREAS}


def esc(s):
    return html.escape(s, quote=True)


def li(items):
    return "\n".join("        <li>%s</li>" % esc(i) for i in items)


def nearby(area):
    """Area pages link to their neighbours and to nothing else on the site.

    Google finds a page through links or through the sitemap. These are kept
    out of the menus on purpose, so the sitemap does the finding -- but a page
    with nothing pointing at it is a page Google treats as an afterthought, and
    neighbouring areas linking to each other is both true and useful to a
    reader who lives on the boundary."""
    out = []
    for s in area["near"]:
        n = BY_SLUG[s]
        out.append('<a href="/boiler-repair-%s">%s</a>' % (s, esc(n["name"])))
    return ", ".join(out)


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Boiler Repair &amp; Gas Engineer in {name} | HeatFix Mcr Limited</title>
<meta name="description" content="{meta}">
<meta name="theme-color" content="#0B2E63">
<link rel="canonical" href="{site}/boiler-repair-{slug}">
<meta property="og:type" content="website">
<meta property="og:title" content="Boiler Repair &amp; Gas Engineer in {name} | HeatFix Mcr Limited">
<meta property="og:description" content="{meta}">
<meta property="og:url" content="{site}/boiler-repair-{slug}">
<meta property="og:image" content="{site}/assets/heatfix/og-card.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="HeatFix Mcr Limited, installation, servicing, repairs, heating, plumbing and gas safety across Greater Manchester.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{site}/assets/heatfix/og-card.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/scroll-fx.css">
<link rel="stylesheet" href="../assets/css/heatfix.css">
<link rel="icon" href="../assets/heatfix/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="../assets/heatfix/icon-180.png">
<script type="application/ld+json">
{ld}
</script>
</head>
<body>
<nav class="hfnav" id="nav">
  <div class="hfnav-in">
    <a class="hfbrand" href="/" aria-label="HeatFix Mcr Limited, home">

      <img class="hfbrand-lockup" src="../assets/heatfix/logo-lockup-rev-600.webp" alt="HeatFix Mcr Limited" width="600" height="551">

      <img class="hfbrand-mark" src="../assets/heatfix/logo-mark-400.webp" alt="HeatFix Mcr Limited" width="400" height="376">

    </a>

    <a class="hfnav-name" href="/" tabindex="-1" aria-hidden="true">
      <b>HeatFix Mcr Limited</b>
      <span>Installation &middot; Servicing &middot; Repairs &middot; Heating &middot; Plumbing &middot; Gas safety</span>
    </a>
    <div class="hfnav-links">
      <a href="/">Home</a>
      <a href="/services">Services</a>
      <a href="/about">About</a>
      <a href="/#quoteForm">Contact</a>
    </div>
    <a class="hfnav-tel" href="tel:{phone_link}">{phone}</a>
    <a class="hfbtn" href="/#quote">Get a free quote</a>
    <button class="hfburger" id="burger" type="button" aria-label="Open menu">
      <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>
    </button>
  </div>
</nav>
<div class="hfdrawer" id="drawer">
  <div class="hfdrawer-in">
    <a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a>
    <a href="/#quoteForm">Contact</a><a href="tel:{phone_link}">{phone}</a>
    <a class="hfbtn" href="/#quote">Get a free quote</a>
  </div>
</div>

<div class="wrap hfwide">
  <p class="hfcrumb"><a href="/">Home</a> &nbsp;&gt;&nbsp; <a href="/services">Services</a> &nbsp;&gt;&nbsp; <span>{name}</span></p>
</div>

<section class="hfhead hfwide-h">
  <div class="wrap hfwide">
    <h1>Gas engineer in {name}</h1>
    <p class="kick">{kick}</p>
  </div>
</section>

<section class="hfduo-wrap" style="background:#fff">
  <div class="wrap hfwide hfduo hfwide-duo">
    <div data-fx="reveal">
      <figure><img src="../assets/heatfix/{img_a}" alt="{alt_a}" width="1004" height="544" loading="eager" fetchpriority="high"></figure>
      <h2>{h2a}</h2>
      <p>{intro}</p>
      <p>{pa}</p>
      <ul>
{la}
      </ul>
    </div>
    <div data-fx="reveal" data-fx-delay="110">
      <figure><img src="../assets/heatfix/{img_b}" alt="{alt_b}" width="1004" height="544" loading="lazy"></figure>
      <h2>{h2b}</h2>
      <p>{pb}</p>
      <ul>
{lb}
      </ul>
      <p><a class="more" href="/services">Everything we do</a></p>
    </div>
  </div>
</section>

<section class="hfport on-dark">
  <div class="wrap hfwide hfport-in">
    <div>
      <span class="eyebrow">{postcodes} and the streets around it</span>
      <h2>One engineer, one number,<br>and he answers it himself.</h2>
      <p>Gas Safe registered No. {gas_safe}, and the ID card comes out on the doorstep before you
        have to ask. Quoting is free, there is no charge for coming to look, and everything is
        agreed in writing before any work starts.</p>
      <p><strong>If you can smell gas right now</strong>, ring the National Gas Emergency Service
        on <a href="tel:0800111999" style="color:var(--gold2)">0800&nbsp;111&nbsp;999</a> first.
        They make the property safe and cap what is leaking. Tracing the fault, repairing it and
        getting your gas back on is our job, and we take emergency call-outs day or night.</p>
      <ul class="hfport-list">
        <li>Gas Safe registered, ID card shown at the door</li>
        <li>Free written quotes, no call-out charge for looking</li>
        <li>Emergency call-outs day or night</li>
        <li>Most enquiries answered the same day</li>
      </ul>
      <div class="hfport-cta">
        <a class="btn gold" href="tel:{phone_link}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 3 5a1 1 0 0 1 1-1z"/></svg>
          Call {phone}
        </a>
        <a class="btn ghost" href="/book">Ask for a visit</a>
      </div>
    </div>
    <aside class="hfport-card">
      <h3>Covering {name}</h3>
      <p>{postcodes}, and the surrounding streets. Manchester and Stockport either side of it.</p>
      <ol>
        <li>Ring or send the details and you get an answer, usually the same day.</li>
        <li>We look at the job and quote it in writing, free either way.</li>
        <li>The work is done by the person who quoted it, not somebody sent instead.</li>
      </ol>
      <p class="hfport-note">Nearby: {nearby}.<br>
        Not on the list? <a href="tel:{phone_link}" style="color:var(--gold2)">Ring and ask</a>, the
        answer is usually yes.</p>
    </aside>
  </div>
</section>

<div class="hfband wide">
  <div class="hfband-in">
    <p>Boiler down in {name}? One call and you will know where you stand</p>
    <a class="hfbtn navyfill" href="/#quote">Get a free quote</a>
  </div>
</div>
<footer class="hffoot">
  <div class="wrap">
    <b>HeatFix Mcr Limited</b>
    <p>Gas Safe registered No. {gas_safe} &nbsp;&middot;&nbsp; Manchester &amp; Stockport &nbsp;&middot;&nbsp;
      <a href="tel:{phone_link}">{phone}</a> &nbsp;&middot;&nbsp;
      <a href="https://www.instagram.com/heatfixmcr/" target="_blank" rel="noopener">Instagram</a></p>
    <img src="../assets/heatfix/logo-mark.webp" alt="" width="796" height="603" onerror="this.remove()">
  </div>
</footer>
<script>
(function(){{
  var b=document.getElementById('burger'), d=document.getElementById('drawer');
  if(!b||!d) return;
  b.addEventListener('click',function(){{ d.classList.add('on'); document.body.style.overflow='hidden'; }});
  d.addEventListener('click',function(e){{
    if(e.target===d||e.target.tagName==='A'){{ d.classList.remove('on'); document.body.style.overflow=''; }}
  }});
  addEventListener('keydown',function(e){{ if(e.key==='Escape'){{ d.classList.remove('on'); document.body.style.overflow=''; }} }});
}})();
</script>
<script src="../assets/js/scroll-fx.js" defer></script>
<script src="../assets/js/heatfix-links.js" defer></script>
<script src="../assets/js/heatfix-scroll.js" defer></script>
</body>
</html>
"""

# Two photographs per page, rotated so neighbouring areas do not look identical
# in a search result. All of them already exist in assets/heatfix.
SHOTS = [
    ("svc-install.webp", "A wall-mounted gas combination boiler with the case off"),
    ("svc-repair.webp", "A gas engineer testing an appliance with a flue gas analyser"),
    ("svc-cooker.webp", "A gas hob being connected and tested in a kitchen"),
    ("svc-cylinder.webp", "Unvented hot water cylinder with expansion vessel and tundish"),
    ("pg-gassafety.webp", "A gas safety certificate being filled in on a clipboard"),
    ("svc-plumbing.webp", "Fitting a chrome mixer tap onto a basin"),
]


def build(area, i):
    a, b = SHOTS[i % len(SHOTS)], SHOTS[(i + 3) % len(SHOTS)]
    meta = ("Gas Safe registered engineer in %s (%s). Boiler repairs, new boilers, servicing, "
            "landlord gas safety certificates and plumbing. Free written quotes. Call %s."
            % (area["name"], area["postcodes"], PHONE))
    ld = {
        "@context": "https://schema.org",
        "@type": "HVACBusiness",
        "name": "HeatFix Mcr Limited",
        "telephone": "+44 7890 452629",
        "url": "%s/boiler-repair-%s" % (SITE, area["slug"]),
        "image": "%s/assets/heatfix/og-card.jpg" % SITE,
        "areaServed": {"@type": "Place", "name": area["name"]},
        "address": {"@type": "PostalAddress", "addressLocality": "Manchester",
                    "addressRegion": "Greater Manchester", "addressCountry": "GB"},
        "sameAs": ["https://www.instagram.com/heatfixmcr/"],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Heating and gas work in %s" % area["name"],
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}}
                for n in ["Boiler repair", "New boiler installation", "Boiler servicing",
                          "Landlord gas safety certificate (CP12)", "Plumbing and leaks"]
            ],
        },
    }
    return PAGE.format(
        site=SITE, slug=area["slug"], name=esc(area["name"]),
        postcodes=esc(area["postcodes"]), kick=esc(area["kick"]),
        intro=esc(area["intro"]), pa=esc(area["pa"]), pb=esc(area["pb"]),
        h2a=esc(area["h2a"]), h2b=esc(area["h2b"]),
        la=li(area["la"]), lb=li(area["lb"]),
        meta=esc(meta), ld=json.dumps(ld, ensure_ascii=False),
        img_a=a[0], alt_a=esc(a[1]), img_b=b[0], alt_b=esc(b[1]),
        phone=PHONE, phone_link=PHONE_LINK, gas_safe=GAS_SAFE,
        nearby=nearby(area),
    )


def main():
    seen = set()
    for i, area in enumerate(AREAS):
        assert area["slug"] not in seen, "duplicate slug " + area["slug"]
        seen.add(area["slug"])
        path = os.path.join(OUT, "heatfix-area-%s.html" % area["slug"])
        with open(path, "w", encoding="utf-8") as f:
            f.write(build(area, i))
        print("wrote", path)

    print("\nworker.js needs these in HEATFIX_PAGES and HEATFIX_PUBLIC:\n")
    for area in AREAS:
        print('  "/boiler-repair-%s": "/templates/heatfix-area-%s.html",'
              % (area["slug"], area["slug"]))


if __name__ == "__main__":
    main()
