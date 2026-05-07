"""
Generate providers (clinicians + vets) and investigators (agency staff)
for the NotifiAZ demo.

Outputs:
  - 6 clinicians across 6 hospitals
  - 4 veterinarians across 4 vet practices
  - 10 investigators across 9 destination agencies

Plus an agency manifest with endpoint URLs and message-format specs
that the message generators reference.

Seed: 42. Reproducible.
"""

import json
from pathlib import Path

HERE = Path(__file__).parent
DATA_DIR = HERE.parent.parent / "data"

CLINICIANS = [
    {"id": "dr-reyes", "name": "Dr. Maria Reyes", "credential": "MD", "specialty": "Internal Medicine",
     "facility_id": "tmc", "facility_name": "Tucson Medical Center", "npi": "1234567890"},
    {"id": "dr-patel", "name": "Dr. Anika Patel", "credential": "MD", "specialty": "Family Medicine",
     "facility_id": "banner-phx", "facility_name": "Banner Health Phoenix", "npi": "1234567891"},
    {"id": "dr-okafor", "name": "Dr. James Okafor", "credential": "MD", "specialty": "Infectious Disease",
     "facility_id": "banner-mesa", "facility_name": "Banner Health Mesa", "npi": "1234567892"},
    {"id": "dr-nguyen", "name": "Dr. Linda Nguyen", "credential": "DO", "specialty": "Family Medicine",
     "facility_id": "honor", "facility_name": "HonorHealth Scottsdale", "npi": "1234567893"},
    {"id": "dr-tsosie", "name": "Dr. Anthony Tsosie", "credential": "MD", "specialty": "Internal Medicine",
     "facility_id": "ihs-whiteriver", "facility_name": "IHS Whiteriver Service Unit", "npi": "1234567894"},
    {"id": "dr-rodriguez", "name": "Dr. Michael Rodriguez", "credential": "MD", "specialty": "Emergency Medicine",
     "facility_id": "naz", "facility_name": "Northern AZ Healthcare", "npi": "1234567895"},
]

VETERINARIANS = [
    {"id": "dr-cho", "name": "Dr. Hannah Cho", "credential": "DVM", "specialty": "Companion Animal",
     "facility_id": "tcv-tucson", "facility_name": "Tucson Companion-Animal Vet"},
    {"id": "dr-greer", "name": "Dr. Sarah Greer", "credential": "DVM", "specialty": "Specialty / Exotic",
     "facility_id": "phx-vet", "facility_name": "Phoenix Veterinary Specialists"},
    {"id": "dr-lawson", "name": "Dr. Robert Lawson", "credential": "DVM", "specialty": "Large Animal",
     "facility_id": "pinal-large", "facility_name": "Pinal Large Animal Veterinary"},
    {"id": "dr-sandoval", "name": "Dr. Elena Sandoval", "credential": "DVM", "specialty": "Mixed Practice",
     "facility_id": "cochise-vet", "facility_name": "Cochise County Veterinary"},
]

# Agency investigators — these are who CONSUMES the reports we send
INVESTIGATORS = [
    {"id": "adhs-nakamura", "name": "Dr. Lisa Nakamura", "credential": "MD MPH",
     "agency_id": "adhs", "agency_name": "Arizona Department of Health Services",
     "role": "State Epidemiologist"},
    {"id": "adhs-yazzie", "name": "Dr. Marcus Yazzie", "credential": "MPH",
     "agency_id": "adhs", "agency_name": "Arizona Department of Health Services",
     "role": "Disease Surveillance Coordinator"},
    {"id": "cdc-chen", "name": "Dr. Sarah Chen", "credential": "MD MPH",
     "agency_id": "cdc_nndss", "agency_name": "CDC National Notifiable Diseases Surveillance System",
     "role": "Surveillance Officer"},
    {"id": "pima-johnson", "name": "Karen Johnson", "credential": "MPH",
     "agency_id": "county_pima", "agency_name": "Pima County Health Department",
     "role": "Senior Epidemiologist"},
    {"id": "maricopa-davis", "name": "Robert Davis", "credential": "MPH",
     "agency_id": "county_maricopa", "agency_name": "Maricopa County Department of Public Health",
     "role": "Outbreak Investigator"},
    {"id": "tribal-apache-begay", "name": "Marie Begay", "credential": "MPH RN",
     "agency_id": "tribal_apache", "agency_name": "Apache Tribal Health Authority",
     "role": "Tribal Public Health Coordinator"},
    {"id": "tribal-navajo-nez", "name": "Dr. Helen Nez", "credential": "MD",
     "agency_id": "tribal_navajo", "agency_name": "Navajo Nation Department of Health",
     "role": "Director of Disease Surveillance"},
    {"id": "aphis-miller", "name": "Dr. James Miller", "credential": "DVM",
     "agency_id": "usda_aphis", "agency_name": "USDA APHIS Veterinary Services",
     "role": "Area Veterinarian-in-Charge — AZ"},
    {"id": "ada-thompson", "name": "Dr. Kate Thompson", "credential": "DVM",
     "agency_id": "az_ada", "agency_name": "Arizona Department of Agriculture",
     "role": "Assistant State Veterinarian"},
    {"id": "agfd-wright", "name": "Dr. David Wright", "credential": "DVM PhD",
     "agency_id": "az_gfd", "agency_name": "Arizona Game and Fish Department",
     "role": "Wildlife Health Program Manager"},
]

# Agency manifest — the destinations the reporter routes to.
# Each entry tells the message generator what format the agency expects
# and (for production) what endpoint URL to POST to.
AGENCIES = [
    {"id": "adhs", "name": "Arizona Department of Health Services",
     "short_name": "ADHS", "kind": "state_health",
     "endpoint": "https://medsis.azdhs.gov/api/v2/elr",
     "message_format": "HL7_v2_5_1_ELR",
     "spec_version": "CDC ELR IG r1.1 + AZ ADHS local extensions",
     "auth": "X-API-Key (ADHS-issued, per-facility)",
     "ack_typical_minutes": 2,
     "supports_callback": True},

    {"id": "cdc_nndss", "name": "CDC National Notifiable Diseases Surveillance System",
     "short_name": "CDC NNDSS", "kind": "federal",
     "endpoint": "https://nndss.cdc.gov/api/v3/case-reports",
     "message_format": "NNDSS_v2_HL7_FHIR",
     "spec_version": "NNDSS Modernization Initiative v2 (MMG-aligned)",
     "auth": "OAuth2 (SAMS-authenticated)",
     "ack_typical_minutes": 15,
     "supports_callback": False},

    {"id": "county_pima", "name": "Pima County Health Department",
     "short_name": "Pima County PH", "kind": "county_health",
     "endpoint": "https://pcph.pima.gov/api/disease-reports",
     "message_format": "PIMA_LOCAL_JSON",
     "spec_version": "Pima County PH v1.2",
     "auth": "Basic (county-issued)",
     "ack_typical_minutes": 30,
     "supports_callback": True,
     "applies_to_county": "Pima"},

    {"id": "county_maricopa", "name": "Maricopa County Department of Public Health",
     "short_name": "Maricopa County PH", "kind": "county_health",
     "endpoint": "https://mcdph.maricopa.gov/api/v2/case-reports",
     "message_format": "MARICOPA_LOCAL_JSON",
     "spec_version": "MCDPH Reportable Disease v1.0",
     "auth": "OAuth2",
     "ack_typical_minutes": 20,
     "supports_callback": True,
     "applies_to_county": "Maricopa"},

    {"id": "tribal_apache", "name": "Apache Tribal Health Authority",
     "short_name": "Apache Tribal Health", "kind": "tribal",
     "endpoint": "https://atha.health/api/disease-referrals",
     "message_format": "TRIBAL_REFERRAL_JSON",
     "spec_version": "Tribal Health v1 (sovereignty-preserving)",
     "auth": "Tribal IRB-approved credentials",
     "ack_typical_minutes": 60,
     "supports_callback": True,
     "applies_to_tribe": "tribal_apache",
     "data_share_default": "decline"},  # explicit no-share-with-state by default

    {"id": "tribal_navajo", "name": "Navajo Nation Department of Health",
     "short_name": "Navajo Nation Health", "kind": "tribal",
     "endpoint": "https://navajonsn.gov/health/api/disease-referrals",
     "message_format": "TRIBAL_REFERRAL_JSON",
     "spec_version": "NNDH Reportable Disease v2",
     "auth": "Navajo Nation IRB credentials",
     "ack_typical_minutes": 60,
     "supports_callback": True,
     "applies_to_tribe": "tribal_navajo",
     "data_share_default": "decline"},

    {"id": "usda_aphis", "name": "USDA APHIS Veterinary Services",
     "short_name": "USDA APHIS", "kind": "federal_animal",
     "endpoint": "https://vsps.aphis.usda.gov/api/animal-disease-reports",
     "message_format": "VSPS_FORM_JSON",
     "spec_version": "VSPS Form 1-A (NLRAD Tier 1) v2024",
     "auth": "USDA eAuthentication",
     "ack_typical_minutes": 10,
     "supports_callback": True},

    {"id": "az_ada", "name": "Arizona Department of Agriculture",
     "short_name": "AZ ADA", "kind": "state_animal",
     "endpoint": "https://agriculture.az.gov/api/state-vet/disease-reports",
     "message_format": "AZ_ADA_JSON",
     "spec_version": "AZ State Vet Reportable v1.5",
     "auth": "X-API-Key",
     "ack_typical_minutes": 15,
     "supports_callback": True},

    {"id": "az_gfd", "name": "Arizona Game and Fish Department",
     "short_name": "AZ G&F", "kind": "wildlife",
     "endpoint": "https://www.azgfd.com/api/wildlife-health/reports",
     "message_format": "AZGFD_WILDLIFE_JSON",
     "spec_version": "AZGFD Wildlife Mortality v1.0",
     "auth": "X-API-Key",
     "ack_typical_minutes": 240,
     "supports_callback": True},
]


def main():
    output = {
        "clinicians": CLINICIANS,
        "veterinarians": VETERINARIANS,
        "investigators": INVESTIGATORS,
        "agencies": AGENCIES,
    }
    out = DATA_DIR / "synthetic" / "providers.json"
    out.write_text(json.dumps(output, indent=2))
    print(f"Wrote providers → {out}")
    print(f"  Clinicians: {len(CLINICIANS)} across {len({c['facility_id'] for c in CLINICIANS})} hospitals")
    print(f"  Veterinarians: {len(VETERINARIANS)} across {len({v['facility_id'] for v in VETERINARIANS})} practices")
    print(f"  Investigators: {len(INVESTIGATORS)} across {len({i['agency_id'] for i in INVESTIGATORS})} agencies")
    print(f"  Agency destinations: {len(AGENCIES)} (each with endpoint + message format)")


if __name__ == "__main__":
    main()
