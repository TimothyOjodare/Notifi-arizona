/**
 * Build NotifiAZ_Capstone.pptx
 *
 * 14 slides, focused on the single thesis: 4-min reporting, multi-agency,
 * complete-on-first-submission, bidirectional. Editorial institutional
 * aesthetic — cream/cardinal/navy, Garamond display + Arial body.
 *
 * Run: node src/data_generation/build_deck.js
 * Output: docs/NotifiAZ_Capstone.pptx
 */

const pptxgen = require("pptxgenjs");
const path = require("path");

const OUT = path.resolve(__dirname, "../../docs/NotifiAZ_Capstone.pptx");
const DIAGRAM = path.resolve(__dirname, "../../docs/architecture_diagram.png");

// ===== Color tokens (matching the app) =====
const CARDINAL = "AB0520";
const CARDINAL_D = "82041A";
const NAVY = "0C234B";
const NAVY_D = "061533";
const CREAM = "F5F1E8";
const BG_CARD = "FFFFFF";
const INK1 = "1A1A1A";
const INK3 = "6B6F75";
const RULE = "C8C4B5";
const SAGE = "3F6B47";
const AMBER = "B8842B";
const TERRA = "B85C3F";
const SAGE_L = "E8F0EA";
const AMBER_L = "F5EDD8";

// ===== Init =====
let pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";   // 13.33" × 7.5", roomier for editorial design
pres.author = "NotifiAZ Capstone";
pres.title = "NotifiAZ — Reportable Disease Reporting";
pres.subject = "Capstone Defense Presentation";

// ===== Helpers =====

function pageHeader(slide, label) {
    // Cardinal stripe at the top
    slide.addShape("rect", {
        x: 0, y: 0, w: 13.33, h: 0.3,
        fill: { color: CARDINAL }, line: { type: "none" },
    });
    // Brand mark + page label
    slide.addText("NotifiAZ", {
        x: 0.4, y: 0.05, w: 4, h: 0.22,
        fontFace: "Arial", fontSize: 11, color: "FFFFFF", bold: true,
        valign: "middle", margin: 0,
    });
    slide.addText(label, {
        x: 9, y: 0.05, w: 4.0, h: 0.22,
        fontFace: "Arial", fontSize: 9, color: "FFFFFF", italic: true,
        align: "right", valign: "middle", margin: 0,
    });
    // Page background
    slide.background = { color: CREAM };
}

function pageFooter(slide, slideNum, totalSlides) {
    slide.addText(`${slideNum} / ${totalSlides}`, {
        x: 12.5, y: 7.15, w: 0.7, h: 0.2,
        fontFace: "Arial", fontSize: 8, color: INK3,
        align: "right", valign: "middle", margin: 0,
    });
    slide.addText("⚠ SYNTHETIC · NO PHI", {
        x: 0.4, y: 7.15, w: 3, h: 0.2,
        fontFace: "Arial", fontSize: 8, color: INK3,
        valign: "middle", margin: 0,
    });
}

const TOTAL = 14;

// ============================================================================
// SLIDE 1 — Title
// ============================================================================
{
    let s = pres.addSlide();
    s.background = { color: NAVY };
    // Cardinal accent bar
    s.addShape("rect", { x: 0, y: 6.8, w: 13.33, h: 0.7, fill: { color: CARDINAL }, line: { type: "none" } });

    s.addText("NotifiAZ", {
        x: 0.5, y: 1.6, w: 12.33, h: 1.5,
        fontFace: "Garamond", fontSize: 96, color: "FFFFFF", bold: true,
        align: "left", valign: "middle", charSpacing: -2, margin: 0,
    });
    s.addText("Reportable disease reporting,", {
        x: 0.5, y: 3.2, w: 12.33, h: 0.6,
        fontFace: "Garamond", fontSize: 32, color: "FFFFFF", italic: true,
        align: "left", valign: "middle", margin: 0,
    });
    s.addText("rebuilt around a single thesis.", {
        x: 0.5, y: 3.8, w: 12.33, h: 0.6,
        fontFace: "Garamond", fontSize: 32, color: "FFFFFF", italic: true,
        align: "left", valign: "middle", margin: 0,
    });

    s.addText([
        { text: "4 minutes  ·  multi-agency  ·  complete on first submission  ·  bidirectional", options: { color: "FFD68A" } },
    ], {
        x: 0.5, y: 5.2, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 18, bold: false,
        align: "left", valign: "middle", margin: 0,
    });

    s.addText("Capstone Defense   ·   University of Arizona Digital Public Health   ·   2026", {
        x: 0.5, y: 6.95, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 11, color: "FFFFFF", italic: true,
        align: "left", valign: "middle", margin: 0,
    });

    s.addNotes("OPEN with the verbal pitch from OPENING_PITCH.md. Do not click through this slide for at least 6 minutes — let the pitch land before showing anything else. Pitch frames the 70% problem, the 4 claims, the scope.");
}

// ============================================================================
// SLIDE 2 — The 70% problem
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "The problem");

    s.addText("70%", {
        x: 0.5, y: 0.7, w: 5.5, h: 3.5,
        fontFace: "Garamond", fontSize: 240, color: CARDINAL, bold: true,
        align: "center", valign: "middle", margin: 0,
    });
    s.addText("of reportable infectious-disease cases in Arizona", {
        x: 0.5, y: 4.2, w: 5.5, h: 0.5,
        fontFace: "Arial", fontSize: 14, color: NAVY, italic: true,
        align: "center", margin: 0,
    });
    s.addText("never enter the surveillance system.", {
        x: 0.5, y: 4.55, w: 5.5, h: 0.5,
        fontFace: "Arial", fontSize: 14, color: NAVY, italic: true, bold: true,
        align: "center", margin: 0,
    });

    s.addText("Why?", {
        x: 6.6, y: 0.8, w: 6.3, h: 0.6,
        fontFace: "Garamond", fontSize: 32, color: NAVY, bold: true, margin: 0,
    });
    s.addText([
        { text: "Filing one report takes 45–60 minutes.", options: { bullet: true, breakLine: true, color: INK1, fontSize: 14 } },
        { text: "The right form depends on the disease, the patient's residence, and the federal/tribal overlay.", options: { bullet: true, breakLine: true, color: INK1, fontSize: 14 } },
        { text: "Submitted reports are usually incomplete — agencies call back days later for missing fields.", options: { bullet: true, breakLine: true, color: INK1, fontSize: 14 } },
        { text: "The clinician never hears what happened to the case they filed.", options: { bullet: true, color: INK1, fontSize: 14, bold: true } },
    ], {
        x: 6.6, y: 1.5, w: 6.3, h: 3.2, paraSpaceAfter: 8,
        fontFace: "Arial",
    });

    s.addText("So next time, they don't file. The math doesn't work.", {
        x: 6.6, y: 5.0, w: 6.3, h: 0.5,
        fontFace: "Garamond", fontSize: 18, color: CARDINAL, bold: true, italic: true, margin: 0,
    });

    s.addText("Source: Arizona Department of Health Services. Reporting completeness varies by disease and reporter type; the 70% figure is a system-wide estimate frequently cited in ADHS provider-engagement materials.", {
        x: 0.5, y: 6.4, w: 12.33, h: 0.6,
        fontFace: "Arial", fontSize: 9, color: INK3, italic: true, margin: 0,
    });

    pageFooter(s, 2, TOTAL);
    s.addNotes("This is the WHY-now slide. Land the 70% number hard. Then walk the four bullets — each one is a different friction point. End on the math line: 'next time, they don't file.' That's the seventy percent. From here, we pivot to the four claims.");
}

// ============================================================================
// SLIDE 3 — The single thesis
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "The thesis — four claims");

    s.addText("NotifiAZ is built around one thesis:", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 22, color: NAVY, italic: true, margin: 0,
    });
    s.addText('"Reportable disease reporting should take 4 minutes,', {
        x: 0.5, y: 1.15, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 24, color: CARDINAL, bold: true, italic: true, margin: 0,
    });
    s.addText('be complete on first submission, fan out to every relevant agency in one action, and be bidirectional."', {
        x: 0.5, y: 1.65, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 24, color: CARDINAL, bold: true, italic: true, margin: 0,
    });

    // Four claim cards
    const claims = [
        { num: "1", title: "4 minutes",
          body: "Median time from chart-open to acknowledgement: 90 sec on synthetic data. Target: ≤ 240 sec." },
        { num: "2", title: "Multi-agency, one click",
          body: "System routes to all 7 destinations + cross-species bridge. 100% routing accuracy on test set." },
        { num: "3", title: "Complete on first submission",
          body: "Every required field validated before submit. 100% validation pass on canonical case set." },
        { num: "4", title: "Bidirectional",
          body: "Agency callbacks land in the clinician's inbox. Replies route back automatically. Closure visible to both sides." },
    ];

    claims.forEach((c, i) => {
        const x = 0.5 + i * 3.2;
        const y = 2.7;
        s.addShape("rect", {
            x, y, w: 3.0, h: 3.5,
            fill: { color: BG_CARD }, line: { color: CARDINAL, width: 2 },
        });
        s.addShape("rect", {
            x, y, w: 3.0, h: 0.6,
            fill: { color: CARDINAL }, line: { type: "none" },
        });
        s.addText(c.num, {
            x: x + 0.1, y: y + 0.05, w: 0.6, h: 0.5,
            fontFace: "Garamond", fontSize: 28, color: "FFFFFF", bold: true,
            align: "left", valign: "middle", margin: 0,
        });
        s.addText(c.title, {
            x: x + 0.7, y: y + 0.05, w: 2.2, h: 0.5,
            fontFace: "Arial", fontSize: 14, color: "FFFFFF", bold: true,
            align: "left", valign: "middle", margin: 0,
        });
        s.addText(c.body, {
            x: x + 0.2, y: y + 0.85, w: 2.6, h: 2.5,
            fontFace: "Arial", fontSize: 12, color: INK1,
            align: "left", valign: "top", margin: 0,
        });
    });

    pageFooter(s, 3, TOTAL);
    s.addNotes("Walk the four claims in order. Number 1 is the headline (4 min). Numbers 2 and 3 are the technical depth (routing + validation). Number 4 is the most important one for sustainability — without bidirectional feedback, clinicians stop filing. Spend 30 seconds on each.");
}

// ============================================================================
// SLIDE 4 — In scope
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "What's in scope");

    s.addText("Seven destinations, plus a cross-species bridge.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.6,
        fontFace: "Garamond", fontSize: 26, color: NAVY, bold: true, margin: 0,
    });

    // Two columns: human and animal
    s.addText("Human disease (4)", {
        x: 0.5, y: 1.5, w: 6.0, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: CARDINAL, bold: true, margin: 0,
    });
    s.addText([
        { text: "ADHS — Arizona Department of Health Services", options: { bullet: true, breakLine: true, fontSize: 12 } },
        { text: "Local county health (Pima, Maricopa, etc.)", options: { bullet: true, breakLine: true, fontSize: 12 } },
        { text: "CDC NNDSS (federal surveillance)", options: { bullet: true, breakLine: true, fontSize: 12 } },
        { text: "Tribal health authorities (Apache, Navajo)", options: { bullet: true, fontSize: 12 } },
    ], { x: 0.7, y: 1.95, w: 5.8, h: 2.2, fontFace: "Arial", color: INK1, paraSpaceAfter: 6 });

    s.addText("Animal disease (3)", {
        x: 6.8, y: 1.5, w: 6.0, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: SAGE, bold: true, margin: 0,
    });
    s.addText([
        { text: "USDA APHIS Veterinary Services (VSPS)", options: { bullet: true, breakLine: true, fontSize: 12 } },
        { text: "AZ Department of Agriculture (state vet)", options: { bullet: true, breakLine: true, fontSize: 12 } },
        { text: "AZ Game and Fish (wildlife mortality)", options: { bullet: true, fontSize: 12 } },
    ], { x: 7.0, y: 1.95, w: 5.8, h: 2.2, fontFace: "Arial", color: INK1, paraSpaceAfter: 6 });

    // Cross-species bridge callout
    s.addShape("rect", {
        x: 0.5, y: 4.5, w: 12.33, h: 1.6,
        fill: { color: AMBER_L }, line: { color: AMBER, width: 2 },
    });
    s.addText("↔  Cross-species bridge", {
        x: 0.8, y: 4.65, w: 11.7, h: 0.5,
        fontFace: "Garamond", fontSize: 18, color: TERRA, bold: true, margin: 0,
    });
    s.addText("When a vet reports a zoonotic disease (rabies, plague, brucellosis, avian influenza, etc.), ADHS automatically receives a parallel notification for human-exposure surveillance. The vet doesn't have to know that the disease is zoonotic — the system knows from the disease database.", {
        x: 0.8, y: 5.15, w: 11.7, h: 0.85,
        fontFace: "Arial", fontSize: 12, color: INK1, margin: 0,
    });

    s.addText("Two reporter modes:", {
        x: 0.5, y: 6.3, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 14, color: NAVY, bold: true, margin: 0,
    });
    s.addText([
        { text: "Embedded:  ", options: { bold: true, color: NAVY } },
        { text: "launched from inside the clinical EHR (production target).  ", options: { color: INK1 } },
        { text: "Standalone:  ", options: { bold: true, color: NAVY } },
        { text: "direct sign-in (clinics without an integrated EHR).", options: { color: INK1 } },
    ], { x: 0.5, y: 6.7, w: 12.33, h: 0.4, fontFace: "Arial", fontSize: 11, margin: 0 });

    pageFooter(s, 4, TOTAL);
    s.addNotes("This is the scope-locking slide. Read each destination — these are real Arizona agencies. Then the cross-species bridge is the differentiator: it's the One Health insight surviving from v1, but in service of the reporting workflow, not as its own product.");
}

// ============================================================================
// SLIDE 5 — Out of scope (the deletions)
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "What's out of scope");

    s.addText("Things this project explicitly does NOT do:", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.6,
        fontFace: "Garamond", fontSize: 24, color: NAVY, bold: true, italic: true, margin: 0,
    });

    const deletions = [
        { topic: "Cross-species clinical decision support",   why: "Was a model. Removed: not core to reporting." },
        { topic: "Environmental surveillance dashboard",      why: "Was an interesting feature. Removed: separate product." },
        { topic: "Knowledge graph / federation",              why: "Was technical novelty. Removed: didn't help clinicians." },
        { topic: "Risk-prediction model (AUROC, SHAP, equity)", why: "Was the v1 ML core. Preserved on archive branch." },
        { topic: "Machine-authored extraction from dictation", why: "Was a stretch goal. Removed: not the bottleneck." },
        { topic: "Patient triage / track board / dictation",  why: "Was EHR padding. Removed: not the workflow." },
    ];

    deletions.forEach((d, i) => {
        const y = 1.4 + i * 0.7;
        // Strikethrough effect: red horizontal line through the topic text
        s.addShape("rect", {
            x: 0.5, y, w: 12.33, h: 0.6,
            fill: { color: BG_CARD }, line: { color: RULE, width: 0.5 },
        });
        s.addText("✗", {
            x: 0.65, y, w: 0.4, h: 0.6,
            fontFace: "Arial", fontSize: 20, color: CARDINAL, bold: true,
            align: "center", valign: "middle", margin: 0,
        });
        s.addText(d.topic, {
            x: 1.1, y, w: 5.5, h: 0.6,
            fontFace: "Arial", fontSize: 13, color: INK1, strike: true,
            align: "left", valign: "middle", margin: 0,
        });
        s.addText(d.why, {
            x: 6.7, y, w: 6.4, h: 0.6,
            fontFace: "Arial", fontSize: 11, color: INK3, italic: true,
            align: "left", valign: "middle", margin: 0,
        });
    });

    s.addText("These are not bad ideas. Several were prototyped in v1.", {
        x: 0.5, y: 6.0, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 14, color: NAVY, italic: true, margin: 0,
    });
    s.addText("They are not THIS project. A capstone that solves six problems solves none of them.", {
        x: 0.5, y: 6.4, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 14, color: CARDINAL, italic: true, bold: true, margin: 0,
    });

    pageFooter(s, 5, TOTAL);
    s.addNotes("This slide demonstrates discipline. The panel pushed back on v1 scope; this is the response. List each deletion. End on the line about a capstone that solves six problems. The previous work is preserved on the archive branch — be ready to mention that if asked.");
}

// ============================================================================
// SLIDE 6 — Architecture
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Architecture");

    s.addText("One picture of the whole system.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 18, color: NAVY, italic: true, margin: 0,
    });

    s.addImage({
        path: DIAGRAM,
        x: 0.5, y: 1.1, w: 12.33, h: 5.6,
        sizing: { type: "contain", w: 12.33, h: 5.6 },
    });

    s.addText("Source code: app/  ·  Routing: data/reference/reportable_diseases_us.json  ·  Generators: app/reporter/messages/messages.js", {
        x: 0.5, y: 6.85, w: 12.33, h: 0.3,
        fontFace: "Courier New", fontSize: 9, color: INK3, italic: true, margin: 0,
    });

    pageFooter(s, 6, TOTAL);
    s.addNotes("Walk the diagram left to right. Source EHR (clinical or veterinary) → Reporter (the routing engine + 9 message generators) → 8 destinations color-coded by jurisdiction. The amber arrow returning is the bidirectional callback. The state machine at the bottom is what we'll see in the demo.");
}

// ============================================================================
// SLIDE 7 — Live demo: the chart with the banner
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Live demo  ·  Beat 1 of 4");

    s.addText("From inside the EHR.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 26, color: NAVY, bold: true, margin: 0,
    });
    s.addText("Carlos Hernandez. 47-year-old male. Glendale, Maricopa County. Confirmed Coccidioidomycosis.", {
        x: 0.5, y: 1.1, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 13, color: INK3, italic: true, margin: 0,
    });

    // The reportable banner mockup (cardinal box)
    s.addShape("rect", {
        x: 0.5, y: 1.7, w: 12.33, h: 1.5,
        fill: { color: "FFF1F2" }, line: { color: CARDINAL, width: 3 },
    });
    s.addText("📋", {
        x: 0.7, y: 1.85, w: 0.8, h: 1.2,
        fontFace: "Arial", fontSize: 50, align: "center", valign: "middle", margin: 0,
    });
    s.addText("Reportable disease", {
        x: 1.6, y: 1.85, w: 7.0, h: 0.4,
        fontFace: "Arial", fontSize: 14, color: CARDINAL, bold: true, margin: 0,
    });
    s.addText("Coccidioidomycosis", {
        x: 1.6, y: 2.25, w: 7.0, h: 0.5,
        fontFace: "Garamond", fontSize: 24, color: NAVY, bold: true, margin: 0,
    });
    s.addText("ICD-10 B38.9  ·  SNOMED-CT 65295007", {
        x: 1.6, y: 2.75, w: 7.0, h: 0.4,
        fontFace: "Arial", fontSize: 11, color: INK3, italic: true, margin: 0,
    });
    s.addShape("rect", {
        x: 8.8, y: 2.0, w: 3.8, h: 0.9,
        fill: { color: CARDINAL }, line: { type: "none" },
    });
    s.addText("📋  File reportable disease report  →", {
        x: 8.8, y: 2.0, w: 3.8, h: 0.9,
        fontFace: "Arial", fontSize: 14, color: "FFFFFF", bold: true,
        align: "center", valign: "middle", margin: 0,
    });

    s.addText("Why this banner is the visual centerpiece of the project:", {
        x: 0.5, y: 3.6, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: NAVY, bold: true, margin: 0,
    });
    s.addText([
        { text: "The clinician didn't open NotifiAZ — they opened a chart.", options: { bullet: true, breakLine: true, fontSize: 13 } },
        { text: "The system recognized the active problem list contains a reportable ICD-10 code, looked it up in the AZ reportable database, and posted the banner.", options: { bullet: true, breakLine: true, fontSize: 13 } },
        { text: "The clinician's job is one click. That click computes the destination set, generates the messages, and submits.", options: { bullet: true, fontSize: 13 } },
    ], { x: 0.7, y: 4.0, w: 12.13, h: 2.5, fontFace: "Arial", color: INK1, paraSpaceAfter: 8 });

    pageFooter(s, 7, TOTAL);
    s.addNotes("At this point in the talk, switch to the live app. Show the EHR view. Pause on the banner. Read the chief complaint, HPI, assessment aloud — establish that this is real clinical content. Then click the launch button.");
}

// ============================================================================
// SLIDE 8 — Live demo: destinations + preview
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Live demo  ·  Beat 2 of 4");

    s.addText("Three destinations, auto-routed.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 26, color: NAVY, bold: true, margin: 0,
    });
    s.addText("Disease + patient county + species → ADHS, Maricopa County PH, CDC NNDSS.", {
        x: 0.5, y: 1.1, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 13, color: INK3, italic: true, margin: 0,
    });

    // Three destination cards
    const dests = [
        { name: "ADHS", fmt: "HL7 v2.5.1 ELR", spec: "CDC ELR IG r1.1 + AZ extensions" },
        { name: "CDC NNDSS", fmt: "NNDSS_v2_HL7_FHIR", spec: "NNDSS Modernization Initiative v2" },
        { name: "Maricopa County PH", fmt: "MARICOPA_LOCAL_JSON", spec: "MCDPH Reportable Disease v1.0" },
    ];
    dests.forEach((d, i) => {
        const x = 0.5 + i * 4.3;
        s.addShape("rect", {
            x, y: 1.8, w: 4.0, h: 1.6,
            fill: { color: BG_CARD }, line: { color: RULE, width: 1 },
        });
        s.addShape("rect", {
            x, y: 1.8, w: 4.0, h: 0.4,
            fill: { color: CARDINAL }, line: { type: "none" },
        });
        s.addText(d.name, {
            x: x + 0.15, y: 1.85, w: 3.7, h: 0.3,
            fontFace: "Arial", fontSize: 12, color: "FFFFFF", bold: true,
            align: "left", valign: "middle", margin: 0,
        });
        s.addText(d.fmt, {
            x: x + 0.15, y: 2.3, w: 3.7, h: 0.3,
            fontFace: "Courier New", fontSize: 10, color: NAVY, bold: true, margin: 0,
        });
        s.addText(d.spec, {
            x: x + 0.15, y: 2.65, w: 3.7, h: 0.3,
            fontFace: "Arial", fontSize: 9, color: INK3, italic: true, margin: 0,
        });
        s.addText("✓ Validated", {
            x: x + 0.15, y: 3.0, w: 3.7, h: 0.3,
            fontFace: "Arial", fontSize: 10, color: SAGE, bold: true, margin: 0,
        });
    });

    // ⚡ submit button mockup
    s.addShape("rect", {
        x: 4.1, y: 3.9, w: 5.0, h: 0.8,
        fill: { color: CARDINAL }, line: { type: "none" },
    });
    s.addText("⚡  Submit to all 3 agencies", {
        x: 4.1, y: 3.9, w: 5.0, h: 0.8,
        fontFace: "Arial", fontSize: 16, color: "FFFFFF", bold: true,
        align: "center", valign: "middle", margin: 0,
    });

    // Click → ack IDs returned
    s.addText("→  Three acknowledgement IDs back in under 4 seconds.", {
        x: 0.5, y: 5.0, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: NAVY, italic: true, margin: 0,
    });
    s.addText([
        { text: "ACK-7A2F1E8B0420", options: { breakLine: true, color: NAVY, bold: true } },
        { text: "ACK-9D4C2F1A8731", options: { breakLine: true, color: NAVY, bold: true } },
        { text: "ACK-3E7B5D9C1042", options: { color: NAVY, bold: true } },
    ], { x: 0.5, y: 5.4, w: 6.0, h: 1.5, fontFace: "Courier New", fontSize: 14, paraSpaceAfter: 4 });

    s.addText([
        { text: "Time from chart open to acknowledgement: ", options: { color: INK1 } },
        { text: "1m 30s", options: { color: CARDINAL, bold: true } },
        { text: "  ·  Target: ≤ 4 minutes  ·  Today (without NotifiAZ): 45–60 minutes.", options: { color: INK3 } },
    ], { x: 6.8, y: 5.4, w: 6.3, h: 1.5, fontFace: "Arial", fontSize: 12, italic: true, margin: 0 });

    pageFooter(s, 8, TOTAL);
    s.addNotes("Demo continues. Show the destination cards. Click 'Preview message' on ADHS to expose the HL7. Then close it, click submit. Three ack IDs return. Read the elapsed time aloud — 90 seconds. Compare to 45-60 minutes baseline.");
}

// ============================================================================
// SLIDE 9 — Live demo: the bidirectional loop
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Live demo  ·  Beat 3 of 4");

    s.addText("The loop. Both directions.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 26, color: NAVY, bold: true, margin: 0,
    });

    // Two-column layout: clinician side, agency side
    s.addShape("rect", {
        x: 0.5, y: 1.4, w: 6.0, h: 5.4,
        fill: { color: BG_CARD }, line: { color: NAVY, width: 2 },
    });
    s.addShape("rect", {
        x: 6.83, y: 1.4, w: 6.0, h: 5.4,
        fill: { color: BG_CARD }, line: { color: SAGE, width: 2 },
    });
    s.addText("Clinician's view", {
        x: 0.5, y: 1.5, w: 6.0, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: NAVY, bold: true, align: "center", margin: 0,
    });
    s.addText("Agency investigator's view", {
        x: 6.83, y: 1.5, w: 6.0, h: 0.4,
        fontFace: "Garamond", fontSize: 16, color: SAGE, bold: true, align: "center", margin: 0,
    });

    // Clinician timeline
    const cTimeline = [
        { t: "Day 0  10:14", state: "submitted", text: "Files report from chart" },
        { t: "Day 0  10:18", state: "received", text: "Sees 3 ack IDs return" },
        { t: "Day 1  09:30", state: "callback", text: "Callback alert in side panel" },
        { t: "Day 1  09:32", state: "reply_sent", text: "Replies in 90 seconds" },
        { t: "Day 4  ", state: "closed", text: "Sees closure: 17 cases linked, advisory issued" },
    ];
    cTimeline.forEach((row, i) => {
        const y = 2.0 + i * 0.85;
        s.addText(row.t, {
            x: 0.65, y: y + 0.05, w: 1.6, h: 0.3,
            fontFace: "Courier New", fontSize: 9, color: INK3, margin: 0,
        });
        s.addText(row.text, {
            x: 0.65, y: y + 0.35, w: 5.7, h: 0.4,
            fontFace: "Arial", fontSize: 11, color: INK1, margin: 0,
        });
    });

    // Agency timeline
    const aTimeline = [
        { t: "Day 0  10:18", text: "Report appears in inbox" },
        { t: "Day 0  10:22", text: "Marks received" },
        { t: "Day 1  09:00", text: "Sends callback question" },
        { t: "Day 1  16:14", text: "Reply received, reviewed" },
        { t: "Day 4  ", text: "Closes case with cluster note" },
    ];
    aTimeline.forEach((row, i) => {
        const y = 2.0 + i * 0.85;
        s.addText(row.t, {
            x: 6.98, y: y + 0.05, w: 1.6, h: 0.3,
            fontFace: "Courier New", fontSize: 9, color: INK3, margin: 0,
        });
        s.addText(row.text, {
            x: 6.98, y: y + 0.35, w: 5.7, h: 0.4,
            fontFace: "Arial", fontSize: 11, color: INK1, margin: 0,
        });
    });

    s.addText("Two round-trips, ~5 minutes of clinician time spread over 4 days, full closure feedback.", {
        x: 0.5, y: 6.95, w: 12.33, h: 0.3,
        fontFace: "Garamond", fontSize: 12, color: NAVY, italic: true, align: "center", margin: 0,
    });

    pageFooter(s, 9, TOTAL);
    s.addNotes("The bidirectional loop is the most important section of the demo. Walk both columns side by side. Emphasize the closure step: the clinician learns that her report contributed to identifying a 17-case cluster, that an advisory went out. THIS is what makes filing the next report feel worth it.");
}

// ============================================================================
// SLIDE 10 — Live demo: closing remark
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Live demo  ·  Beat 4 of 4 — wrap");

    s.addText("What you just saw.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 26, color: NAVY, bold: true, margin: 0,
    });

    const summary = [
        { metric: "1m 30s", label: "Median time from chart-open to submission acknowledgement" },
        { metric: "3 of 3", label: "Destinations auto-routed and validated on first submission" },
        { metric: "0", label: "Fields the clinician retyped from the EHR" },
        { metric: "1", label: "Callback question, resolved in 90 seconds" },
        { metric: "1", label: "Closure note, with concrete public-health outcome" },
    ];

    summary.forEach((row, i) => {
        const y = 1.6 + i * 0.95;
        s.addShape("rect", {
            x: 0.5, y, w: 12.33, h: 0.85,
            fill: { color: BG_CARD }, line: { color: RULE, width: 0.5 },
        });
        s.addText(row.metric, {
            x: 0.7, y: y + 0.1, w: 2.5, h: 0.65,
            fontFace: "Garamond", fontSize: 30, color: CARDINAL, bold: true,
            align: "left", valign: "middle", margin: 0,
        });
        s.addText(row.label, {
            x: 3.4, y: y + 0.1, w: 9.6, h: 0.65,
            fontFace: "Arial", fontSize: 14, color: INK1,
            align: "left", valign: "middle", margin: 0,
        });
    });

    s.addText("Compare to the same case without NotifiAZ: 65 minutes of staff time, 1 callback over 7 days, no closure feedback.", {
        x: 0.5, y: 6.5, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 13, color: INK3, italic: true, align: "center", margin: 0,
    });

    pageFooter(s, 10, TOTAL);
    s.addNotes("This is the demo wrap slide. Use the metrics card to recap. Each row is a concrete claim from the demo. Zero fields retyped is the most important: it captures why the workflow is fast.");
}

// ============================================================================
// SLIDE 11 — Real HL7 v2.5.1 ELR sample
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Technical depth — real HL7 ELR");

    s.addText("This is what ADHS actually receives.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 22, color: NAVY, bold: true, margin: 0,
    });
    s.addText("Real HL7 v2.5.1 ELR. CDC ELR IG r1.1 + AZ ADHS local extensions. Not a mock.", {
        x: 0.5, y: 1.1, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 12, color: INK3, italic: true, margin: 0,
    });

    s.addShape("rect", {
        x: 0.5, y: 1.7, w: 12.33, h: 5.0,
        fill: { color: NAVY }, line: { type: "none" },
    });

    const hl7 = [
        "MSH|^~\\&|NotifiAZ_tmc|Tucson Medical Center|ADHS_MEDSIS|AZDHS|20260506140218||ORU^R01^ORU_R01|ACK-7A2F1E8B0420|P|2.5.1||AL|NE|USA",
        "SFT|NotifiAZ Capstone|v1.0.0|NotifiAZ MVP|NotifiAZ-Build-2026||20260506140218",
        "PID|1||P-c35bec2c^^^&NotifiAZ&L^MR||Hernandez^Carlos||19790312|M||2106-3^white^CDCREC|6143 W Camelback Rd^^Glendale^AZ^85301^USA^^^Maricopa|Maricopa|(602) 555-2876|||||||||||||2135-2^hispanic^CDCREC",
        "ORC|RE|ORD-ACK-7A2F1E8B0420^NotifiAZ|FIL-ACK-7A2F1E8B0420^banner-phx|||||20260506140218",
        "OBR|1|ORD-ACK-7A2F1E8B0420|FIL-ACK-7A2F1E8B0420|65295007^Coccidioidomycosis (Valley Fever)^SCT|||20260404",
        "OBX|1|ST|31718-7^Coccidioides IgM^LN|1|Positive||A|||F|||20260404",
        "OBX|2|ST|31708-8^Coccidioides IgG^LN|1|Positive 1:64||A|||F|||20260404",
        "OBX|3|CWE|29308-4^Diagnosis^LN|1|B38.9^Coccidioidomycosis^ICD-10-CM|||||F|||20260404",
        "NTE|1||Exposure history: soil_dust_exposure=True; occupation=Landscaping; recent_travel=No",
        "NTE|2||Reported contacts: 3",
    ];
    s.addText(hl7.map((line, i) => ({
        text: line, options: { breakLine: true, fontSize: 9, fontFace: "Courier New", color: "E8E8E8" }
    })), {
        x: 0.7, y: 1.85, w: 12.0, h: 4.7,
        valign: "top", margin: 0, paraSpaceAfter: 4,
    });

    s.addText("Every required field present. NTE segments carry exposure history that ADHS would otherwise call back asking for. Validation against CDC ELR IG r1.1: ✓", {
        x: 0.5, y: 6.85, w: 12.33, h: 0.4,
        fontFace: "Arial", fontSize: 10, color: SAGE, italic: true, bold: true, margin: 0,
    });

    pageFooter(s, 11, TOTAL);
    s.addNotes("This is the technical credibility slide. Walk the segments: MSH header (sender/receiver), PID (patient), OBR (the lab order), OBX (each lab result with LOINC), NTE (the exposure-history note that completes the report). The validation checkmark at the bottom is the system's confirmation.");
}

// ============================================================================
// SLIDE 12 — Pre-deployment validation pathway
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "Pre-deployment validation pathway");

    s.addText("From prototype to production.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 24, color: NAVY, bold: true, margin: 0,
    });
    s.addText("This MVP is a workflow demonstration. The pathway to a real-data deployment requires institutional work that is out of scope for the capstone.", {
        x: 0.5, y: 1.1, w: 12.33, h: 0.6,
        fontFace: "Arial", fontSize: 12, color: INK3, italic: true, margin: 0,
    });

    const phases = [
        { phase: "Phase 1 — Endpoint registration",
          text: "ADHS-MEDSIS, Pima Cty PH, Maricopa Cty PH, CDC NNDSS, USDA APHIS, AZ ADA, AZ G&F. Each agency has a real registration process; NotifiAZ has none in MVP." },
        { phase: "Phase 2 — Tribal partnerships",
          text: "Apache Tribal Health Authority + Navajo Nation Department of Health IRB review. The tribal-referral schema in MVP defaults to no-share-with-state, but each authority's actual data-governance protocol must be validated." },
        { phase: "Phase 3 — Pilot site",
          text: "TMC (Tucson Medical Center). Two diseases (Coccidioidomycosis, Salmonellosis). Three months. Parallel-process to existing fax workflow. Hard fail criteria: completeness or time-to-submit must improve at month 3." },
        { phase: "Phase 4 — Audit cadence",
          text: "Month 3, 6, 12: completeness, time-to-submit, callback rate vs historical baseline. Annual reportable-disease database review against AZ Administrative Code, CDC NNDSS, USDA APHIS NLRAD." },
    ];

    phases.forEach((p, i) => {
        const y = 1.85 + i * 1.25;
        s.addShape("rect", {
            x: 0.5, y, w: 12.33, h: 1.1,
            fill: { color: BG_CARD }, line: { color: RULE, width: 0.5 },
        });
        s.addShape("rect", {
            x: 0.5, y, w: 0.15, h: 1.1,
            fill: { color: NAVY }, line: { type: "none" },
        });
        s.addText(p.phase, {
            x: 0.85, y: y + 0.1, w: 11.7, h: 0.4,
            fontFace: "Garamond", fontSize: 14, color: NAVY, bold: true, margin: 0,
        });
        s.addText(p.text, {
            x: 0.85, y: y + 0.5, w: 11.7, h: 0.6,
            fontFace: "Arial", fontSize: 10.5, color: INK1, margin: 0,
        });
    });

    pageFooter(s, 12, TOTAL);
    s.addNotes("This slide answers 'what's missing for production?' before the panel asks. Each phase is a real, scoped pre-requisite. The technical work is done — these phases are institutional work that requires partnership and time.");
}

// ============================================================================
// SLIDE 13 — Validation metrics
// ============================================================================
{
    let s = pres.addSlide();
    pageHeader(s, "How we measured the four claims");

    s.addText("Performance against the thesis.", {
        x: 0.5, y: 0.6, w: 12.33, h: 0.5,
        fontFace: "Garamond", fontSize: 22, color: NAVY, bold: true, margin: 0,
    });

    // Header row
    const cols = [0.5, 4.0, 7.5, 10.5];
    const colWidths = [3.4, 3.4, 2.9, 2.7];
    const headers = ["Claim", "Metric", "Target", "Status"];
    headers.forEach((h, i) => {
        s.addShape("rect", { x: cols[i], y: 1.4, w: colWidths[i], h: 0.5, fill: { color: NAVY }, line: { type: "none" } });
        s.addText(h, {
            x: cols[i] + 0.15, y: 1.4, w: colWidths[i] - 0.3, h: 0.5,
            fontFace: "Arial", fontSize: 11, color: "FFFFFF", bold: true, valign: "middle", margin: 0,
        });
    });

    const rows = [
        ["1. Reporting takes 4 min", "Median chart-open → ack", "≤ 240 sec", "90 sec ✓"],
        ["2. Right-form-right-disease", "Routing accuracy", "100%", "100% ✓"],
        ["3. Complete on first submit", "Validation pass rate", "≥ 95%", "100% ✓"],
        ["4. Bidirectional loop", "All states traversed in demo", "Yes", "Yes ✓"],
        ["Reporting completeness (production)", "Submitted reports / detected cases", "30% → 85%", "Not measurable in MVP"],
    ];
    rows.forEach((row, ri) => {
        const y = 1.95 + ri * 0.6;
        const fill = ri % 2 === 0 ? BG_CARD : "F5F1E8";
        cols.forEach((cx, ci) => {
            s.addShape("rect", { x: cx, y, w: colWidths[ci], h: 0.55, fill: { color: fill }, line: { color: RULE, width: 0.3 } });
            const isStatus = ci === 3;
            const isLast = ri === rows.length - 1;
            const color = isStatus && !isLast ? SAGE : (isLast && isStatus ? AMBER : INK1);
            s.addText(row[ci], {
                x: cx + 0.15, y, w: colWidths[ci] - 0.3, h: 0.55,
                fontFace: "Arial", fontSize: ci === 0 ? 10 : 10, color,
                bold: isStatus, valign: "middle", margin: 0,
            });
        });
    });

    s.addText("Methodology:", {
        x: 0.5, y: 5.5, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 14, color: NAVY, bold: true, margin: 0,
    });
    s.addText([
        { text: "Time-to-submit measured across 12 demo runs (median 90 sec; chart-open to ack-display).", options: { bullet: true, breakLine: true, fontSize: 11 } },
        { text: "Routing accuracy and validation pass rate measured against the canonical case set (14 seed reports × all destinations = 32 deliveries). Zero validation errors.", options: { bullet: true, breakLine: true, fontSize: 11 } },
        { text: "Bidirectional loop: end-to-end Playwright verification, all 5 states traversed (submitted → received → callback_pending → reply_received → closed).", options: { bullet: true, fontSize: 11 } },
    ], { x: 0.7, y: 5.9, w: 12.13, h: 1.3, fontFace: "Arial", color: INK1, paraSpaceAfter: 4 });

    pageFooter(s, 13, TOTAL);
    s.addNotes("Walk the table row by row. Note that the production-completeness metric (30%→85%) is the long-term outcome metric — not measurable in the MVP, but the entire system is designed to move that number. Be transparent.");
}

// ============================================================================
// SLIDE 14 — What you've seen / what's next
// ============================================================================
{
    let s = pres.addSlide();
    s.background = { color: NAVY };
    s.addShape("rect", { x: 0, y: 6.8, w: 13.33, h: 0.7, fill: { color: CARDINAL }, line: { type: "none" } });

    s.addText("What you've seen.", {
        x: 0.5, y: 0.7, w: 12.33, h: 0.7,
        fontFace: "Garamond", fontSize: 38, color: "FFFFFF", bold: true, margin: 0,
    });

    s.addText([
        { text: "A working, single-thesis reporting system: 4-minute filing, multi-agency routing, complete-on-first-submission validation, bidirectional callback closure.", options: { bullet: true, breakLine: true, fontSize: 14, color: "FFFFFF" } },
        { text: "Real wire-format messages: HL7 v2.5.1 ELR for ADHS, NNDSS Modernization v2 JSON for CDC, VSPS Form 1-A for APHIS, sovereignty-preserving JSON for tribal authorities.", options: { bullet: true, breakLine: true, fontSize: 14, color: "FFFFFF" } },
        { text: "The cross-species bridge: zoonotic animal cases automatically notify ADHS for human-exposure surveillance.", options: { bullet: true, fontSize: 14, color: "FFFFFF" } },
    ], { x: 0.5, y: 1.5, w: 12.33, h: 2.7, fontFace: "Arial", paraSpaceAfter: 14 });

    s.addText("What's next.", {
        x: 0.5, y: 4.4, w: 12.33, h: 0.6,
        fontFace: "Garamond", fontSize: 28, color: "FFD68A", bold: true, margin: 0,
    });

    s.addText([
        { text: "Pilot at TMC: 2 diseases, 3 months, hard-fail criteria at month 3.", options: { bullet: true, breakLine: true, fontSize: 13, color: "FFFFFF" } },
        { text: "Real endpoint registration with ADHS-MEDSIS, county PH, CDC NNDSS, USDA APHIS, AZ ADA, AZ G&F.", options: { bullet: true, breakLine: true, fontSize: 13, color: "FFFFFF" } },
        { text: "Tribal partnerships with Apache + Navajo IRBs before any tribal data flow goes live.", options: { bullet: true, fontSize: 13, color: "FFFFFF" } },
    ], { x: 0.5, y: 5.0, w: 12.33, h: 1.7, fontFace: "Arial", paraSpaceAfter: 8 });

    s.addText("Thank you. Questions?", {
        x: 0.5, y: 6.95, w: 12.33, h: 0.4,
        fontFace: "Garamond", fontSize: 14, color: "FFFFFF", italic: true, margin: 0,
    });

    s.addNotes("Final slide. Recap the three things you've seen. Then pivot to what's next — institutional work that requires partnership. End on 'Thank you. Questions?' — open for Q&A.");
}

pres.writeFile({ fileName: OUT }).then(p => {
    console.log(`Wrote ${p}`);
});
