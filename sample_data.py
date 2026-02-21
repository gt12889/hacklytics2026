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
            outcome_severity="hospitalization",
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
            outcome_severity="serious",
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
        )
    ]
