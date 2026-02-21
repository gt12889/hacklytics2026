"""RxGuard configuration — API settings, target drug classes, and pipeline constants."""

import os

# ── openFDA API ──────────────────────────────────────────────────────────────
FDA_BASE_URL = "https://api.fda.gov/drug/event.json"
FDA_API_KEY = os.getenv("FDA_API_KEY", "")
# Treat common placeholders as "no key"
if FDA_API_KEY.strip().lower() in {"yourapikeyhere", "", "none", "null"}:
    FDA_API_KEY = ""

# Rate limits (requests per minute)
RATE_LIMIT_WITH_KEY = 240
RATE_LIMIT_WITHOUT_KEY = 40
RATE_LIMIT = RATE_LIMIT_WITH_KEY if FDA_API_KEY else RATE_LIMIT_WITHOUT_KEY

# Pagination
PAGE_LIMIT = 100          # max results per request (openFDA cap)
MAX_SKIP = 26000          # openFDA caps skip at ~26000

# Per-drug target: how many reports to try to pull per drug
REPORTS_PER_DRUG = 2000

# ── Target drug classes / names ──────────────────────────────────────────────
# Top 50 drugs/drug-classes chosen for high interaction potential (from blueprint
# Section 12 test queries + common interacting classes).
TARGET_DRUGS = [
    # Blood thinners / anticoagulants
    "warfarin",
    "heparin",
    "enoxaparin",
    "rivaroxaban",
    "apixaban",
    # NSAIDs
    "ibuprofen",
    "naproxen",
    "aspirin",
    "diclofenac",
    "celecoxib",
    # SSRIs / antidepressants
    "fluoxetine",
    "sertraline",
    "paroxetine",
    "citalopram",
    "escitalopram",
    # Statins
    "simvastatin",
    "atorvastatin",
    "rosuvastatin",
    "pravastatin",
    # ACE inhibitors
    "lisinopril",
    "enalapril",
    "ramipril",
    # Beta blockers
    "metoprolol",
    "atenolol",
    "propranolol",
    # Diabetes
    "metformin",
    "insulin",
    "glipizide",
    # Cardiac
    "digoxin",
    "amiodarone",
    "diltiazem",
    "verapamil",
    # Antibiotics / anti-infectives
    "clarithromycin",
    "erythromycin",
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
    "metronidazole",
    # Corticosteroids
    "prednisone",
    "dexamethasone",
    # Pain / opioids
    "tramadol",
    "oxycodone",
    # Immunosuppressants / chemotherapy
    "methotrexate",
    "cyclosporine",
    # Psychiatric
    "lithium",
    # MAO inhibitors
    "phenelzine",
    "tranylcypromine",
    # Diuretics
    "spironolactone",
    "furosemide",
    "hydrochlorothiazide",
]

# ── Paths ────────────────────────────────────────────────────────────────────
DATA_RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
DATA_PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "data", "processed")

# ── FAERS fields of interest ─────────────────────────────────────────────────
# Top-level fields to extract from each result record
FIELDS_OF_INTEREST = [
    "safetyreportid",
    "safetyreportversion",
    "receivedate",
    "serious",
    "seriousnessdeath",
    "seriousnesshospitalization",
    "seriousnesslifethreatening",
    "seriousnessdisabling",
    "seriousnessother",
    "occurcountry",
]
