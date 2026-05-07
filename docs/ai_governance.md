# AI Governance, Transparency, and Privacy — NotifiAZ

> Public-health systems that touch sensitive populations need explicit governance answers, not implicit ones. This document states NotifiAZ's choices on **governance, transparency, and privacy** — what we do, why we do it, what we deliberately don't do, and what we'd add for production deployment.

NotifiAZ has two AI components: a **rule-based decision tree** (destination routing) and a **supervised callback-likelihood predictor** (logistic regression). Both have governance implications. Both are documented below.

---

## 1. Governance choices made in the MVP

### 1.1 Tribal data sovereignty by default

**Choice.** Every message routed to a tribal authority defaults `consentToShareWithStateOfficials = false` and `consentToShareWithCdc = false`. The clinician must explicitly opt in to upstream sharing if they have consent.

**Why this matters.** Tribal nations have sovereign authority over their health data. The 2010 IHS Memorandum on tribal data sovereignty and the 2024 ONC information-blocking exceptions both affirm this. A system that defaults to sharing tribal health data with state and federal authorities — even unintentionally, even by omission — violates that sovereignty.

**Where to verify.** Open the reporter, file a report on a patient with `tribal_residency` populated (e.g., `Yanaha Wilson` if she has tribal residency, or any Apache/Navajo-resident patient), click "Preview message" on the tribal-authority destination card. The consent fields are right there in the JSON, with `false` defaults.

**Code reference.** `app/reporter/messages/messages.js` → `_buildTribalAuthorityMessage()`.

### 1.2 Rule versioning is wire-tagged

**Choice.** Every agency in `data/reference/agencies.json` carries a `spec_version` field. Every generated message embeds the spec version it was built against (`_spec_version` field for JSON, `MSH-12` for HL7).

**Why this matters.** When ADHS bumps their ELR Implementation Guide (it happens — current major version is 2.0), receivers and senders need to negotiate version. A message that doesn't declare its version forces the receiver to guess, and guessing wrong silently corrupts data.

**Where to verify.** Click "Preview message" on the ADHS destination of any report — top of the message contains the `MSH` segment with `2.5.1` declared.

### 1.3 Audit log is local-storage but append-only in semantics

**Choice.** Every state transition in NotifiAZ writes an event to `NA_STORE.getAuditLog()`: sign-in, sign-out, report-submitted, report-received, callback-sent, callback-replied, delivery-closed. Events have timestamps, actor IDs, and event payloads.

**Why this matters.** Surveillance systems must be auditable both for accountability (who saw what when) and for outbreak forensics (when did the first case enter the system, who routed it, who acked it).

**MVP limitation.** The audit log is in-browser local storage. A full deployment requires server-side append-only storage with cryptographic ordering (typically a hash chain or an external timestamping service like RFC 3161).

**Where to verify.** `app/shared/store.js` → `getAuditLog()`. Open the browser DevTools → Application → Local Storage → `na-audit-log` to see the live log.

### 1.4 The callback predictor is a warning, not a gate

**Choice.** The callback-likelihood predictor never blocks a clinician from submitting a report. It shows a probability, top contributing factors, and concrete suggestions. The clinician is always free to submit.

**Why this matters.** A learned model that gates a regulatory action introduces a new failure mode: the model misclassifies a critical report as "incomplete," the clinician trusts the model, the report is delayed. We refuse this failure mode. The model's job is to surface information; the clinician's job is to decide.

**Where to verify.** Submit a high-risk report in the demo. The "Submit to all N agencies" button is always active regardless of the predictor's score.

### 1.5 The RAG retriever has no LLM in the loop

**Choice.** The "Ask NotifiAZ" panel runs TF-IDF retrieval over the disease database, then formats answers from the matched entry's structured fields. There is no LLM call.

**Why this matters.** LLMs hallucinate. In a public-health context, a hallucinated reporting timeline ("Plague is reportable within 7 days" — wrong, it's immediate) could delay outbreak response. We refuse this risk in the MVP.

**Production path.** In a production deployment, the same retrieval would feed an instruction-tuned model (e.g., MedGemma or a fine-tuned Llama) for natural-language phrasing. The retrieved disease entry would be the only allowed source of facts; the LLM's job would be wording, not facts. Plus, we'd add a fact-check layer that re-extracts the answer's claims and verifies each against the source entry.

**Where to verify.** `app/insights/rag.js` — search for the word "LLM". You won't find one. The `answer()` function reads structured fields; that's all.

---

## 2. Transparency

### 2.1 Preview before submit

Every destination card in the reporter has a "Preview message" button that shows the **exact bytes** the system will send to that agency, before submission. Clinicians can inspect what's being sent in their name. This is the single highest-value transparency feature in the system.

### 2.2 Per-prediction explainability

The reporter risk widget shows the top three feature contributions to the callback risk, with direction (▲ increases / ▼ decreases) and magnitude. The clinician can see *why* the model predicted what it did.

### 2.3 Global model explainability

The Insights tab §2.3 shows feature importance across all three trained models side by side. When the three models agree on which features matter, that's evidence the model is finding real structure rather than overfitting. When they disagree, that's a flag for further investigation. Both states are shown to the panel.

### 2.4 Coefficients exported as inspectable JSON

The trained model's coefficients are saved to `data/ml/predictor_coefficients.json` as plain JSON. Anyone with read access to the repository can verify the live model matches the trained model (and the answer is yes — `app/shared/predictor_data.js` is just `predictor_coefficients.json` wrapped in a window assignment).

### 2.5 Full source visibility for routing logic

The decision tree that routes reports to destinations is hand-written code in `app/reporter/reporter.js` → `_resolveDestinations()`. There is no opaque ML model in the routing path. Every routing decision is traceable to one rule in `reportable_diseases_us.json`.

### 2.6 Honest reporting of model performance

`docs/predictor_model_card.md` reports the model's metrics honestly: F1 = 0.53, AUC = 0.72. These are not impressive numbers. They are honest numbers for a noisy prediction problem. We do not inflate them with selective threshold reporting or test-set leakage.

---

## 3. Privacy

### 3.1 No PHI in the repository

**Choice.** Every named subject in NotifiAZ is synthetic. The patient panel was generated procedurally from `seed=42`. No real human's data is in the codebase, the demo, the deck, the model, or the test fixtures.

**How to verify.** Reproduce the dataset by running `python3 src/data_generation/generate_patients.py` after deleting the existing `data/synthetic/patients.json`. Identical bytes will appear. Real patient data could not be reproduced from a seed.

**Where named.** `SYNTHETIC_DATA_NOTICE.md` in the repo root.

### 3.2 Tribal residency reduces upstream sharing

The default for tribal-residency patients is to *not* share their data with state or federal officials, even when those officials would otherwise be in the routing path. This is the strongest privacy default in the system, and it's the right default for the population it protects.

### 3.3 Local-storage state, no remote persistence

The MVP runs entirely in the browser. State is local-storage. There is no backend collecting reports, no analytics endpoint, no telemetry. A clinician using the demo could pull their network cable and the demo would continue to work.

### 3.4 Re-identification risk in the synthetic dataset

The synthetic dataset uses culturally-plausible names (including names common in Native American populations to demonstrate tribal-residency routing). We have not done a re-identification risk assessment because there is nothing to re-identify — the names are randomly assembled and have no link to real individuals. But we name this honestly: a production system processing real PHI would require formal HIPAA Privacy Rule compliance, including a §164.514(b) Safe Harbor or §164.514(b)(1) Expert Determination de-identification step before any synthetic-derived analytic.

### 3.5 What we do *not* implement (and would, in production)

- Differential privacy on aggregated surveillance statistics. The synthetic dataset is small enough that membership inference would be possible if it were real PHI.
- Encryption-at-rest. The MVP is in browser local-storage, which is unencrypted. A production deployment would use `IndexedDB` with a Web Crypto–derived key, or move state to a server with encrypted database storage.
- Per-role data masking in the investigator console. Currently, an investigator at agency X can see the patient's full demographics. A more restrictive deployment would mask demographics behind a role-based reveal.

These are honest gaps, named in this document, with documented post-MVP migration paths in `docs/api_spec.md`.

---

## 4. Governance, transparency, privacy in production deployment

If NotifiAZ moved from MVP to a real deployment, these are the governance elements that would harden:

| Domain | MVP | Production |
|---|---|---|
| Authentication | Identity tile click | OAuth 2.0 + facility SSO + state-issued reporter credentials |
| Audit log | Browser local-storage | Server-side append-only log with hash chain + RFC 3161 timestamps |
| Tribal sovereignty | `consentToShareWith*` defaults | Same defaults + per-tribe IRB review of routing rules + tribal data steward sign-off on every spec_version bump |
| Model retraining cadence | Static (trained once) | Quarterly retraining on agency-confirmed callback labels; drift monitoring on feature distributions; per-cycle model card update |
| LLM in RAG | Not present | Instruction-tuned medical LLM with retrieval-only context + fact-check layer + red-team review before any deployment |
| Privacy law compliance | Synthetic data, no compliance needed | Full HIPAA Privacy + Security + Breach rules; state breach notification compliance (Arizona Revised Statutes §18-552); IHS data-sharing agreements per tribe |
| Encryption | Local-storage in clear | TLS 1.3 in transit, AES-256-GCM at rest, per-record key derivation for sensitive fields |
| Vendor risk | None | Annual SOC 2 Type II audit, per-tribe data processing agreement, contractually-bound data retention limits |

The point of this table is to show the panel that we know what production looks like, even though we ship an MVP. The MVP makes choices that are *consistent with* the production target, not choices that would have to be reversed.

---

## 5. Who decides what — accountability

A governance document is incomplete without naming who decides what:

- **Routing rules** in `reportable_diseases_us.json` are decided by the project author (R. Akinrele) for the MVP, with sources cited per disease (Arizona Administrative Code R9-6-202, CDC NNDSS, USDA APHIS, AZ ADA, AZ G&F, IHS tribal protocols). In a production deployment, rule changes would require dual sign-off from ADHS surveillance and the affected destination authority.
- **Model retraining** is decided by the project author for the MVP. In a production deployment, retraining cadence and threshold tuning would be a joint decision between the deploying institution's ML governance committee and the destination agencies that label callbacks.
- **Tribal-routing defaults** are decided in consultation with the relevant tribal authority's data steward. The MVP encodes the conservative default (no upstream sharing); changes require tribal sign-off.
- **Privacy boundaries** for any production deployment would be decided by a HIPAA Security Officer, with input from the Public Health Authority that owns the deployment.

This is not a deflection — it is the actual governance structure. NotifiAZ's MVP is intentionally a single-author research artifact; the production target is multi-stakeholder.

---

## Summary

NotifiAZ takes governance seriously *in the MVP*: tribal sovereignty defaults, rule versioning, audit logging, predictor-as-warning-not-gate, no LLM in the RAG loop. Transparency is built in: preview-before-submit, per-prediction explainability, global model explainability, exported coefficients, source-visible routing. Privacy is achieved through synthetic data, restrictive defaults, and local-only state.

The gaps are named honestly: no encryption at rest, no differential privacy, no role-based masking, no re-identification risk assessment. These are deliberate MVP scoping choices with documented production paths.

A deploying institution can read this document and know exactly what they would inherit, what they would have to add, and where the lines are.
