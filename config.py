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

# Per-pair target: how many reports to try to pull per interaction pair
REPORTS_PER_PAIR = 1000

# ── Interaction pairs ────────────────────────────────────────────────────────
# 50 high-risk drug interaction pairs chosen from blueprint test queries
# + common clinically significant interactions.
INTERACTION_PAIRS = [
    # From test queries (Q1-Q10)
    ("warfarin", "ibuprofen"),              # Q1: major bleeding
    ("methotrexate", "ibuprofen"),          # Q2: renal failure
    ("methotrexate", "naproxen"),           # Q2 variant
    ("lithium", "lisinopril"),              # Q3: lithium toxicity
    ("lithium", "enalapril"),               # Q3 variant
    ("fluoxetine", "tramadol"),             # Q4: serotonin syndrome
    ("sertraline", "tramadol"),             # Q4 variant
    ("paroxetine", "tramadol"),             # Q4 variant
    ("simvastatin", "clarithromycin"),      # Q5: rhabdomyolysis
    ("simvastatin", "erythromycin"),        # Q5 variant
    ("digoxin", "amiodarone"),              # Q9: digoxin toxicity
    ("ciprofloxacin", "prednisone"),        # Q10: tendon rupture
    ("levofloxacin", "prednisone"),         # Q10 variant
    ("levofloxacin", "dexamethasone"),      # Q10 variant
    ("spironolactone", "lisinopril"),       # Q8: hyperkalemia
    ("spironolactone", "enalapril"),        # Q8 variant
    # Brand name test coverage (Q11-14 = same pairs above)
    ("atorvastatin", "clarithromycin"),     # Q13: Lipitor+Biaxin
    # Demographic test coverage (Q19-20)
    ("metformin", "lisinopril"),            # Q19
    # Additional high-risk interactions
    ("warfarin", "aspirin"),                # bleeding risk
    ("warfarin", "naproxen"),              # bleeding risk
    ("warfarin", "celecoxib"),              # bleeding risk
    ("warfarin", "sertraline"),             # SSRI + anticoagulant
    ("warfarin", "fluoxetine"),             # SSRI + anticoagulant
    ("warfarin", "amiodarone"),             # INR elevation
    ("warfarin", "metronidazole"),          # INR elevation
    ("digoxin", "verapamil"),               # digoxin toxicity
    ("digoxin", "diltiazem"),               # digoxin toxicity
    ("digoxin", "clarithromycin"),          # digoxin toxicity
    ("cyclosporine", "methotrexate"),       # immunosuppression
    ("metformin", "furosemide"),            # lactic acidosis
    ("metformin", "enalapril"),             # hypoglycemia/renal
    ("metformin", "ciprofloxacin"),         # Q16: blood sugar
    ("insulin", "ciprofloxacin"),           # Q16 variant
    ("insulin", "levofloxacin"),            # Q16 variant
    ("atorvastatin", "erythromycin"),       # rhabdomyolysis
    ("rosuvastatin", "clarithromycin"),     # rhabdomyolysis
    ("citalopram", "tramadol"),             # serotonin syndrome
    ("escitalopram", "tramadol"),           # serotonin syndrome
    ("phenelzine", "fluoxetine"),           # Q7: MAO+SSRI
    ("phenelzine", "sertraline"),           # Q7 variant
    ("metoprolol", "verapamil"),            # bradycardia
    ("propranolol", "insulin"),             # masks hypoglycemia
    ("ibuprofen", "lisinopril"),            # reduced BP control
    ("ibuprofen", "furosemide"),            # reduced diuretic effect
    ("aspirin", "heparin"),                 # bleeding
    ("oxycodone", "diazepam"),              # resp. depression
    ("prednisone", "ibuprofen"),            # GI bleeding
    ("amiodarone", "simvastatin"),          # rhabdomyolysis
    ("diltiazem", "simvastatin"),           # rhabdomyolysis
    ("clarithromycin", "digoxin"),          # digoxin toxicity (reversed)
    ("hydrochlorothiazide", "lithium"),     # lithium toxicity
]

# Flat list of unique drug names (derived from pairs) for V1 search compatibility
TARGET_DRUGS = sorted(set(d for pair in INTERACTION_PAIRS for d in pair))

# ── Paths ────────────────────────────────────────────────────────────────────
DATA_RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
DATA_PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "data", "processed")

# ── Actian VectorAI DB ──────────────────────────────────────────────────
VECTORDB_ADDRESS = os.getenv("VECTORDB_ADDRESS", "localhost:50051")
VECTORDB_COLLECTION = "faers_reports"
VECTORDB_LABELS_COLLECTION = "dailymed_labels"  # Separate namespace for drug labels
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384
VECTORDB_BATCH_SIZE = 500   # vectors per batch_upsert call
HNSW_EF_SEARCH = 100        # higher = more accurate search

# ── FAERS fields of interest ─────────────────────────────────────────────────
# Top-level fields to extract from each result record
FIELDS_OF_INTEREST = [
    "safetyreportid",
    "safetyreportversion",
    "serious",
    "seriousnessdeath",
    "seriousnesshospitalization",
    "seriousnesslifethreatening",
]
