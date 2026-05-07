# NotifiAZ — Demo Cheatsheet

> Print this. Hold it next to the laptop during the demo. The whole walkthrough is **8 minutes** end-to-end.

## Setup (do this 30 seconds before you start)

1. Open `app/index.html` in Chrome (just double-click). No server needed.
2. If you've demoed before, hit Cmd-Shift-R to clear localStorage so seed reports re-load fresh.
3. Pre-position browser zoom at 100%, window full-screen.

---

## Beat 1 — "Here's what filing a report looks like today" (1 min)

**Before clicking anything, say this:**

> "Filing a single reportable disease report through ADHS today takes a clinician between 45 and 60 minutes. They open ADHS-MEDSIS in one tab, the patient's chart in another, the CDC NNDSS portal in a third, the county portal in a fourth. They retype the patient's demographics into each. They retype the encounter date. They retype the lab values. If the patient is on tribal land, they figure out which tribal authority to also notify. If the disease is animal-side, they file separately with USDA, AZ ADA, AZGFD. Every one of these forms expects a different schema. This is what the alternative to NotifiAZ looks like."

---

## Beat 2 — Sign in as Dr. Reyes (TMC physician) (30 sec)

1. **Click "👩‍⚕️ Clinician" tile** → identity grid appears.
2. **Click "Dr. Maria Reyes — Tucson Medical Center"**.
3. The patient list opens automatically. **Say:**

> "I'm signed in as Dr. Reyes. This is her patient panel at TMC. The clipboard icons mark patients with a reportable disease that hasn't been filed yet. The system has flagged each one because the active problem list contains an ICD-10 code that maps to Arizona's reportable-disease database."

---

## Beat 3 — Open a Cocci patient's chart (1 min)

1. **Click the first reportable patient** (Yanaha Wilson, or whoever has Cocci/Salmonellosis at the top).
2. The chart opens with the cardinal-red banner. **Pause.** Let the panel see it.
3. **Say:**

> "This is the most important visual in the entire system. The clinician is in Epic-equivalent chart view. They see the encounter, the assessment, the labs. And they see this red banner — *the disease is reportable, and it has not been filed yet*. The system has done the work to recognize this. The clinician's job is one click."

4. **Read aloud the chief complaint, the HPI, the assessment.** Establish that this is real clinical content.

---

## Beat 4 — Click "📋 File reportable disease report" (1 min)

1. **Click the launch button.**
2. The reporter view opens. **Say:**

> "Look at what just happened. I clicked one button. The system pulled the patient demographics, the encounter, the lab results, the exposure history out of the FHIR record. It looked up the disease in the reportable-disease database. It saw the patient lives in Maricopa County. It computed the destination set: ADHS for state surveillance, CDC NNDSS for federal, Maricopa County for local. Three destinations, auto-routed. I haven't typed anything."

3. **Click "Preview message →" on the ADHS card.**
4. **Pause for 5 seconds.** Let the panel read the HL7. Then say:

> "This is real HL7 v2.5.1 ELR. MSH header, PID with the patient identifier, OBR with the SNOMED code, OBX segments for each lab, NTE segments carrying the exposure history that ADHS would otherwise call back asking for. It validates against the CDC ELR Implementation Guide r1.1 plus AZ ADHS local extensions. This is what a real ADHS-MEDSIS endpoint receives in production."

5. **Click Hide preview, then briefly preview CDC NNDSS** to show the JSON difference. Different format, same source data.

---

## Beat 5 — Submit (15 sec)

1. **Click "⚡ Submit to all 3 agencies".**
2. Success screen appears with three ack IDs.
3. **Say:**

> "Three acknowledgement IDs. From the moment I opened the chart to right now: about ninety seconds. The thesis is that the well-resourced clinician should be doing this in under four minutes, the under-resourced clinician in maybe seven. Either way, not forty-five."

---

## Beat 6 — Switch to investigator (the bidirectional loop) (3 min)

1. **Click "Sign out".**
2. **Click "🔍 Agency investigator".**
3. **Click "Dr. Lisa Nakamura — Arizona Department of Health Services".**
4. The inbox opens. **Say:**

> "Now I'm Dr. Nakamura. She's a state epidemiologist at ADHS. This is her inbox. The report I just filed is at the top — submitted state, just now. Down the inbox there are reports in other states: received, callback pending, reply received, closed. This is how the agency side actually moves cases through the system."

5. **Click the Salmonellosis row** (the one we just submitted).
6. The detail panel opens with full patient info, exposure history, labs.
7. **Say:**

> "She sees the full report. The patient's HPI, the assessment, the exposure history — every field that today she'd be calling the practice back to ask about. It's already here."

8. **Click "✓ Mark received".** State pill flips to RECEIVED.
9. **Type a callback question** in the textarea: *"Was this case associated with the church potluck on April 21? Three other reports name same event."*
10. **Click "Send callback".**
11. **Say:**

> "The agency has a question. In today's workflow, this is a phone call to the practice that the clinician returns three days later. In NotifiAZ, the clinician sees this in their inbox the next time they sign in."

---

## Beat 7 — Close the loop (1 min)

1. **Sign out.**
2. **Sign back in as Dr. Reyes** (clinician). **Click "Reporter" tab** in the header.
3. The "My filed reports" side panel shows the Salmonellosis card with the **amber CALLBACK PENDING** badge.
4. **Say:**

> "She has a callback waiting. She didn't get a phone call. She didn't get a fax. She just opened NotifiAZ and the system told her ADHS is asking her something."

5. **Expand the Per-agency status details.**
6. **Type a reply** in the textarea: *"Confirmed: patient attended the potluck. Three household contacts notified."*
7. **Click "Send reply".**
8. **Sign out.**

---

## Beat 8 — Close (45 sec)

1. **Sign back in as Dr. Nakamura (ADHS investigator).**
2. **Set the inbox filter to "Reply received".**
3. **Click the Salmonellosis row.**
4. The reply is visible in the detail panel.
5. **Type a closure note:** *"Cluster of 11 cases linked to potluck. Source identified. Closed."*
6. **Click "Close delivery".** State pill flips to CLOSED with sage green.
7. **Say:**

> "Two round trips. From submission to closure: a few minutes of agency time, a couple of minutes of clinician time, and a confirmed cluster identified. That's the bidirectional loop. That's what makes clinicians keep filing."

---

## If the panel asks: "What about animals?"

> "Glad you asked." **Sign in as Dr. Hannah Cho (vet, Tucson Companion-Animal Vet)**. Click an animal patient with a zoonotic disease. The launch button fires the reporter, the destinations include both USDA APHIS and the AZ Department of Agriculture *and* a parallel notification to ADHS — that's the cross-species bridge. The whole vet-side workflow is symmetric to the human side.

## If the panel asks: "What about the EHR integration?"

> "What you saw was the embedded mode — NotifiAZ launched from inside a clinical chart. The standalone mode is the same UI without the EHR shell. The API mode accepts a FHIR R4 Bundle at `POST /api/reports`; production EHRs would call that endpoint from inside their own UI. See `docs/api_spec.md` for the contract."

## If the panel asks: "What's not here that you'd need for production?"

> "Real endpoint registration with each agency. MOUs with each tribal authority. IRB review for the tribal data flow. Pilot deployment at one site with two diseases for three months before expanding. Audit review at month 3, 6, 12. The technical work is here; the institutional work is the pathway from prototype to deployment."

---

## Beat 9 — Insights tab (~2 min) — added v0.3

> *"Before I close, let me show you the Insights tab. This is where the course-concept work lives, all in one place."*

Click the **📈 Insights** tab in the header.

**Section 1 — Dataset (EDA).** Scroll past the disease distribution chart, the AZ county chart, the subject-kind donut, and the tribal-residency stack.

> *"Cardinal-red bars are humans, navy is geography, the donut shows the One-Health bridge — six animal cases on a synthetic panel of 60 humans, all routed correctly. The skew toward Valley Fever, Salmonellosis, and RMSF mirrors what ADHS surveillance staff actually see."*

**Section 2 — Predictor.** Scroll to the headline metrics card (F1 = 0.53, AUC = 0.72), point at the model comparison table, then the ROC curve, then the three-way feature importance chart.

> *"We trained three models — logistic regression, random forest, gradient boosting — on a synthetic but realistic problem: predicting whether a submitted report will trigger an agency callback. LR wins on F1 and AUC and is interpretable, so it's our production model. The other two are comparison baselines for academic completeness."*

> *"All three models agree completeness_score is the dominant feature. That's the whole thesis: incomplete reports are the ones that get called back, and the predictor surfaces this to the clinician at submission time, before the callback can happen."*

**Section 3 — Ask NotifiAZ (RAG).** Click the sample chip `"fever cough soil dust southern arizona"`. Wait for the results.

> *"This is the RAG retriever. TF-IDF over the 72-disease database, cosine-ranked, deterministic answer template. No LLM in the loop — every claim is auditable to a specific entry in the disease database. In production, the same retrieval would feed an instruction-tuned model for natural-language phrasing, with a fact-check layer."*

**Mention before moving on.** During the earlier reporter walkthrough, point briefly at the pre-submission risk widget (the gradient meter showing callback probability with the top 3 contributing factors). Don't dwell — just one sentence:

> *"That risk meter you saw on the reporter form? Same model, scored live in the browser. The clinician sees their callback risk before they hit submit, with concrete suggestions for fields to populate."*

**Hand-off line.**

> *"All of this is in the codebase, all of it is reproducible from `seed=42`, and all of it is documented in `docs/COURSE_CONCEPTS_MAPPING.md`."*
