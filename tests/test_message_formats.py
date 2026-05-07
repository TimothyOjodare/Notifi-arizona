"""
Validate that the JS-side message generators in app/reporter/messages/messages.js
produce well-formed output for the canonical case set.

We can't run JS from pytest directly, so this test executes the JS via Node
and validates the structure of the resulting messages.

Run: pytest tests/test_message_formats.py -v
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "app"
DATA_DIR = ROOT / "data"


def _run_node_eval(script: str) -> dict:
    """Execute a JS snippet in Node, with all our project's data loaded as
    `window` globals. Returns the JSON-parsed result.

    Writes a temp JS file (the data bundle is ~157KB so -e overflows argv)."""
    import tempfile
    bundle = (APP_DIR / "shared" / "data.js").read_text()
    messages_src = (APP_DIR / "reporter" / "messages" / "messages.js").read_text()

    wrapper = f"""
        // Polyfill window
        var window = {{}};
        // Load the data bundle
        {bundle}
        // Load the message generators
        {messages_src}
        // Execute the test snippet
        var result = (function() {{
            {script}
        }})();
        process.stdout.write(JSON.stringify(result));
    """
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(wrapper)
        temp_path = f.name
    try:
        proc = subprocess.run(["node", temp_path], capture_output=True, text=True, timeout=30)
        if proc.returncode != 0:
            raise RuntimeError(f"Node failed: {proc.stderr}")
        return json.loads(proc.stdout)
    finally:
        os.unlink(temp_path)


# -------------- Canonical case fixtures ---------------

@pytest.fixture(scope="module")
def patients():
    return json.loads((DATA_DIR / "synthetic" / "patients.json").read_text())


@pytest.fixture(scope="module")
def animals():
    return json.loads((DATA_DIR / "synthetic" / "animals.json").read_text())


@pytest.fixture(scope="module")
def providers():
    return json.loads((DATA_DIR / "synthetic" / "providers.json").read_text())


@pytest.fixture(scope="module")
def cocci_patient(patients):
    """The canonical Coccidioidomycosis patient — the demo's anchor case."""
    cands = [p for p in patients if p.get("active_problems")
             and p["active_problems"][0]["disease_id"] == "valley_fever"]
    assert cands, "Need at least one Valley Fever patient in the dataset"
    return cands[0]


# -------------- Top-level checks ---------------

def test_data_bundle_loadable():
    """The data bundle is well-formed JS."""
    import tempfile
    bundle = (APP_DIR / "shared" / "data.js").read_text()
    wrapper = f"""
        var window = {{}};
        {bundle}
        process.stdout.write(JSON.stringify({{
            patients: window.NA_DATA.patients.length,
            animals: window.NA_DATA.animals.length,
            diseases: window.NA_DATA.reportable_diseases.diseases.length
        }}));
    """
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(wrapper)
        path = f.name
    try:
        proc = subprocess.run(["node", path], capture_output=True, text=True)
        assert proc.returncode == 0, proc.stderr
        counts = json.loads(proc.stdout)
        assert counts["patients"] == 60
        assert counts["animals"] == 11
        assert counts["diseases"] == 72
    finally:
        os.unlink(path)


def test_adhs_elr_for_cocci(cocci_patient, providers):
    """ADHS ELR generator produces well-formed HL7 v2.5.1."""
    reporter = providers["clinicians"][0]   # Dr. Reyes
    result = _run_node_eval(f"""
        var subj = {json.dumps(cocci_patient)};
        var rep = {json.dumps(reporter)};
        return window.NA_MESSAGES.generateForDestination(subj, "valley_fever", rep, "adhs", "human");
    """)
    assert result["format"] == "HL7_v2_5_1_ELR"
    assert result["validation_errors"] == []
    assert result["ack_id"].startswith("ACK-")
    content = result["content"]
    # Verify required HL7 segments
    segments = [seg.split("|")[0] for seg in content.split("\r\n")]
    assert "MSH" in segments, "Missing MSH (message header)"
    assert "PID" in segments, "Missing PID (patient identification)"
    assert "ORC" in segments, "Missing ORC (common order)"
    assert "OBR" in segments, "Missing OBR (observation request)"
    # OBX segments are optional but should be present for Cocci with serology
    obx_count = segments.count("OBX")
    assert obx_count >= 1, f"Expected at least 1 OBX segment, found {obx_count}"
    # Verify field separator/encoding chars are correct
    msh = next(s for s in content.split("\r\n") if s.startswith("MSH"))
    assert msh[3] == "|", "MSH field separator must be |"


def test_cdc_nndss_for_cocci(cocci_patient, providers):
    """CDC NNDSS generator produces valid JSON with required fields."""
    reporter = providers["clinicians"][0]
    result = _run_node_eval(f"""
        var subj = {json.dumps(cocci_patient)};
        var rep = {json.dumps(reporter)};
        return window.NA_MESSAGES.generateForDestination(subj, "valley_fever", rep, "cdc_nndss", "human");
    """)
    assert result["format"] == "NNDSS_v2_HL7_FHIR"
    assert result["validation_errors"] == []
    obj = result["content_obj"]
    assert obj["messageType"] == "case_report"
    assert obj["sourceJurisdiction"] == "AZ"
    assert "conditionCode" in obj["condition"]
    assert obj["condition"]["conditionName"].startswith("Coccidioidomycosis") or obj["condition"]["conditionName"].startswith("Valley")
    assert "anonymizedId" in obj["subject"]
    assert "specVersion" in obj


def test_county_routing_for_maricopa_patient(patients, providers):
    """A Maricopa-county patient routes to county_maricopa correctly."""
    maricopa_patients = [p for p in patients
                         if p["address"]["county"] == "Maricopa"
                         and p.get("active_problems")
                         and p["active_problems"][0]["disease_id"] == "salmonellosis"]
    if not maricopa_patients:
        pytest.skip("No Maricopa Salmonellosis patient in this seed")
    p = maricopa_patients[0]
    reporter = providers["clinicians"][1]   # Dr. Patel at Banner Phoenix
    result = _run_node_eval(f"""
        var subj = {json.dumps(p)};
        var rep = {json.dumps(reporter)};
        return window.NA_MESSAGES.generateForDestination(subj, "salmonellosis", rep, "county_maricopa", "human");
    """)
    assert result["format"] == "MARICOPA_LOCAL_JSON"
    assert result["validation_errors"] == []
    assert result["content_obj"]["patient"]["address"]["county"] == "Maricopa"


def test_tribal_referral_preserves_sovereignty(patients, providers):
    """Tribal referral defaults to no-share-with-state."""
    tribal_patients = [p for p in patients if p.get("tribal_residency")]
    if not tribal_patients:
        pytest.skip("No tribal patient in this seed")
    p = tribal_patients[0]
    tribal_id = p["tribal_residency"]
    reporter = providers["clinicians"][0]
    if tribal_id not in ("tribal_apache", "tribal_navajo"):
        pytest.skip(f"Tribal {tribal_id} not in supported destinations")
    disease_id = p["active_problems"][0]["disease_id"] if p.get("active_problems") else "salmonellosis"
    result = _run_node_eval(f"""
        var subj = {json.dumps(p)};
        var rep = {json.dumps(reporter)};
        return window.NA_MESSAGES.generateForDestination(subj, "{disease_id}", rep, "{tribal_id}", "human");
    """)
    assert result["format"] == "TRIBAL_REFERRAL_JSON"
    obj = result["content_obj"]
    assert obj["consentToShareWithStateOfficials"] is False, \
        "Tribal referrals must default to no-share-with-state"
    assert obj["consentToShareWithCdc"] is False
    assert obj["tribalIrbReviewRequired"] is True


def test_aphis_vsps_for_animal(animals, providers):
    """USDA APHIS VSPS generator produces valid Form 1-A JSON."""
    rabies = [a for a in animals if a["active_problems"][0]["disease_id"] == "rabies_animal"]
    if not rabies:
        pytest.skip("No rabies_animal in this seed")
    a = rabies[0]
    vet = providers["veterinarians"][0]
    result = _run_node_eval(f"""
        var subj = {json.dumps(a)};
        var rep = {json.dumps(vet)};
        return window.NA_MESSAGES.generateForDestination(subj, "rabies_animal", rep, "usda_aphis", "animal");
    """)
    assert result["format"] == "VSPS_FORM_JSON"
    assert result["validation_errors"] == []
    obj = result["content_obj"]
    assert obj["formType"] == "VSPS_FORM_1A"
    assert obj["tier"] == "1"
    assert "premisesIdentifier" in obj["premises"]
    assert obj["premises"]["state"] == "AZ"


def test_no_destination_returns_unknown(cocci_patient, providers):
    """An unknown destination returns format=UNKNOWN with errors."""
    reporter = providers["clinicians"][0]
    result = _run_node_eval(f"""
        var subj = {json.dumps(cocci_patient)};
        var rep = {json.dumps(reporter)};
        return window.NA_MESSAGES.generateForDestination(subj, "valley_fever", rep, "fake_destination", "human");
    """)
    assert result["format"] == "UNKNOWN"
    assert len(result["validation_errors"]) > 0


def test_animal_to_human_destination_rejects(animals, providers):
    """An animal subject sent to NNDSS (human-only) must be rejected."""
    rabies = [a for a in animals if a["active_problems"][0]["disease_id"] == "rabies_animal"]
    if not rabies:
        pytest.skip("No rabies_animal")
    a = rabies[0]
    vet = providers["veterinarians"][0]
    # Try sending an animal to CDC NNDSS (which only handles human)
    result = _run_node_eval(f"""
        var subj = {json.dumps(a)};
        var rep = {json.dumps(vet)};
        return window.NA_MESSAGES.generateForDestination(subj, "rabies_animal", rep, "cdc_nndss", "animal");
    """)
    # Should hit the UNKNOWN path
    assert result["format"] == "UNKNOWN"


def test_cross_species_adhs_for_zoonotic_animal(animals, providers):
    """A zoonotic animal disease reporting to ADHS produces a cross-species ELR."""
    plague = [a for a in animals if a["active_problems"][0]["disease_id"] == "plague" and not a.get("is_wildlife")]
    if not plague:
        pytest.skip("No non-wildlife plague animal")
    a = plague[0]
    vet = providers["veterinarians"][0]
    result = _run_node_eval(f"""
        var subj = {json.dumps(a)};
        var rep = {json.dumps(vet)};
        return window.NA_MESSAGES.generateForDestination(subj, "plague", rep, "adhs", "animal");
    """)
    assert result["format"] == "HL7_v2_5_1_ELR"
    assert result["validation_errors"] == []
    # Cross-species notification — content should reference the cross-species nature
    assert "cross-species" in result["content"].lower() or "non-human" in result["content"].lower(), \
        "Cross-species notifications must be flagged in the message content"


def test_all_canonical_destinations_yield_some_output():
    """Smoke test: every supported destination produces non-empty content for a valid case."""
    # Use a Maricopa patient with multiple destinations
    patients = json.loads((DATA_DIR / "synthetic" / "patients.json").read_text())
    providers = json.loads((DATA_DIR / "synthetic" / "providers.json").read_text())
    cocci = next((p for p in patients
                  if p.get("active_problems")
                  and p["active_problems"][0]["disease_id"] == "valley_fever"
                  and p["address"]["county"] == "Maricopa"),
                 None) or next(p for p in patients if p.get("active_problems") and p["active_problems"][0]["disease_id"] == "valley_fever")
    reporter = providers["clinicians"][0]
    HUMAN_DESTS = ["adhs", "cdc_nndss", "county_pima", "county_maricopa"]
    for dest in HUMAN_DESTS:
        result = _run_node_eval(f"""
            var subj = {json.dumps(cocci)};
            var rep = {json.dumps(reporter)};
            return window.NA_MESSAGES.generateForDestination(subj, "valley_fever", rep, "{dest}", "human");
        """)
        assert result["content"], f"Destination {dest} produced no content"
        assert result["ack_id"], f"Destination {dest} produced no ack_id"
