# FAIR Compliance — NotifiAZ

> A one-page mapping of NotifiAZ's data and message structures to the four FAIR principles: **F**indable, **A**ccessible, **I**nteroperable, **R**eusable. Each principle is mapped to a specific implementation choice in the project, with a file or code reference that the panel can verify.

The FAIR principles (Wilkinson et al., 2016) were authored for research data, but they translate cleanly to public-health surveillance data — and arguably more urgently, because surveillance data has explicit downstream consumers (state, federal, tribal agencies) that need to find and reuse it.

---

## F — Findable

> *Data and metadata should be easy to find for both humans and machines.*

| FAIR sub-principle | NotifiAZ implementation | Where to verify |
|---|---|---|
| F1: globally unique, persistent identifiers | Every disease has a stable string ID (`valley_fever`, `tb_active`, `rmsf`, etc.) plus three external identifiers: ICD-10, SNOMED-CT, and (where applicable) ELR LOINC. | `data/reference/reportable_diseases_us.json` |
| F2: data described with rich metadata | Every report carries: reporter identity + facility, subject identity + residency, disease + codes, exposure history, lab results, message-spec version, audit trail. | `app/reporter/messages/messages.js` and any rendered report preview |
| F3: metadata clearly reference the identifier | Every generated message embeds the disease ID, agency ID, message-spec version, and a per-report UUID. | Click "Preview message" in the reporter — every payload contains these. |
| F4: registered/indexed in a searchable resource | The Insights tab "Ask NotifiAZ" panel (RAG retriever) makes every disease entry searchable by symptom/exposure/agent name. The disease database itself is structured JSON, indexable by any downstream tool. | Insights tab §3; `app/shared/rag_data.js` |

---

## A — Accessible

> *Data should be retrievable using their identifier via a standardized communications protocol.*

| FAIR sub-principle | NotifiAZ implementation | Where to verify |
|---|---|---|
| A1: retrievable by identifier via standard protocol | Reports are generated as standards-compliant payloads: HL7 v2.5.1 ELR (pipe-delimited, MLLP-ready), NNDSS HL7 v2 messages, and per-agency JSON. All retrievable by the report UUID. | `app/reporter/messages/messages.js` |
| A1.1: protocol is open, free, universally implementable | HL7 v2 is an open international standard (ISO/HL7 27951:2009). FHIR R4 is HL7's modern open standard. JSON over HTTP is universally implementable. | The message generators emit only these formats. |
| A1.2: protocol allows authentication & authorization where necessary | The MVP uses local-storage state with audit logging. The production deployment plan documents the migration path: mTLS for state-to-state ELR, OAuth 2.0 for FHIR endpoints, signed JWTs for tribal endpoints. | `docs/api_spec.md` §"Production deployment" |
| A2: metadata accessible even when data no longer is | Every closed report retains its full audit log including all agency interactions, message-spec versions, and structured outcome notes. The report can be redacted (PHI removed) while metadata is preserved for surveillance statistics. | `NA_STORE.getAuditLog()` in `app/shared/store.js` |

A note on the **scope of accessibility for this MVP**: the codebase is committee-restricted under the LICENSE file — accessibility is intentionally narrow until post-graduation. The documented plan is to open-source under Apache 2.0 with a Public Health exception clause. This is a real FAIR limitation, named transparently rather than overclaimed.

---

## I — Interoperable

> *Data uses formal, accessible, shared, broadly applicable language for knowledge representation.*

This is where NotifiAZ does its strongest work — interoperability is the entire point of standards-compliant message generation.

| FAIR sub-principle | NotifiAZ implementation | Where to verify |
|---|---|---|
| I1: formal, accessible, shared, broadly applicable language | **HL7 v2.5.1 ELR** (the format every state ELR receiver in the United States accepts) for ADHS routing. **NNDSS HL7 v2** for CDC NNDSS routing. **FHIR R4 Bundle** as the input format from EHRs. **APHIS VSPS Form 1-A JSON** for federal animal disease reporting. | `app/reporter/messages/messages.js` — every generator function emits a standard format. |
| I2: vocabularies that follow FAIR principles | **ICD-10-CM** for human disease classification. **SNOMED CT** for clinical concepts. **LOINC** for laboratory observations. **HL7 v2 tables** (0078, 0085, 0123) for results. All three vocabularies are themselves FAIR-compliant. | Open `reportable_diseases_us.json`; every disease entry has `icd10`, `snomed_ct`, and `human_reporting.elr.observation_loinc` fields. |
| I3: qualified references to other (meta)data | Every report cross-references: the disease record (by stable ID), the patient record (by stable ID), the encounter (by stable ID), the laboratory results (by LOINC code + value with units). Each agency message preserves these references in the destination format's idiomatic way (OBX segments in HL7 v2; nested resources in FHIR). | Click "Preview message" on any reporter screen. |

**Concrete demonstration.** A single Valley Fever case in the demo generates four interoperable messages from one user action:

1. HL7 v2.5.1 ELR for ADHS — pipe-delimited, MSH/PID/OBR/OBX segments, ELR-IG-2.0 conformant.
2. NNDSS v2 HL7 for CDC — case classification, jurisdiction, condition codes per NNDSS MMG.
3. Maricopa County PH JSON — county-specific schema; routes to MCDPH's reportable-disease intake.
4. (For zoonotic case) APHIS VSPS Form 1-A JSON — federal animal-disease reporting.

These are all generated from the same internal report object, by code the panel can read in `messages.js`. Interoperability is not an aspiration — it is implemented.

---

## R — Reusable

> *Data should be well-described so they can be replicated and/or combined in different settings.*

| FAIR sub-principle | NotifiAZ implementation | Where to verify |
|---|---|---|
| R1: described with rich, plurality of accurate attributes | Every disease entry includes: common name, ICD-10, SNOMED-CT, applicable populations, applicable species, zoonotic flag, select-agent flag, AZ relevance score, ADHS class + timeline, destination list, animal-side destination list. | `reportable_diseases_us.json` |
| R1.1: released with a clear, accessible data usage license | `LICENSE` file in repo root: committee-restricted MVP with documented post-graduation Apache-2.0-with-PH-exception path. | Repository root |
| R1.2: associated with detailed provenance | Every report carries the reporter ID, facility ID, EHR source, generation timestamp, and message-spec version. The audit log captures every state transition with timestamp + actor ID. | `NA_STORE.getAuditLog()` and any submitted report's history panel |
| R1.3: meets domain-relevant community standards | HL7 v2.5.1 ELR follows the **CDC ELR Implementation Guide v2.0**. NNDSS messages follow the **CDC NNDSS Modernization MMG**. Tribal routing follows **Indian Health Service tribal data sovereignty defaults**. APHIS messages follow **VSPS Form 1-A**. | `data/reference/agencies.json` `spec_version` fields, and per-message `_spec_version` tags. |

**Reusability proof.** Because reports are generated in standard formats with stable IDs and full provenance, the same report can be:

- Re-routed to a different jurisdiction if the patient moves (just resolve `local_health_dept` against the new county).
- Aggregated into surveillance statistics by ADHS without reverse-engineering the source.
- Audited by a tribal authority for sovereignty compliance (the `consentToShareWith*` fields are explicit on every tribal-routed message).
- Used as training data for future surveillance analytics, with PHI redacted but provenance preserved.

---

## What FAIR compliance is NOT here

To be honest about scope:

- We do not yet publish a machine-readable data dictionary in OpenAPI / OpenAPI 3.1 / FHIR ImplementationGuide format. The next-version roadmap does — `docs/api_spec.md` includes the ImplementationGuide outline.
- We do not register the disease database with an external registry like FAIRsharing.org. Doing so requires the codebase to be public.
- The synthetic dataset is reproducible from `seed=42` but is not a citable archive (no DOI). Post-graduation we'd deposit it on Zenodo with a DOI.

These are honestly named gaps, not silent omissions.

---

## Summary

NotifiAZ is **strongly FAIR on Interoperable and Reusable**, **partially FAIR on Findable**, and **intentionally scope-restricted on Accessible** for the duration of the MVP. The product's reason for existing — multi-agency, standards-compliant reporting — *is* a FAIR thesis at its core. Every standard format generated, every stable identifier, every audit-logged state transition is FAIR work.

Reference: Wilkinson, M.D., et al. (2016). *The FAIR Guiding Principles for scientific data management and stewardship*. Scientific Data 3, 160018.
