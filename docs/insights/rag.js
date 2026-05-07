/* ============================================================================
 * NotifiAZ — insights/rag.js
 *
 * In-browser TF-IDF retrieval over the 72-disease reportable-disease
 * database. The pre-computed vectors live in app/shared/rag_data.js.
 *
 * The flow is the standard RAG retrieval stage:
 *   1. Tokenize query
 *   2. Compute query TF-IDF vector (using shipped vocab + IDF)
 *   3. Cosine-similarity rank against all 72 disease vectors
 *   4. Return top-k matches
 *
 * The "answer" stage is template-based, NOT an LLM call:
 *   - Pull the structured fields from the matched disease entry
 *   - Format into a deterministic answer card
 * This keeps the demo offline and verifiable. In production, the same
 * retrieval feeds an LLM context window for natural-language answers.
 * ========================================================================== */

(function () {
    'use strict';

    const STOP = null;
    function _stopSet() {
        if (STOP) return STOP;
        return new Set((window.NA_RAG && window.NA_RAG.stop_words) || []);
    }

    function _tokenize(text) {
        const stop = _stopSet();
        return text.toLowerCase()
            .replace(/[^a-z0-9\-\s]/g, " ")
            .split(/\s+/)
            .filter(t => t.length > 1 && !stop.has(t));
    }

    function _queryVector(tokens) {
        const R = window.NA_RAG;
        if (!R) return null;
        const tf = {};
        tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
        const maxTf = Math.max(...Object.values(tf), 1);
        const vec = {};
        let normSq = 0;
        Object.entries(tf).forEach(([term, count]) => {
            const i = R.vocab.indexOf(term);
            if (i < 0) return;   // OOV term, skipped
            const tfNorm = 0.5 + 0.5 * (count / maxTf);
            const w = tfNorm * R.idf[i];
            vec[i] = w;
            normSq += w * w;
        });
        const norm = Math.sqrt(normSq) || 1;
        Object.keys(vec).forEach(k => { vec[k] = vec[k] / norm; });
        return vec;
    }

    function _cosine(qVec, dVec) {
        // qVec and dVec are sparse {idx -> weight}, both already L2-normalized
        let dot = 0;
        const qKeys = Object.keys(qVec);
        const dKeys = Object.keys(dVec);
        const smaller = qKeys.length < dKeys.length ? qVec : dVec;
        const larger = smaller === qVec ? dVec : qVec;
        Object.entries(smaller).forEach(([k, v]) => {
            if (larger[k] !== undefined) dot += v * larger[k];
        });
        return dot;
    }

    /**
     * search(query, topK) → [{disease_id, score, answer_data}, ...]
     */
    function search(query, topK = 3) {
        const R = window.NA_RAG;
        if (!R) return [];
        const tokens = _tokenize(query);
        if (tokens.length === 0) return [];
        const qv = _queryVector(tokens);
        if (!qv || Object.keys(qv).length === 0) return [];
        const scored = [];
        Object.entries(R.vectors).forEach(([did, dv]) => {
            const s = _cosine(qv, dv);
            if (s > 0) scored.push({
                disease_id: did,
                score: s,
                answer_data: R.answer_data[did],
            });
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }

    /**
     * answer(result) → structured answer card from a single search result.
     * Deterministic; no LLM call. The fields come straight from the disease
     * entry, so every claim is auditable.
     */
    function answer(result) {
        if (!result || !result.answer_data) return null;
        const a = result.answer_data;
        const isReportable = (a.human_destinations || []).length > 0 || (a.animal_destinations || []).length > 0;
        const dest = (a.human_destinations || []).concat(a.animal_destinations || []);
        return {
            common_name: a.common_name,
            is_reportable: isReportable,
            urgency: a.adhs_class || "—",
            timeline: a.adhs_timeline || "—",
            destinations: dest,
            applies_to: a.applies_to,
            is_zoonotic: a.is_zoonotic,
            is_select_agent: a.is_select_agent,
            icd10: a.icd10,
            snomed_ct: a.snomed_ct,
            az_relevance: a.az_relevance_score,
            similarity_score: result.score,
        };
    }

    /**
     * Sample queries to seed the search box. These exercise different
     * retrieval paths (symptom, exposure, agent name, route).
     */
    const SAMPLE_QUERIES = [
        "fever cough soil dust southern arizona",
        "tick bite rash hiking",
        "raw milk cattle fever",
        "rodent exposure cabin respiratory",
        "unvaccinated child rash fever",
        "prairie dog die-off wildlife",
        "salmonella potluck outbreak",
    ];

    window.NA_RAG_SEARCH = { search, answer, SAMPLE_QUERIES };
})();
