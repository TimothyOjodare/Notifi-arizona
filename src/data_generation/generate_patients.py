"""
Generate 60 synthetic patients across Arizona for the NotifiAZ demo.

50 of them have a reportable disease that needs to be filed.
10 are non-reportable (control / noise).

Each patient carries:
  - Demographics (FHIR Patient shape)
  - One or more encounters (FHIR Encounter)
  - Active conditions (with reportable disease lookup)
  - Lab results (LOINC + value + abnormal flag)
  - Provider assignment (which clinician at which institution)

Seed: 42. Reproducible.
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
rng = random.Random(SEED)

HERE = Path(__file__).parent
DATA_DIR = HERE.parent.parent / "data"
DISEASE_DB = json.load(open(DATA_DIR / "reference" / "reportable_diseases_us.json"))

# AZ surnames + given names (calibrated to AZ demographics)
SURNAMES = [
    "Garcia", "Martinez", "Rodriguez", "Hernandez", "Lopez", "Gonzalez", "Sanchez",
    "Smith", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson",
    "Tsosie", "Begay", "Yazzie", "Benally", "Nez", "Becenti",
    "Garcia-Lopez", "Mendez", "Vasquez", "Castillo", "Rivera", "Ramirez",
    "Cooper", "Reed", "Bailey", "Bell", "Murphy", "Cox", "Howard",
    "Ortiz", "Morales", "Reyes", "Cruz", "Flores", "Gomez", "Diaz",
]
GIVEN_F = ["Maria", "Sofia", "Ana", "Isabel", "Carmen", "Lucia", "Elena", "Rosa",
           "Patricia", "Linda", "Susan", "Karen", "Lisa", "Nancy", "Sandra",
           "Aiyana", "Dezbah", "Naya", "Yanaha", "Doli",
           "Aisha", "Jessica", "Ashley", "Emily", "Rebecca"]
GIVEN_M = ["Carlos", "Jose", "Luis", "Miguel", "Juan", "Antonio", "Pedro", "Diego",
           "James", "John", "Robert", "Michael", "William", "David", "Richard",
           "Hosteen", "Kee", "Shilah", "Atsidi", "Bidziil",
           "Daniel", "Christopher", "Matthew", "Anthony"]

# AZ cities + ZIPs + counties (real)
AZ_LOCATIONS = [
    ("Tucson",        "85716", "Pima"),
    ("Tucson",        "85710", "Pima"),
    ("Tucson",        "85745", "Pima"),
    ("Phoenix",       "85003", "Maricopa"),
    ("Phoenix",       "85015", "Maricopa"),
    ("Phoenix",       "85032", "Maricopa"),
    ("Mesa",          "85201", "Maricopa"),
    ("Scottsdale",    "85251", "Maricopa"),
    ("Glendale",      "85301", "Maricopa"),
    ("Chandler",      "85225", "Maricopa"),
    ("Flagstaff",     "86001", "Coconino"),
    ("Yuma",          "85364", "Yuma"),
    ("Prescott",      "86301", "Yavapai"),
    ("Sierra Vista",  "85635", "Cochise"),
    ("Tempe",         "85281", "Maricopa"),
    ("Whiteriver",    "85941", "Apache"),     # tribal — Apache reservation
    ("Window Rock",   "86515", "Apache"),     # tribal — Navajo Nation capital
    ("Tuba City",     "86045", "Coconino"),   # tribal — Navajo Nation
    ("San Carlos",    "85550", "Gila"),       # tribal — San Carlos Apache
    ("Sells",         "85634", "Pima"),       # tribal — Tohono O'odham
    ("Casa Grande",   "85122", "Pinal"),
]

# Reportable diseases to use in the synthetic patient population.
# Drawn directly from the 72-disease database. Mix of high-volume + rare to
# show routing breadth. Skewed toward AZ-relevant.
PATIENT_DISEASES = [
    ("valley_fever",         12),  # AZ #1
    ("salmonellosis",         6),
    ("pertussis",             4),
    ("tb_active",             3),
    ("rmsf",                  4),
    ("hantavirus",            1),
    ("west_nile",             3),
    ("plague",                1),
    ("brucellosis",           2),
    ("measles",               2),
    ("gonorrhea",             4),
    ("syphilis",              3),
    ("lyme",                  1),
    ("q_fever",               1),
    ("typhoid",               1),
    ("rabies_human",          1),
    ("ehrlichiosis",          1),
]
# Total: 50 reportable patients. Plus 10 non-reportable.

# Healthcare institutions for clinician assignment
INSTITUTIONS = [
    {"id": "tmc",          "name": "Tucson Medical Center",       "type": "hospital", "city": "Tucson",     "county": "Pima"},
    {"id": "banner-phx",   "name": "Banner Health Phoenix",       "type": "hospital", "city": "Phoenix",    "county": "Maricopa"},
    {"id": "banner-mesa",  "name": "Banner Health Mesa",          "type": "hospital", "city": "Mesa",       "county": "Maricopa"},
    {"id": "honor",        "name": "HonorHealth Scottsdale",      "type": "hospital", "city": "Scottsdale", "county": "Maricopa"},
    {"id": "ihs-whiteriver","name": "IHS Whiteriver Service Unit","type": "hospital", "city": "Whiteriver", "county": "Apache"},
    {"id": "naz",          "name": "Northern AZ Healthcare",      "type": "hospital", "city": "Flagstaff",  "county": "Coconino"},
]


def _county_to_lhd(county: str) -> str:
    """County → local health department destination ID."""
    return f"county_{county.lower()}"


def _is_tribal_residency(city: str) -> tuple[bool, str | None]:
    """Returns (is_tribal, tribal_authority_id)."""
    tribal_map = {
        "Whiteriver": "tribal_apache",
        "Window Rock": "tribal_navajo",
        "Tuba City": "tribal_navajo",
        "San Carlos": "tribal_apache",
        "Sells": "tribal_tohono_oodham",
    }
    if city in tribal_map:
        return True, tribal_map[city]
    return False, None


def _make_demographics(rng: random.Random, sex: str = None) -> dict:
    sex = sex or rng.choice(["female", "male"])
    given = rng.choice(GIVEN_F if sex == "female" else GIVEN_M)
    family = rng.choice(SURNAMES)
    age = rng.randint(2, 88)
    today = datetime(2026, 4, 15)
    dob = today - timedelta(days=age * 365 + rng.randint(0, 364))
    city, zip_code, county = rng.choice(AZ_LOCATIONS)
    is_tribal, tribal_auth = _is_tribal_residency(city)
    street_no = rng.randint(100, 9999)
    streets = ["E Speedway Blvd", "N Country Club Rd", "W Camelback Rd", "S Stone Ave",
               "N Central Ave", "E Broadway Blvd", "W Ina Rd", "N Oracle Rd",
               "E Grant Rd", "S Park Ave", "W Glendale Ave", "E McDowell Rd"]
    street = rng.choice(streets)

    return {
        "patient_id": f"P-{uuid.UUID(int=rng.getrandbits(128)).hex[:8]}",
        "name": {"family": family, "given": [given]},
        "sex": sex,
        "birthDate": dob.strftime("%Y-%m-%d"),
        "age": age,
        "address": {
            "line": [f"{street_no} {street}"],
            "city": city,
            "state": "AZ",
            "postalCode": zip_code,
            "county": county,
        },
        "phone": f"(520) 555-{rng.randint(1000, 9999):04d}" if county == "Pima" else f"(602) 555-{rng.randint(1000, 9999):04d}",
        "tribal_residency": tribal_auth,  # None or e.g. "tribal_apache"
        "race": rng.choices(
            ["white", "hispanic", "amerindian", "black", "asian"],
            weights=[35, 35, 18, 6, 6],  # AZ-calibrated
            k=1
        )[0],
        "ethnicity": "hispanic" if rng.random() < 0.32 else "non_hispanic",
    }


def _build_encounter(rng: random.Random, patient: dict, disease_id: str | None) -> dict:
    """Build a clinical encounter for a patient. If disease_id given, build
    around that diagnosis. Otherwise build a routine visit."""
    visit_date = datetime(2026, 4, 15) - timedelta(days=rng.randint(1, 21))
    institution = rng.choice(INSTITUTIONS)
    encounter_id = f"E-{uuid.UUID(int=rng.getrandbits(128)).hex[:8]}"

    if disease_id is None:
        return {
            "encounter_id": encounter_id,
            "date": visit_date.strftime("%Y-%m-%d"),
            "facility_id": institution["id"],
            "facility_name": institution["name"],
            "type": "outpatient",
            "chief_complaint": rng.choice([
                "Annual physical", "Med refill", "BP follow-up", "Diabetes follow-up"
            ]),
            "hpi": "Patient is in their usual state of health. Routine follow-up visit.",
            "exam": {"temp_f": round(98.6 + rng.uniform(-0.4, 0.4), 1),
                     "hr": rng.randint(60, 90), "rr": rng.randint(12, 16),
                     "spo2": rng.randint(96, 99), "bp": f"{rng.randint(110, 130)}/{rng.randint(70, 84)}"},
            "assessment": "Routine. No acute issues.",
            "plan": "Continue current regimen. Return PRN.",
            "icd10_codes": [],
        }

    # Reportable disease encounter
    disease = next(d for d in DISEASE_DB["diseases"] if d["disease_id"] == disease_id)
    common = disease["common_name"]

    HPI_TEMPLATES = {
        "valley_fever": "{age}-year-old {sex} from {city} presenting with progressive cough x {weeks} weeks, low-grade fever, fatigue, night sweats. Reports significant exposure to wind-blown soil dust during recent yard work. No skin rash. Lives in cocci-endemic region.",
        "salmonellosis": "{age}-year-old {sex} with 3-day history of acute gastroenteritis: watery diarrhea, abdominal cramping, fever to 102. Recent church potluck attendance with potato salad. Several other attendees also ill.",
        "pertussis": "{age}-year-old {sex} with paroxysmal cough x 2 weeks, post-tussive emesis, characteristic 'whoop'. Unvaccinated child sibling at home. Mother also has cough.",
        "tb_active": "{age}-year-old {sex} with chronic cough x 6 weeks, weight loss 12 lb, night sweats, low-grade fever. Recent immigration from endemic region. Household contacts identified.",
        "hepatitis_c_OLD": "{age}-year-old {sex} with abnormal LFTs found on routine screening. Risk factors include history of IDU. Currently asymptomatic.",
        "rmsf": "{age}-year-old {sex} with fever, headache, myalgias x 5 days. Maculopapular rash on wrists and ankles, now spreading to trunk. Recent hiking in eastern AZ. Tick exposure reported.",
        "hantavirus": "{age}-year-old {sex} with abrupt fever, myalgias, then progressive dyspnea over 48 hours. Recent rodent exposure cleaning out cabin in northern AZ. Now hypoxic, requires admission.",
        "west_nile": "{age}-year-old {sex} with fever, headache, fatigue, faint maculopapular rash. Lives in Pinal County (current mosquito anomaly). No recent travel.",
        "plague": "{age}-year-old {sex} with sudden fever, painful inguinal lymphadenopathy. Reports flea bites and dead prairie dogs on property in Coconino County. Suspected bubonic plague.",
        "brucellosis": "{age}-year-old {sex} with intermittent fever, night sweats, arthralgia x 4 weeks. Cattle rancher in Cochise County. Reports consumption of raw milk from own herd.",
        "measles": "{age}-year-old {sex} with fever, cough, coryza, conjunctivitis x 3 days, now with maculopapular rash starting at hairline. Unvaccinated. Recent international travel.",
        "gonorrhea": "{age}-year-old {sex} with dysuria and purulent urethral discharge x 5 days. Multiple recent sexual partners. Requesting STI screen.",
        "syphilis": "{age}-year-old {sex} with painless genital ulcer noted 3 weeks ago, now resolved. Now with diffuse maculopapular rash including palms and soles. RPR ordered.",
        "lyme": "{age}-year-old {sex} with erythema migrans, fatigue, arthralgias. Recent travel to Northeast US.",
        "q_fever": "{age}-year-old {sex} with fever, severe headache, hepatitis x 2 weeks. Goat farmer. Recent kidding season with placenta exposure.",
    }
    template = HPI_TEMPLATES.get(disease_id, f"{{age}}-year-old {{sex}} with confirmed {common}.")
    sex_word = "woman" if patient["sex"] == "female" else "man"
    hpi = template.format(
        age=patient["age"], sex=sex_word, city=patient["address"]["city"],
        weeks=rng.randint(2, 6),
    )

    is_severe = rng.random() < 0.12
    return {
        "encounter_id": encounter_id,
        "date": visit_date.strftime("%Y-%m-%d"),
        "facility_id": institution["id"],
        "facility_name": institution["name"],
        "type": "inpatient" if is_severe else "outpatient",
        "chief_complaint": _chief_for(disease_id),
        "hpi": hpi,
        "exam": _exam_for(rng, disease_id, is_severe),
        "assessment": f"Confirmed {common}. ICD-10 {disease['icd10']}. SCT {disease['snomed_ct']}.",
        "plan": _plan_for(disease_id),
        "icd10_codes": [disease["icd10"]],
        "snomed_codes": [disease["snomed_ct"]],
        "disease_id": disease_id,
        "is_hospitalized": is_severe,
    }


def _chief_for(d: str) -> str:
    return {
        "valley_fever": "Cough, fever, fatigue x weeks",
        "salmonellosis": "Acute gastroenteritis, fever",
        "pertussis": "Persistent paroxysmal cough",
        "tb_active": "Chronic cough, weight loss",
        "hepatitis_c_OLD": "Abnormal LFTs",
        "rmsf": "Fever, rash, recent tick exposure",
        "hantavirus": "Acute respiratory distress",
        "west_nile": "Fever, headache, rash",
        "plague": "Fever, lymphadenopathy",
        "brucellosis": "Recurrent fever, raw milk exposure",
        "measles": "Fever, rash, unvaccinated",
        "gonorrhea": "Dysuria, urethral discharge",
        "syphilis": "Painless ulcer, rash",
        "lyme": "Erythema migrans, arthralgia",
        "q_fever": "Fever, hepatitis, livestock exposure",
    }.get(d, "Disease workup")


def _plan_for(d: str) -> str:
    plans = {
        "valley_fever": "Fluconazole 400mg daily x 3-6 months. Repeat serology in 4 weeks. ID consult if disseminated.",
        "salmonellosis": "Supportive care, oral rehydration. Stool culture confirmed. Antibiotics not indicated unless severe.",
        "pertussis": "Azithromycin 500mg x 1 day, then 250mg x 4 days. Family contacts to receive prophylaxis.",
        "tb_active": "RIPE therapy initiated. Respiratory isolation. Contact tracing through ADHS TB program.",
        "hepatitis_c_OLD": "DAA therapy: glecaprevir/pibrentasvir x 8 weeks. HCV RNA at week 4 and 12 post-treatment.",
        "rmsf": "Doxycycline 100mg BID x 7-14 days. Continue until afebrile x 3 days.",
        "hantavirus": "ICU admission. Supportive care, mechanical ventilation as needed. Ribavirin not effective.",
        "west_nile": "Supportive care. Most cases self-limited. Monitor for neuroinvasive disease.",
        "plague": "Streptomycin 1g IM BID x 10 days OR doxycycline. Hospital isolation.",
        "brucellosis": "Doxycycline 100mg BID + rifampin 600mg daily x 6 weeks.",
        "measles": "Supportive care, vitamin A. Airborne isolation. Contact tracing critical.",
        "gonorrhea": "Ceftriaxone 500mg IM single dose. Test for chlamydia coinfection. Partner notification.",
        "syphilis": "Benzathine penicillin G 2.4M units IM. Confirm with VDRL and FTA-ABS. Partner notification.",
        "lyme": "Doxycycline 100mg BID x 14-21 days.",
        "q_fever": "Doxycycline 100mg BID x 14 days. Echocardiogram to evaluate for endocarditis.",
    }
    return plans.get(d, "Per protocol.")


def _exam_for(rng: random.Random, disease_id: str, severe: bool) -> dict:
    base_temp = 100.4 + rng.uniform(-1.0, 1.6)
    return {
        "temp_f": round(base_temp + (1.5 if severe else 0), 1),
        "hr": rng.randint(85, 110) + (15 if severe else 0),
        "rr": rng.randint(16, 22) + (8 if severe else 0),
        "spo2": rng.randint(93, 99) - (10 if severe else 0),
        "bp": f"{rng.randint(110, 138)}/{rng.randint(72, 88)}",
    }


def _labs_for(rng: random.Random, disease_id: str) -> list[dict]:
    """Generate plausible labs for the disease."""
    labs = []
    DISEASE_LABS = {
        "valley_fever": [
            {"name": "Coccidioides IgM", "loinc": "31718-7", "value": "Positive", "abnormal": True},
            {"name": "Coccidioides IgG", "loinc": "31708-8", "value": "Positive 1:64", "abnormal": True},
        ],
        "salmonellosis": [
            {"name": "Stool culture", "loinc": "625-4", "value": "Salmonella enterica subsp enterica", "abnormal": True},
        ],
        "pertussis": [
            {"name": "B. pertussis PCR", "loinc": "23826-1", "value": "Positive", "abnormal": True},
        ],
        "tb_active": [
            {"name": "AFB smear", "loinc": "10717-9", "value": "3+ acid-fast bacilli", "abnormal": True},
            {"name": "MTB PCR", "loinc": "38379-4", "value": "Positive", "abnormal": True},
            {"name": "Chest X-ray", "loinc": "36643-5", "value": "Upper-lobe cavitary lesion", "abnormal": True},
        ],
        "hepatitis_c_OLD": [
            {"name": "HCV antibody", "loinc": "13955-0", "value": "Reactive", "abnormal": True},
            {"name": "HCV RNA", "loinc": "11011-4", "value": "1,200,000 IU/mL", "abnormal": True},
            {"name": "ALT", "loinc": "1742-6", "value": "142", "unit": "U/L", "abnormal": True},
        ],
        "rmsf": [
            {"name": "Rickettsia rickettsii IgG", "loinc": "31093-5", "value": "1:128", "abnormal": True},
        ],
        "hantavirus": [
            {"name": "Hantavirus IgM", "loinc": "30178-5", "value": "Positive", "abnormal": True},
        ],
        "west_nile": [
            {"name": "WNV IgM (CSF)", "loinc": "31739-3", "value": "Positive", "abnormal": True},
        ],
        "plague": [
            {"name": "Y. pestis F1 antigen", "loinc": "29615-9", "value": "Positive", "abnormal": True},
        ],
        "brucellosis": [
            {"name": "Brucella agglutinin", "loinc": "5057-1", "value": "1:320", "abnormal": True},
        ],
        "measles": [
            {"name": "Measles IgM", "loinc": "22501-1", "value": "Positive", "abnormal": True},
            {"name": "Measles PCR", "loinc": "48508-6", "value": "Detected", "abnormal": True},
        ],
        "gonorrhea": [
            {"name": "GC NAAT", "loinc": "21416-3", "value": "Positive", "abnormal": True},
        ],
        "syphilis": [
            {"name": "RPR", "loinc": "20507-0", "value": "1:32", "abnormal": True},
            {"name": "FTA-ABS", "loinc": "5292-4", "value": "Reactive", "abnormal": True},
        ],
        "lyme": [
            {"name": "B. burgdorferi IgG/IgM", "loinc": "29575-5", "value": "Positive", "abnormal": True},
        ],
        "q_fever": [
            {"name": "C. burnetii Phase II IgG", "loinc": "31064-6", "value": "1:1024", "abnormal": True},
        ],
    }
    return DISEASE_LABS.get(disease_id, [])


def _exposure_for(rng: random.Random, disease_id: str, patient: dict) -> dict:
    """Build an exposure-history block for the disease (key for ADHS field completeness)."""
    EXPOSURE_TEMPLATES = {
        "valley_fever": {
            "soil_dust_exposure": True,
            "occupation": rng.choice(["Construction", "Agricultural worker", "Landscaping", "Office worker"]),
            "recent_travel": rng.choice(["No", "Visited Phoenix metro", "No"]),
        },
        "salmonellosis": {
            "food_exposure": rng.choice(["Church potluck — potato salad", "Restaurant chicken", "Home-cooked eggs"]),
            "ill_contacts": rng.randint(0, 4),
            "recent_travel": "No",
        },
        "pertussis": {
            "vaccination_status": "Unknown — adult Tdap >10 years ago",
            "household_contacts": rng.randint(2, 5),
            "child_contacts_under_5": rng.choice([True, True, False]),
        },
        "tb_active": {
            "country_of_origin": rng.choice(["Mexico", "Philippines", "Vietnam", "USA"]),
            "household_contacts": rng.randint(2, 6),
            "occupation_healthcare": rng.choice([False, False, True]),
        },
        "rmsf": {
            "tick_exposure": "Yes — eastern AZ hiking",
            "outdoor_activity": True,
            "geographic_area": "Apache-Sitgreaves National Forest",
        },
        "hantavirus": {
            "rodent_exposure": "Yes — cleaning rural cabin",
            "geographic_area": "Coconino County",
        },
        "west_nile": {
            "mosquito_exposure": "Yes",
            "outdoor_activity_evening": True,
            "geographic_area": patient["address"]["county"] + " County",
        },
        "plague": {
            "flea_exposure": "Yes",
            "rodent_die_off_observed": "Yes — prairie dogs on property",
            "geographic_area": "Northern AZ",
        },
        "brucellosis": {
            "raw_milk_consumption": "Yes — own herd",
            "occupation": "Cattle rancher",
            "animal_contact": "Daily — cattle",
        },
        "measles": {
            "vaccination_status": "Unvaccinated",
            "recent_travel": "International",
            "school_or_daycare_contact": True,
        },
        "gonorrhea": {
            "n_sexual_partners_3mo": rng.randint(2, 6),
            "condom_use": rng.choice(["Sometimes", "Rarely", "Never"]),
        },
        "syphilis": {
            "n_sexual_partners_3mo": rng.randint(1, 4),
            "msm_status": rng.choice([True, False]),
        },
        "q_fever": {
            "occupation": "Goat farmer",
            "kidding_season_exposure": True,
        },
    }
    return EXPOSURE_TEMPLATES.get(disease_id, {})


def main():
    patients = []

    # 50 reportable patients
    for disease_id, count in PATIENT_DISEASES:
        for _ in range(count):
            p = _make_demographics(rng)
            enc = _build_encounter(rng, p, disease_id)
            p["encounters"] = [enc]
            p["active_problems"] = [{
                "icd10": enc["icd10_codes"][0],
                "snomed": enc["snomed_codes"][0],
                "name": next(d["common_name"] for d in DISEASE_DB["diseases"] if d["disease_id"] == disease_id),
                "onset_date": (datetime.strptime(enc["date"], "%Y-%m-%d") - timedelta(days=rng.randint(2, 14))).strftime("%Y-%m-%d"),
                "status": "active",
                "is_reportable": True,
                "disease_id": disease_id,
            }]
            p["medications"] = []
            p["lab_results"] = _labs_for(rng, disease_id)
            p["exposure_history"] = _exposure_for(rng, disease_id, p)
            p["contacts"] = rng.randint(0, 5)  # Total household + close contacts
            p["occupation"] = p.get("exposure_history", {}).get("occupation", "Not documented")
            patients.append(p)

    # 10 non-reportable controls
    for _ in range(10):
        p = _make_demographics(rng)
        enc = _build_encounter(rng, p, None)
        p["encounters"] = [enc]
        p["active_problems"] = []
        p["medications"] = []
        p["lab_results"] = []
        p["exposure_history"] = {}
        p["contacts"] = 0
        p["occupation"] = "Various"
        patients.append(p)

    rng.shuffle(patients)
    out = DATA_DIR / "synthetic" / "patients.json"
    out.write_text(json.dumps(patients, indent=2))
    print(f"Wrote {len(patients)} patients → {out}")
    print(f"  Reportable: {sum(1 for p in patients if p['active_problems'])}")
    print(f"  Hospitalized: {sum(1 for p in patients if p['encounters'][0].get('is_hospitalized'))}")
    print(f"  Tribal residency: {sum(1 for p in patients if p['tribal_residency'])}")
    print(f"  Counties represented: {len({p['address']['county'] for p in patients})}")


if __name__ == "__main__":
    main()
