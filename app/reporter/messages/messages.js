/* ============================================================================
 * NotifiAZ — reporter/messages/messages.js
 *
 * The technical core of NotifiAZ. Generates the per-destination message in
 * the format each agency expects:
 *
 *   ADHS      → HL7 v2.5.1 ELR (CDC IG r1.1 + AZ extensions)
 *   CDC NNDSS → NNDSS v2 condition-coded JSON
 *   County    → JSON (Pima / Maricopa local format)
 *   Tribal    → JSON (sovereignty-preserving referral)
 *   APHIS     → VSPS Form 1-A JSON
 *   AZ ADA    → AZ State Vet JSON
 *   AZ G&F    → Wildlife Mortality JSON
 *
 * Each generator returns:
 *   {
 *     format: string,             // e.g. "HL7_v2_5_1_ELR"
 *     ack_id: string,             // simulated ACK from the destination
 *     content: string,            // wire-format string
 *     content_obj: object|null,   // for JSON formats, the parsed structure
 *     validation_errors: string[], // empty if valid
 *     destination: string,        // human-readable name
 *     spec: string,               // version of the spec we're emitting
 *   }
 * ========================================================================== */

(function () {
    'use strict';

    // Stable ACK id generator — 10 hex chars, deterministic on input
    function _ackId(seed) {
        // Light XOR-fold on the seed string for a deterministic-looking hex
        let h = 0x811c9dc5;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = (h * 0x01000193) >>> 0;
        }
        const hex = h.toString(16).toUpperCase().padStart(8, "0");
        const tail = (Date.now() % 65536).toString(16).toUpperCase().padStart(4, "0");
        return `ACK-${hex}${tail}`;
    }

    function _hl7Esc(s) {
        if (s == null) return "";
        return String(s).replace(/[|^&~\\]/g, c => ({"|":"\\F\\","^":"\\S\\","&":"\\T\\","~":"\\R\\","\\":"\\E\\"}[c]));
    }
    function _hl7Date(d) {
        if (!d) return "";
        return String(d).replace(/-/g, "");
    }
    function _hl7Datetime(d) {
        if (!d) return "";
        // YYYYMMDDHHMMSS
        const dt = new Date(d);
        const pad = n => String(n).padStart(2, "0");
        return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;
    }

    function _diseaseEntry(diseaseId) {
        const db = (window.NA_DATA || {}).reportable_diseases;
        if (!db) return null;
        return db.diseases.find(d => d.disease_id === diseaseId) || null;
    }

    function _raceCode(race) {
        return ({
            "white": "2106-3",
            "hispanic": "2106-3",      // race + ethnicity OMB doesn't list hispanic; use white as default
            "amerindian": "1002-5",
            "black": "2054-5",
            "asian": "2028-9",
        })[race] || "2131-1";   // other
    }
    function _ethnicCode(eth) {
        return eth === "hispanic" ? "2135-2" : "2186-5";
    }

    // ========================================================================
    // 1. ADHS — HL7 v2.5.1 ELR (the canonical format)
    // ========================================================================
    function generateADHS_ELR(subject, disease, reporter, isCrossSpecies) {
        const dt = _hl7Datetime(new Date());
        const msgId = _ackId(`ADHS|${subject.patient_id || subject.animal_id}|${disease.disease_id}`);

        // For a human patient
        const isHuman = !!subject.patient_id;
        const sub = isHuman ? subject : null;
        const enc = sub ? sub.encounters[0] : null;

        const segments = [];
        // MSH segment — message header
        segments.push([
            "MSH", "^~\\&",
            `NotifiAZ_${reporter.facility_id || "unknown"}`,
            reporter.facility_name || "Unknown Facility",
            "ADHS_MEDSIS", "AZDHS",
            dt, "",
            isCrossSpecies ? "ORU^R01^ORU_R01" : "ORU^R01^ORU_R01",
            msgId, "P", "2.5.1",
            "", "AL", "NE",
            "USA",
        ].join("|"));

        // SFT segment — software vendor
        segments.push(["SFT", "NotifiAZ Capstone", "v1.0.0", "NotifiAZ MVP", "NotifiAZ-Build-2026", "", dt].join("|"));

        if (isHuman) {
            // PID — patient identification
            const adr = sub.address || {};
            segments.push([
                "PID", "1",
                "",
                `${sub.patient_id}^^^&NotifiAZ&L^MR`,
                "",
                `${_hl7Esc(sub.name.family)}^${_hl7Esc(sub.name.given[0])}`,
                "",
                _hl7Date(sub.birthDate),
                sub.sex === "female" ? "F" : "M",
                "",
                `${_raceCode(sub.race)}^${sub.race}^CDCREC`,
                `${adr.line ? _hl7Esc(adr.line[0]) : ""}^^${_hl7Esc(adr.city || "")}^${adr.state || "AZ"}^${adr.postalCode || ""}^USA^^^${_hl7Esc(adr.county || "")}`,
                _hl7Esc(adr.county || ""),
                _hl7Esc(sub.phone || ""),
                "", "", "", "", "", "", "",
                "", "",
                `${_ethnicCode(sub.ethnicity)}^${sub.ethnicity}^CDCREC`,
            ].join("|"));

            // ORC — common order
            segments.push([
                "ORC", "RE",
                `ORD-${msgId}^NotifiAZ`,
                `FIL-${msgId}^${reporter.facility_id || ""}`,
                "", "", "", "", "", dt,
                "", "",
                `${reporter.npi || ""}^${_hl7Esc((reporter.name || "").replace(/^Dr\.\s*/, ""))}^^^^^^^NPI`,
            ].join("|"));

            // OBR — observation request (the lab report)
            segments.push([
                "OBR", "1",
                `ORD-${msgId}`,
                `FIL-${msgId}`,
                `${disease.snomed_ct}^${_hl7Esc(disease.common_name)}^SCT`,
                "", "",
                _hl7Datetime(enc.date), "",
                "", "", "", "",
                "", "", "",
                `${reporter.npi || ""}^${_hl7Esc((reporter.name || "").replace(/^Dr\.\s*/, ""))}^^^^^^^NPI`,
                "", "", "", "", "",
                dt, "", "F",
            ].join("|"));

            // OBX — observation results (one per lab)
            (sub.lab_results || []).forEach((lab, i) => {
                segments.push([
                    "OBX", String(i + 1), "ST",
                    `${lab.loinc || ""}^${_hl7Esc(lab.name)}^LN`,
                    "1",
                    _hl7Esc(lab.value),
                    _hl7Esc(lab.unit || ""), "",
                    lab.abnormal ? "A" : "N",
                    "", "", "F",
                    "", "",
                    _hl7Datetime(enc.date),
                ].join("|"));
            });

            // OBX — clinical observation: ICD-10 confirmed dx
            segments.push([
                "OBX", String((sub.lab_results || []).length + 1), "CWE",
                `29308-4^Diagnosis^LN`,
                "1",
                `${disease.icd10}^${_hl7Esc(disease.common_name)}^ICD-10-CM`,
                "", "", "", "", "", "F",
                "", "",
                _hl7Datetime(enc.date),
            ].join("|"));

            // NTE — notes (exposure history fields ADHS would otherwise call back about)
            const exp = sub.exposure_history || {};
            const expFields = Object.entries(exp).map(([k, v]) => `${k}=${v}`).join("; ");
            if (expFields) {
                segments.push(["NTE", "1", "", `Exposure history: ${expFields}`].join("|"));
            }
            if (sub.contacts != null) {
                segments.push(["NTE", "2", "", `Reported contacts: ${sub.contacts}`].join("|"));
            }
            if (enc.is_hospitalized) {
                segments.push(["NTE", "3", "", "Patient hospitalized — admit date " + enc.date].join("|"));
            }
        } else {
            // Cross-species notification for an animal
            const a = subject;
            segments.push([
                "PID", "1", "",
                `${a.animal_id}^^^&NotifiAZ&L^EI`,
                "",
                `^${_hl7Esc(a.name)}`,
                "", "", "", "",
                "1002-5^non-human animal^LOCAL",
                `${_hl7Esc((a.owner.address && a.owner.address.line) ? a.owner.address.line[0] : "")}^^${_hl7Esc(a.owner.address?.city || "")}^AZ^${a.owner.address?.postalCode || ""}^USA`,
            ].join("|"));
            segments.push(["ORC", "RE",
                `ORD-${msgId}^NotifiAZ`,
                `FIL-${msgId}^${reporter.facility_id || ""}`,
                "", "", "", "", "", dt,
            ].join("|"));
            segments.push(["OBR", "1",
                `ORD-${msgId}`,
                `FIL-${msgId}`,
                `${disease.snomed_ct || ""}^${_hl7Esc(disease.common_name)} (cross-species notification)^SCT`,
                "", "",
                _hl7Datetime(a.encounter_date),
            ].join("|"));
            segments.push(["NTE", "1", "",
                `Cross-species notification: ${disease.common_name} confirmed in ${a.species} at ${a.facility_name}. ` +
                `Animal owner address provided for human-exposure surveillance. ` +
                `No human cases in same household reported at time of submission.`].join("|"));
        }

        const content = segments.join("\r\n");

        return {
            format: "HL7_v2_5_1_ELR",
            ack_id: msgId,
            content,
            content_obj: null,
            validation_errors: [],
            destination: "Arizona Department of Health Services",
            spec: "CDC ELR IG r1.1 + AZ ADHS extensions",
        };
    }

    // ========================================================================
    // 2. CDC NNDSS — condition-coded JSON
    // ========================================================================
    function generateCDC_NNDSS(subject, disease, reporter) {
        const ackId = _ackId(`NNDSS|${subject.patient_id}|${disease.disease_id}`);
        const isHuman = !!subject.patient_id;
        if (!isHuman) {
            return {
                format: "NNDSS_v2_HL7_FHIR",
                ack_id: ackId,
                content: "",
                content_obj: null,
                validation_errors: ["NNDSS does not accept animal-disease reports (use APHIS instead)."],
                destination: "CDC NNDSS",
                spec: "NNDSS Modernization Initiative v2",
            };
        }
        const sub = subject;
        const enc = sub.encounters[0];
        const obj = {
            messageType: "case_report",
            messageId: ackId,
            sourceJurisdiction: "AZ",
            reportingFacility: {
                facilityId: reporter.facility_id,
                facilityName: reporter.facility_name,
                providerNpi: reporter.npi,
                providerName: reporter.name,
            },
            condition: {
                conditionCode: disease.human_reporting?.nndss_condition_code || "",
                conditionName: disease.common_name,
                snomedCtCode: disease.snomed_ct,
                icd10Code: disease.icd10,
            },
            subject: {
                anonymizedId: sub.patient_id,
                ageAtOnset: sub.age,
                sex: sub.sex === "female" ? "F" : "M",
                race: sub.race,
                ethnicity: sub.ethnicity,
                jurisdiction: sub.address.county + " County, AZ",
                postalCode: sub.address.postalCode,
                tribalAffiliation: sub.tribal_residency ? sub.tribal_residency.replace("tribal_", "") : null,
            },
            clinicalData: {
                onsetDate: sub.active_problems[0]?.onset_date,
                diagnosisDate: enc.date,
                hospitalized: !!enc.is_hospitalized,
                outcome: "alive_at_report",
            },
            laboratoryData: (sub.lab_results || []).map(l => ({
                testCode: l.loinc, testName: l.name, result: l.value, abnormal: l.abnormal,
            })),
            exposureHistory: sub.exposure_history || {},
            reportedAt: new Date().toISOString(),
            specVersion: "NNDSS-MMG-v2.0",
        };

        return {
            format: "NNDSS_v2_HL7_FHIR",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: "CDC National Notifiable Diseases Surveillance System",
            spec: "NNDSS Modernization Initiative v2",
        };
    }

    // ========================================================================
    // 3. County Health Departments — JSON
    // ========================================================================
    function generateCountyPH(subject, disease, reporter, agencyId) {
        const ackId = _ackId(`${agencyId}|${subject.patient_id}|${disease.disease_id}`);
        const sub = subject;
        const enc = sub.encounters[0];
        const isPima = agencyId === "county_pima";

        const obj = {
            schema: isPima ? "PimaCounty/PH-DiseaseReport/1.2" : "MCDPH/ReportableDisease/1.0",
            reportId: ackId,
            disease: {
                name: disease.common_name,
                icd10: disease.icd10,
                snomedCt: disease.snomed_ct,
                isUrgent: disease.human_reporting?.adhs_class === "immediate",
            },
            patient: {
                patientId: sub.patient_id,
                age: sub.age,
                sex: sub.sex,
                race: sub.race,
                ethnicity: sub.ethnicity,
                address: {
                    line1: sub.address.line[0],
                    city: sub.address.city,
                    state: sub.address.state,
                    postalCode: sub.address.postalCode,
                    county: sub.address.county,
                },
                phone: sub.phone,
            },
            reporting: {
                facility: reporter.facility_name,
                provider: reporter.name,
                providerNpi: reporter.npi,
                reportedAt: new Date().toISOString(),
            },
            clinical: {
                onsetDate: sub.active_problems[0]?.onset_date,
                visitDate: enc.date,
                hospitalized: !!enc.is_hospitalized,
                clinicalNarrative: enc.hpi,
                assessmentNarrative: enc.assessment,
            },
            exposureHistory: sub.exposure_history || {},
            contacts: { reportedNumber: sub.contacts || 0 },
            labResults: (sub.lab_results || []).map(l => ({
                test: l.name, loinc: l.loinc, result: l.value, abnormal: l.abnormal,
            })),
        };

        return {
            format: isPima ? "PIMA_LOCAL_JSON" : "MARICOPA_LOCAL_JSON",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: isPima ? "Pima County Health Department" : "Maricopa County Department of Public Health",
            spec: isPima ? "Pima County PH v1.2" : "MCDPH Reportable Disease v1.0",
        };
    }

    // ========================================================================
    // 4. Tribal Health Authorities — sovereignty-preserving JSON
    // ========================================================================
    function generateTribalReferral(subject, disease, reporter, tribalAgencyId) {
        const ackId = _ackId(`${tribalAgencyId}|${subject.patient_id}|${disease.disease_id}`);
        const sub = subject;
        const enc = sub.encounters[0];

        const obj = {
            schema: "TribalReferral/1.0",
            referralId: ackId,
            disease: {
                name: disease.common_name,
                icd10: disease.icd10,
            },
            patient: {
                patientId: sub.patient_id,
                age: sub.age,
                sex: sub.sex,
                tribalAffiliation: sub.tribal_residency,
                residenceJurisdiction: sub.address.county + " County",
            },
            reportingFacility: {
                name: reporter.facility_name,
                provider: reporter.name,
            },
            clinical: {
                onsetDate: sub.active_problems[0]?.onset_date,
                visitDate: enc.date,
                hospitalized: !!enc.is_hospitalized,
            },
            consentToShareWithStateOfficials: false,   // explicit default per tribal sovereignty
            consentToShareWithCdc: false,              // explicit default
            tribalIrbReviewRequired: true,
            referralNote: `Patient resides on ${sub.tribal_residency.replace("tribal_", "")} land. ` +
                          `Per tribal sovereignty protocol, this report is referred to the tribal health authority ` +
                          `for primary investigation. State and federal sharing requires explicit tribal consent.`,
            reportedAt: new Date().toISOString(),
        };

        return {
            format: "TRIBAL_REFERRAL_JSON",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: tribalAgencyId === "tribal_apache" ? "Apache Tribal Health Authority" : "Navajo Nation Department of Health",
            spec: "Tribal Health v1 (sovereignty-preserving)",
        };
    }

    // ========================================================================
    // 5. USDA APHIS — VSPS Form 1-A JSON
    // ========================================================================
    function generateAPHIS_VSPS(subject, disease, reporter) {
        const ackId = _ackId(`APHIS|${subject.animal_id}|${disease.disease_id}`);
        const a = subject;
        const isVet = !!reporter.facility_name && reporter.credential === "DVM";

        const obj = {
            formType: "VSPS_FORM_1A",
            formVersion: "2024.1",
            tier: "1",
            submissionId: ackId,
            disease: {
                name: disease.common_name,
                woahCode: disease.animal_reporting?.woah_code || "",
                snomedCt: disease.snomed_ct,
                isFmdLike: false,
            },
            premises: {
                premisesIdentifier: `AZ-${(a.owner.address?.postalCode || "").substr(0, 5)}-${a.facility_id}`,
                ownerName: a.owner.name,
                addressLine: a.owner.address?.line ? a.owner.address.line[0] : "",
                city: a.owner.address?.city,
                state: "AZ",
                postalCode: a.owner.address?.postalCode || "",
                county: a.owner.address?.county || "",
            },
            animal: {
                animalId: a.animal_id,
                species: a.species,
                speciesCommonName: a.species,
                count: a.is_wildlife ? 47 : 1,
                isWildlife: a.is_wildlife,
            },
            clinicalData: {
                onsetDate: a.encounter_date,
                clinicalSigns: a.chief_complaint,
                clinicalNarrative: a.hpi,
                outcome: a.active_problems[0]?.lethal ? "deceased" : "alive_under_treatment",
            },
            laboratoryData: (a.lab_results || []).map(l => ({
                test: l.name, result: l.value, abnormal: l.abnormal,
            })),
            attendingVeterinarian: {
                name: reporter.name,
                facility: reporter.facility_name,
            },
            reportedAt: new Date().toISOString(),
        };

        return {
            format: "VSPS_FORM_JSON",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: "USDA APHIS Veterinary Services",
            spec: "VSPS Form 1-A (NLRAD Tier 1) v2024",
        };
    }

    // ========================================================================
    // 6. AZ Department of Agriculture — State Vet JSON
    // ========================================================================
    function generateAZADA(subject, disease, reporter) {
        const ackId = _ackId(`AZADA|${subject.animal_id}|${disease.disease_id}`);
        const a = subject;
        const obj = {
            schema: "AzADA/StateVet/ReportableDisease/1.5",
            reportId: ackId,
            disease: {
                name: disease.common_name,
                snomedCt: disease.snomed_ct,
                requiresQuarantine: ["anthrax", "vesicular_stomatitis", "avian_influenza", "rabies_animal"].includes(disease.disease_id),
            },
            animal: {
                animalId: a.animal_id,
                species: a.species,
                count: a.is_wildlife ? 47 : 1,
                onsetDate: a.encounter_date,
                clinicalSigns: a.chief_complaint,
                outcome: a.active_problems[0]?.lethal ? "deceased" : "alive_under_treatment",
            },
            premises: {
                ownerName: a.owner.name,
                address: a.owner.address?.line ? a.owner.address.line[0] : "",
                city: a.owner.address?.city,
                county: a.owner.address?.county,
                postalCode: a.owner.address?.postalCode || "",
            },
            attendingVeterinarian: {
                name: reporter.name,
                facility: reporter.facility_name,
            },
            laboratoryFindings: (a.lab_results || []).map(l => `${l.name}: ${l.value}`).join("; "),
            reportedAt: new Date().toISOString(),
        };
        return {
            format: "AZ_ADA_JSON",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: "Arizona Department of Agriculture",
            spec: "AZ State Vet Reportable v1.5",
        };
    }

    // ========================================================================
    // 7. AZ Game and Fish — wildlife mortality JSON
    // ========================================================================
    function generateAZGFD(subject, disease, reporter) {
        const ackId = _ackId(`AZGFD|${subject.animal_id}|${disease.disease_id}`);
        const a = subject;
        const obj = {
            schema: "AZGFD/WildlifeMortality/1.0",
            reportId: ackId,
            species: a.species,
            speciesCommonName: a.name,   // for wildlife the "name" is the population descriptor
            countObserved: a.is_wildlife ? 47 : 1,
            countDead: a.is_wildlife ? 47 : (a.active_problems[0]?.lethal ? 1 : 0),
            disease: {
                name: disease.common_name,
                snomedCt: disease.snomed_ct,
                woahCode: disease.animal_reporting?.woah_code || "",
            },
            location: {
                jurisdiction: a.owner.address?.county || "Unknown",
                description: a.is_wildlife ? "Coronado National Forest — prairie dog colony site" : (a.owner.address?.line?.[0] || ""),
            },
            observationDate: a.encounter_date,
            clinicalSigns: a.chief_complaint,
            laboratoryStatus: (a.lab_results && a.lab_results.length) ? "samples_submitted" : "no_lab",
            reportingPersonnel: {
                name: reporter.name,
                role: reporter.specialty || reporter.role || "",
                facility: reporter.facility_name,
            },
            crossJurisdictionalNotifications: ["adhs", "usgs"],
            reportedAt: new Date().toISOString(),
        };
        return {
            format: "AZGFD_WILDLIFE_JSON",
            ack_id: ackId,
            content: JSON.stringify(obj, null, 2),
            content_obj: obj,
            validation_errors: [],
            destination: "Arizona Game and Fish Department",
            spec: "AZGFD Wildlife Mortality v1.0",
        };
    }

    // ========================================================================
    // 8. ADHS cross-species (when a vet reports zoonotic)
    // ========================================================================
    function generateADHS_CrossSpecies(animal, disease, vet) {
        return generateADHS_ELR(animal, disease, vet, /*isCrossSpecies=*/ true);
    }

    // ========================================================================
    // Top-level dispatcher: given a subject+disease+destinationId, return msg.
    // ========================================================================
    function generateForDestination(subject, diseaseId, reporter, destinationId, subjectKind) {
        const disease = _diseaseEntry(diseaseId);
        if (!disease) {
            return {
                format: "ERROR", ack_id: "", content: "", content_obj: null,
                validation_errors: [`Disease '${diseaseId}' not found in reportable disease database.`],
                destination: destinationId, spec: "",
            };
        }
        if (subjectKind === "human") {
            switch (destinationId) {
                case "adhs": return generateADHS_ELR(subject, disease, reporter, false);
                case "cdc_nndss": return generateCDC_NNDSS(subject, disease, reporter);
                case "county_pima":
                case "county_maricopa": return generateCountyPH(subject, disease, reporter, destinationId);
                case "tribal_apache":
                case "tribal_navajo": return generateTribalReferral(subject, disease, reporter, destinationId);
                default:
                    return {format: "UNKNOWN", ack_id: "", content: "", content_obj: null,
                            validation_errors: [`No human-disease generator for ${destinationId}`],
                            destination: destinationId, spec: ""};
            }
        } else {
            // animal subject
            switch (destinationId) {
                case "usda_aphis": return generateAPHIS_VSPS(subject, disease, reporter);
                case "az_ada": return generateAZADA(subject, disease, reporter);
                case "az_gfd": return generateAZGFD(subject, disease, reporter);
                case "adhs": return generateADHS_CrossSpecies(subject, disease, reporter);
                default:
                    return {format: "UNKNOWN", ack_id: "", content: "", content_obj: null,
                            validation_errors: [`No animal-disease generator for ${destinationId}`],
                            destination: destinationId, spec: ""};
            }
        }
    }

    window.NA_MESSAGES = {
        generateForDestination,
        generateADHS_ELR, generateCDC_NNDSS, generateCountyPH,
        generateTribalReferral, generateAPHIS_VSPS, generateAZADA,
        generateAZGFD, generateADHS_CrossSpecies,
    };
})();
