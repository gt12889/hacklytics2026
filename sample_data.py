"""
Sample FAERS Data for Testing
Contains mock case reports matching the example query
"""
from data_models import FAERSCase

def get_sample_cases() -> list[FAERSCase]:
    """Return sample FAERS cases for testing"""
    return [
        FAERSCase(
            case_id="FAERS-001",
            drugs=["warfarin", "ibuprofen"],
            age=67,
            sex="female",
            conditions=["atrial fibrillation", "osteoarthritis"],
            outcome_severity="hospitalization",
            description="67F on chronic warfarin therapy for AFib, prescribed ibuprofen 400mg for osteoarthritis. Presented to ER 9 days later with melena and hemoglobin of 6.2. INR was 8.3. Required 4 units pRBC transfusion.",
            faers_matches=4231
        ),
        FAERSCase(
            case_id="FAERS-002",
            drugs=["warfarin", "ibuprofen", "metformin"],
            age=65,
            sex="female",
            conditions=["atrial fibrillation", "diabetes"],
            outcome_severity="hospitalization",
            description="65-year-old female on warfarin for AFib and metformin for type 2 diabetes. Started ibuprofen 600mg TID for back pain. After 2 weeks, developed GI bleeding with INR 7.8. Required hospitalization and blood transfusion.",
            faers_matches=1847
        ),
        FAERSCase(
            case_id="FAERS-003",
            drugs=["warfarin", "naproxen"],
            age=72,
            sex="female",
            conditions=["atrial fibrillation"],
            outcome_severity="death",
            description="72-year-old female on warfarin for AFib. Prescribed naproxen 500mg BID for arthritis. Found unresponsive at home 3 weeks later. Autopsy revealed massive GI hemorrhage. INR was 9.1.",
            faers_matches=2156
        ),
        FAERSCase(
            case_id="FAERS-004",
            drugs=["metformin", "ibuprofen"],
            age=58,
            sex="female",
            conditions=["diabetes", "osteoarthritis"],
            outcome_severity="serious",
            description="58-year-old female with diabetes on metformin. Started ibuprofen for osteoarthritis. Developed acute kidney injury after 3 weeks. Creatinine increased from 1.0 to 2.8. Metformin held due to renal impairment.",
            faers_matches=847
        ),
        FAERSCase(
            case_id="FAERS-005",
            drugs=["warfarin", "aspirin", "ibuprofen"],
            age=70,
            sex="male",
            conditions=["atrial fibrillation", "coronary artery disease"],
            outcome_severity="death",
            description="70-year-old male on warfarin and aspirin. Added ibuprofen for joint pain. Developed severe GI bleeding requiring 6 units pRBC. INR elevated to 6.5.",
            faers_matches=3124
        ),
        FAERSCase(
            case_id="FAERS-006",
            drugs=["warfarin", "ibuprofen"],
            age=64,
            sex="female",
            conditions=["atrial fibrillation"],
            outcome_severity="hospitalization",
            description="64-year-old female on warfarin. Prescribed ibuprofen 400mg TID. After 1 week, presented with hematemesis. INR 7.2. Required endoscopic intervention and 3 units pRBC.",
            faers_matches=3891
        ),
        FAERSCase(
            case_id="FAERS-007",
            drugs=["metformin", "ibuprofen"],
            age=62,
            sex="female",
            conditions=["diabetes", "hypertension"],
            outcome_severity="serious",
            description="62-year-old female with diabetes on metformin. Started ibuprofen for chronic pain. After 4 weeks, developed lactic acidosis. Metformin discontinued. Renal function recovered after NSAID cessation.",
            faers_matches=623
        ),
        FAERSCase(
            case_id="FAERS-008",
            drugs=["warfarin", "diclofenac"],
            age=68,
            sex="female",
            conditions=["atrial fibrillation", "osteoarthritis"],
            outcome_severity="hospitalization",
            description="68-year-old female on warfarin for AFib. Prescribed diclofenac 75mg BID for arthritis. Developed melena after 10 days. INR 7.9. Required hospitalization and transfusion.",
            faers_matches=1923
        ),
        FAERSCase(
            case_id="FAERS-009",
            drugs=["warfarin", "ibuprofen"],
            age=71,
            sex="female",
            conditions=["atrial fibrillation"],
            outcome_severity="non-serious",
            description="71-year-old female on warfarin. Started ibuprofen 600mg TID. Developed bruising and epistaxis. INR elevated to 5.8. Required warfarin dose reduction.",
            faers_matches=2756
        ),
        FAERSCase(
            case_id="FAERS-010",
            drugs=["metformin", "naproxen"],
            age=60,
            sex="female",
            conditions=["diabetes", "osteoarthritis"],
            outcome_severity="serious",
            description="60-year-old female with diabetes on metformin. Prescribed naproxen for arthritis. Developed acute kidney injury. Creatinine increased to 2.5. Metformin temporarily held.",
            faers_matches=534
        ),

        # ── methotrexate + naproxen (FAERS-011 to 013) ──────────────────────
        FAERSCase(
            case_id="FAERS-011",
            drugs=["methotrexate", "naproxen"],
            age=52,
            sex="male",
            conditions=["rheumatoid arthritis"],
            outcome_severity="hospitalization",
            description="52-year-old male with RA on methotrexate 15mg weekly. Prescribed naproxen 500mg BID for joint flare. After 12 days presented with pancytopenia: WBC 1.2, Hgb 7.8, platelets 45k. Creatinine rose to 3.1. Required IV leucovorin rescue, G-CSF, and 2 units pRBC. Naproxen discontinued.",
            faers_matches=1842
        ),
        FAERSCase(
            case_id="FAERS-012",
            drugs=["methotrexate", "naproxen"],
            age=68,
            sex="female",
            conditions=["rheumatoid arthritis", "chronic kidney disease"],
            outcome_severity="death",
            description="68-year-old female with RA and baseline CKD stage 3 on methotrexate 12.5mg weekly. Added naproxen 500mg BID for pain. Developed severe pancytopenia with WBC 0.4 and AKI with creatinine 4.5. Sepsis from neutropenic fever. Expired on hospital day 8 despite aggressive supportive care.",
            faers_matches=2310
        ),
        FAERSCase(
            case_id="FAERS-013",
            drugs=["methotrexate", "naproxen"],
            age=45,
            sex="male",
            conditions=["psoriatic arthritis"],
            outcome_severity="serious",
            description="45-year-old male with psoriatic arthritis on methotrexate 20mg weekly. Started OTC naproxen for back pain. After 3 weeks, labs showed creatinine 2.0, mild leukopenia WBC 3.1. Methotrexate held for 2 weeks and naproxen stopped. Renal function recovered to baseline over 10 days.",
            faers_matches=978
        ),

        # ── lithium + lisinopril (FAERS-014 to 016) ─────────────────────────
        FAERSCase(
            case_id="FAERS-014",
            drugs=["lithium", "lisinopril"],
            age=38,
            sex="female",
            conditions=["bipolar disorder", "hypertension"],
            outcome_severity="hospitalization",
            description="38-year-old female with bipolar I on lithium 900mg daily, stable level 0.9. Started lisinopril 10mg for new HTN. Two weeks later presented with coarse tremor, confusion, and vomiting. Lithium level 2.4 mEq/L. Creatinine 1.8. IV fluids and lithium held. Level normalized over 3 days.",
            faers_matches=1456
        ),
        FAERSCase(
            case_id="FAERS-015",
            drugs=["lithium", "lisinopril"],
            age=74,
            sex="male",
            conditions=["bipolar disorder", "heart failure"],
            outcome_severity="death",
            description="74-year-old male with bipolar disorder and CHF on lithium 600mg daily and newly started lisinopril 20mg. Found obtunded at home by family. ER lithium level 3.0 mEq/L, creatinine 4.2, potassium 6.1. Developed status epilepticus and cardiac arrest. Expired despite resuscitation efforts.",
            faers_matches=892
        ),
        FAERSCase(
            case_id="FAERS-016",
            drugs=["lithium", "lisinopril"],
            age=55,
            sex="female",
            conditions=["bipolar disorder"],
            outcome_severity="serious",
            description="55-year-old female on lithium 1200mg daily with stable level 1.0. Lisinopril 5mg added for mild hypertension. At 4-week follow-up, lithium level 1.5 mEq/L with fine tremor and mild nausea. Lithium dose reduced to 900mg. Subsequent level 0.8 with symptom resolution.",
            faers_matches=634
        ),

        # ── fluoxetine + tramadol (FAERS-017 to 020) ────────────────────────
        FAERSCase(
            case_id="FAERS-017",
            drugs=["fluoxetine", "tramadol"],
            age=33,
            sex="male",
            conditions=["depression", "chronic pain"],
            outcome_severity="hospitalization",
            description="33-year-old male on fluoxetine 40mg for major depression. Prescribed tramadol 50mg Q6H for chronic low back pain. Within 18 hours developed agitation, diaphoresis, clonus in bilateral lower extremities, and temperature 104.2F. Diagnosed with serotonin syndrome. Treated with cyproheptadine and IV fluids. Discharged day 3.",
            faers_matches=2187
        ),
        FAERSCase(
            case_id="FAERS-018",
            drugs=["fluoxetine", "tramadol"],
            age=61,
            sex="female",
            conditions=["depression", "fibromyalgia"],
            outcome_severity="death",
            description="61-year-old female on fluoxetine 60mg. Started tramadol 100mg TID for fibromyalgia at outside clinic. Found unresponsive at home 36 hours later. Temperature 106.8F in ER. Developed DIC, rhabdomyolysis CK 42000, and multi-organ failure. Expired in ICU day 2 despite aggressive cooling and supportive measures.",
            faers_matches=1523
        ),
        FAERSCase(
            case_id="FAERS-019",
            drugs=["fluoxetine", "tramadol"],
            age=47,
            sex="male",
            conditions=["anxiety", "osteoarthritis"],
            outcome_severity="serious",
            description="47-year-old male on fluoxetine 20mg for GAD. Took tramadol 50mg from spouse's prescription for knee pain. Developed mild tremor, diarrhea, and restlessness over 6 hours. Presented to urgent care with HR 112 and temperature 100.8F. Tramadol discontinued, symptoms resolved within 24 hours.",
            faers_matches=3102
        ),
        FAERSCase(
            case_id="FAERS-020",
            drugs=["fluoxetine", "tramadol"],
            age=78,
            sex="female",
            conditions=["depression", "chronic pain", "osteoporosis"],
            outcome_severity="non-serious",
            description="78-year-old female on fluoxetine 10mg. Given tramadol 25mg in ER for rib fracture pain. Developed mild myoclonus and agitation within 4 hours. Recognized by ER physician as possible serotonin interaction. Tramadol stopped, acetaminophen substituted. Symptoms resolved same day without further intervention.",
            faers_matches=567
        ),

        # ── simvastatin + clarithromycin (FAERS-021 to 023) ──────────────────
        FAERSCase(
            case_id="FAERS-021",
            drugs=["simvastatin", "clarithromycin"],
            age=63,
            sex="male",
            conditions=["hyperlipidemia", "COPD"],
            outcome_severity="hospitalization",
            description="63-year-old male on simvastatin 80mg daily for 5 years. Prescribed clarithromycin 500mg BID for acute bronchitis. After 4 days developed severe bilateral thigh pain, dark brown urine, and inability to walk. CK 38000. Creatinine 2.7. Diagnosed with rhabdomyolysis secondary to CYP3A4 inhibition. IV hydration for 5 days.",
            faers_matches=2845
        ),
        FAERSCase(
            case_id="FAERS-022",
            drugs=["simvastatin", "clarithromycin"],
            age=50,
            sex="female",
            conditions=["hyperlipidemia"],
            outcome_severity="serious",
            description="50-year-old female on simvastatin 40mg. Clarithromycin 250mg BID for sinusitis. After 6 days noted muscle aches and tea-colored urine. CK 8200. No renal impairment. Both medications held. CK normalized over 2 weeks. Switched to rosuvastatin which is not metabolized by CYP3A4.",
            faers_matches=1567
        ),
        FAERSCase(
            case_id="FAERS-023",
            drugs=["simvastatin", "clarithromycin"],
            age=82,
            sex="male",
            conditions=["hyperlipidemia", "pneumonia"],
            outcome_severity="death",
            description="82-year-old male on simvastatin 40mg with mild CKD. Hospitalized for pneumonia, started clarithromycin IV. Day 3 developed oliguric AKI, CK 52000, potassium 7.1. Rhabdomyolysis with acute tubular necrosis. Required emergent dialysis but developed cardiac arrest. Expired despite resuscitation.",
            faers_matches=4012
        ),

        # ── metformin + ciprofloxacin (FAERS-024 to 026) ────────────────────
        FAERSCase(
            case_id="FAERS-024",
            drugs=["metformin", "ciprofloxacin"],
            age=71,
            sex="female",
            conditions=["diabetes", "urinary tract infection"],
            outcome_severity="hospitalization",
            description="71-year-old female with type 2 diabetes on metformin 1000mg BID. Started ciprofloxacin 500mg BID for complicated UTI. Day 3 found by husband confused and diaphoretic. Glucose 32 mg/dL. Required D50 bolus and dextrose drip. Hospitalized for 2 days for glucose monitoring. Cipro switched to nitrofurantoin.",
            faers_matches=1234
        ),
        FAERSCase(
            case_id="FAERS-025",
            drugs=["metformin", "ciprofloxacin"],
            age=44,
            sex="male",
            conditions=["diabetes"],
            outcome_severity="serious",
            description="44-year-old male diabetic on metformin 850mg BID. Prescribed ciprofloxacin for prostatitis. After 5 days experienced recurrent episodes of lightheadedness and tremulousness. Self-monitored glucose showing readings of 55-58 mg/dL. Contacted PCP who adjusted metformin dose and completed cipro course with close glucose monitoring.",
            faers_matches=789
        ),
        FAERSCase(
            case_id="FAERS-026",
            drugs=["metformin", "ciprofloxacin"],
            age=85,
            sex="female",
            conditions=["diabetes", "chronic kidney disease"],
            outcome_severity="non-serious",
            description="85-year-old female with diabetes and CKD stage 3a on metformin 500mg BID. Ciprofloxacin 250mg BID for UTI. Pharmacist flagged interaction at dispensing. Endocrinologist contacted, agreed to reduce metformin to 500mg daily during antibiotic course. Glucose remained 90-140 mg/dL throughout. No hypoglycemic episodes.",
            faers_matches=512
        ),

        # ── phenelzine + fluoxetine (FAERS-027 to 029) ──────────────────────
        FAERSCase(
            case_id="FAERS-027",
            drugs=["phenelzine", "fluoxetine"],
            age=41,
            sex="male",
            conditions=["treatment-resistant depression"],
            outcome_severity="death",
            description="41-year-old male on phenelzine 60mg daily for treatment-resistant depression. New psychiatrist unfamiliar with regimen started fluoxetine 20mg without washout period. Within 12 hours developed severe hypertensive crisis BP 240/140, hyperthermia 107F, and generalized rigidity. Progressed to DIC and multi-organ failure. Expired in ICU within 36 hours of fluoxetine administration.",
            faers_matches=1678
        ),
        FAERSCase(
            case_id="FAERS-028",
            drugs=["phenelzine", "fluoxetine"],
            age=56,
            sex="female",
            conditions=["depression", "anxiety"],
            outcome_severity="hospitalization",
            description="56-year-old female on phenelzine 45mg daily. Stopped phenelzine and started fluoxetine after only 7-day washout (should be 14 days). Presented to ER day 3 with BP 210/120, temperature 103.5F, myoclonus, and altered mental status. Treated with IV nitroprusside and cyproheptadine. ICU stay 4 days. Full recovery.",
            faers_matches=2341
        ),
        FAERSCase(
            case_id="FAERS-029",
            drugs=["phenelzine", "fluoxetine"],
            age=30,
            sex="male",
            conditions=["depression"],
            outcome_severity="serious",
            description="30-year-old male on phenelzine 30mg for atypical depression. Obtained fluoxetine sample from friend. Within 8 hours developed headache, BP 195/115, diaphoresis, and agitation. ER visit: diagnosed hypertensive urgency secondary to MAO-SSRI interaction. IV labetalol and monitoring. Discharged day 2 with counseling on drug interactions.",
            faers_matches=987
        ),

        # ── spironolactone + lisinopril (FAERS-030 to 032) ──────────────────
        FAERSCase(
            case_id="FAERS-030",
            drugs=["spironolactone", "lisinopril"],
            age=77,
            sex="female",
            conditions=["heart failure", "hypertension"],
            outcome_severity="death",
            description="77-year-old female with NYHA class III CHF on spironolactone 50mg and lisinopril 40mg. Potassium supplements continued inadvertently. Presented with weakness and palpitations. K+ 8.5 mEq/L. ECG showed sine wave pattern. Despite IV calcium, insulin/glucose, and emergent dialysis, developed VFib arrest. Expired.",
            faers_matches=3456
        ),
        FAERSCase(
            case_id="FAERS-031",
            drugs=["spironolactone", "lisinopril"],
            age=59,
            sex="male",
            conditions=["heart failure"],
            outcome_severity="hospitalization",
            description="59-year-old male with CHF started on spironolactone 25mg added to existing lisinopril 20mg. Routine labs at 1 week showed K+ 6.8 mEq/L. ECG with peaked T-waves and prolonged PR. Admitted for cardiac monitoring, IV calcium gluconate, kayexalate. Spironolactone dose reduced to 12.5mg. K+ normalized in 48 hours.",
            faers_matches=2134
        ),
        FAERSCase(
            case_id="FAERS-032",
            drugs=["spironolactone", "lisinopril"],
            age=66,
            sex="female",
            conditions=["heart failure", "chronic kidney disease"],
            outcome_severity="serious",
            description="66-year-old female with CHF and CKD stage 3 on lisinopril 10mg. Spironolactone 25mg added for edema. At 2-week follow-up, K+ 6.0 mEq/L with baseline creatinine rise from 1.4 to 1.9. Spironolactone held. Potassium restricted diet initiated. K+ returned to 4.8 within 5 days.",
            faers_matches=1789
        ),

        # ── digoxin + amiodarone (FAERS-033 to 035) ─────────────────────────
        FAERSCase(
            case_id="FAERS-033",
            drugs=["digoxin", "amiodarone"],
            age=80,
            sex="male",
            conditions=["atrial fibrillation", "heart failure"],
            outcome_severity="hospitalization",
            description="80-year-old male with AFib on digoxin 0.25mg daily. Amiodarone 400mg BID loading initiated for rate control. Day 5 presented with nausea, visual halos, and HR 34. Digoxin level 4.2 ng/mL (therapeutic 0.8-2.0). Digoxin held, dose reduced to 0.125mg. Temporary pacing not required. Level normalized day 4.",
            faers_matches=3678
        ),
        FAERSCase(
            case_id="FAERS-034",
            drugs=["digoxin", "amiodarone"],
            age=69,
            sex="female",
            conditions=["atrial fibrillation"],
            outcome_severity="serious",
            description="69-year-old female on digoxin 0.125mg and newly started amiodarone 200mg daily. At routine visit 3 weeks later, complained of anorexia and nausea. Digoxin level 3.1 ng/mL. ECG showed junctional rhythm at 42 bpm. Digoxin held and dose halved. Symptoms resolved within 1 week. Counseled on drug interaction monitoring.",
            faers_matches=2567
        ),
        FAERSCase(
            case_id="FAERS-035",
            drugs=["digoxin", "amiodarone"],
            age=85,
            sex="male",
            conditions=["atrial fibrillation", "heart failure", "chronic kidney disease"],
            outcome_severity="death",
            description="85-year-old male with AFib, CHF, and CKD on digoxin 0.25mg. Amiodarone started for persistent AFib. Digoxin dose not adjusted. Presented day 7 with complete heart block, digoxin level 6.0 ng/mL. Temporary pacer placed but developed ventricular fibrillation refractory to cardioversion. Expired in cath lab.",
            faers_matches=1234
        ),

        # ── ciprofloxacin + prednisone (FAERS-036 to 038) ───────────────────
        FAERSCase(
            case_id="FAERS-036",
            drugs=["ciprofloxacin", "prednisone"],
            age=73,
            sex="female",
            conditions=["COPD", "urinary tract infection"],
            outcome_severity="hospitalization",
            description="73-year-old female on chronic prednisone 10mg for COPD. Prescribed ciprofloxacin 500mg BID for UTI. Day 8 felt sudden pop in right ankle while walking. MRI confirmed complete Achilles tendon rupture. Required surgical repair and 8 weeks non-weight bearing. Fluoroquinolone-corticosteroid interaction documented.",
            faers_matches=1876
        ),
        FAERSCase(
            case_id="FAERS-037",
            drugs=["ciprofloxacin", "prednisone"],
            age=48,
            sex="male",
            conditions=["inflammatory bowel disease"],
            outcome_severity="serious",
            description="48-year-old male with Crohn's disease on prednisone 40mg taper. Ciprofloxacin added for perianal abscess. After 10 days developed bilateral Achilles tendinopathy with pain and swelling. MRI showed partial tears bilaterally. Ciprofloxacin stopped, switched to metronidazole. Physical therapy initiated. No surgical intervention required.",
            faers_matches=923
        ),
        FAERSCase(
            case_id="FAERS-038",
            drugs=["ciprofloxacin", "prednisone"],
            age=65,
            sex="male",
            conditions=["COPD", "pneumonia"],
            outcome_severity="non-serious",
            description="65-year-old male on prednisone 20mg for COPD exacerbation. Ciprofloxacin 750mg BID for pneumonia. Developed bilateral Achilles soreness day 5. Pharmacist identified fluoroquinolone-steroid tendon risk. Antibiotic changed to amoxicillin-clavulanate. Symptoms resolved within 3 days. No imaging required.",
            faers_matches=678
        ),

        # ── atorvastatin + clarithromycin (FAERS-039 to 041) ─────────────────
        FAERSCase(
            case_id="FAERS-039",
            drugs=["atorvastatin", "clarithromycin"],
            age=57,
            sex="female",
            conditions=["hyperlipidemia", "sinusitis"],
            outcome_severity="hospitalization",
            description="57-year-old female on atorvastatin 40mg for 3 years. Prescribed clarithromycin 500mg BID for acute sinusitis. Day 5 developed severe proximal muscle weakness, dark urine, and diffuse myalgias. CK 28000. Creatinine 2.1. Rhabdomyolysis from CYP3A4-mediated statin accumulation. IV hydration 4 days. Both drugs held.",
            faers_matches=2456
        ),
        FAERSCase(
            case_id="FAERS-040",
            drugs=["atorvastatin", "clarithromycin"],
            age=42,
            sex="male",
            conditions=["hyperlipidemia", "bronchitis"],
            outcome_severity="serious",
            description="42-year-old male on atorvastatin 20mg. Clarithromycin prescribed for bronchitis. After 7 days developed diffuse muscle pain and brown urine. CK 12500 but creatinine normal. Atorvastatin and clarithromycin stopped. CK trended down over 10 days. Switched to pravastatin which has minimal CYP3A4 metabolism.",
            faers_matches=1345
        ),
        FAERSCase(
            case_id="FAERS-041",
            drugs=["atorvastatin", "clarithromycin"],
            age=79,
            sex="female",
            conditions=["hyperlipidemia", "pneumonia", "chronic kidney disease"],
            outcome_severity="death",
            description="79-year-old female with CKD stage 4 on atorvastatin 80mg. Admitted for pneumonia, started clarithromycin. Developed rhabdomyolysis CK 45000, hyperkalemia 7.3, and anuric AKI by day 3. Emergent dialysis initiated but developed cardiac arrest secondary to hyperkalemia. Expired. CYP3A4 inhibition with impaired renal clearance identified as cause.",
            faers_matches=3890
        ),

        # ── metformin + lisinopril (FAERS-042 to 043) ───────────────────────
        FAERSCase(
            case_id="FAERS-042",
            drugs=["metformin", "lisinopril"],
            age=72,
            sex="male",
            conditions=["diabetes", "hypertension", "chronic kidney disease"],
            outcome_severity="hospitalization",
            description="72-year-old male with T2DM on metformin 1000mg BID and lisinopril 40mg. Developed gastroenteritis with dehydration. Creatinine rose from 1.5 to 4.1. Lactate 6.2 mmol/L concerning for metformin-associated lactic acidosis in setting of ACE-inhibitor-related renal hemodynamic changes. Hospitalized for IV bicarb and hydration. Both drugs held.",
            faers_matches=1567
        ),
        FAERSCase(
            case_id="FAERS-043",
            drugs=["metformin", "lisinopril"],
            age=55,
            sex="female",
            conditions=["diabetes", "hypertension"],
            outcome_severity="serious",
            description="55-year-old female on metformin 500mg BID and lisinopril 20mg. Annual labs showed creatinine rise from 0.9 to 1.6 over 6 months. eGFR dropped to 42 mL/min. Nephrologist attributed decline to ACE inhibitor effect on GFR with concern for metformin accumulation at reduced renal function. Metformin dose halved, renal function stabilized.",
            faers_matches=723
        ),
    ]
