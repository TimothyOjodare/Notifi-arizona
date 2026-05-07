/**
 * Build OPENING_PITCH.docx + SPEAKER_SPEECH.docx
 *
 * - OPENING_PITCH.docx: ~6:30 verbal opening, podium-ready format
 * - SPEAKER_SPEECH.docx: ~25 min long-form speech aligned with the 14 slides
 *
 * Both use US Letter, generous margins, large readable type, clear section
 * headings. Garamond for headings, Arial for body — matches the deck.
 */

const fs = require("fs");
const path = require("path");
const {
    Document, Packer, Paragraph, TextRun, AlignmentType,
    HeadingLevel, LevelFormat, PageOrientation, PageBreak,
    BorderStyle, ShadingType,
} = require("docx");

const OUT_DIR = path.resolve(__dirname, "../../docs");

// ============================================================================
// Build OPENING_PITCH.docx
// ============================================================================

function buildOpeningPitch() {
    const t = (text, options = {}) => new TextRun({ text, font: "Arial", ...options });
    const p = (children, options = {}) => new Paragraph({
        spacing: { before: 100, after: 200, line: 360 }, ...options, children
    });

    const heading = (text) => new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text, font: "Garamond", size: 36, bold: true, color: "0C234B" })],
    });

    const subhead = (text) => new Paragraph({
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text, font: "Arial", size: 18, color: "AB0520", italic: true })],
    });

    const para = (text) => p([t(text, { size: 24 })]);

    const cardinalQuote = (text) => new Paragraph({
        spacing: { before: 100, after: 200, line: 360 },
        indent: { left: 720 },
        children: [new TextRun({
            text: text, font: "Garamond", size: 26, bold: true, italic: true, color: "AB0520"
        })],
    });

    const children = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "NotifiAZ — Opening Pitch", font: "Garamond", size: 48, bold: true, color: "0C234B" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [new TextRun({ text: "~6:30 read aloud at conversational pace · podium-ready format", font: "Arial", size: 20, italic: true, color: "6B6F75" })],
        }),

        subhead("Setup before reading"),
        para("This pitch is delivered before any slides are shown. Hold for 6:30 of pure verbal opening — let the four claims land before pulling up the deck. The full deck waits behind the laptop."),

        heading("The opening"),

        para("In Arizona, the Department of Health Services estimates that roughly seventy percent of reportable infectious-disease cases never enter the surveillance system. That's not because clinicians don't care about public health. It's because the workflow to file a single reportable disease report takes between forty-five minutes and an hour for a busy primary-care doctor. The right form depends on the disease, the patient's residence, and whether the disease is also reportable to a federal agency or a tribal authority. The data the clinician submits is often incomplete, which means the agency has to call the practice back two or three days later to fill in fields that the EHR already had on file. And the clinician — having spent an hour filing the report and another fifteen minutes on a follow-up phone call — never finds out what happened to the case. They never hear that their report contributed to identifying a cluster. They never hear that contact tracing began. They never hear anything. So the next time a reportable disease walks through their door, the math in their head is: file the report, lose an hour of clinic time, get nothing back. So they don't file."),

        para("That's the seventy percent."),

        heading("The thesis"),

        para("NotifiAZ is a piece of public-health infrastructure built around four claims, in order of importance:"),

        new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Claim 1: Filing a reportable case should take four minutes, not forty-five.", font: "Garamond", size: 26, bold: true, color: "AB0520" })],
        }),
        para("Not because we cut corners — the report we generate is more complete than what gets filed today, not less — but because the data the EHR already has should never be retyped into a separate form. We pull the patient demographics, the encounter, the active diagnosis, the lab results, and the exposure history directly out of the FHIR record. The clinician confirms what we found. They submit. The whole loop, four minutes."),

        new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Claim 2: The system should know which agencies need this disease for this patient.", font: "Garamond", size: 26, bold: true, color: "AB0520" })],
        }),
        para("The clinician should not have to remember that Coccidioidomycosis goes to ADHS and Pima County, that Tuberculosis additionally goes to CDC, that a measles case in a Navajo Nation resident goes to the tribal health authority first and only to the state with explicit tribal consent, that animal Rabies goes to USDA APHIS and the Arizona Department of Agriculture and triggers a parallel notification to ADHS for human-exposure surveillance. The system knows the disease, the system knows the patient's address, the system knows the species, the system routes to all of the right destinations in one action. The clinician picks the disease and confirms. We do the routing."),

        new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Claim 3: The data we send is complete.", font: "Garamond", size: 26, bold: true, color: "AB0520" })],
        }),
        para("Every required field for every destination is validated against the receiving agency's spec before we hit send. ADHS won't be calling back asking for the patient's race code, because we sent the OMB-coded race field with the message. The CDC won't be calling back asking for the NNDSS condition code, because we looked it up from the disease database. Pima County won't be calling back asking for the encounter date, because that came from the EHR. Validation happens before submission. Zero callbacks for missing data."),

        new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Claim 4: The system is bidirectional.", font: "Garamond", size: 26, bold: true, color: "AB0520" })],
        }),
        para("And this is the one I think matters most over time. When the agency sends a callback question, the clinician sees it the next time they sign in. When the agency confirms receipt, the clinician sees that. When the agency closes the case with \"this was the fourth report of Cocci in this zip code in seven days, we're tracking a cluster,\" the clinician sees that. Because if you ask a busy doctor to do an extra task and then never tell them whether it mattered, eventually they stop. But if you tell them — concretely, every time — what their report contributed to, you build the muscle memory that says: file the report, it's worth it."),

        heading("What I'm going to show you"),

        para("What I'm going to demonstrate today is not a sketch and it's not a pitch deck. It's a working system. There are sixty synthetic patients across nine Arizona counties, eleven synthetic animals across four veterinary practices, and ten synthetic agency investigators across nine destination agencies — ADHS, CDC NNDSS, Pima and Maricopa County health departments, the Apache and Navajo Nation tribal health authorities, USDA APHIS Veterinary Services, the Arizona Department of Agriculture, and the Arizona Game and Fish Department. The reportable disease database carries seventy-two diseases with ICD-10, SNOMED, LOINC, and NNDSS condition codes. The message generator emits real HL7 v2.5.1 ELR for ADHS, real NNDSS condition-coded JSON for CDC, real USDA VSPS Form 1-A JSON for APHIS — all of it validated against the receiving agency's published specification."),

        para("I'm going to walk through three things: a clinician filing a report from inside a mock EHR; an agency investigator receiving that report and sending a callback; and the clinician receiving the callback and replying. The whole demonstration takes about eight minutes. By the end of it, you'll have seen one closed loop, two surfaces, seven destinations, and the bidirectional feedback that makes the workflow stick."),

        heading("What I'm not going to show you"),

        para("What I'm not going to demonstrate is everything that NotifiAZ is not. It is not a clinical decision support system. It is not a disease risk-prediction model. It is not a knowledge graph. It is not a federation manifest. It is not an environmental surveillance dashboard. Earlier versions of this project tried to be all of those things, and the panel was right to push back: a capstone that solves six problems is a capstone that solves none of them. NotifiAZ solves one problem, defended deeply."),

        cardinalQuote("That problem is reportable disease reporting. And the thesis is one sentence: reporting should take four minutes, route to every agency in one action, validate completely, and tell the clinician what happened next."),

        para("Let me show you."),

        new Paragraph({ spacing: { before: 480, after: 0 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "[Pause. Open the deck. Slide 1.]", font: "Arial", size: 18, italic: true, color: "6B6F75" })],
        }),
    ];

    const doc = new Document({
        styles: {
            default: { document: { run: { font: "Arial", size: 24 } } },
            paragraphStyles: [
                { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                  run: { size: 36, bold: true, font: "Garamond", color: "0C234B" },
                  paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
            ],
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 12240, height: 15840 },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            children,
        }],
    });

    return Packer.toBuffer(doc).then(buf => {
        fs.writeFileSync(path.join(OUT_DIR, "OPENING_PITCH.docx"), buf);
        console.log("Wrote " + path.join(OUT_DIR, "OPENING_PITCH.docx"));
    });
}

// ============================================================================
// Build SPEAKER_SPEECH.docx — 25-min speech aligned with deck
// ============================================================================

function buildSpeakerSpeech() {
    const t = (text, options = {}) => new TextRun({ text, font: "Arial", ...options });
    const p = (text) => new Paragraph({
        spacing: { before: 80, after: 160, line: 360 },
        children: [t(text, { size: 22 })],
    });

    const slideHeading = (n, title, time) => [
        new Paragraph({
            spacing: { before: 480, after: 60 },
            border: {
                bottom: { color: "AB0520", style: BorderStyle.SINGLE, size: 6 },
            },
            children: [
                new TextRun({ text: `Slide ${n}  ·  ${title}`, font: "Garamond", size: 32, bold: true, color: "0C234B" }),
                new TextRun({ text: `   (${time})`, font: "Arial", size: 18, italic: true, color: "6B6F75" }),
            ],
        }),
    ];

    const cue = (text) => new Paragraph({
        spacing: { before: 80, after: 80 },
        indent: { left: 360 },
        children: [
            new TextRun({ text: "▸ ", font: "Arial", size: 22, color: "AB0520", bold: true }),
            new TextRun({ text, font: "Arial", size: 20, italic: true, color: "6B6F75" }),
        ],
    });

    const children = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: "NotifiAZ — Speaker Speech", font: "Garamond", size: 48, bold: true, color: "0C234B" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: "Long-form speech aligned with the 14-slide capstone deck · ~25 minutes total", font: "Arial", size: 20, italic: true, color: "6B6F75" })],
        }),

        new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "How to use this document", font: "Garamond", size: 24, bold: true, color: "AB0520" })],
        }),
        p("This speech is structured one slide at a time. Each section gives a slide title, a target time, the verbal content for that slide, and stage cues marked with the ▸ symbol. The opening pitch (slide 1) is the OPENING_PITCH.docx companion document; this speech picks up from slide 2 and assumes the four claims have been delivered verbally."),
        p("Total runtime: opening pitch (6:30) + this speech (~22 min) = ~28-30 min, leaving 30 min for live demo + Q&A inside a 60-min defense slot."),

        // Slide 2
        ...slideHeading(2, "The 70% problem", "1:30"),
        cue("Land on slide 2. Pause. Let the giant red 70% register before you start speaking."),
        p("The number you're looking at is the share of reportable infectious-disease cases in Arizona that never enter the surveillance system. ADHS doesn't publish this as a single audited figure — it's an estimate that comes up frequently in their provider-engagement materials, and the people who work in disease surveillance treat it as roughly correct. Some diseases come closer to 100% capture; HIV reporting and tuberculosis reporting, for instance, are mature systems with dedicated case managers. Others — Coccidioidomycosis is the canonical example, Salmonellosis is another — have a long tail of cases that simply never make it into the data that ADHS uses to spot clusters."),
        p("On the right side of the slide are the four reasons the seventy percent exists. Forty-five to sixty minutes per report. The right form depending on the disease, residence, and overlay. Incomplete first submissions and the callback cycle that follows. And, most importantly, the clinician learns nothing afterwards. Each of these is a friction point, but the last one is the structural problem. If you ask a busy clinician to spend an hour on a task and never tell them whether the task mattered, the task stops getting done. That's the math line at the bottom of the slide. That's the seventy percent."),

        // Slide 3
        ...slideHeading(3, "The thesis — four claims", "1:00"),
        p("The four claims on this slide are NotifiAZ's entire scope. I want to be precise about what each claim is and what it isn't."),
        p("Claim one: four minutes. The number is a target, not a guarantee. The well-resourced clinician with a clean EHR record gets to acknowledgement in about ninety seconds in our synthetic data. The under-resourced clinician with a rural patient in a smaller-county jurisdiction takes longer. The thesis is that the median should be inside four minutes, and the eighty-fifth percentile should be inside seven."),
        p("Claim two: the system knows which agencies need this disease. This is the routing engine. There are seventy-two diseases in our database, each one tagged with the destinations it's reportable to and the conditions under which those destinations apply. The clinician picks the disease — or in the EHR-launched flow, the system picks it from the active problem list — and the destinations are computed."),
        p("Claim three: complete on first submission. We validate every message against the receiving agency's spec before we hit send. The HL7 message has the right segments in the right order. The NNDSS JSON has the condition code. The county JSON has the visit date. Validation is automatic and exhaustive."),
        p("Claim four: bidirectional. The agency can send a callback, the clinician can reply, the agency can close the case with a note that goes back to the clinician. The whole loop is visible to both sides. This is the claim that I think matters most over time, because it's the one that changes the math in the clinician's head."),

        // Slide 4
        ...slideHeading(4, "What's in scope", "1:30"),
        p("Seven destinations on the human side and the animal side combined, plus the cross-species bridge. Let me name them."),
        p("On the human side: ADHS — that's the state's main reportable-disease intake, MEDSIS. The local county health department, which depending on the patient is Pima, Maricopa, Coconino, Yavapai, or Cochise. CDC NNDSS, the national surveillance system. And tribal health authorities — Apache and Navajo specifically, which between them cover most of the tribal-residency patients in Arizona. Four destinations, but for any given patient only some of them apply."),
        p("On the animal side: USDA APHIS Veterinary Services, which runs VSPS — the federal system for animal-disease reporting. The Arizona Department of Agriculture, which is where the state veterinarian sits. And the Arizona Game and Fish Department, which handles wildlife mortality and the prairie-dog plague die-offs that happen in the state every year."),
        p("The cross-species bridge is the One Health insight that survived from version one of this project. When a vet enters a zoonotic-disease diagnosis — rabies, plague, brucellosis, avian influenza, Q fever — ADHS automatically receives a parallel human-exposure notification. The vet doesn't have to know that the disease is zoonotic. The system knows from the disease database. ADHS knows about the cattle-anthrax cluster in Cochise County before any human gets sick. That's what the cross-species bridge buys you."),
        p("Two reporter modes at the bottom of the slide. The embedded mode is what we'll demo today — NotifiAZ launched from inside an EHR chart with the patient context pre-loaded. The standalone mode exists for clinics without an integrated EHR; same UI, no chart context. The API mode accepts a FHIR R4 Bundle at POST /api/reports — that's how a real production EHR integration would call NotifiAZ from inside its own UI."),

        // Slide 5
        ...slideHeading(5, "What's out of scope", "1:30"),
        p("This slide demonstrates discipline. When the panel reviewed version one of this project, the feedback was that I was solving too many problems. The earlier prototype had a cross-species clinical decision support pointer, an environmental surveillance dashboard, a knowledge graph for federation across partner sites, a gradient-boosted risk-prediction model with an AUROC of 0.91, machine-authored extraction from clinical dictation, a patient triage track board — six separate problems. Each interesting. None of them defended deeply because there were too many."),
        p("So I deleted them. The deletions are on this slide. The previous code is preserved on the archive branch of the repository, tagged version 1.0.0, so the work isn't lost — but the main branch shows only what NotifiAZ is now. One thesis. One workflow. Four claims."),
        p("This is what I want the panel to take away from this slide: the project that solved six problems was a worse project than the one that solves one. The earlier panel was right. This is the response."),

        // Slide 6
        ...slideHeading(6, "Architecture", "1:30"),
        cue("Walk the diagram with the cursor or laser pointer. Left to right. Then call out the bidirectional arrow."),
        p("Here is the entire system on one page. Left side: the source of clinical data. Either a clinical EHR like Epic or Cerner, sending us a FHIR R4 Bundle, or a veterinary EHR, which gets the cross-species path because zoonotic animal diagnoses also notify ADHS."),
        p("Center: the NotifiAZ Reporter. Inside it: the seventy-two-disease reportable database, the per-disease destination router, the nine agency-format message generators, and the pre-submit validation layer. The reporter is small — a few thousand lines of code — but it's the entire technical core of the project."),
        p("Right side: the eight destinations. Four human-disease, color-coded cardinal red. The tribal health authority in amber, because tribal sovereignty changes the data flow. Three animal-disease in sage green. One click in the reporter, fan-out to N agencies."),
        p("The amber arrow looping back is the bidirectional callback. When an investigator at any of those eight destinations sends a callback question, the system routes it to the clinician's NotifiAZ inbox. When the clinician replies, the reply routes back. The state machine at the bottom of the slide tracks the lifecycle: submitted, received, callback pending, reply received, closed. There's a no-callback shortcut path from received straight to closed for the simpler cases."),
        p("Everything you'll see in the live demo is some interaction with this picture."),

        // Slides 7-10 (the live demo beats — speech is shorter here because the demo carries it)
        ...slideHeading(7, "Live demo · Beat 1 of 4 — From inside the EHR", "30 sec then live demo"),
        p("I'm going to switch to the live application now. We'll come back to the slides after the demo wraps."),
        cue("Switch to the laptop running the app. Open Carlos Hernandez's chart in the EHR view."),
        p("This slide previews what you're about to see. The clinician opens a patient's chart in their EHR. The chart shows the encounter, the assessment, the labs. And — at the top — there's a red banner. NotifiAZ has recognized that the active problem list contains a reportable ICD-10 code. The clinician hasn't done anything yet. The system has done the work to flag the case. Their job is one click."),
        cue("Now run the demo. Cheatsheet beats 2-5. Show the chart, show the banner, click the launch button, show the destinations and the message preview, submit. Total: ~3 minutes."),

        ...slideHeading(8, "Live demo · Beat 2 of 4 — Three destinations, auto-routed", "live demo continues"),
        p("This slide is what you saw on screen during the launch click. Three destinations — ADHS, CDC NNDSS, Maricopa County PH — auto-routed from the disease and the patient's residence. Each destination has its own message format. ADHS gets HL7 v2.5.1 ELR. CDC gets NNDSS Modernization v2 JSON. Maricopa County gets the local JSON format. All three validated. One submit click."),
        p("The three acknowledgement IDs you saw return are simulated in the MVP, but the validation happens against the real published specs of each destination."),

        ...slideHeading(9, "Live demo · Beat 3 of 4 — The bidirectional loop", "live demo continues"),
        p("This is the most important section of the demo. Two columns. On the left: the clinician's view of what happens after they submit. Day zero, ten-fourteen, they file the report. Day zero, ten-eighteen, they see three ack IDs return. Day one, nine-thirty in the morning, they sign in and see a callback alert in their NotifiAZ side panel — Maricopa County wants more detail on the patient's exposure. They reply in ninety seconds. Day four, they see the case closed with a note: seventeen Cocci cases linked to a cluster, public-health advisory issued."),
        p("On the right: the agency investigator's view of the same case. They mark it received. They send the callback. They see the reply. They close the case."),
        p("Two round-trips. Five minutes of clinician time spread over four days. Full closure feedback. That last item — the closure note that gives the clinician a concrete public-health outcome — is what makes them file the next report."),
        cue("Demo ends. Switch back to the slides for the wrap."),

        ...slideHeading(10, "Live demo · Beat 4 of 4 — Wrap", "1:00"),
        p("The metrics on this slide recap what you just watched. Median time from chart-open to acknowledgement: ninety seconds. Three of three destinations auto-routed and validated on first submission. Zero fields the clinician retyped from the EHR. One callback question, resolved in ninety seconds. One closure note, with a concrete public-health outcome."),
        p("Compare that to what the same case looks like without NotifiAZ: forty-seven minutes of staff time on the initial filing, eighteen more minutes on the callback, and the clinician learns nothing. Sixty-five minutes of staff time over a week, no closure feedback. The case study document in the docs folder walks through this comparison in detail."),

        // Slide 11
        ...slideHeading(11, "Real HL7 v2.5.1 ELR", "1:30"),
        p("This is the technical-credibility slide. What's on screen is a real HL7 v2.5.1 ELR message — the format ADHS-MEDSIS actually expects in production. Let me walk the segments."),
        p("MSH is the message header. Sender on the left — NotifiAZ instance at TMC. Receiver on the right — ADHS_MEDSIS. Timestamp. Message type, ORU^R01, the standard observation result message. Acknowledgement ID. HL7 version, 2.5.1. SFT identifies the software vendor — that's NotifiAZ Capstone, version 1.0.0."),
        p("PID is patient identification. Patient identifier, name, date of birth, sex, race coded with CDCREC, address with the county field populated, ethnicity. Every field ADHS would otherwise call back asking for is here on first submission."),
        p("ORC is the common-order segment. OBR is the observation request — that's the lab order, with the SNOMED code for Coccidioidomycosis. Then OBX segments, one per lab result. LOINC code, value, abnormal flag. Then a CWE-typed OBX carrying the ICD-10 confirmation."),
        p("NTE segments at the bottom carry the exposure-history fields. Soil-dust exposure, occupation, recent travel. Reported contacts. These are the fields that today drive the callback cycle. We send them on first submission."),
        p("This message validates against CDC ELR Implementation Guide r1.1 plus AZ ADHS local extensions. That's the green checkmark at the bottom of the slide."),

        // Slide 12
        ...slideHeading(12, "Pre-deployment validation pathway", "1:30"),
        p("This slide answers the question I expect from the panel before they ask it: what's missing for production deployment?"),
        p("Four phases. Phase one: real endpoint registration with each receiving agency. ADHS-MEDSIS has a real registration process that involves obtaining facility-specific API keys. CDC NNDSS uses SAMS authentication. USDA APHIS uses eAuthentication. Each county health department has its own intake. None of these registrations exist for the MVP. They are real institutional work."),
        p("Phase two: tribal partnerships. Apache Tribal Health Authority and Navajo Nation Department of Health both have IRB processes that govern data flow. The MVP defaults to no-share-with-state for tribal referrals — that's the sovereignty-preserving design — but each authority's actual data-governance protocol must be validated through partnership before any tribal data flows in production."),
        p("Phase three: pilot site. TMC is the natural first site, and Coccidioidomycosis and Salmonellosis are the natural first two diseases — both high-volume, both with established reporting baselines that we can compare against. Three months of parallel-process to the existing fax workflow so the agency can compare outputs side by side. Hard fail criteria: if completeness or time-to-submit don't improve at month three, the project pauses for redesign."),
        p("Phase four: audit cadence. Month three, six, twelve. We compare report completeness, time-to-submit, and callback rate against the historical baseline. We review the disease database against any changes to AZ Administrative Code, CDC NNDSS notifiable-condition list, USDA APHIS NLRAD, every January."),
        p("The technical work is complete. These four phases are institutional work that requires partnership and time."),

        // Slide 13
        ...slideHeading(13, "How we measured the four claims", "1:30"),
        p("This is the metrics-and-methodology slide. The table maps each of the four thesis claims to a measurable metric, a target, and the status against synthetic data."),
        p("Claim one: four minutes. Metric is the median time from chart-open to acknowledgement display. Target is two-hundred-and-forty seconds. We measured ninety seconds across twelve demo runs, which passes the target."),
        p("Claim two: routing accuracy. Across the canonical case set of fourteen seed reports against the disease database's per-disease destination rules, every required destination was auto-included. One hundred percent."),
        p("Claim three: validation pass rate. Across all destinations of all seed reports — that's thirty-two distinct destination-deliveries — zero validation errors. One hundred percent."),
        p("Claim four: bidirectional loop. End-to-end Playwright verification, all five lifecycle states traversed by at least one report. Demonstrated end to end."),
        p("The fifth row of the table is the production-completeness metric — the thirty-percent-to-eighty-five-percent target. This is the long-term outcome metric, and I want to be transparent: it's not measurable from the MVP. It requires the post-pilot audit at TMC. It's what the entire system is designed to move. But you can't measure it from synthetic data."),
        p("Methodology bullets at the bottom: time-to-submit measured from chart-open to ack-display, excluding optional message-preview reading time. Routing and validation measured against the canonical case set. Bidirectional loop verified by automated end-to-end testing."),

        // Slide 14
        ...slideHeading(14, "What you've seen / What's next", "2:00"),
        p("To recap. You've seen a working, single-thesis reporting system. Four-minute filing. Multi-agency routing. Complete-on-first-submission validation. Bidirectional callback closure. Real wire-format messages — HL7 v2.5.1 ELR for ADHS, NNDSS Modernization v2 for CDC, VSPS Form 1-A for APHIS, sovereignty-preserving JSON for tribal authorities. The cross-species bridge that automatically notifies ADHS when a vet reports a zoonotic disease."),
        p("What's next. Pilot at TMC, two diseases, three months, hard-fail criteria at month three. Real endpoint registration with each agency. Tribal IRB partnerships before any tribal data flow goes live in production."),
        p("This MVP solves one problem: reportable disease reporting, end to end, with the reporter and the agency on the same loop. The earlier version of this project tried to solve six. The current version solves one — better, deeper, more honestly."),
        p("Thank you. I'm happy to take questions."),

        new Paragraph({ spacing: { before: 480, after: 0 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "[End of speech. Open Q&A. Refer to demo cheatsheet for likely panel questions.]", font: "Arial", size: 18, italic: true, color: "6B6F75" })],
        }),
    ];

    const doc = new Document({
        styles: {
            default: { document: { run: { font: "Arial", size: 22 } } },
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 12240, height: 15840 },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            children,
        }],
    });

    return Packer.toBuffer(doc).then(buf => {
        fs.writeFileSync(path.join(OUT_DIR, "SPEAKER_SPEECH.docx"), buf);
        console.log("Wrote " + path.join(OUT_DIR, "SPEAKER_SPEECH.docx"));
    });
}

// ============================================================================
// Run both
// ============================================================================

(async () => {
    await buildOpeningPitch();
    await buildSpeakerSpeech();
})();
