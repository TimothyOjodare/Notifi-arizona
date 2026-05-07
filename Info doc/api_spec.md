# NotifiAZ API Specification

> **Status:** MVP. Production deployment requires real endpoint registration with each receiving agency. The contract documented below is the contract the MVP simulates and that a production deployment would expose.

---

## Overview

NotifiAZ exposes a single API endpoint for EHR integration. An existing EHR (Epic, Cerner, Athenahealth, or any other FHIR-capable system) calls this endpoint with a FHIR R4 Bundle containing the patient and encounter context. NotifiAZ performs the destination routing, generates one message per destination in the agency's expected format, validates each message, and returns acknowledgement IDs.

This is the **API integration mode**. The standalone web UI mode and the embedded-launch mode (where NotifiAZ is opened from inside the EHR) are alternative front-ends to the same routing engine.

---

## Endpoint

```
POST /api/reports
Content-Type: application/fhir+json
Accept: application/json
Authorization: Bearer <NotifiAZ-issued OAuth2 token>
```

**Base URL (production):** `https://api.notifiaz.org/v1`
**Base URL (staging):** `https://staging-api.notifiaz.org/v1`
**Base URL (MVP):** Not deployed; the message generators are exercised through the in-browser application.

---

## Request

The request body is a FHIR R4 Bundle of `type: "collection"` containing the following resources:

| Resource | Cardinality | Notes |
|---|---|---|
| `Patient` | 1 | Required. Demographics, address with county, optional tribal-affiliation extension. |
| `Encounter` | 1 | Required. The encounter where the reportable diagnosis was made. |
| `Condition` | 1+ | Required. At least one Condition with a SNOMED CT or ICD-10 code matching a disease in the NotifiAZ reportable-disease database. |
| `Observation` | 0+ | Optional. Lab results with LOINC codes, used to populate OBX segments in HL7 ELR. |
| `Practitioner` | 1 | Required. The reporting clinician (NPI required). |
| `Organization` | 1 | Required. The reporting facility. |

### Example request (abbreviated)

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "P-c35bec2c",
        "name": [{ "family": "Hernandez", "given": ["Carlos"] }],
        "gender": "male",
        "birthDate": "1979-03-12",
        "address": [{
          "line": ["6143 W Camelback Rd"],
          "city": "Glendale",
          "state": "AZ",
          "postalCode": "85301",
          "extension": [{
            "url": "http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-county",
            "valueString": "Maricopa"
          }]
        }],
        "extension": [{
          "url": "https://notifiaz.org/fhir/StructureDefinition/tribal-affiliation",
          "valueCoding": null
        }]
      }
    },
    {
      "resource": {
        "resourceType": "Condition",
        "code": {
          "coding": [
            { "system": "http://snomed.info/sct", "code": "65295007", "display": "Coccidioidomycosis" },
            { "system": "http://hl7.org/fhir/sid/icd-10", "code": "B38.9" }
          ]
        },
        "subject": { "reference": "Patient/P-c35bec2c" },
        "onsetDateTime": "2026-04-01"
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "code": {
          "coding": [{ "system": "http://loinc.org", "code": "31718-7", "display": "Coccidioides IgM" }]
        },
        "valueString": "Positive",
        "interpretation": [{
          "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": "A" }]
        }]
      }
    }
  ]
}
```

### Required FHIR extensions

NotifiAZ uses two custom FHIR extensions:

1. **Tribal affiliation:** `https://notifiaz.org/fhir/StructureDefinition/tribal-affiliation` on `Patient`.
   Values: `tribal_apache`, `tribal_navajo`, `tribal_tohono_oodham`, `tribal_san_carlos`, or null.
   Used to route the report to the patient's tribal health authority.

2. **Exposure history:** `https://notifiaz.org/fhir/StructureDefinition/exposure-history` on `Encounter`.
   Value type: `Extension` with sub-extensions for `soil_dust_exposure`, `food_exposure`, `tick_exposure`, etc., per the disease type.
   Used to populate the NTE segments in HL7 ELR and the `exposureHistory` field in CDC NNDSS JSON.

---

## Response

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "report_id": "R-a1b2c3d4",
  "submitted_at": "2026-05-06T14:32:18.422Z",
  "deliveries": [
    {
      "destination_id": "adhs",
      "destination_name": "Arizona Department of Health Services",
      "ack_id": "ACK-7A2F1E8B0420",
      "message_format": "HL7_v2_5_1_ELR",
      "status": "submitted",
      "validation_errors": []
    },
    {
      "destination_id": "county_maricopa",
      "destination_name": "Maricopa County Department of Public Health",
      "ack_id": "ACK-9D4C2F1A8731",
      "message_format": "MARICOPA_LOCAL_JSON",
      "status": "submitted",
      "validation_errors": []
    },
    {
      "destination_id": "cdc_nndss",
      "destination_name": "CDC National Notifiable Diseases Surveillance System",
      "ack_id": "ACK-3E7B5D9C1042",
      "message_format": "NNDSS_v2_HL7_FHIR",
      "status": "submitted",
      "validation_errors": []
    }
  ],
  "destinations_routed": 3,
  "destinations_validated": 3
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `report_id` | string | NotifiAZ-assigned report identifier. Use this to query report status later. |
| `submitted_at` | ISO 8601 datetime | When NotifiAZ received and processed the report. |
| `deliveries` | array | One entry per destination. |
| `deliveries[].destination_id` | string | One of: `adhs`, `cdc_nndss`, `county_pima`, `county_maricopa`, `tribal_apache`, `tribal_navajo`, `usda_aphis`, `az_ada`, `az_gfd`. |
| `deliveries[].ack_id` | string | Acknowledgement from the destination's intake system. Format varies by destination. |
| `deliveries[].message_format` | string | The wire format used. See message-format reference below. |
| `deliveries[].status` | enum | `submitted`, `received`, `callback_pending`, `reply_received`, `closed`. State machine documented in `app/shared/store.js`. |
| `deliveries[].validation_errors` | array | Empty if the message passed validation. Non-empty if the destination's spec rejected the message; the report will not be forwarded to that destination until the errors are resolved. |

### Message format reference

| `message_format` | Destination | Spec |
|---|---|---|
| `HL7_v2_5_1_ELR` | ADHS | CDC ELR Implementation Guide r1.1 + AZ ADHS extensions |
| `NNDSS_v2_HL7_FHIR` | CDC NNDSS | NNDSS Modernization Initiative v2 (MMG-aligned) |
| `PIMA_LOCAL_JSON` | Pima County PH | Pima County PH v1.2 |
| `MARICOPA_LOCAL_JSON` | Maricopa County PH | MCDPH Reportable Disease v1.0 |
| `TRIBAL_REFERRAL_JSON` | Tribal Health Authorities | Tribal Health v1 (sovereignty-preserving) |
| `VSPS_FORM_JSON` | USDA APHIS | VSPS Form 1-A (NLRAD Tier 1) v2024 |
| `AZ_ADA_JSON` | AZ Department of Agriculture | AZ State Vet Reportable v1.5 |
| `AZGFD_WILDLIFE_JSON` | AZ Game and Fish | AZGFD Wildlife Mortality v1.0 |

---

## Status query

```
GET /api/reports/{report_id}
```

Returns the current state of a previously submitted report including any callback questions and replies.

```json
{
  "report_id": "R-a1b2c3d4",
  "submitted_at": "2026-05-06T14:32:18.422Z",
  "deliveries": [
    {
      "destination_id": "adhs",
      "ack_id": "ACK-7A2F1E8B0420",
      "status": "callback_pending",
      "received_at": "2026-05-06T14:33:01.105Z",
      "callback": {
        "question": "Can you confirm patient's exact yard-work locations in the 14 days prior to onset?",
        "sent_by": "investigator:adhs-nakamura",
        "sent_at": "2026-05-06T16:42:11.002Z"
      }
    },
    ...
  ]
}
```

## Reply to a callback

```
POST /api/reports/{report_id}/deliveries/{destination_id}/reply
Content-Type: application/json

{
  "reply": "Patient reports yard-work at three sites: 4400 W Glendale Ave (4/1), 5821 N 67th Ave (3/29), 4233 W Cactus Rd (3/27). All ZIP 85301."
}
```

Returns 200 OK with the updated delivery state.

---

## Error responses

| HTTP | Meaning |
|---|---|
| `400 Bad Request` | The FHIR Bundle is malformed or missing required resources. The response body contains structured validation errors. |
| `401 Unauthorized` | OAuth2 token is missing, expired, or invalid. |
| `403 Forbidden` | The authenticated facility is not authorized to file reports for the specified jurisdiction. |
| `409 Conflict` | A duplicate report (same `Patient.id` + `Condition.code` + `onsetDateTime`) was filed within the last 24 hours. The response body contains the existing `report_id`. |
| `422 Unprocessable Entity` | The disease was recognized but is not currently configured as reportable in any destination jurisdiction. |
| `503 Service Unavailable` | One or more destination intake systems are temporarily unreachable. NotifiAZ will queue the report and retry; the response body indicates which destinations are queued. |

---

## Authentication

Production: OAuth2 Client Credentials flow. Each EHR vendor / clinical institution receives a `client_id` and `client_secret` from NotifiAZ. Tokens are short-lived (1 hour) and scoped to a specific facility.

MVP: No authentication. The MVP runs in-browser and uses `localStorage` for state.

---

## Versioning

API version is encoded in the URL path (`/v1/`). Breaking changes will trigger a new major version. Backward-compatible changes (new optional fields, new destinations) will not.

---

## Production deployment notes

This API contract is the *target*. Pre-requisites for going live:

1. ADHS-MEDSIS HL7 v2.5.1 ELR endpoint registration. ADHS provides per-facility API keys.
2. CDC NNDSS NMI v2 endpoint registration through SAMS authentication.
3. County health department endpoint registration (Pima County, Maricopa County PH each maintain a separate registration process).
4. Tribal health authority IRB review and partnership agreement, per authority.
5. USDA APHIS eAuthentication credentials for VSPS submission.
6. AZ State Veterinarian endpoint key.
7. AZGFD Wildlife Health Program endpoint key.

None of these are obtained for the MVP. The MVP exists to demonstrate the workflow and the contract; production deployment is a separate scope of work.
