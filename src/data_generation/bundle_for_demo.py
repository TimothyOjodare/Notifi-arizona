"""
Bundle the synthetic data into a single JS file the front-end can load
without a server.

Output: app/shared/data.js — sets `window.NA_DATA = {patients, animals,
providers, seed_reports, reportable_diseases}`.
"""

import json
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
DATA_DIR = ROOT / "data"
APP_DIR = ROOT / "app"


def main():
    patients = json.load(open(DATA_DIR / "synthetic" / "patients.json"))
    animals = json.load(open(DATA_DIR / "synthetic" / "animals.json"))
    providers = json.load(open(DATA_DIR / "synthetic" / "providers.json"))
    seed_reports = json.load(open(DATA_DIR / "synthetic" / "seed_reports.json"))
    diseases = json.load(open(DATA_DIR / "reference" / "reportable_diseases_us.json"))

    bundle = {
        "patients": patients,
        "animals": animals,
        "providers": providers,
        "seed_reports": seed_reports,
        "reportable_diseases": diseases,
    }

    js = "window.NA_DATA = " + json.dumps(bundle, default=str) + ";\n"
    out = APP_DIR / "shared" / "data.js"
    out.write_text(js)
    size_kb = len(js) / 1024
    print(f"Wrote {out} ({size_kb:.1f} KB)")
    print(f"  Patients: {len(patients)}  Animals: {len(animals)}  Reports: {len(seed_reports)}")
    print(f"  Reference diseases: {len(diseases['diseases'])}")


if __name__ == "__main__":
    main()
