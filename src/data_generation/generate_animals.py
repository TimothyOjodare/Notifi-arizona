"""
Generate 25 synthetic animals across Arizona for the NotifiAZ demo.

11 of them have a reportable animal disease.
10 of those 11 are zoonotic — they trigger the cross-species ADHS bridge.

Each animal carries:
  - Owner / household demographics
  - Veterinary practice assignment
  - Encounters with HPI, exam, vitals, assessment, plan
  - Active conditions
  - Lab results

Seed: 42. Reproducible.
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
rng = random.Random(SEED + 1)  # offset from patients

HERE = Path(__file__).parent
DATA_DIR = HERE.parent.parent / "data"
DISEASE_DB = json.load(open(DATA_DIR / "reference" / "reportable_diseases_us.json"))

# Veterinary practices
VET_PRACTICES = [
    {"id": "tcv-tucson",   "name": "Tucson Companion-Animal Vet",     "city": "Tucson",   "county": "Pima"},
    {"id": "phx-vet",      "name": "Phoenix Veterinary Specialists",  "city": "Phoenix",  "county": "Maricopa"},
    {"id": "pinal-large",  "name": "Pinal Large Animal Veterinary",   "city": "Casa Grande", "county": "Pinal"},
    {"id": "cochise-vet",  "name": "Cochise County Veterinary",       "city": "Sierra Vista", "county": "Cochise"},
]

# Animal diseases — drawn from the disease DB, mix of zoonotic + non-zoonotic
ANIMAL_DISEASES = [
    ("valley_fever",         "canine",    4),  # zoonotic awareness, but doesn't transmit dog-to-human
    ("brucellosis",          "canine",    1),  # zoonotic
    ("plague",               "feline",    1),  # zoonotic
    ("rabies_animal",        "canine",    1),  # zoonotic, immediate
    ("anthrax",              "bovine",    1),  # zoonotic, immediate
    ("vesicular_stomatitis", "equine",    1),  # ADA reportable
    ("avian_influenza",      "avian",     1),  # zoonotic
    ("plague",               "wildlife",  1),  # prairie dog die-off — AGFD
]

# Owner names + addresses (a subset will overlap with patients to demo cross-species)
OWNER_SURNAMES = ["Hernandez", "Patel", "Rodriguez", "Smith", "Begay",
                  "Johnson", "Garcia", "Tsosie", "Cooper", "Reed",
                  "Brown", "Davis", "Martinez", "Gonzalez", "Lopez"]


def _build_animal(rng, disease_id, species, idx):
    practice = rng.choice(VET_PRACTICES)
    surname = rng.choice(OWNER_SURNAMES)
    given = rng.choice(["Maria", "Carlos", "Anika", "James", "Linda", "Robert", "Anthony", "Jennifer"])
    visit_date = datetime(2026, 4, 15) - timedelta(days=rng.randint(1, 21))

    is_wildlife = species == "wildlife"
    if is_wildlife:
        owner = {"name": "AZ Game and Fish Department", "address": {"city": practice["city"], "state": "AZ", "county": practice["county"]}}
        animal_name = "wild population"
        animal_id = f"AZGFD-{visit_date.strftime('%Y%m%d')}-{rng.randint(1000,9999)}"
    else:
        owner = {
            "name": f"{given} {surname}",
            "address": {"line": [f"{rng.randint(100,9999)} W {rng.choice(['Ina','Speedway','Camelback','Glendale'])} Rd"],
                        "city": practice["city"], "state": "AZ", "postalCode": rng.choice(["85716","85003","85225","85635"]),
                        "county": practice["county"]},
            "phone": f"({'520' if practice['county'] == 'Pima' else '602'}) 555-{rng.randint(1000,9999):04d}",
        }
        animal_name = rng.choice({
            "canine": ["Rocco", "Bella", "Max", "Daisy", "Luna", "Charlie", "Cooper", "Buddy"],
            "feline": ["Whiskers", "Mittens", "Shadow", "Felix", "Tiger"],
            "bovine": ["Bessie", "#427", "#102", "Rosa"],
            "equine": ["Thunder", "Star", "Dakota"],
            "avian": ["Hen 12", "Hen 47", "Rooster A"],
        }.get(species, ["Animal A"]))
        animal_id = f"A-{uuid.UUID(int=rng.getrandbits(128)).hex[:8]}"

    disease = next(d for d in DISEASE_DB["diseases"] if d["disease_id"] == disease_id)

    HPI_TEMPLATES = {
        ("valley_fever", "canine"): "{name} is a {age}-year-old {breed} presenting with persistent cough x 3 weeks, weight loss 8 lb, lethargy. Lives in southern AZ desert environment. Yard has loose soil. Frequent digger.",
        ("brucellosis", "canine"): "{name} is a 4-year-old breeding kennel sire with epididymitis, infertility issues over the past breeding season. Two dam pregnancies failed. Routine pre-breeding screen requested.",
        ("plague", "feline"): "{name} is an outdoor cat presenting with sudden lethargy, fever, painful submandibular swelling. Owner reports cat brings dead rodents home. Lives in northern AZ.",
        ("rabies_animal", "canine"): "Stray dog brought in by animal control after biting a child. Aggressive, drooling, ataxic. No rabies vaccination history. Specimen submitted to AZ State Vet Diagnostic Lab.",
        ("anthrax", "bovine"): "Sudden death of 3 head of cattle in a 24-hour period in Cochise County herd. Bloody discharge from natural orifices. Pasture had recent flooding event. Necropsy contraindicated; field samples submitted.",
        ("vesicular_stomatitis", "equine"): "Quarter horse with vesicular lesions on muzzle and tongue, drooling, refusing feed. Two other horses in same paddock now showing lesions.",
        ("avian_influenza", "avian"): "Backyard flock with sudden mortality — 12 of 45 birds dead within 48 hours. Remaining birds depressed, decreased egg production, neurological signs. Wild bird traffic in area.",
        ("plague", "wildlife"): "Prairie dog die-off observed at Coronado National Forest site. ~47 dead animals over 2-week period. Specimens submitted to USGS National Wildlife Health Center for Y. pestis testing.",
    }
    breeds = {"canine": rng.choice(["Labrador mix", "German Shepherd", "Border Collie", "Australian Shepherd"]),
              "feline": "DSH", "bovine": "Angus cross", "equine": "Quarter Horse", "avian": "Backyard mixed flock"}
    hpi = HPI_TEMPLATES.get((disease_id, species), f"Confirmed {disease['common_name']}.").format(
        name=animal_name, age=rng.randint(2, 9), breed=breeds.get(species, ""))

    is_lethal = disease_id in ["rabies_animal", "anthrax", "avian_influenza"] or (disease_id == "plague" and species == "wildlife")

    return {
        "animal_id": animal_id,
        "name": animal_name,
        "species": species,
        "owner": owner,
        "facility_id": practice["id"],
        "facility_name": practice["name"],
        "encounter_date": visit_date.strftime("%Y-%m-%d"),
        "chief_complaint": _animal_chief(disease_id, species),
        "hpi": hpi,
        "exam": {"temp_f": round(101.5 + rng.uniform(-1.0, 2.5), 1),
                 "hr": rng.randint(80, 140), "rr": rng.randint(20, 40)},
        "assessment": f"Confirmed {disease['common_name']}. ICD-10 {disease.get('icd10','—')}. SCT {disease.get('snomed_ct','—')}.",
        "plan": _animal_plan(disease_id, species),
        "active_problems": [{
            "name": disease["common_name"],
            "icd10": disease.get("icd10", ""),
            "snomed": disease.get("snomed_ct", ""),
            "is_reportable": True,
            "disease_id": disease_id,
            "is_zoonotic": disease.get("is_zoonotic", False),
            "lethal": is_lethal,
        }],
        "lab_results": _animal_labs(rng, disease_id),
        "is_wildlife": is_wildlife,
    }


def _animal_chief(d, sp):
    return {
        ("valley_fever", "canine"): "Chronic cough, weight loss",
        ("brucellosis", "canine"): "Pre-breeding screen, abortion history",
        ("plague", "feline"): "Acute lethargy, lymphadenopathy",
        ("rabies_animal", "canine"): "Bite incident, neurological signs",
        ("anthrax", "bovine"): "Sudden death event in herd",
        ("vesicular_stomatitis", "equine"): "Vesicular oral lesions",
        ("avian_influenza", "avian"): "Sudden flock mortality",
        ("plague", "wildlife"): "Wildlife die-off observed",
    }.get((d, sp), "Disease workup")


def _animal_plan(d, sp):
    return {
        ("valley_fever", "canine"): "Fluconazole 5mg/kg PO daily x 6-12 months. Recheck titer at 8 weeks.",
        ("brucellosis", "canine"): "Confirmed by RSAT + tube agglutination. Spay/neuter recommended; long-term doxycycline+rifampin if breeding kennel value preserved. Report to ADA.",
        ("plague", "feline"): "Hospitalized in isolation. Streptomycin or gentamicin x 7-10 days. Public health notified per Y. pestis ELISA.",
        ("rabies_animal", "canine"): "Animal euthanized for testing. AZ State Vet Lab notified. Post-exposure prophylaxis arranged for bite victim.",
        ("anthrax", "bovine"): "Field carcasses left intact (no necropsy). Pasture quarantined. Surviving herd vaccinated. Ag Department + APHIS notified.",
        ("vesicular_stomatitis", "equine"): "Premises quarantined. Affected horses isolated. Reported to AZ State Vet + USDA APHIS.",
        ("avian_influenza", "avian"): "Flock depopulated. Premises disinfected. APHIS HPAI response activated. ADHS notified for human-exposure surveillance.",
        ("plague", "wildlife"): "Site posted with warning signs. Flea control on prairie dog colonies. USGS + ADHS coordinating.",
    }.get((d, sp), "Per protocol.")


def _animal_labs(rng, d):
    LABS = {
        "valley_fever": [{"name": "Coccidioides AGID", "value": "Positive 1:32", "abnormal": True}],
        "brucellosis": [{"name": "Brucella RSAT", "value": "Positive", "abnormal": True}],
        "plague": [{"name": "Y. pestis F1 antigen", "value": "Positive", "abnormal": True}],
        "rabies_animal": [{"name": "DFA brain stem", "value": "Positive — pending state lab confirmation", "abnormal": True}],
        "anthrax": [{"name": "B. anthracis culture", "value": "Pending", "abnormal": True}],
        "vesicular_stomatitis": [{"name": "VSV PCR", "value": "Positive — Indiana serotype", "abnormal": True}],
        "avian_influenza": [{"name": "AI matrix PCR", "value": "Positive H5", "abnormal": True}],
    }
    return LABS.get(d, [])


def main():
    animals = []
    for disease_id, species, count in ANIMAL_DISEASES:
        for i in range(count):
            animals.append(_build_animal(rng, disease_id, species, i))

    rng.shuffle(animals)
    out = DATA_DIR / "synthetic" / "animals.json"
    out.write_text(json.dumps(animals, indent=2))
    print(f"Wrote {len(animals)} animals → {out}")
    print(f"  Reportable: {sum(1 for a in animals if a['active_problems'][0]['is_reportable'])}")
    print(f"  Zoonotic: {sum(1 for a in animals if a['active_problems'][0]['is_zoonotic'])}")
    print(f"  Wildlife: {sum(1 for a in animals if a['is_wildlife'])}")
    print(f"  Practices represented: {len({a['facility_id'] for a in animals})}")


if __name__ == "__main__":
    main()
