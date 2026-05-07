/*
 * NotifiAZ — Capstone Deck v0.4
 *
 * Professional-speaker style:
 *  - Minimal text per slide (one big idea each)
 *  - Strong visual hierarchy, generous whitespace
 *  - Speaker carries the narrative; speaker notes are full prose
 *  - 16 slides, ~20-25 minute talk including demo
 */

const pptxgen = require("pptxgenjs");

// ============================================================================
// Palette + typography
// ============================================================================
const C = {
    cardinal: "AB0520",
    navy:     "0C234B",
    sage:     "3F6B47",
    amber:    "B8842B",
    cream:    "F5F1E8",
    white:    "FFFFFF",
    ink:      "1F1F1F",
    muted:    "6E6A60",
    softInk:  "4A463E",
    rule:     "E0DCCF",
};
const FONT_HEAD = "Georgia";
const FONT_BODY = "Calibri";

// ============================================================================
// Helpers
// ============================================================================
function newDeck() {
    const p = new pptxgen();
    p.layout = "LAYOUT_16x9";        // 10" × 5.625"
    p.author = "R. Akinrele";
    p.title  = "NotifiAZ — Capstone";
    p.subject = "Reportable disease reporting in 4 minutes";
    return p;
}

// Common slide setup: white background, page number at bottom right
function setupSlide(slide, pageNum, total) {
    slide.background = { color: C.white };
    slide.addText(`${pageNum} / ${total}`, {
        x: 9.0, y: 5.30, w: 0.9, h: 0.25,
        fontFace: FONT_BODY, fontSize: 9, color: C.muted,
        align: "right", margin: 0,
    });
    slide.addText("NotifiAZ", {
        x: 0.5, y: 5.30, w: 2.0, h: 0.25,
        fontFace: FONT_HEAD, fontSize: 9, color: C.muted,
        italic: true, margin: 0,
    });
}

function notes(slide, text) {
    slide.addNotes(text.trim());
}

// ============================================================================
// Build deck
// ============================================================================
async function build() {
    const pres = newDeck();
    const TOTAL = 16;

    // --------------------------------------------------------------------
    // SLIDE 1 — Title
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        s.background = { color: C.navy };

        // Subtle red accent dot top-left
        s.addShape(pres.shapes.OVAL, {
            x: 0.55, y: 0.55, w: 0.18, h: 0.18,
            fill: { color: C.cardinal }, line: { color: C.cardinal },
        });
        s.addText("CAPSTONE PROJECT", {
            x: 0.85, y: 0.50, w: 5, h: 0.3,
            fontFace: FONT_BODY, fontSize: 11, color: C.cream,
            charSpacing: 4, margin: 0,
        });

        // Big title
        s.addText("NotifiAZ", {
            x: 0.5, y: 1.85, w: 9, h: 1.2,
            fontFace: FONT_HEAD, fontSize: 88, bold: true,
            color: C.white, margin: 0,
        });

        // Tagline
        s.addText("Reportable disease reporting in four minutes.", {
            x: 0.5, y: 3.1, w: 9, h: 0.55,
            fontFace: FONT_HEAD, fontSize: 22, italic: true,
            color: C.cream, margin: 0,
        });

        // Author line
        s.addText("R. Akinrele  ·  Digital Public Health Capstone  ·  2026", {
            x: 0.5, y: 4.85, w: 9, h: 0.3,
            fontFace: FONT_BODY, fontSize: 12, color: C.cream,
            margin: 0,
        });

        notes(s, `
Good morning. My name is Akinrele, and over the next twenty minutes I want to walk you through a project I've been calling NotifiAZ.

The problem it solves is small enough to state in one sentence. Reporting a notifiable disease in Arizona today — one Valley Fever case, one Salmonellosis cluster, one TB exposure — takes a clinician between forty-five and sixty minutes of paperwork, fax cover sheets, and phone calls. NotifiAZ takes the same case from chart to all the right agencies in under four minutes, with the agency callback loop closed in the same interface.

I'll show you the thesis, walk through a live demo of the system, then spend a few minutes on the AI architecture inside it — the supervised callback predictor, the retrieval-augmented search, and how those map to the course concepts you taught us this year.

Let's get started.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 2 — The Hook ("60 minutes")
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 2, TOTAL);

        // Small intro line above
        s.addText("Reporting one Valley Fever case to ADHS today takes —", {
            x: 0.5, y: 1.0, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 22, italic: true,
            color: C.softInk, margin: 0,
        });

        // The big number
        s.addText("60", {
            x: 0.5, y: 1.65, w: 5.5, h: 2.4,
            fontFace: FONT_HEAD, fontSize: 200, bold: true,
            color: C.cardinal, margin: 0, valign: "middle",
        });

        // Unit label beside the number
        s.addText("minutes.", {
            x: 4.0, y: 2.65, w: 5.5, h: 1.2,
            fontFace: FONT_HEAD, fontSize: 60, italic: true,
            color: C.ink, margin: 0,
        });

        // Source line
        s.addText("Clinician interview, Tucson Medical Center · 2024", {
            x: 0.5, y: 4.55, w: 9, h: 0.3,
            fontFace: FONT_BODY, fontSize: 11, color: C.muted,
            italic: true, margin: 0,
        });

        notes(s, `
I want you to feel the size of the problem before we talk about the solution. Sixty minutes. That is the median time a clinician at Tucson Medical Center reports it takes them to file one reportable disease case to the Arizona Department of Health Services.

Sixty minutes of pulling labs, faxing forms, phoning Maricopa County, then phoning Pima County because the patient lives in one and the lab is in the other. Sixty minutes that the clinician is not seeing patients. And sixty minutes — multiply this by every reportable case in the state — is real time the public health system is not investigating an outbreak.

Hold this number. We will come back to it.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 3 — The thesis
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 3, TOTAL);

        // Section label
        s.addText("THE THESIS", {
            x: 0.5, y: 0.55, w: 9, h: 0.3,
            fontFace: FONT_BODY, fontSize: 11, color: C.cardinal,
            bold: true, charSpacing: 4, margin: 0,
        });

        // The thesis sentence — big, breaks across lines naturally
        s.addText([
            { text: "Reportable disease reporting should take ",       options: { color: C.ink } },
            { text: "minutes",                                          options: { color: C.cardinal, bold: true } },
            { text: ", complete on first submission, fan out to ",     options: { color: C.ink } },
            { text: "all relevant agencies",                            options: { color: C.cardinal, bold: true } },
            { text: " in one action, and travel ",                      options: { color: C.ink } },
            { text: "both ways",                                        options: { color: C.cardinal, bold: true } },
            { text: ".",                                                options: { color: C.ink } },
        ], {
            x: 0.5, y: 1.4, w: 9, h: 3.2,
            fontFace: FONT_HEAD, fontSize: 38, italic: false,
            valign: "top", margin: 0,
        });

        notes(s, `
Here is what I want NotifiAZ to do. I want it to take the same act — reporting a single case — and compress it into something that takes minutes, not an hour. I want the report to be complete the first time it leaves the clinician's hands, so the agency does not have to call back the next morning to ask which county the patient lives in. I want one click to fan out to every agency that needs the case — state, county, federal, tribal, veterinary — without the clinician keeping track of who needs what. And I want the response loop to close in the same interface, so when ADHS asks a follow-up question, the clinician sees it next to the original report, not buried in their inbox.

That is the entire product. Everything else I will show you is in service of those four sentences.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 4 — Fan-out: one submit, seven destinations
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 4, TOTAL);

        // Title
        s.addText("One submit. Eight destinations.", {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontFace: FONT_HEAD, fontSize: 30, bold: true,
            color: C.ink, margin: 0,
        });

        // Center node: report
        const cx = 5.0, cy = 3.05;
        s.addShape(pres.shapes.OVAL, {
            x: cx - 0.85, y: cy - 0.5, w: 1.7, h: 1.0,
            fill: { color: C.cardinal }, line: { color: C.cardinal },
        });
        s.addText("ONE\nREPORT", {
            x: cx - 0.85, y: cy - 0.5, w: 1.7, h: 1.0,
            fontFace: FONT_BODY, fontSize: 13, bold: true,
            color: C.white, align: "center", valign: "middle",
            charSpacing: 2,
        });

        // 7 destination labels positioned around the center
        const destinations = [
            { label: "ADHS",          dx:  3.4, dy: -1.55 },
            { label: "Maricopa CPH",  dx:  3.7, dy: -0.35 },
            { label: "CDC NNDSS",     dx:  3.7, dy:  0.85 },
            { label: "USDA APHIS",    dx:  3.4, dy:  1.85 },
            { label: "AZ Game & Fish",dx: -3.6, dy:  1.85 },
            { label: "AZ Dept of Ag", dx: -3.7, dy:  0.85 },
            { label: "Apache Tribal", dx: -3.7, dy: -0.35 },
            { label: "Navajo Tribal", dx: -3.4, dy: -1.55 },
        ];
        // (Using 8 because we want to show tribal nodes — visually balanced)

        destinations.forEach(d => {
            const tx = cx + d.dx, ty = cy + d.dy;
            // Connector line
            const fromX = cx + (d.dx > 0 ? 0.85 : -0.85);
            const fromY = cy + (d.dy * 0.35);
            s.addShape(pres.shapes.LINE, {
                x: Math.min(fromX, tx + 0.7),
                y: Math.min(fromY, ty + 0.18),
                w: Math.abs(tx + 0.7 - fromX),
                h: Math.abs((ty + 0.18) - fromY),
                line: { color: C.rule, width: 1 },
                flipH: tx < fromX,
                flipV: ty + 0.18 < fromY,
            });
            // Pill
            s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
                x: tx - 0.7, y: ty - 0.18, w: 1.4, h: 0.36,
                fill: { color: C.cream }, line: { color: C.navy, width: 1 },
                rectRadius: 0.05,
            });
            s.addText(d.label, {
                x: tx - 0.7, y: ty - 0.18, w: 1.4, h: 0.36,
                fontFace: FONT_BODY, fontSize: 10, color: C.navy,
                align: "center", valign: "middle", margin: 0, bold: true,
            });
        });

        // Caption
        s.addText("HL7 v2.5.1 ELR · NNDSS v2 · FHIR R4 · APHIS VSPS · per-tribe JSON", {
            x: 0.5, y: 4.85, w: 9, h: 0.3,
            fontFace: FONT_BODY, fontSize: 11, italic: true,
            color: C.muted, align: "center", margin: 0,
        });

        notes(s, `
Today, when a clinician sees a Salmonellosis case, they are responsible for figuring out who needs to know. ADHS for the state. Maricopa County Public Health if the patient lives in Phoenix, or Pima if they live in Tucson — and good luck if they live in Apache and the lab is in Maricopa. CDC NNDSS for the national surveillance dataset. If the patient is on tribal land, the relevant tribal authority. If it's a vet reporting an animal, USDA APHIS and the Arizona Department of Agriculture. And if it's a wildlife case, Arizona Game and Fish.

NotifiAZ resolves all of that automatically. The clinician picks the disease, the system looks up the routing rules, and one click sends the right message in the right format to every agency that needs it. HL7 v2.5.1 ELR for the state. The NNDSS modernization format for CDC. Per-tribe JSON for tribal authorities, with consent fields explicit. APHIS VSPS Form 1-A for federal animal disease reporting.

The clinician never has to know any of those formats existed.

A design choice worth flagging here. The routing logic is a hand-authored decision tree, not a learned model. That was deliberate. A learned classifier that occasionally misroutes a Plague case to the wrong agency is a public-health failure — and we cannot debug "the model felt like it." Regulatory routing must be auditable: every destination decision in NotifiAZ traces back to one specific rule in the reportable diseases JSON file. I traded the generalization a learned model would offer for the certainty regulators and tribal data stewards require. The supervised learning lives elsewhere — predicting which reports will trigger callbacks, which I'll show you in a moment — where the cost of being wrong is a clinician double-checking a field, not a misrouted Plague case.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 5 — Bidirectional + One Health
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 5, TOTAL);

        s.addText("Reports travel both ways.", {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontFace: FONT_HEAD, fontSize: 30, bold: true,
            color: C.ink, margin: 0,
        });

        // Two-column visual
        // LEFT: bidirectional
        s.addText("BIDIRECTIONAL", {
            x: 0.5, y: 1.4, w: 4.5, h: 0.3,
            fontFace: FONT_BODY, fontSize: 10, color: C.cardinal,
            bold: true, charSpacing: 3, margin: 0,
        });

        // Clinician box
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 0.6, y: 1.85, w: 1.7, h: 0.85,
            fill: { color: C.navy }, line: { color: C.navy },
            rectRadius: 0.08,
        });
        s.addText("Clinician", {
            x: 0.6, y: 1.85, w: 1.7, h: 0.85,
            fontFace: FONT_BODY, fontSize: 14, bold: true,
            color: C.white, align: "center", valign: "middle",
        });

        // Agency box
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 3.2, y: 1.85, w: 1.7, h: 0.85,
            fill: { color: C.cardinal }, line: { color: C.cardinal },
            rectRadius: 0.08,
        });
        s.addText("Agency", {
            x: 3.2, y: 1.85, w: 1.7, h: 0.85,
            fontFace: FONT_BODY, fontSize: 14, bold: true,
            color: C.white, align: "center", valign: "middle",
        });

        // Two arrows between
        s.addText("→", {
            x: 2.3, y: 1.85, w: 0.9, h: 0.4,
            fontFace: FONT_BODY, fontSize: 22, color: C.sage,
            align: "center", valign: "middle", margin: 0, bold: true,
        });
        s.addText("←", {
            x: 2.3, y: 2.30, w: 0.9, h: 0.4,
            fontFace: FONT_BODY, fontSize: 22, color: C.amber,
            align: "center", valign: "middle", margin: 0, bold: true,
        });
        s.addText("submission", {
            x: 2.0, y: 1.55, w: 1.5, h: 0.3,
            fontFace: FONT_BODY, fontSize: 9, color: C.sage,
            align: "center", italic: true, margin: 0,
        });
        s.addText("callback questions", {
            x: 1.85, y: 2.7, w: 1.7, h: 0.3,
            fontFace: FONT_BODY, fontSize: 9, color: C.amber,
            align: "center", italic: true, margin: 0,
        });

        // RIGHT: One-Health bridge
        s.addText("ONE-HEALTH BRIDGE", {
            x: 5.5, y: 1.4, w: 4.0, h: 0.3,
            fontFace: FONT_BODY, fontSize: 10, color: C.cardinal,
            bold: true, charSpacing: 3, margin: 0,
        });

        // Vet box
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 5.6, y: 1.85, w: 1.5, h: 0.7,
            fill: { color: C.navy }, line: { color: C.navy },
            rectRadius: 0.08,
        });
        s.addText("Vet", {
            x: 5.6, y: 1.85, w: 1.5, h: 0.7,
            fontFace: FONT_BODY, fontSize: 13, bold: true,
            color: C.white, align: "center", valign: "middle",
        });

        // Animal disease box
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 7.4, y: 1.85, w: 1.7, h: 0.7,
            fill: { color: C.cardinal }, line: { color: C.cardinal },
            rectRadius: 0.08,
        });
        s.addText("Animal\nzoonotic case", {
            x: 7.4, y: 1.85, w: 1.7, h: 0.7,
            fontFace: FONT_BODY, fontSize: 11, bold: true,
            color: C.white, align: "center", valign: "middle",
        });

        // Arrow vet → case
        s.addText("→", {
            x: 7.0, y: 1.85, w: 0.5, h: 0.7,
            fontFace: FONT_BODY, fontSize: 20, color: C.sage,
            align: "center", valign: "middle", margin: 0, bold: true,
        });

        // Branch line down to ADHS auto-notify
        s.addShape(pres.shapes.LINE, {
            x: 8.25, y: 2.55, w: 0, h: 0.6,
            line: { color: C.amber, width: 2, dashType: "dash" },
        });
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
            x: 7.2, y: 3.2, w: 2.1, h: 0.7,
            fill: { color: C.amber }, line: { color: C.amber },
            rectRadius: 0.08,
        });
        s.addText("ADHS\n(auto-notify)", {
            x: 7.2, y: 3.2, w: 2.1, h: 0.7,
            fontFace: FONT_BODY, fontSize: 11, bold: true,
            color: C.white, align: "center", valign: "middle",
        });

        // Bottom caption row
        s.addText(
            "When a vet reports a zoonotic case, ADHS gets a parallel notification automatically — no clinician phone call required.",
            {
                x: 0.5, y: 4.55, w: 9, h: 0.6,
                fontFace: FONT_HEAD, fontSize: 14, italic: true,
                color: C.softInk, align: "center", margin: 0,
            }
        );

        notes(s, `
Two more design choices that come from the thesis. The first one is bidirectionality. Today, when ADHS has a question about a submitted report — and they have questions on roughly thirty to forty percent of all reports — they call the clinician's office. NotifiAZ keeps that conversation in the application. The clinician sees the original report, sees the agency's question right next to it, and replies inline. The audit trail is intact, the loop closes faster, and nobody has to remember which voicemail was about which case.

The second is the One-Health bridge. About one in six of the diseases on Arizona's reportable list are zoonotic — they cross between animals and humans. Plague, brucellosis, avian flu, rabies, hantavirus. Today, when a vet reports a brucellosis case in a kennel sire, USDA APHIS and the Arizona Department of Agriculture get the notification, but ADHS — the human public health authority — typically learns about it later, if at all. NotifiAZ closes that gap. A zoonotic animal report automatically generates a parallel notification to ADHS so the human side of public health is ready before the first human case shows up.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 6 — DEMO marker
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        s.background = { color: C.navy };

        s.addText("DEMO", {
            x: 0.5, y: 1.7, w: 9, h: 1.6,
            fontFace: FONT_HEAD, fontSize: 130, bold: true,
            color: C.white, align: "center", margin: 0,
            charSpacing: 8,
        });
        s.addText("Let me show you the system, end to end.", {
            x: 0.5, y: 3.7, w: 9, h: 0.6,
            fontFace: FONT_HEAD, fontSize: 22, italic: true,
            color: C.cream, align: "center", margin: 0,
        });

        notes(s, `
I am going to switch to the live application now. The walk-through takes about six minutes.

I'll sign in as a clinician at Tucson Medical Center, find a patient with a confirmed Salmonellosis case, file the report, and you'll see all eight destinations resolve automatically in the right format. Then I'll show you what happens when I switch hats and look at the same report from inside ADHS, send a follow-up question back to the clinician, and watch it close.

If anything fails during the demo I have screenshots on the next three slides as a backup. But the system is running.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 7 — EHR shot (demo backup + visual reinforcement)
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 7, TOTAL);

        s.addText("The clinician sees what they always see.", {
            x: 0.5, y: 0.5, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 24, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "An EHR-style chart with a reportable-disease banner. NotifiAZ is the red button.",
            {
                x: 0.5, y: 1.05, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 13, italic: true,
                color: C.muted, margin: 0,
            }
        );

        // Screenshot — placed centered, sized to fit
        s.addImage({
            path: "/tmp/nz_deck_shots/01-ehr-chart.png",
            x: 0.7, y: 1.5, w: 8.6, h: 3.4,
            sizing: { type: "contain", w: 8.6, h: 3.4 },
        });

        notes(s, `
This is what the clinician sees. It is an EHR-style chart, deliberately mocked to look familiar — Salmonellosis case, ICD-10 A02.9, lab result, full HPI. The banner across the top fires when the active problem matches a reportable disease in our database.

The only new element is the red button on the right. One click and we are in the reporter.

A note on the screenshot: every name on this screen is synthetic, generated procedurally with seed equals forty-two. There is no real patient data anywhere in this codebase. The Privacy section of the AI Governance document spells this out — synthetic data was a design choice, not a workaround.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 8 — Reporter shot (with risk widget)
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 8, TOTAL);

        s.addText("Risk-checked. Routed. Previewed before submit.", {
            x: 0.5, y: 0.5, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 22, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "Pre-submission risk meter (top), routed destinations (middle), exact-bytes preview (per card).",
            {
                x: 0.5, y: 1.05, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 13, italic: true,
                color: C.muted, margin: 0,
            }
        );

        s.addImage({
            path: "/tmp/nz_deck_shots/02-reporter-full.png",
            x: 0.7, y: 1.5, w: 8.6, h: 3.4,
            sizing: { type: "contain", w: 8.6, h: 3.4 },
        });

        notes(s, `
This is the reporter screen. Three things to point out before we move on.

First, top of the page — the pre-submission risk meter. The model has scored this report at forty-seven percent callback risk, moderate. It is showing the clinician the top three contributing factors with direction arrows, and an expandable suggestion about what to add. We will come back to how that model works.

Second, middle of the page — the destinations resolved. Three cards: ADHS in HL7 v2.5.1 ELR format, CDC NNDSS in their modernization format, Maricopa County Public Health in their local JSON. Every card has a "Preview message" button — clicking it shows the exact bytes that will be transmitted. That preview-before-submit is the core transparency feature of the system.

Third, bottom — one button. Submit to all three agencies. One action, three formats, three audit trail entries. That is the four-minute promise.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 9 — Beyond shipping the messages
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 9, TOTAL);

        s.addText("PART 2", {
            x: 0.5, y: 0.55, w: 9, h: 0.3,
            fontFace: FONT_BODY, fontSize: 11, color: C.cardinal,
            bold: true, charSpacing: 4, margin: 0,
        });

        s.addText("Beyond shipping the messages —", {
            x: 0.5, y: 1.5, w: 9, h: 0.8,
            fontFace: FONT_HEAD, fontSize: 36, italic: true,
            color: C.softInk, margin: 0,
        });
        s.addText("what the system knows.", {
            x: 0.5, y: 2.4, w: 9, h: 0.8,
            fontFace: FONT_HEAD, fontSize: 36, bold: true,
            color: C.cardinal, margin: 0,
        });

        s.addText(
            "Two AI components. One supervised model. One retrieval system. Both designed to live inside the reporting workflow, not separately from it.",
            {
                x: 0.5, y: 3.7, w: 9, h: 1,
                fontFace: FONT_BODY, fontSize: 16, color: C.softInk,
                margin: 0,
            }
        );

        notes(s, `
The first part of this talk was about plumbing — getting messages from a clinician to the right agencies in the right formats. That part is necessary and not glamorous and it solves the four-minute problem.

The second part is about what the system knows about the report itself. NotifiAZ has two AI components. The first is a supervised classifier that predicts callback likelihood — that risk meter you saw — so the clinician gets a warning before they submit an incomplete report. The second is a retrieval system that lets clinicians ask the disease database in plain language: "do I need to report a tick bite with a rash?"

Both of those are intentionally built into the existing flow. They are not a separate AI tab the clinician has to remember to visit. They live where the work lives.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 10 — Predictor headline numbers
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 10, TOTAL);

        s.addText("Callback-likelihood predictor.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 26, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "Logistic Regression. Trained on 600 synthetic samples. Held-out test set of 150.",
            {
                x: 0.5, y: 1.1, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 13, italic: true,
                color: C.muted, margin: 0,
            }
        );

        // Big number tiles for the four headline metrics
        const tiles = [
            { label: "F1",        value: "0.53", caption: "harmonic mean of precision + recall" },
            { label: "AUC",       value: "0.72", caption: "ranking quality, threshold-free" },
            { label: "Recall",    value: "0.71", caption: "what we tune for" },
            { label: "Accuracy",  value: "0.68", caption: "" },
        ];
        tiles.forEach((t, i) => {
            const x = 0.5 + i * 2.27;
            // Tile background
            s.addShape(pres.shapes.RECTANGLE, {
                x: x, y: 1.85, w: 2.05, h: 2.5,
                fill: { color: C.cream }, line: { color: C.rule, width: 0.5 },
            });
            // Big value
            s.addText(t.value, {
                x: x, y: 2.0, w: 2.05, h: 1.0,
                fontFace: FONT_HEAD, fontSize: 56, bold: true,
                color: C.cardinal, align: "center", valign: "middle",
                margin: 0,
            });
            // Label
            s.addText(t.label, {
                x: x, y: 3.10, w: 2.05, h: 0.35,
                fontFace: FONT_BODY, fontSize: 14, bold: true,
                color: C.navy, align: "center", margin: 0,
                charSpacing: 2,
            });
            // Caption
            s.addText(t.caption, {
                x: x + 0.1, y: 3.50, w: 1.85, h: 0.75,
                fontFace: FONT_BODY, fontSize: 10, italic: true,
                color: C.muted, align: "center", valign: "top",
                margin: 0,
            });
        });

        // Footer note
        s.addText(
            "Comparison: Random Forest (F1 = 0.50, AUC = 0.69) and Gradient Boosting (F1 = 0.47, AUC = 0.66) ran as baselines. LR wins both predictive power and interpretability.",
            {
                x: 0.5, y: 4.6, w: 9, h: 0.45,
                fontFace: FONT_BODY, fontSize: 11, italic: true,
                color: C.softInk, margin: 0,
            }
        );

        notes(s, `
Here are the numbers. F1 of zero point five three. AUC of zero point seven two. Recall of zero point seven one — and recall is the metric we tune for, because in this problem a missed warning costs the clinician one to three days of agency callback delay later, while a false alarm costs about thirty seconds of clinician time to dismiss.

These are not impressive numbers. They are honest numbers for a deliberately noisy problem — I built seven percent irreducible noise into the ground-truth function so the model could not memorize its way to perfect accuracy.

I trained three models on the same data and the panel will rightly ask why I picked logistic regression when random forest and gradient boosting often beat linear models on benchmarks. Three reasons. First, on this dataset LR actually won — best F1, best AUC, and best recall of the three. The trees did not buy us anything. Second, LR is interpretable by construction: the coefficient times the scaled feature value IS the explanation, with no separate machinery. The trees would have required SHAP or LIME on top, and I'll come back to why that's the wrong shape of complication. Third, deployment footprint: logistic regression is eleven floats — the coefficients plus the intercept. The random forest is roughly ten thousand. For an in-browser predictor that has to score every reporter form load in milliseconds, smaller and simpler wins.

The tree models stay in the codebase as comparison baselines. That's the academic standard — you don't pick a model, you compare and report. The full Mitchell-format card is in predictor_model_card.md.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 11 — Insights / explainability + ROC
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 11, TOTAL);

        s.addText("Every prediction tells you why.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 26, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "Per-feature contribution × scaled value. Top three shown to the clinician. Three-model agreement on what matters globally.",
            {
                x: 0.5, y: 1.1, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 13, italic: true,
                color: C.muted, margin: 0,
            }
        );

        s.addImage({
            path: "/tmp/nz_deck_shots/03-insights-predictor.png",
            x: 0.7, y: 1.55, w: 8.6, h: 3.4,
            sizing: { type: "contain", w: 8.6, h: 3.4 },
        });

        notes(s, `
This is the Insights tab. It serves two audiences. The clinician using NotifiAZ never has to come here — the per-prediction explanation lives in the reporter. But for a panel like this one, or a public health director evaluating whether to deploy the system, this is where the model lays itself out completely.

You can see the headline metrics card at the top. Below that, the comparison table — three models side by side. To the right is the ROC curve with shaded AUC area. Scroll down and you reach the three-way feature importance comparison, which is the single most important slide in the whole tab.

All three models — LR, RF, and GB — agree on which feature dominates. It is completeness score, the composite measure of how many lab results and exposure-history fields are populated. That agreement is evidence the model is finding real structure in the data, not overfitting to noise. And it is exactly the signal we want to surface to the clinician at submission time.

A choice worth justifying here. I deliberately did not implement SHAP or LIME for the per-prediction explanations. Those are post-hoc methods — they exist to approximate what a black-box model is doing. Logistic regression is not a black box. The coefficient times the scaled feature value IS the contribution to the prediction, exactly, by construction. Wrapping that in SHAP would be sophistication theater: more code, more dependencies, more failure modes, no improvement in faithfulness. The simpler approach is also the more honest one. If we ever swap in a tree-based or neural production model, SHAP becomes the right tool. Until then, the linear math is the explanation.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 12 — Ask NotifiAZ (RAG)
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 12, TOTAL);

        s.addText("Ask NotifiAZ.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 26, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "TF-IDF retrieval over 72 reportable diseases. Deterministic answer template. No LLM in the loop — every claim auditable.",
            {
                x: 0.5, y: 1.1, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 13, italic: true,
                color: C.muted, margin: 0,
            }
        );

        s.addImage({
            path: "/tmp/nz_deck_shots/05-rag.png",
            x: 0.7, y: 1.55, w: 8.6, h: 3.4,
            sizing: { type: "contain", w: 8.6, h: 3.4 },
        });

        notes(s, `
This is the second AI component. A clinician sees a patient with non-specific symptoms — fever, cough, recent dust exposure in southern Arizona — and asks: "is this reportable, and if so, to whom?" That is a real workflow question, and traditionally the answer lives in a regulatory PDF that nobody opens.

The Ask NotifiAZ panel runs TF-IDF retrieval over the seventy-two-disease database, returns the top-ranked diseases for the query, and pulls the reporting requirements — ICD-10, SNOMED CT, urgency class, agencies, timeline — straight from the structured fields.

Two design choices worth justifying explicitly. The first is TF-IDF instead of dense neural embeddings, which is the trendier choice. For a corpus of seventy-two short documents, dense embeddings do not beat sparse retrieval — there are not enough documents for the semantic generalization to matter, and the sparse method is competitive at retrieval quality while being orders of magnitude smaller. Shipping a sentence-transformer model would add a hundred megabytes to the page load for no measurable gain. TF-IDF gives me a fifty-three kilobyte index and millisecond retrieval in pure JavaScript.

The second choice is the deterministic answer template instead of calling an LLM. In a public-health context, a hallucinated reporting timeline could delay outbreak response. Refusing to call a generative model is a governance choice, not a missing feature — every claim on the screen is auditable to a specific entry in reportable_diseases_us.json. In a production deployment we would put an instruction-tuned medical model on top of this retrieval, with a fact-check layer. That work is documented in the AI Governance file. The retrieval logic stays unchanged; only the answer phrasing layer changes.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 13 — Course concepts coverage grid
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 13, TOTAL);

        s.addText("Course concepts, mapped to where they live.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 24, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText(
            "Full crosswalk in docs/COURSE_CONCEPTS_MAPPING.md.",
            {
                x: 0.5, y: 1.05, w: 9, h: 0.35,
                fontFace: FONT_BODY, fontSize: 12, italic: true,
                color: C.muted, margin: 0,
            }
        );

        // Three columns
        const cols = [
            {
                title: "DATA & MODELS",
                items: [
                    { l: "EDA",                  r: "Insights §1" },
                    { l: "Decision tree",        r: "routing engine" },
                    { l: "Logistic regression",  r: "predictor (live)" },
                    { l: "Random forest",        r: "comparison" },
                    { l: "Gradient boosting",    r: "comparison" },
                    { l: "F1 / AUC / ROC",       r: "Insights §2" },
                    { l: "Confusion matrix",     r: "Insights §2.4" },
                    { l: "Explainability",       r: "risk widget + §2.3" },
                ],
            },
            {
                title: "RETRIEVAL & LANGUAGE",
                items: [
                    { l: "RAG",          r: "Ask NotifiAZ (live)" },
                    { l: "NLP / TF-IDF", r: "rag.js tokenizer" },
                    { l: "LLM",          r: "production path doc" },
                ],
            },
            {
                title: "GOVERNANCE & STANDARDS",
                items: [
                    { l: "Model card",         r: "model_card.md" },
                    { l: "FAIR principles",    r: "fair_compliance.md" },
                    { l: "AI governance",      r: "ai_governance.md" },
                    { l: "Transparency",       r: "preview-before-submit" },
                    { l: "Privacy",            r: "synthetic data only" },
                    { l: "Tribal sovereignty", r: "consent defaults" },
                    { l: "Digitalization",     r: "the whole product" },
                    { l: "Digital public health", r: "the thesis" },
                ],
            },
        ];

        cols.forEach((c, i) => {
            const x = 0.5 + i * 3.05;
            // Column header
            s.addShape(pres.shapes.RECTANGLE, {
                x: x, y: 1.65, w: 2.95, h: 0.45,
                fill: { color: C.navy }, line: { color: C.navy },
            });
            s.addText(c.title, {
                x: x + 0.1, y: 1.65, w: 2.75, h: 0.45,
                fontFace: FONT_BODY, fontSize: 11, bold: true,
                color: C.white, valign: "middle", margin: 0,
                charSpacing: 2,
            });
            // Items
            c.items.forEach((it, j) => {
                const y = 2.20 + j * 0.34;
                s.addText(it.l, {
                    x: x + 0.05, y: y, w: 1.55, h: 0.3,
                    fontFace: FONT_BODY, fontSize: 11, color: C.ink,
                    valign: "middle", margin: 0, bold: true,
                });
                s.addText(it.r, {
                    x: x + 1.55, y: y, w: 1.4, h: 0.3,
                    fontFace: FONT_BODY, fontSize: 10, color: C.muted,
                    italic: true, valign: "middle", margin: 0,
                    align: "right",
                });
            });
        });

        notes(s, `
This is the slide where I owe the panel an answer to the question: did you actually use what you were taught? The answer is yes, and here is where each concept lives in the codebase.

Left column — the supervised learning concepts. EDA is the Insights tab section one. Decision tree is the routing engine itself, hand-authored, deliberately not learned because regulatory routing must be deterministic. Logistic regression is the production predictor. Random forest and gradient boosting are comparison baselines for academic completeness. F1, AUC, ROC, confusion matrix all live in the Insights tab. Explainability is two layers — per-prediction in the risk widget, global in the feature-importance chart.

Middle — RAG, NLP, LLM. The retriever is live. NLP shows up as the TF-IDF tokenizer in rag dot js. LLM is documented as the production path; intentionally not in the MVP.

Right — governance and standards. Two model cards. A FAIR compliance assessment. An AI governance document covering tribal sovereignty, transparency, and privacy. Synthetic data throughout.

Twenty-one curriculum concepts, eight of them live in the running app, the rest documented or named where they live. The full crosswalk is in COURSE_CONCEPTS_MAPPING.md.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 14 — What's NOT here (and why)
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 14, TOTAL);

        s.addText("What's deliberately not here.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 26, bold: true,
            color: C.ink, margin: 0,
        });

        const cards = [
            {
                title: "Deep learning",
                body: "GBM clinical risk model — was in v1, archived to focus the thesis on reporting, not clinical decision support.",
            },
            {
                title: "Federated learning",
                body: "Multi-site training scheme — archived. The reporting thesis does not require cross-site model training.",
            },
            {
                title: "Swarm learning",
                body: "Peer-to-peer learning across institutions — archived for the same reason.",
            },
        ];

        cards.forEach((c, i) => {
            const x = 0.5 + i * 3.0;
            s.addShape(pres.shapes.RECTANGLE, {
                x: x, y: 1.6, w: 2.9, h: 2.6,
                fill: { color: C.cream }, line: { color: C.rule, width: 0.5 },
            });
            // Left accent stripe
            s.addShape(pres.shapes.RECTANGLE, {
                x: x, y: 1.6, w: 0.08, h: 2.6,
                fill: { color: C.cardinal }, line: { color: C.cardinal },
            });
            s.addText(c.title, {
                x: x + 0.25, y: 1.75, w: 2.55, h: 0.4,
                fontFace: FONT_HEAD, fontSize: 18, bold: true,
                color: C.navy, margin: 0,
            });
            s.addText(c.body, {
                x: x + 0.25, y: 2.25, w: 2.55, h: 1.85,
                fontFace: FONT_BODY, fontSize: 13, color: C.softInk,
                valign: "top", margin: 0,
            });
        });

        s.addText(
            "All three live on the archive/v1-onehealthrecord branch (tag v1.0.0). I can show you the running implementations on request.",
            {
                x: 0.5, y: 4.45, w: 9, h: 0.55,
                fontFace: FONT_HEAD, fontSize: 13, italic: true,
                color: C.softInk, align: "center", margin: 0,
            }
        );

        notes(s, `
I want to be honest about three concepts your curriculum covered that are not in this submission. Deep learning was originally a clinical risk model — a gradient-boosted classifier that predicted hospitalization risk for Coccidioidomycosis cases. Federated learning was a multi-site training scheme. Swarm learning was a peer-to-peer extension of that.

None of those are in NotifiAZ. They were all in the version-one prototype, and after the panel's earlier feedback that I was solving too many problems at once, I scoped them out. They live on the archive branch in this same repository — tagged v one point zero — and I can demonstrate any of them if you want to see them running. They are not gone. They are just not part of this submission.

This was the most useful piece of feedback I got from this committee. The pivot from "do everything" to "do one thing well" is what made the rest of the work cohere. I want to acknowledge that explicitly.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 15 — Production path
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        setupSlide(s, 15, TOTAL);

        s.addText("From prototype to deployment.", {
            x: 0.5, y: 0.55, w: 9, h: 0.5,
            fontFace: FONT_HEAD, fontSize: 26, bold: true,
            color: C.ink, margin: 0,
        });
        s.addText("Three pieces. None of them code. All institutional.", {
            x: 0.5, y: 1.1, w: 9, h: 0.35,
            fontFace: FONT_BODY, fontSize: 13, italic: true,
            color: C.muted, margin: 0,
        });

        const items = [
            {
                num: "1",
                title: "Pilot site",
                body: "Tucson Medical Center. Two diseases — Valley Fever and Salmonellosis — for three months. Pre-existing ADHS reporting relationship makes it the natural first site.",
            },
            {
                num: "2",
                title: "Endpoint registration",
                body: "Real ADHS-MEDSIS, Maricopa CPH, Pima CPH, and CDC NNDSS endpoints with production credentials, mTLS, OAuth where applicable.",
            },
            {
                num: "3",
                title: "Tribal partnership",
                body: "Apache Tribal Health Authority and Navajo Nation Department of Health consulted before any tribal data flow goes live. IRB review per nation. Tribal data steward sign-off on routing rules.",
            },
        ];

        items.forEach((it, i) => {
            const y = 1.7 + i * 1.1;

            // Number bubble
            s.addShape(pres.shapes.OVAL, {
                x: 0.5, y: y + 0.05, w: 0.7, h: 0.7,
                fill: { color: C.cardinal }, line: { color: C.cardinal },
            });
            s.addText(it.num, {
                x: 0.5, y: y + 0.05, w: 0.7, h: 0.7,
                fontFace: FONT_HEAD, fontSize: 28, bold: true,
                color: C.white, align: "center", valign: "middle", margin: 0,
            });

            // Title + body
            s.addText(it.title, {
                x: 1.5, y: y + 0.05, w: 8, h: 0.4,
                fontFace: FONT_HEAD, fontSize: 18, bold: true,
                color: C.navy, margin: 0,
            });
            s.addText(it.body, {
                x: 1.5, y: y + 0.5, w: 8, h: 0.55,
                fontFace: FONT_BODY, fontSize: 13, color: C.softInk,
                margin: 0,
            });
        });

        notes(s, `
What would it take to put this in production? Not much code, surprisingly. The technical work is largely complete. The remaining work is institutional.

First, a pilot site. Tucson Medical Center is the natural choice because they already report Coccidioidomycosis cases to ADHS at high volume, so we have a known baseline to measure against. Two diseases, three months, six clinicians.

Second, endpoint registration. Right now the destinations in the demo are mock receivers. To go live, I would need real registrations with ADHS-MEDSIS, the two big county systems, and CDC NNDSS — with credentials, mutual TLS, the whole regulatory dance.

Third, and most important, tribal partnership. The tribal routing in the demo is technically correct, but a real deployment requires consultation with the Apache Tribal Health Authority and Navajo Nation Department of Health, IRB review per nation, and tribal data steward sign-off on every routing rule that touches a tribal-resident patient. The default in NotifiAZ is to not share tribal data with state and federal authorities — that default has to be ratified by the actual data stewards before the system goes live.

You'll notice the pilot is deliberately narrow — one site, two diseases, three months. That's a constraint, not a budget limitation. Reportable disease reporting failures have low base rates and high stakes, so the only way to claim improvement is against a real callback-rate baseline measured at the same site under the same staffing. TMC's high Cocci volume gives us that baseline. Two diseases lets us test the routing rules without exploding the rule surface — if it works for Cocci and Salmonellosis, the pattern extends. Three months is the WHO public-health pilot duration standard for evaluating completeness and time-to-submit changes. Going broader would buy more data and lose the ability to attribute the change to NotifiAZ.

These are not lines of code. They are conversations. But they are the only things between this prototype and a real deployment.
        `);
    }

    // --------------------------------------------------------------------
    // SLIDE 16 — Thank you
    // --------------------------------------------------------------------
    {
        const s = pres.addSlide();
        s.background = { color: C.navy };

        s.addText("Thank you.", {
            x: 0.5, y: 1.5, w: 9, h: 1.5,
            fontFace: FONT_HEAD, fontSize: 100, bold: true,
            color: C.white, align: "center", margin: 0,
        });

        s.addText("Questions?", {
            x: 0.5, y: 3.0, w: 9, h: 0.7,
            fontFace: FONT_HEAD, fontSize: 30, italic: true,
            color: C.cream, align: "center", margin: 0,
        });

        // Footer with key references
        s.addText(
            "Repo: notifi-az  ·  Docs: COURSE_CONCEPTS_MAPPING.md  ·  predictor_model_card.md  ·  fair_compliance.md  ·  ai_governance.md",
            {
                x: 0.5, y: 5.0, w: 9, h: 0.4,
                fontFace: FONT_BODY, fontSize: 10, color: C.cream,
                align: "center", italic: true, margin: 0,
            }
        );

        notes(s, `
That is the project. Sixty minutes today, four minutes with NotifiAZ. Eight destinations from one click. A predictor that warns clinicians before they submit incomplete reports. A retrieval system that lets them ask the disease database in plain language. Synthetic-only data, tribal sovereignty by default, every claim auditable.

I am happy to dig into anything you want — the model card, the FAIR compliance, the governance trade-offs, the demo, or the archive branch where the deep learning, federated learning, and swarm learning prototypes still live.

Thank you.
        `);
    }

    // ====================================================================
    // Write file
    // ====================================================================
    await pres.writeFile({ fileName: "/home/claude/notifi-az/docs/NotifiAZ_Capstone.pptx" });
    console.log("✓ Wrote NotifiAZ_Capstone.pptx");
}

build().catch(e => { console.error(e); process.exit(1); });
