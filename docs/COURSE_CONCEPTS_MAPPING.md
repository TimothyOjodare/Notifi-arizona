# Course Concepts → NotifiAZ Mapping

> A reference document for the certification panel: every concept covered in the Digital Public Health curriculum mapped to where it appears in this project, with file references and an explanation of how the concept advances the public-health thesis.

This is the document to read first if you want to verify that NotifiAZ exercises the course material. The product itself is a focused single-thesis project (4-minute reportable disease reporting, multi-agency, bidirectional). The course concepts are not bolted on — they are integrated into the system and named here so the integration is visible.

---

## Concept-by-concept index

| # | Concept | Where it lives in NotifiAZ | What kind of coverage |
|---|---|---|---|
| 1 | **Exploratory Data Analysis (EDA)** | Insights tab §1.1–1.3; `docs/eda_report.md` | Live, interactive |
| 2 | **Decision tree** | `app/reporter/reporter.js` → `_resolveDestinations()`; `data/reference/reportable_diseases_us.json` | Live, deterministic — the routing engine itself is a hand-coded decision tree |
| 3 | **Logistic Regression** | `src/ml/train_callback_predictor.py`; Insights tab §2.1–2.4; reporter risk widget | Live, interpretable, primary model |
| 4 | **Random Forest** | Same training script; Insights tab §2.1, §2.3 | Comparison baseline |
| 5 | **Gradient Boosting** | Same training script; Insights tab §2.1, §2.3 | Comparison baseline |
| 6 | **F1 score** | Insights tab §2.1; reporter risk widget footer | Reported per model |
| 7 | **AUC / ROC** | Insights tab §2.2 (D3 line chart with shaded area) | Live |
| 8 | **Model card** | `docs/model_card.md` (system-level); `docs/predictor_model_card.md` (predictor-specific) | Two cards in Mitchell format |
| 9 | **Explainability** | Reporter risk widget shows top-3 contributing factors with direction; Insights tab §2.3 (3-way feature importance chart); routing decisions are auditable to specific JSON entries | Per-prediction + global |
| 10 | **RAG (Retrieval-Augmented Generation)** | Insights tab §3 (Ask NotifiAZ); `app/insights/rag.js`; `src/ml/build_rag_index.py` | Live, working retriever |
| 11 | **NLP** | TF-IDF tokenizer in the RAG retriever (`build_rag_index.py` → `_tokenize`, `app/insights/rag.js` → `_tokenize`) | Live |
| 12 | **LLM** | Documented in `docs/ai_governance.md` and Insights §3 footer — production deployment plan; deterministic answer template substitutes for an LLM call in the demo | Documented (intentionally not in the demo) |
| 13 | **Deep Learning** | Not in NotifiAZ. Lives on the `archive/v1-onehealthrecord` branch as the GBM risk model (deliberately scoped out per panel feedback) | Archived; out of scope |
| 14 | **Federated Learning** | Same — on archive branch, scoped out | Archived; out of scope |
| 15 | **Swarm Learning** | Same — on archive branch, scoped out | Archived; out of scope |
| 16 | **FAIR principles** | `docs/fair_compliance.md` | Documented |
| 17 | **Digitalization** | The whole product — paper/fax workflow → digital workflow | Whole-system |
| 18 | **Digital public health** | Same — the thesis is a digital-public-health thesis | Whole-system |
| 19 | **AI Governance** | `docs/ai_governance.md`; tribal sovereignty defaults in messages.js; rule versioning in `agencies` manifest | Documented + enforced in code |
| 20 | **Transparency** | Preview-before-submit on every report; full audit log (`NA_STORE.getAuditLog()`); coefficients exported in JSON for inspection | Live |
| 21 | **Privacy of data** | 100% synthetic data; `SYNTHETIC_DATA_NOTICE.md`; `consentToShareWithStateOfficials=false` default for tribal routing | Whole-system |

---

## How each concept earns its place in the public-health thesis

It would be dishonest to bolt course concepts onto a product that doesn't need them. Each one below is here because it does real work in the reporting workflow.

### Decision tree (the routing engine)

When a clinician picks a disease, the system has to decide which agencies receive the report. The rules are:

- Disease's `human_reporting.destinations` list determines the candidate set
- `local_health_dept` resolves to the patient's county health department
- `tribal_if_applicable` resolves to the patient's tribal authority *only if* they have tribal residency
- For animals, zoonotic disease triggers a parallel ADHS notification

This is a four-level decision tree, hand-authored. **It is intentionally not learned.** Regulatory routing rules must be deterministic and auditable. A learned model that occasionally misrouted a Plague case to the wrong agency would be a public-health failure. The hand-authored tree gets us correctness; the predictor (next concept) gets us optimization.

The decision tree is "explainable by construction" — every routing decision is traceable to one rule in `reportable_diseases_us.json`.

### Supervised learning (Logistic Regression + RF + GB)

The hand-authored decision tree decides *where* a report goes. The supervised model decides *whether the report is likely to come back*. That is, it predicts whether the receiving agency will send a callback question because the report is incomplete.

This is a useful prediction because:

- Today, ~30-40% of reports in real ADHS surveillance trigger a callback. Each callback adds 1-3 days to investigation start time.
- A pre-submission prediction lets the clinician fix completeness gaps *before* hitting submit.
- The clinician sees the prediction inline in the reporter — a meter, the top three contributing factors, and concrete suggestions ("add at least 2 lab results", "populate exposure-history fields").

We trained three models on the same features:

- **Logistic Regression** (production): F1 0.53, AUC 0.72. Best F1 of the three, and interpretable — every prediction comes with feature-level coefficients × scaled values, summing to the logit.
- **Random Forest** (comparison): F1 0.50, AUC 0.69. Used as a non-linear baseline; if RF beats LR significantly, that's evidence non-linearities are needed and we'd switch.
- **Gradient Boosting** (comparison): F1 0.47, AUC 0.66. Same role as RF.

LR wins both predictively and pedagogically, so it's what runs live. See `docs/predictor_model_card.md` for the full Mitchell-format card.

### F1 / AUC / Confusion matrix

These are the three lenses the panel will recognize:

- **F1** (harmonic mean of precision and recall) is the headline performance metric. We report it per model.
- **AUC** is threshold-independent — it tells you how well the model can rank reports by callback risk, separate from the question of where you set the warning threshold.
- **Confusion matrix** shows the threshold-dependent counts. We deliberately tuned class weights to maximize recall — a missed callback is a real cost (1-3 days of delay), a false alarm costs only one extra check by the clinician.

All three are live in the Insights tab.

### Explainability

Two layers:

1. **Per-prediction (local) explainability.** The reporter risk widget shows the user the top three factors driving their score, in their direction (▲ increases risk, ▼ decreases risk), with magnitude. A clinician sees *why* their report has a 47% callback risk, and what to change to lower it.

2. **Global explainability.** The Insights §2.3 chart compares feature importance across all three models. When LR coefficients agree with RF/GB feature importance, that's a strong signal the model is finding real structure rather than overfitting. In our case, all three models agree `completeness_score` is the dominant feature — which is exactly what we'd expect from domain knowledge.

This is genuine explainability, not post-hoc rationalization. The LR model *is* its coefficients.

### RAG (Retrieval-Augmented Generation)

The "Ask NotifiAZ" panel in the Insights tab is a working RAG retriever over the 72-disease database. A clinician types `"fever cough soil dust southern arizona"` and the system returns the top-ranked disease entries (Valley Fever should rank #1 for that query) with reporting requirements pre-pulled.

Implementation:

- **Index time** (Python, `src/ml/build_rag_index.py`): tokenize each disease entry, compute TF-IDF vectors with smoothed IDF, L2-normalize, ship to the browser as JSON.
- **Query time** (browser, `app/insights/rag.js`): tokenize the query, compute query TF-IDF vector with the same vocab + IDF, cosine-rank against all 72 entries.
- **Answer time**: deterministic answer template using the matched entry's structured fields.

In a production deployment, the retrieval stage would be unchanged but the answer stage would feed an LLM (e.g., MedGemma or Llama-3.1-8B-Instruct) to phrase the answer in natural language. We deliberately do *not* call an LLM in the MVP because:

1. Every claim in the answer must be auditable to a specific disease entry.
2. We refuse to risk hallucinating a reporting timeline or a destination.
3. A panel reviewer can verify every shown fact against `reportable_diseases_us.json`.

This is a deliberate AI-governance choice, not a limitation.

### FAIR principles

See `docs/fair_compliance.md` for a full mapping. In one paragraph: NotifiAZ outputs are HL7 v2.5.1 ELR (interoperable with every state ELR receiver in the US), inputs accept FHIR R4 Bundles (interoperable with every modern EHR), the disease database has stable IDs with ICD-10 + SNOMED-CT codes (findable + reusable), and the LICENSE file makes accessibility scope-explicit (committee-only for the MVP, with a documented path to open-source post-graduation).

### AI Governance, Transparency, Privacy

See `docs/ai_governance.md` for the governance and transparency story. Highlights:

- **Tribal sovereignty.** Every tribal-routing message defaults `consentToShareWithStateOfficials=false` and `consentToShareWithCdc=false`. The system makes the conservative default explicit so any deviation from it is an opt-in, not an assumption.
- **Rule versioning.** Each agency in `providers.json` carries a `spec_version` and is wire-tagged on every message generated. If ADHS bumps their ELR IG, the version field tells you instantly which messages were generated against which spec.
- **Audit log.** Every state transition (sign in, report submitted, callback sent, reply received, case closed) is logged to `NA_STORE.getAuditLog()`. The audit log is local-storage in the MVP; in production this becomes an append-only log with cryptographic ordering.
- **Synthetic data only.** No PHI in the repository. The synthetic data generators are reproducible from `seed=42`; you can verify the dataset bit-for-bit.

### Digitalization & Digital Public Health

These are not features — they're the thesis. NotifiAZ takes a public-health workflow that today runs on fax forms and phone callbacks (the documented ADHS reportable-disease pipeline) and replaces it with a digital workflow that compresses the time-to-submit from 45-60 minutes to under 4, makes routing automatic, and closes the feedback loop bidirectionally. That is the project. Everything else in this document is in service of that.

---

## What is NOT in NotifiAZ (and why)

In response to certification panel feedback, three concepts that were prototyped earlier are now scoped out and live on the `archive/v1-onehealthrecord` branch:

- **Deep learning (GBM clinical risk model).** Was a Coccidioidomycosis severity predictor; archived because it expanded the thesis from "reporting" to "reporting + clinical decision support." A future v2 could re-introduce it as a clinical-risk overlay in the EHR side panel, but it is not part of this submission.
- **Federated learning.** Was a multi-site federated training scheme. Archived because the thesis no longer requires cross-site model training.
- **Swarm learning.** Same.

These concepts are documented in this mapping for completeness, and the archive branch contains the running implementations if the panel wishes to verify they exist.

---

## How to demo the course concepts in the live walkthrough

If a panel member asks "where is the [concept]" during the demo, here is the route to surface each one:

| Question | Answer route |
|---|---|
| Where is your EDA? | Insights tab → §1.1, §1.2, §1.3 |
| Where is your model? | Reporter form (live in workflow) + Insights tab §2.1–2.4 |
| What's your AUC? | Insights tab §2.2 — large ROC curve with AUC callout |
| How do you know your model isn't overfitting? | Insights tab §2.3 — three models agreeing on feature importance |
| What about explainability? | Reporter risk widget shows top-3 factors per prediction (live) |
| Show me the RAG / search / NLP | Insights tab §3 — type "tick bite rash hiking", returns RMSF as #1 |
| What about FAIR? | `docs/fair_compliance.md` |
| What about governance? | `docs/ai_governance.md` |
| What about privacy? | `SYNTHETIC_DATA_NOTICE.md` + tribal sovereignty defaults visible in any tribal-routed message preview |

If the panel wants to see code:

- `src/ml/train_callback_predictor.py` — the full training pipeline
- `src/ml/build_rag_index.py` — the retrieval index builder
- `app/insights/predictor.js` — in-browser scoring
- `app/insights/rag.js` — in-browser retrieval
- `app/insights/insights.js` — D3.js charts
- `app/reporter/messages/messages.js` — the per-destination message generators
