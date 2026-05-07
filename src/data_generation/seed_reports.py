"""
Seed 12 pre-loaded reports across all 5 lifecycle states so the demo has
rich state when it loads:

  submitted       — 4 reports (just sent, not yet acked)
  received        — 3 reports (agency confirmed receipt)
  callback_pending — 2 reports (agency sent a question, waiting on clinician)
  reply_received  — 1 report (clinician replied, awaiting closure)
  closed          — 2 reports (case closed)

These give the investigator console an inbox to work with on first load and
let the clinician's "my filed reports" view show non-empty state.

Seed: 42. Reproducible.
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
rng = random.Random(SEED + 2)

HERE = Path(__file__).parent
DATA_DIR = HERE.parent.parent / "data"
NOW = datetime(2026, 5, 6, 14, 0, 0)


def _ack(): return f"ACK-{uuid.UUID(int=rng.getrandbits(128)).hex[:10].upper()}"


def _make_report(reporter_id, subject_id, subject_kind, disease_id, destinations,
                 state_pattern, days_ago):
    """
    state_pattern: one of:
      "submitted"          — 1 destination at submitted
      "partial_received"   — 2 of 3 destinations received, 1 still submitted
      "all_received"
      "callback"           — at least one destination has callback_pending
      "reply_received"
      "closed"
    """
    submitted_at = NOW - timedelta(days=days_ago, hours=rng.randint(0, 12))
    deliveries = []
    for d in destinations:
        delivery = {
            "destination_id": d,
            "ack_id": _ack(),
            "submitted_at": submitted_at.isoformat(),
            "state": "submitted",
        }
        # Apply state pattern to this delivery
        if state_pattern == "all_received" or state_pattern in ("callback", "reply_received", "closed"):
            delivery["state"] = "received"
            delivery["received_at"] = (submitted_at + timedelta(minutes=rng.randint(2, 60))).isoformat()
            delivery["received_by"] = "agency_intake_system"
        if state_pattern == "partial_received" and rng.random() < 0.66:
            delivery["state"] = "received"
            delivery["received_at"] = (submitted_at + timedelta(minutes=rng.randint(2, 60))).isoformat()
            delivery["received_by"] = "agency_intake_system"
        if state_pattern == "callback":
            # one destination gets a callback
            if d == destinations[0]:
                delivery["state"] = "callback_pending"
                delivery["callback"] = {
                    "question": _CALLBACK_QUESTIONS.get(disease_id, "Please confirm exposure history details."),
                    "sent_by": "investigator",
                    "sent_at": (submitted_at + timedelta(hours=rng.randint(2, 24))).isoformat(),
                }
        if state_pattern == "reply_received":
            if d == destinations[0]:
                delivery["state"] = "reply_received"
                delivery["callback"] = {
                    "question": _CALLBACK_QUESTIONS.get(disease_id, "Please confirm exposure history."),
                    "sent_by": "investigator",
                    "sent_at": (submitted_at + timedelta(hours=4)).isoformat(),
                    "reply": "Confirmed: patient reports yard-work soil-dust exposure 7 days prior to onset; no recent travel; no household contacts symptomatic at this time.",
                    "replied_by": "clinician",
                    "replied_at": (submitted_at + timedelta(hours=8)).isoformat(),
                }
        if state_pattern == "closed":
            delivery["state"] = "closed"
            delivery["received_at"] = (submitted_at + timedelta(minutes=10)).isoformat()
            delivery["received_by"] = "agency_intake_system"
            delivery["closed_at"] = (submitted_at + timedelta(days=rng.randint(2, 7))).isoformat()
            delivery["closed_by"] = "investigator"
            delivery["closure_note"] = _CLOSURE_NOTES.get(disease_id, "Case investigation complete. Closed.")
        deliveries.append(delivery)

    return {
        "report_id": f"R-{uuid.UUID(int=rng.getrandbits(128)).hex[:8]}",
        "reporter_id": reporter_id,
        "subject_id": subject_id,
        "subject_kind": subject_kind,   # "human" | "animal"
        "disease_id": disease_id,
        "submitted_at": submitted_at.isoformat(),
        "deliveries": deliveries,
    }


_CALLBACK_QUESTIONS = {
    "valley_fever": "Can you confirm patient's specific occupational soil-dust exposure timing? We're tracking a Pinal County cluster and need a 14-day exposure window.",
    "salmonellosis": "Was this case associated with the church potluck on April 21? Three other reports name same event.",
    "pertussis": "Has the household received post-exposure prophylaxis? Confirm vaccination status of children under 5 in the household.",
    "tb_active": "Confirm contact-tracing list submitted to ADHS TB program. We need NEXUS-format contact list.",
    "rmsf": "Patient's exact tick-exposure location — coordinates if possible — for vector mapping.",
    "measles": "Vaccination history of all household contacts and dates of any out-of-state travel by patient in the 21 days before onset.",
    "plague": "Patient's exact residence GPS for flea-control coordination with AGFD prairie-dog die-off site.",
    "hantavirus": "Confirm rodent-exposure location and any other people who shared the cabin.",
}

_CLOSURE_NOTES = {
    "valley_fever": "Case confirmed. No further investigation required. Patient enrolled in cocci registry. Cluster of 3 in zip code monitored.",
    "salmonellosis": "Outbreak source identified (church potluck). 11 cases linked. Closed.",
    "pertussis": "Household prophylaxis administered. School notified. Closed.",
    "gonorrhea": "Partner notification complete. Treatment confirmed. Closed.",
}


def main():
    patients = json.load(open(DATA_DIR / "synthetic" / "patients.json"))
    animals = json.load(open(DATA_DIR / "synthetic" / "animals.json"))
    providers = json.load(open(DATA_DIR / "synthetic" / "providers.json"))
    diseases = json.load(open(DATA_DIR / "reference" / "reportable_diseases_us.json"))["diseases"]

    by_disease_h = {p["active_problems"][0]["disease_id"]: p for p in patients if p["active_problems"]}
    by_disease_a = {a["active_problems"][0]["disease_id"] + "_" + a["species"]: a for a in animals}

    def _human_dest(disease_id, patient):
        d = next((d for d in diseases if d["disease_id"] == disease_id), None)
        if not d: return []
        dests_raw = d["human_reporting"]["destinations"]
        out = []
        county = patient["address"]["county"]
        for dest in dests_raw:
            if dest == "adhs": out.append("adhs")
            elif dest == "cdc_nndss": out.append("cdc_nndss")
            elif dest == "local_health_dept":
                cid = f"county_{county.lower()}"
                if cid in {a["id"] for a in providers["agencies"]}:
                    out.append(cid)
            elif dest == "tribal_if_applicable":
                if patient.get("tribal_residency"):
                    out.append(patient["tribal_residency"])
        return out

    def _animal_dest(animal):
        d = next((d for d in diseases if d["disease_id"] == animal["active_problems"][0]["disease_id"]), None)
        if not d or not d.get("animal_reporting"): return []
        dests_raw = d["animal_reporting"].get("destinations", [])
        out = []
        for dest in dests_raw:
            if dest == "ada": out.append("az_ada")
            elif dest == "aphis": out.append("usda_aphis")
            elif dest == "azgfd" or animal["is_wildlife"]: out.append("az_gfd")
            elif dest == "adhs_cross_species": out.append("adhs")
        if animal["active_problems"][0].get("is_zoonotic") and "adhs" not in out:
            out.append("adhs")
        return list(dict.fromkeys(out))   # dedupe

    reports = []

    # 4 submitted (just-sent state)
    for d_id in ["valley_fever", "salmonellosis", "pertussis", "rmsf"]:
        p = by_disease_h.get(d_id)
        if not p: continue
        dests = _human_dest(d_id, p)
        if dests:
            reports.append(_make_report("dr-reyes", p["patient_id"], "human", d_id, dests, "submitted", days_ago=0))

    # 3 received
    for d_id in ["measles", "syphilis", "gonorrhea"]:
        p = by_disease_h.get(d_id)
        if not p: continue
        dests = _human_dest(d_id, p)
        if dests:
            reports.append(_make_report("dr-patel", p["patient_id"], "human", d_id, dests, "all_received", days_ago=2))

    # 2 callback_pending
    for d_id in ["valley_fever", "tb_active"]:
        # Use a different patient for the second valley fever report
        candidates = [p for p in patients if p["active_problems"] and p["active_problems"][0]["disease_id"] == d_id]
        if not candidates: continue
        p = candidates[-1] if d_id == "valley_fever" else candidates[0]
        dests = _human_dest(d_id, p)
        if dests:
            reports.append(_make_report("dr-okafor", p["patient_id"], "human", d_id, dests, "callback", days_ago=3))

    # 1 reply_received
    p = by_disease_h.get("hantavirus")
    if p:
        dests = _human_dest("hantavirus", p)
        if dests:
            reports.append(_make_report("dr-rodriguez", p["patient_id"], "human", "hantavirus", dests, "reply_received", days_ago=4))

    # 2 closed
    for d_id in ["salmonellosis", "pertussis"]:
        candidates = [p for p in patients if p["active_problems"] and p["active_problems"][0]["disease_id"] == d_id]
        if len(candidates) >= 2:
            p = candidates[1]   # second one (first is in submitted)
            dests = _human_dest(d_id, p)
            if dests:
                reports.append(_make_report("dr-nguyen", p["patient_id"], "human", d_id, dests, "closed", days_ago=10))

    # Bonus: 2 animal reports for variety
    rabies_animal = next((a for a in animals if a["active_problems"][0]["disease_id"] == "rabies_animal"), None)
    if rabies_animal:
        dests = _animal_dest(rabies_animal)
        reports.append(_make_report("dr-cho", rabies_animal["animal_id"], "animal", "rabies_animal", dests, "callback", days_ago=1))

    plague_wildlife = next((a for a in animals if a["is_wildlife"]), None)
    if plague_wildlife:
        dests = _animal_dest(plague_wildlife)
        reports.append(_make_report("dr-lawson", plague_wildlife["animal_id"], "animal",
                                    plague_wildlife["active_problems"][0]["disease_id"], dests, "all_received", days_ago=2))

    out = DATA_DIR / "synthetic" / "seed_reports.json"
    out.write_text(json.dumps(reports, indent=2))
    print(f"Wrote {len(reports)} seed reports → {out}")
    state_counts = {}
    for r in reports:
        for d in r["deliveries"]:
            state_counts[d["state"]] = state_counts.get(d["state"], 0) + 1
    print(f"  Delivery states: {state_counts}")
    print(f"  Cross-species (animal+ADHS): {sum(1 for r in reports if r['subject_kind']=='animal' and any(d['destination_id']=='adhs' for d in r['deliveries']))}")


if __name__ == "__main__":
    main()
