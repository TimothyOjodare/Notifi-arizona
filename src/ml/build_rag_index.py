"""
NotifiAZ — RAG (Retrieval-Augmented Generation) precompute

A real RAG system has three stages: (1) retrieve relevant docs from a
corpus given a query, (2) augment a prompt with the retrieved context,
(3) generate an answer with an LLM.

This module covers stage (1) — the retrieval — and ships pre-computed
TF-IDF vectors to the browser so the user can do live retrieval against
the 72-disease reportable-disease database without a backend.

For stage (2)+(3), we ship a deterministic answer template that uses the
retrieved disease entry's structured fields. This is intentionally NOT an
LLM call — keeping it deterministic means:
  - No API key needed for the demo
  - No hallucinations
  - Fully auditable: every answer is traceable to a specific disease entry
  - The panel can verify every claim against `data/reference/reportable_diseases_us.json`

In a production deployment, stage (2)+(3) would be a small instruction-
tuned model (e.g., Llama-3.1-8B-Instruct or MedGemma) with the retrieved
disease entry injected as context. The retrieval logic stays unchanged.

Output: app/shared/rag_data.js
  - corpus: per-disease text blob + structured fields
  - vocab: sorted list of terms used in TF-IDF
  - idf: inverse-document-frequency for each term
  - vectors: per-disease TF-IDF vector (sparse, only nonzero terms)

Run: python3 src/ml/build_rag_index.py
Reproducible.
"""

import json
import math
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
DATA = ROOT / "data"
APP = ROOT / "app"


# Stop-word list — small, English clinical-context-tuned
STOP = set("""a an the and or but of for to in on at by with as is are be been being
was were has have had do does did this that these those it its they them
his her their from we us our you your i me my mine yours so if then than
not no nor can could would should may might must will shall who whom whose
which what when where why how about into over under again further
""".split())


def _tokenize(text):
    text = text.lower()
    # Replace punctuation with space, keep alphanumerics + hyphens
    text = re.sub(r"[^a-z0-9\-\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if t not in STOP and len(t) > 1]


def _disease_text(d):
    """Build the searchable text blob per disease."""
    parts = [
        d.get("common_name", ""),
        d.get("disease_id", "").replace("_", " "),
    ]
    # Clinical synonyms / aliases hard-coded for AZ-relevant diseases that
    # patients/clinicians ask about by their colloquial name. This is the
    # equivalent of an SEO/synonym layer in a real RAG system.
    SYN = {
        "valley_fever": "coccidioidomycosis cocci fungal pneumonia desert dust soil exposure cough fever fatigue",
        "rmsf": "rocky mountain spotted fever tick rash myalgia headache outdoor hiking",
        "tb_active": "tuberculosis chronic cough weight loss night sweats afb cavitary lung infection",
        "hantavirus": "rodent exposure cabin pulmonary syndrome sin nombre virus dyspnea",
        "west_nile": "mosquito virus encephalitis neuroinvasive arbovirus",
        "salmonellosis": "diarrhea gastroenteritis foodborne potluck poultry eggs",
        "pertussis": "whooping cough paroxysmal post-tussive emesis pediatric",
        "plague": "yersinia pestis flea prairie dog rodent bubonic lymphadenopathy",
        "brucellosis": "raw milk cattle goats undulant fever zoonotic livestock",
        "rabies_animal": "bat dog bite drooling neurological zoonotic immediate",
        "anthrax": "bacillus livestock cattle sudden death bioterrorism",
        "avian_influenza": "h5n1 bird flu poultry zoonotic pandemic backyard flock",
        "vesicular_stomatitis": "horse cattle vesicles muzzle drool foreign animal disease",
        "measles": "rubeola rash fever cough coryza conjunctivitis vaccination unvaccinated outbreak",
        "gonorrhea": "neisseria sti std urethritis discharge dysuria",
        "syphilis": "treponema chancre rash std sexually transmitted",
        "lyme": "borrelia tick erythema migrans bullseye rash",
        "q_fever": "coxiella goat livestock placenta zoonotic kidding",
        "ehrlichiosis": "tick rickettsial fever headache leukopenia",
        "typhoid": "salmonella typhi enteric fever rose spots travel",
    }
    parts.append(SYN.get(d.get("disease_id", ""), ""))
    parts.append(" ".join(d.get("applies_to", [])))
    parts.append(" ".join(d.get("applicable_species", [])))
    if d.get("is_zoonotic"): parts.append("zoonotic cross-species human animal")
    if d.get("is_select_agent"): parts.append("select agent bioterrorism")
    hr = d.get("human_reporting") or {}
    if hr.get("adhs_class"): parts.append("class " + hr["adhs_class"])
    if hr.get("adhs_timeline"): parts.append("timeline " + hr["adhs_timeline"])
    parts.append(" ".join(hr.get("destinations") or []))
    ar = d.get("animal_reporting") or {}
    parts.append(" ".join(ar.get("destinations") or []))
    return " ".join(parts).lower()


def main():
    db = json.load(open(DATA / "reference" / "reportable_diseases_us.json"))
    diseases = db["diseases"]

    # Build corpus: list of (disease_id, text)
    corpus = [(d["disease_id"], _tokenize(_disease_text(d))) for d in diseases]
    N = len(corpus)

    # Vocab: every term that appears in any document
    vocab_set = set()
    for _, tokens in corpus:
        vocab_set.update(tokens)
    vocab = sorted(vocab_set)
    term_to_idx = {t: i for i, t in enumerate(vocab)}

    # IDF: log(N / df) for each term
    df = Counter()
    for _, tokens in corpus:
        for t in set(tokens):
            df[t] += 1
    idf = [math.log((N + 1) / (df[t] + 1)) + 1.0 for t in vocab]   # smoothed

    # TF-IDF vectors per document, stored sparse: {idx: weight}
    vectors = {}
    for did, tokens in corpus:
        if not tokens:
            vectors[did] = {}
            continue
        tf = Counter(tokens)
        max_tf = max(tf.values())
        vec = {}
        for term, count in tf.items():
            i = term_to_idx[term]
            tf_norm = 0.5 + 0.5 * (count / max_tf)
            vec[i] = round(tf_norm * idf[i], 4)
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vectors[did] = {i: round(v / norm, 5) for i, v in vec.items()}

    # Build the answer-template metadata per disease for stage (2)+(3)
    answer_data = {}
    for d in diseases:
        hr = d.get("human_reporting") or {}
        ar = d.get("animal_reporting") or {}
        answer_data[d["disease_id"]] = {
            "common_name": d.get("common_name"),
            "icd10": d.get("icd10"),
            "snomed_ct": d.get("snomed_ct"),
            "applies_to": d.get("applies_to", []),
            "is_zoonotic": d.get("is_zoonotic", False),
            "is_select_agent": d.get("is_select_agent", False),
            "az_relevance_score": d.get("az_relevance_score", 0),
            "adhs_class": hr.get("adhs_class"),
            "adhs_timeline": hr.get("adhs_timeline"),
            "human_destinations": hr.get("destinations", []),
            "animal_destinations": ar.get("destinations", []),
        }

    bundle = {
        "vocab": vocab,
        "idf": [round(v, 4) for v in idf],
        "vectors": vectors,
        "answer_data": answer_data,
        "stop_words": sorted(STOP),
        "stats": {"n_documents": N, "vocab_size": len(vocab)},
    }
    js = "window.NA_RAG = " + json.dumps(bundle) + ";\n"
    out = APP / "shared" / "rag_data.js"
    out.write_text(js)
    size = out.stat().st_size / 1024
    print(f"Wrote {out} ({size:.1f} KB)")
    print(f"  Documents: {N}")
    print(f"  Vocab size: {len(vocab)} terms")
    print(f"  Avg vector density: {sum(len(v) for v in vectors.values()) / N:.1f} terms/doc")


if __name__ == "__main__":
    main()
