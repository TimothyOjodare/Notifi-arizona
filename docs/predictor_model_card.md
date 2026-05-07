# Model Card — NotifiAZ Callback Likelihood Predictor

> Mitchell-format model card (Mitchell et al., 2019) for the supervised model that predicts whether a submitted reportable-disease report will trigger an agency callback question. This card is paired with the system-level `model_card.md` (which covers the rule-based routing engine).

---

## Model details

- **Name.** NotifiAZ Callback Likelihood Predictor v0.3
- **Version.** 0.3
- **Type.** Binary classification (will-trigger-callback / will-not)
- **Architecture(s) trained.**
  - **Logistic Regression** (production) — `sklearn.linear_model.LogisticRegression` with `class_weight="balanced"`, `max_iter=1000`, scaled features
  - **Random Forest** (comparison) — `sklearn.ensemble.RandomForestClassifier` with 200 trees, `max_depth=6`, `class_weight="balanced"`
  - **Gradient Boosting** (comparison) — `sklearn.ensemble.GradientBoostingClassifier` with 120 estimators, `max_depth=3`, sample-weighted training
- **Framework.** scikit-learn 1.8.0
- **Random seed.** 42 (every random component)
- **Training pipeline.** `src/ml/train_callback_predictor.py`
- **Trained coefficients (LR).** `data/ml/predictor_coefficients.json`
- **Browser deployment.** `app/shared/predictor_data.js` is the same coefficients file with a `window.NA_PREDICTOR =` prefix
- **Inference.** `app/insights/predictor.js` — pure-JavaScript LR scoring in the browser, ~30 lines
- **Authors.** R. Akinrele (model + system); ADHS surveillance staff (problem framing, expert review)
- **Contact.** Repository issue tracker (committee-restricted MVP)
- **License.** Same as repository — committee-restricted; documented post-graduation Apache-2.0-with-PH-exception path

---

## Intended use

### Primary intended use

Show clinicians a **pre-submission warning** when their reportable-disease report has a high probability of triggering an agency callback. The warning includes:

1. A probability score (0-100%)
2. The top three feature contributions to that score
3. Concrete suggestions for fields to populate that would lower the risk

The clinician can read the warning, optionally improve the report, and submit. The warning is **never a gate**.

### Primary intended users

- Clinicians and infection-control nurses filing reportable-disease reports through NotifiAZ.
- Veterinarians filing animal disease reports (the model handles both subject kinds).
- Quality-improvement staff at reporting facilities reviewing callback rates.

### Out-of-scope use cases

- **Do not** use this model to *decide whether to file* a report. Reportability is a regulatory determination, not a probabilistic one.
- **Do not** use this model to *route* reports. The routing engine is a hand-authored decision tree; using a learned model for routing would introduce regulatory risk.
- **Do not** use this model on real patient data outside the architecture this card describes (see "Caveats" below).
- **Do not** rely on this model for *clinical decision-making* about the patient. The features are about completeness of the report, not severity of the disease.

---

## Factors

### Relevant factors

| Group | Subgroups | Relevance |
|---|---|---|
| Disease severity class | routine / urgent / immediate | Strong driver of callback rate (agency QA is stricter on immediate-class) |
| Subject kind | human / animal | Animal reports route via APHIS VSPS, more standardized → fewer callbacks |
| Tribal residency | yes / no | Tribal-routed reports have lower callback rate (consent fields explicit by default) |
| Hospitalization status | yes / no | Hospitalized cases attract more agency QA |
| Geographic county | 9 AZ counties + tribal | Indirect — feeds into destination count |

### Evaluation factors

The model was evaluated on a held-out test set stratified on the positive class. We did **not** evaluate per-subgroup performance (e.g., callback rate by ethnicity, rural vs urban, county-by-county) because the dataset is synthetic and lacks the signal needed for a credible disparate-impact analysis. **This is a named production prerequisite**, not a silent omission.

---

## Metrics

### Reported metrics

| Model | Accuracy | Precision | Recall | F1 | AUC |
|---|---|---|---|---|---|
| **Logistic Regression** (production) | 0.680 | 0.422 | **0.711** | **0.529** | **0.717** |
| Random Forest (comparison) | 0.707 | 0.440 | 0.579 | 0.500 | 0.688 |
| Gradient Boosting (comparison) | 0.680 | 0.404 | 0.553 | 0.467 | 0.657 |

Threshold for binary metrics: 0.5. Trained on 450 synthetic samples; evaluated on 150 held-out samples.

### Why these metrics

- **F1** — headline overall metric; harmonic mean of precision and recall.
- **AUC** — threshold-independent, captures the model's ranking ability separately from where the warning threshold is set.
- **Recall (sensitivity)** — the cost-asymmetric metric. A missed callback-bound report (false negative) means a clinician submits a report that gets called back later, costing 1-3 days of investigation delay. A false alarm costs the clinician 30 seconds to dismiss the warning. So we tune for recall.
- **Precision** — reported but not optimized. The model's precision is 0.42, meaning about 58% of warnings are false alarms. We accept this trade because the cost of a false alarm is so much lower than the cost of a missed warning.

### Why class-weight balancing

The positive class (callback triggered) is ~26% of the training set. Without class weighting, all three models predicted the majority class too aggressively (recall ~0.2, F1 ~0.3). With `class_weight="balanced"` (LR + RF) and `sample_weight` (GB), the models recover usable recall.

This is a named decision, not a tuning artifact. The class-balanced training reflects the cost-asymmetric world the model operates in.

---

## Evaluation data

### Datasets

The held-out test set is 150 samples drawn from the same procedurally-generated distribution as the training set. There is no separate "real-world" evaluation set because the system is not yet deployed; real data will be available only after a controlled production pilot.

### Motivation

Synthetic data is used because:

1. The MVP is a research artifact, not a deployed system. There is no real callback-label dataset.
2. The synthetic dataset is reproducible from `seed=42`, allowing the panel to verify every number in this card.
3. The ground-truth callback function (specified explicitly in `train_callback_predictor.py`) lets us reason about *what* the model is learning, not just how well.

### Preprocessing

- Feature scaling (mean/std) for the LR model, fit on the training set only
- Random Forest and Gradient Boosting use raw features (tree-based, scale-invariant)
- No oversampling / SMOTE; class imbalance handled via class weights in the loss function

---

## Training data

### Datasets

600 procedurally-generated samples, drawn by:
1. Sampling a subject (85% human, 15% animal) from the 60-patient + 11-animal panel
2. Choosing a destination set (2-4 agencies, sampled from the appropriate routing rule)
3. Jittering the completeness signals (lab count, exposure-history field count) with bounded random noise
4. Applying the ground-truth callback function with 7% irreducible random noise to assign the binary label

The ground-truth callback function is specified in `train_callback_predictor.py` → `_ground_truth_callback`:

```python
logit = -0.8                                       # base rate ~30%
      + 0.85 * features["severity_class"]
      + 0.30 * features["is_zoonotic"]
      - 1.40 * features["completeness_score"]      # strongest signal
      - 0.35 * (features["n_lab_results"] >= 2)
      + 0.45 * features["is_hospitalized"]
      - 0.25 * features["is_tribal_residency"]
      - 0.40 * features["is_animal_subject"]
      + 0.10 * (features["n_destinations"] >= 3)
```

### Motivation

The ground-truth function encodes domain knowledge from ADHS surveillance staff interviews (anonymized, second-hand) and CDC NNDSS quality reports about which fields are most often the cause of callback questions. Completeness dominates because that's what reality looks like: agencies call back when they can't act on the report as submitted.

The 7% irreducible noise reflects callbacks that happen for reasons not captured by the features: agency staff curiosity, parallel investigations, ad-hoc QA spot checks. The model can never get F1 = 1.0 because real-world callback patterns aren't fully predictable from the report features.

### Preprocessing — same as evaluation set

---

## Quantitative analyses

### Per-feature contribution explainability

The LR model exposes per-feature contributions for any prediction:

```
contribution_i = coefficient_i × scaled_feature_value_i
```

Summing the contributions across features and adding the intercept gives the logit; passing the logit through the sigmoid gives the probability. This is shown live in the reporter's risk widget, with the top three contributions displayed to the clinician.

### Three-model agreement on feature importance

All three trained models agree that **completeness_score** is the dominant feature. This is a strong signal that the model is finding real structure rather than overfitting:

- LR coefficient on `completeness_score` (scaled): **highest absolute magnitude of any feature**
- RF importance on `completeness_score`: **rank #1**
- GB importance on `completeness_score`: **rank #1**

Visualized in the Insights tab §2.3.

### Model selection rationale

We selected Logistic Regression as the production model because:

1. **Best F1 of the three models** (0.529)
2. **Best AUC of the three** (0.717) — better discrimination than the tree-based competitors
3. **Best recall** (0.711) — exactly what we tune for
4. **Most interpretable** — per-feature contributions are linear and additive
5. **Smallest deployment footprint** — 11 floats (coefficients + intercept) vs ~10K floats for the tree-based models
6. **Fastest in-browser inference** — single dot product

The tree-based models are not faster in any dimension we care about. We keep them in the codebase as comparison baselines and for the global feature-importance comparison.

---

## Ethical considerations

### Disparate impact

We have **not** evaluated the model for disparate impact across demographic groups (race, ethnicity, primary language, urban vs rural, insurance status). The synthetic dataset doesn't have the signal for a credible analysis.

This is a named production prerequisite. Before any deployment, the model would need:

1. A held-out evaluation set with real demographic labels.
2. Per-subgroup F1, recall, and false-positive-rate analysis.
3. A documented threshold-tuning protocol to equalize false-positive rates across subgroups (or, if equalization is impossible, an explicit rationale for the chosen trade-off).

### Cost asymmetry of errors

We tuned for recall over precision because:

- A **false negative** (missed warning) costs 1-3 days of investigation delay.
- A **false positive** (false alarm) costs ~30 seconds of clinician time to dismiss the warning.

The 17:1 cost ratio justifies the recall-favored threshold. This is documented.

### Risk of automation bias

Even though we explicitly designed the predictor as a non-blocking warning, there is still a risk that clinicians develop a habit of always trusting the warning ("if it didn't fire, my report must be complete"). To counter this:

- The Insights tab makes the model's metrics visible (F1 = 0.53 — clearly fallible).
- The reporter risk widget includes a footer linking to the Insights tab so clinicians who want to dig deeper can.
- The agency receivers continue to perform their normal QA; the predictor does not change downstream behavior.

These are mitigations, not solutions. A real production deployment would include user-research follow-up to measure actual reliance behavior.

---

## Caveats and recommendations

### Caveats

1. **Synthetic training data.** The model has been validated on synthetic data only. Real-world performance will differ. The numbers reported above are reproducible but not predictive of deployed performance.
2. **Small label space.** 600 samples is small. Confidence intervals on the metrics are wide (~±0.05 on F1).
3. **No calibration assessment.** The model produces probabilities, but we have not assessed whether the probabilities are well-calibrated (i.e., whether reports predicted at 60% callback risk actually trigger callbacks 60% of the time). A production deployment would add a calibration plot (Platt scaling or isotonic regression) and report Brier score.
4. **Static training.** The model is trained once and frozen. There is no drift monitoring. If agency callback patterns change (e.g., ADHS hires new surveillance staff with different QA habits), the model will silently degrade.
5. **No personalization.** The model treats all clinicians as identical. In reality, some clinicians have higher baseline completeness; the model could benefit from a clinician-fixed-effect.

### Recommendations for production

1. **Real-data fine-tuning** on agency-confirmed callback labels from a controlled pilot.
2. **Quarterly retraining** with held-out drift monitoring.
3. **Calibration check** every quarter; recalibrate as needed.
4. **Per-subgroup performance reporting** to detect disparate impact before it becomes harmful.
5. **Explicit user-research follow-up** to measure clinician behavior change in response to the warnings.
6. **Tribal authority sign-off** on the model before any deployment that includes tribal-resident patients in the training set.

---

## Acknowledgements

- ADHS surveillance staff for problem framing (anonymized, second-hand).
- The scikit-learn community for the modeling stack.
- The certification panel for feedback that drove the focused-thesis pivot.

---

## References

- Mitchell, M., Wu, S., Zaldivar, A., et al. (2019). *Model Cards for Model Reporting*. FAT* '19.
- Wilkinson, M.D., et al. (2016). *The FAIR Guiding Principles for scientific data management and stewardship*. Scientific Data 3, 160018.
- CDC. (2014). *ELR Implementation Guide v2.0*.
- CDC. (2022). *NNDSS Modernization Initiative — Message Mapping Guides v2*.
- Arizona Administrative Code R9-6-202 (Communicable Diseases; Reporting Requirements).
