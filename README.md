# NotifiAZ

> **Reportable disease reporting that takes 4 minutes, not 60. Complete on first submission. Multi-agency in one click. Bidirectional.**
>
> ** This project Started with a complex model that trys to solve multiple PH problems at a go, found here: [EVALUATION_NOTE.md]([EVALUATION_NOTE.md](https://github.com/timothyOjodare/onehealth-record-v1)). After my instructor's review I narrowed down to just one PH problem-solution that I named NotifiAZ (NotifiArizona) **

[![Status](https://img.shields.io/badge/status-capstone--MVP-blue)]() [![Data](https://img.shields.io/badge/data-100%25%20synthetic-green)]() [![Reproducibility](https://img.shields.io/badge/seed-42-orange)]() [![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)](LICENSE)

> ⚠️ **Synthetic data only.** Every patient, animal, encounter, and report in this repository is procedurally generated. See [SYNTHETIC_DATA_NOTICE.md](SYNTHETIC_DATA_NOTICE.md).

---

## The single problem this project solves

In Arizona, the Department of Health Services estimates that **roughly 70% of reportable infectious-disease cases never enter the surveillance system.** Not because clinicians don't care — because the workflow to file one report takes 45-60 minutes, the right form depends on the disease and the patient's residence, the data the clinician submits is often incomplete (forcing the agency to call back), and clinicians never hear what happened to the cases they did file.

NotifiAZ rebuilds the reporting workflow around four claims:

1. **A reportable case takes 4 minutes to file**, not 45-60.
2. **The system knows which agencies need this disease for this patient** — clinician picks the disease, NotifiAZ routes to all 7 possible destinations.
3. **Every required field is validated against the receiving agency's spec** before submission. Zero callbacks for missing data.
4. **The reporter sees what happens next** — agency receipt, callback questions, eventual closure. Two round-trips on average per case.

That is the entire product.

---

## What's in the scope

**Seven destinations + cross-species bridge:**

- **Human disease (4):** Arizona Department of Health Services (MEDSIS), local county health (Pima, Maricopa, etc.), CDC NNDSS, tribal health authorities (Apache, Navajo).
- **Animal disease (3):** USDA APHIS Veterinary Services (VSPS), Arizona Department of Agriculture, Arizona Game and Fish Department.
- **Cross-species:** when a vet reports a zoonotic disease, ADHS receives an automatic parallel notification.

**Two surfaces:**

- **Reporter** — clinicians and veterinarians file reports. Available as a standalone web app AND as an API endpoint that existing EHR systems can call (`POST /api/reports` accepts a FHIR R4 Bundle).
- **Investigator console** — agency staff at ADHS, county health, CDC, tribal health, APHIS, ADA, AGFD see incoming reports, mark them received, send callback questions, close cases.

**Two deployment modes for the reporter:**

- **Standalone:** clinician logs into NotifiAZ directly, picks patient or fills demographics by hand, submits. Demonstrates use without EHR integration.
- **EHR-embedded:** existing EHR launches NotifiAZ from inside its own UI, passing patient + encounter context as a FHIR Bundle. Demonstrates the production integration story.

The MVP ships a stripped-down mock EHR alongside the reporter so the panel can see the embedded launch in action.

---

## What's out of scope

This project explicitly does **not** include:

- Cross-species clinical decision support (the model pointer)
- Environmental surveillance dashboard
- Knowledge graph / federation across partner clinical sites
- Risk modeling / AUROC / SHAP / equity disaggregation
- Machine-authored extraction from dictation
- Patient triage / track board / encounter dictation

Every one of these has merit. Several were prototyped in the v1 codebase, preserved on the `archive/v1-onehealthrecord` branch for reference. **None of them are this project.** This project is reporting, end to end.

---

## For the certification panel — start here

**If you have 5 minutes:**
1. Open [`app/index.html`](app/index.html) in Chrome or Edge. No install required.
2. Sign in as Dr. Reyes at TMC.
3. Open Carlos Hernandez's chart in the EHR (he has confirmed Coccidioidomycosis).
4. Click **📋 File reportable disease report** in the chart sidebar.
5. NotifiAZ pre-fills the report from FHIR data. Three destinations are auto-selected (ADHS, Pima County, CDC NNDSS). Click **Submit**.
6. You'll see acknowledgement IDs from all three agencies, generated within 4 seconds.

**If you have 30 minutes:**
1. Read [`docs/OPENING_PITCH.md`](docs/OPENING_PITCH.md) (~6:30 read aloud).
2. Walk the demo in [`docs/demo_cheatsheet.md`](docs/demo_cheatsheet.md), which includes the bidirectional loop demo (file → receive → callback → reply → close).
3. Open [`docs/NotifiAZ_Capstone.pdf`](docs/NotifiAZ_Capstone.pdf) — focused 14-slide deck.

**If you want depth:**
- [`docs/model_card.md`](docs/model_card.md) — every metric on the four claims (time-to-submit, destination-routing accuracy, message-validation pass rate, callback turnaround).
- [`data/reference/reportable_diseases_us.json`](data/reference/reportable_diseases_us.json) — the 72-disease reportable database with full source citations and per-disease destination routing rules.
- [`app/reporter/messages/`](app/reporter/messages/) — the message generators, one per destination, each producing a validated payload in the agency's expected format.

---

## Architecture, in one paragraph

NotifiAZ is a single-page web application backed by an in-browser key-value store (production swaps for a real backend). Three roles — clinician, veterinarian, investigator — share one application, with role-gated views. The clinician/vet surface includes a mock EHR that launches the reporter with patient context. The reporter accepts either a manual form or a FHIR R4 Bundle (the same bundle a real EHR API integration would send), looks up the disease in the reportable-disease database, computes the destination set per the routing rules, generates one message per destination in the agency's expected format (HL7 v2.5.1 ELR for human-disease ELR submissions, USDA VSPS-format JSON for APHIS, agency-specific JSON for everything else), validates each message against the destination spec, and submits in parallel. The investigator console is a per-agency inbox with state machine: received → under investigation → callback pending → reply received → closed. Callback questions and replies are visible to both sides of the loop.

---

## Reproducing the data

Every patient, animal, provider, and pre-loaded report in this repository is generated from `seed=42`:

```bash
cd src/data_generation
python3 generate_patients.py
python3 generate_animals.py
python3 generate_providers.py
python3 seed_reports.py
python3 bundle_for_demo.py
```

This produces `app/shared/data.js`, the data bundle the front-end loads. The whole pipeline runs in under 30 seconds.

---

## Project history

This project's main branch is the focused, single-thesis NotifiAZ build. The previous full-feature ONE-HealthRecord prototype is preserved on the `archive/v1-onehealthrecord` branch and tagged `v1.0.0`. The pivot from the broader prototype to this single-thesis project was made in response to certification panel feedback to "solve one problem, not survey six."

For full project context including the v1 baseline, see the archive branch.
