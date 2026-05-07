# Model Card — NotifiAZ

> Following Mitchell et al. (2019), "Model Cards for Model Reporting." This model card describes a *workflow system*, not a machine-learning model. The card has been adapted to fit a routing-and-validation system rather than a predictive model. Every section that does not apply to a non-ML system is marked **N/A** with a reason.

## Model Details

**System name:** NotifiAZ Reportable Disease Reporting System

**System version:** 0.1 (capstone MVP, May 2026)

**System type:** Deterministic routing + validation system. Given a patient/animal record and a confirmed reportable disease diagnosis, the system computes the destination set, generates an agency-specific message in the appropriate format, and tracks the report through a defined state machine.

**No machine-learning models are used.** Earlier iterations of this project included a gradient-boosted risk model for cross-species disease prediction and a clinical decision support pointer; both were removed during the May 2026 pivot to keep the project's thesis focused. The risk-model artifact is preserved on the `archive/v1-onehealthrecord` branch for reference.

**Owner / point of contact:** Capstone author. Contact via the certification panel.

**Citation:** Not yet published. If cited in academic feedback: *NotifiAZ: A Reportable-Disease Reporting Workflow with Multi-Agency Routing and Bidirectional Closure (capstone MVP, 2026).*

**License:** All Rights Reserved. See `LICENSE`. Reviewer access for academic assessment is permitted; no production use is permitted without explicit author consent.

## Intended Use

**Primary intended uses:**

- Demonstrating a workflow for clinicians and veterinarians to file reportable-disease reports with multi-agency fan-out, in-form validation, and bidirectional callback.
- Demonstrating a workflow for agency investigators to receive, action, and close reports with callback capability.
- Capstone defense and academic assessment of an MVP that solves the reporting friction problem.

**Primary intended users:**

- Clinicians and veterinarians at the point of care, on a desktop or laptop browser.
- Agency investigators at ADHS, county health departments, CDC NNDSS, tribal health authorities, USDA APHIS, AZ Department of Agriculture, AZ Game and Fish.

**Out of scope:**

- Production deployment without prior endpoint registration with each named agency, IRB review for tribal data flows, MOUs with each receiving institution, and pilot validation at a single clinical site.
- Use as a clinical decision support system. The system does not predict, recommend, or stratify cases. It routes confirmed diagnoses to the correct destinations.
- Patient-facing use. The system has no patient surface.

## Factors

**Relevant factors that influence performance:**

- **Disease selection:** Performance is bounded by the completeness of the 72-disease reportable-disease database. A disease not in the database cannot be reported through the system. The database covers all 67 Arizona reportable conditions plus a curated set of CDC-notifiable and APHIS-reportable additions.
- **Geographic jurisdiction:** Routing rules are calibrated to Arizona. County health department destinations, tribal health authority destinations, and the cross-species ADHS bridge are AZ-specific. Adapting to another state would require a re-mapping of `local_health_dept` and `tribal_if_applicable` rules in the disease database.
- **EHR data quality:** The reporter pre-fills from FHIR R4 Bundle data. If the source EHR has incomplete demographics, missing labs, or absent exposure-history fields, the report quality degrades accordingly. The validation layer flags these gaps before submission.

**Evaluation factors not currently measured:**

- Variation in time-to-submit across clinician seniority, role (physician vs nurse vs reporting-staff), or institutional size.
- Variation in callback rate across destination types (state vs federal vs tribal).
- Cross-jurisdictional accuracy when patients' residence and treatment locations differ.

## Metrics

**Performance measures, in order of thesis-relevance:**

| Claim | Metric | Target | Status (MVP) |
|---|---|---|---|
| 1. Reporting takes 4 min, not 45-60 | Median time from "Open chart" to "Submission acknowledged" | ≤ 240 sec | **Passing** in synthetic data: median 90 sec across 12 demo runs (excludes message-preview reading time) |
| 2. Right-disease-right-form routing | Destination-routing accuracy: % of reports where every required destination is auto-included | 100% | **100%** for all 14 seed reports against the disease database's per-disease destination rules |
| 3. Complete on first submission | Per-destination message validation pass rate (no `validation_errors`) | ≥ 95% | **100%** for all destinations on the canonical case set (Hernandez Cocci, Reed Salmonella, Garcia-Lopez RMSF, etc.) |
| 4. Bidirectional loop | Time from agency callback to clinician reply (median) | ≤ 1 day in real-world deployment; **observable in MVP** | **Observable**: state-machine demonstrated end-to-end; latency cannot be measured in single-session demo |

**Reporting completeness (production target, not measurable in MVP):**

The thesis claims that NotifiAZ should raise reportable-disease submission completeness from a baseline of approximately 30% (current) to a target of 85% (post-deployment). This metric requires a post-pilot real-data audit and is **not measurable from the MVP**. It is included here to be transparent about what the system aims to produce in production.

## Evaluation Data

**Datasets:**

- 60 synthetic patients across 9 Arizona counties, generated from `seed=42`.
  - 50 with reportable diseases (15 distinct diseases including Valley Fever, Salmonellosis, Pertussis, TB, RMSF, Hantavirus, West Nile, Plague, Brucellosis, Measles, Gonorrhea, Syphilis, Lyme, Q Fever, Typhoid, Rabies, Ehrlichiosis)
  - 10 non-reportable controls
  - 13 with tribal residency (Apache, Navajo, San Carlos, Tohono O'odham)
  - 8 hospitalized
- 11 synthetic animals across 4 vet practices.
  - All 11 reportable
  - 6 zoonotic (triggering the cross-species ADHS bridge)
  - 1 wildlife (prairie dog plague die-off → AGFD route)
- 14 pre-seeded reports across all 5 lifecycle states (4 submitted, 6+ received, 3 callback_pending, 1 reply_received, 6 closed; some reports span multiple states across deliveries).
- 10 synthetic agency investigators across 9 destination agencies.

**Motivation:** The synthetic dataset is designed to demonstrate the routing engine's coverage across realistic AZ disease patterns, geographic jurisdictions (urban/rural/tribal), severity levels (outpatient/hospitalized/lethal-animal), and the full lifecycle of report processing. It is not designed for ML-grade train/test splits because no model is being trained.

**Preprocessing:**

- Patient and animal generators draw from realistic AZ name distributions, location distributions calibrated to AZ population centers and reservations, and disease-specific HPI/plan templates aligned with current ADHS clinical guidance.
- The reportable-disease database (`data/reference/reportable_diseases_us.json`) is compiled from public-policy sources (Arizona Administrative Code R9-6-202, CDC NNDSS, USDA APHIS National List of Reportable Animal Diseases, AZ ADA state vet's reportable list, AZGFD wildlife disease guidance). It is real public-policy data; the patient cases that reference it are synthetic.

## Training Data

**N/A.** No models are trained.

## Quantitative Analyses

**System-level metrics on the canonical case set:**

- **Message validation pass rate:** 100% across all 14 seed reports × all destinations (32 total destination-deliveries). Zero validation errors. Every destination's message contains all required fields per the destination's spec.
- **Routing fan-out:** Mean 2.6 destinations per human-disease report. Maximum 4 destinations (e.g., a measles case in a Navajo Nation resident routes to ADHS + CDC NNDSS + Maricopa or Coconino County + Navajo Nation tribal health). Mean 2.0 destinations per animal-disease report. Cross-species bridge (animal report routing to ADHS) fires for 6 of 11 animal cases (zoonotic diseases).
- **Time-to-submit benchmark:** Median 90 sec across 12 demo runs from chart open to acknowledgement display (does not include message-preview reading time, which is optional). The thesis target is 240 sec (4 min) including all clinician review.
- **State-machine integrity:** Every state transition (`submitted → received → callback_pending → reply_received → closed`) is exercised by at least one report in the seed set. End-to-end Playwright verification confirms all transitions work without manual intervention.

**Disaggregated analysis:**

- **Tribal vs non-tribal routing:** All 13 tribal-residency patients correctly route to their tribal health authority (Apache or Navajo) in addition to ADHS and the relevant county. The tribal-referral message format defaults to `consentToShareWithStateOfficials: false` per sovereignty-preserving design.
- **Urban vs rural counties:** Maricopa, Pima counties auto-route to local health department endpoints; Coconino, Yavapai, Cochise route to ADHS without county-specific endpoints (because the project ships with concrete endpoints only for Pima and Maricopa, the two counties with substantial active reporting infrastructure). Other counties would need their endpoints registered in the agency manifest.
- **Animal vs human:** Animal reports correctly skip CDC NNDSS (not an animal-disease destination) and human-only routes; human reports correctly skip APHIS, ADA, AGFD; cross-species bridge fires only for zoonotic animal reports.

## Ethical Considerations

**Data privacy:**

- Every patient and animal record is synthetic. No real PHI is in the repository. See `SYNTHETIC_DATA_NOTICE.md` for the full disclosure.
- Production deployment would handle real PHI. The system's audit log, role-based access (clinician/vet/investigator), and message-level validation provide defense-in-depth, but a real production deployment requires a HIPAA Privacy Officer review, a SOC 2 Type II audit of the hosting infrastructure, and per-destination Business Associate Agreements where applicable.

**Tribal sovereignty:**

- The tribal-referral message format defaults to `consentToShareWithStateOfficials: false` and `consentToShareWithCdc: false`. Tribal health authorities receive the report first; state and federal sharing requires explicit tribal consent.
- This default is a design choice in the prototype. Production deployment requires partnership with each tribal authority's IRB to validate that the consent flow matches the authority's actual data-governance protocols.

**Equity considerations in the routing rules:**

- Patients in rural counties without dedicated county-PH endpoints route only to ADHS. This means rural patients receive less local public-health visibility than urban patients. This is a *current* state-of-affairs issue, not a NotifiAZ-introduced bias — but the system must not be deployed in a way that further widens this gap.
- Tribal patients receive their primary report at the tribal health authority. This is an equity feature, not a bug — it preserves tribal sovereignty over data flow. But the same design means tribal cases are not automatically visible in the state surveillance system unless the tribal authority shares them. Production deployment must coordinate with ADHS Tribal Health Liaison to ensure tribal cases are not under-counted in state-level surveillance metrics.

**Clinician burden:**

- The thesis is that NotifiAZ *reduces* clinician burden. If the system in production turns out to *increase* burden (e.g., because the embedded EHR launch is brittle, or because the FHIR Bundle parsing fails on real-world EHR variations), the system fails its core purpose. Pilot deployment must measure time-to-submit at one site for three months before any expansion.

## Caveats and Recommendations

**Caveats:**

- This is an MVP, not a production system. Real endpoint registration, IRB review, MOUs, and pilot validation are pre-requisites for production deployment.
- The 72-disease database is curated against current AZ Administrative Code (R9-6-202, June 2025 effective version) and current CDC NNDSS guidance. Reportable-disease lists change periodically; production deployment requires an annual review of the disease database against current state and federal regulations.
- Performance metrics in this card are measured on synthetic data and demo runs. Real-world performance will differ.

**Recommendations for next steps:**

1. **Pilot site selection.** TMC is the natural first site (already a major reporter to ADHS for Cocci surveillance). Scope: two diseases (Coccidioidomycosis, Salmonellosis), three months.
2. **Endpoint registration.** ADHS-MEDSIS endpoint, Maricopa and Pima County PH endpoints, CDC NNDSS endpoint registered with real credentials.
3. **Tribal partnership.** Apache Tribal Health Authority and Navajo Nation Department of Health both consulted before any tribal data flow goes live.
4. **Audit cadence.** Month 3, 6, 12: compare report completeness, time-to-submit, and callback rate against historical baseline. Hard fail criteria: if completeness or time-to-submit do not improve at month 3, the project pauses for redesign.
5. **Annual disease database review.** Review against AZ Administrative Code, CDC NNDSS, USDA APHIS NLRAD changes each January.

---

*This model card adapted from Mitchell, M., Wu, S., Zaldivar, A., Barnes, P., Vasserman, L., Hutchinson, B., Spitzer, E., Raji, I.D., & Gebru, T. (2019). Model Cards for Model Reporting. Proceedings of the Conference on Fairness, Accountability, and Transparency (FAT*). doi:10.1145/3287560.3287596*

---

## Course concepts appendix — added v0.3

NotifiAZ is taught against a Digital Public Health curriculum that covers EDA, supervised learning, RAG, FAIR, AI governance, and others. This card covers the **system-level** AI architecture (the rule-based decision tree). Two companion documents complete the picture:

- **`predictor_model_card.md`** — Mitchell-format card for the supervised callback-likelihood predictor (Logistic Regression + RF + GB comparison). Covers F1, AUC, confusion matrix, per-feature explainability, calibration caveats.
- **`COURSE_CONCEPTS_MAPPING.md`** — exhaustive mapping of all 21 curriculum concepts to specific files and behaviors in this codebase. Read this first if you are evaluating concept coverage.

Together with this system card, those three documents constitute the full AI-architecture documentation for NotifiAZ.
