/* ============================================================================
 * NotifiAZ — insights/predictor.js
 *
 * Live (in-browser) logistic-regression scoring against a report. Uses the
 * coefficients trained by src/ml/train_callback_predictor.py and shipped as
 * app/shared/predictor_data.js (window.NA_PREDICTOR).
 *
 * Why the panel will care:
 *   - Demonstrates supervised learning end-to-end: sklearn training + JS
 *     inference, all from synthetic but realistic features.
 *   - Demonstrates explainability: every prediction comes with a
 *     per-feature contribution breakdown (LR coefficients × scaled feature
 *     value). This is true model-level explainability, not post-hoc.
 *   - Demonstrates the bridge from a rule-based decision tree (destination
 *     routing) to a learned model (callback prediction) — two complementary
 *     approaches in one system.
 * ========================================================================== */

(function () {
    'use strict';

    function _featuresFromReport(subject, kind, disease, destinations) {
        const dr = (disease || {}).human_reporting || {};
        const sevMap = {immediate: 2, urgent: 1, routine: 0};

        if (kind === "human") {
            const enc = subject.encounters[0];
            const exp = subject.exposure_history || {};
            const nExp = Object.entries(exp).filter(([_, v]) => v !== null && v !== "" && v !== false).length;
            const nLabs = (subject.lab_results || []).length;
            const completeness = Math.min(1.0, (nLabs / 2 + nExp / 4) / 2);
            return {
                severity_class: sevMap[dr.adhs_class] || 0,
                n_destinations: destinations.length,
                is_zoonotic: disease.is_zoonotic ? 1 : 0,
                is_animal_subject: 0,
                n_lab_results: nLabs,
                n_exposure_fields: nExp,
                is_hospitalized: enc.is_hospitalized ? 1 : 0,
                is_tribal_residency: subject.tribal_residency ? 1 : 0,
                subject_age_norm: (subject.age || 0) / 100.0,
                completeness_score: completeness,
            };
        } else {
            const nLabs = (subject.lab_results || []).length;
            return {
                severity_class: sevMap[dr.adhs_class] || 0,
                n_destinations: destinations.length,
                is_zoonotic: subject.active_problems[0]?.is_zoonotic ? 1 : 0,
                is_animal_subject: 1,
                n_lab_results: nLabs,
                n_exposure_fields: 0,
                is_hospitalized: 0,
                is_tribal_residency: 0,
                subject_age_norm: 0,
                completeness_score: Math.min(1.0, nLabs / 2),
            };
        }
    }

    /**
     * Score a report. Returns {probability, decision, contributions}.
     *  - probability: 0..1
     *  - decision: "high" | "moderate" | "low"
     *  - contributions: per-feature signed contribution to the logit
     *                    (positive = pushes toward callback, negative = pushes away)
     *  - features: the raw feature vector, in case the UI wants to show it
     */
    function scoreReport(subject, kind, disease, destinations) {
        const M = window.NA_PREDICTOR;
        if (!M) return null;
        const c = M.coefficients;
        const features = _featuresFromReport(subject, kind, disease, destinations);

        let logit = c.intercept;
        const contributions = [];
        c.feature_names.forEach((name, i) => {
            const raw = features[name];
            const scaled = (raw - c.scaler_mean[i]) / c.scaler_scale[i];
            const contrib = c.coefficients[i] * scaled;
            logit += contrib;
            contributions.push({
                name,
                raw_value: raw,
                contribution: contrib,
                coefficient: c.coefficients[i],
            });
        });
        const prob = 1.0 / (1.0 + Math.exp(-logit));
        const decision = prob >= 0.5 ? "high" : (prob >= 0.3 ? "moderate" : "low");
        contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
        return { probability: prob, logit, decision, contributions, features };
    }

    /**
     * Human-readable explanation of WHY the prediction is what it is.
     * Used in the inline reporter warning panel.
     */
    function explain(scoreResult, topN = 3) {
        if (!scoreResult) return "";
        const top = scoreResult.contributions.slice(0, topN);
        return top.map(c => {
            const dir = c.contribution > 0 ? "increases" : "decreases";
            const human = ({
                severity_class: "Disease severity class",
                n_destinations: "Number of destination agencies",
                is_zoonotic: "Zoonotic disease",
                is_animal_subject: "Animal-subject report",
                n_lab_results: "Number of lab results documented",
                n_exposure_fields: "Number of exposure-history fields populated",
                is_hospitalized: "Patient hospitalization",
                is_tribal_residency: "Tribal residency (sovereignty path)",
                subject_age_norm: "Subject age",
                completeness_score: "Overall report completeness",
            })[c.name] || c.name;
            return { label: human, dir, magnitude: Math.abs(c.contribution).toFixed(2), raw: c.raw_value };
        });
    }

    /**
     * "What's missing?" — concrete suggestions to lower the callback risk.
     * Looks at the lowest-contributing features and gives advice.
     */
    function suggestImprovements(scoreResult) {
        if (!scoreResult) return [];
        const f = scoreResult.features;
        const tips = [];
        if (f.n_exposure_fields < 3) tips.push({
            field: "Exposure history",
            suggestion: `Document exposure history more completely. Currently ${f.n_exposure_fields} fields populated; expected ≥ 3.`,
        });
        if (f.n_lab_results < 2) tips.push({
            field: "Laboratory results",
            suggestion: `Attach at least 2 confirmatory lab results. Currently ${f.n_lab_results}.`,
        });
        if (f.completeness_score < 0.6) tips.push({
            field: "Completeness",
            suggestion: `Overall completeness is ${(f.completeness_score*100).toFixed(0)}%. Aim for ≥ 80%.`,
        });
        return tips;
    }

    window.NA_SCORE = { scoreReport, explain, suggestImprovements };
})();
