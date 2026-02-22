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
REPORTS_PER_PAIR = 200

# ── Batch pipeline settings ─────────────────────────────────────────────────
# How many pairs to fetch per run (keeps each run under ~5 minutes).
# The pipeline automatically skips already-fetched pairs and appends new ones.
PAIRS_PER_RUN = 5

# ── Interaction pairs ────────────────────────────────────────────────────────
# Priority pairs: these match the preset suggestion queries shown to users.
# They are fetched FIRST so the app has data for the demo scenarios.
PRIORITY_PAIRS = [
    ("warfarin", "ibuprofen"),              # suggestion: bleeding risk
    ("warfarin", "aspirin"),                # suggestion: bleeding risk
    ("metformin", "lisinopril"),            # suggestion: renal/hypoglycemia
    ("warfarin", "naproxen"),              # suggestion: bleeding risk
    ("warfarin", "diclofenac"),            # suggestion: bleeding risk
    ("fluoxetine", "tramadol"),             # suggestion: serotonin syndrome
    ("simvastatin", "clarithromycin"),      # suggestion: rhabdomyolysis
    ("lithium", "lisinopril"),              # suggestion: lithium toxicity
    ("digoxin", "amiodarone"),              # suggestion: digoxin toxicity
    ("ciprofloxacin", "prednisone"),        # suggestion: tendon rupture
]

# Full list: all high-risk interaction pairs for background loading.
# Pipeline fetches PRIORITY_PAIRS first, then works through the rest.
INTERACTION_PAIRS = PRIORITY_PAIRS + [
    # Additional pairs (fetched after priority pairs are done)
    ("methotrexate", "ibuprofen"),          # renal failure
    ("methotrexate", "naproxen"),           # renal failure variant
    ("lithium", "enalapril"),               # lithium toxicity variant
    ("sertraline", "tramadol"),             # serotonin syndrome
    ("paroxetine", "tramadol"),             # serotonin syndrome
    ("simvastatin", "erythromycin"),        # rhabdomyolysis
    ("levofloxacin", "prednisone"),         # tendon rupture
    ("levofloxacin", "dexamethasone"),      # tendon rupture
    ("spironolactone", "lisinopril"),       # hyperkalemia
    ("spironolactone", "enalapril"),        # hyperkalemia
    ("atorvastatin", "clarithromycin"),     # Lipitor+Biaxin
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
    ("metformin", "ciprofloxacin"),         # blood sugar
    ("insulin", "ciprofloxacin"),           # blood sugar variant
    ("insulin", "levofloxacin"),            # blood sugar variant
    ("atorvastatin", "erythromycin"),       # rhabdomyolysis
    ("rosuvastatin", "clarithromycin"),     # rhabdomyolysis
    ("citalopram", "tramadol"),             # serotonin syndrome
    ("escitalopram", "tramadol"),           # serotonin syndrome
    ("phenelzine", "fluoxetine"),           # MAO+SSRI
    ("phenelzine", "sertraline"),           # MAO+SSRI
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
