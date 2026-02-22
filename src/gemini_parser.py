from google import genai
import time
import json
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()


def parse_patient_text(text: str) -> dict:
    """
    Extract structured patient data from free-text clinical input using Gemini.
    Returns a dict with keys: age, sex, preexisting_conditions, current_medications, prescribed_medications.
    sex: 1 = male, 2 = female, null = unknown
    """
    prompt = f""" Extract the following fields from this text and return a strict JSON. Always include all fields. Use null if the information is missing. 

For the sex, use 1 for "male" and 2 for "female". Fix capitalization for medicines and conditions (first letter capitalized). Fields: age, sex, preexisting_conditions, current_medications, prescribed_medications. 

Text: \"{text}\" """

    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model="gemma-3-27b-it",
                contents=prompt,
            )
            raw = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return json.loads(raw)
        except Exception as e:
            print(f"Attempt {attempt+1} failed:", e)
            time.sleep(2 ** attempt)

    return {
        "age": None,
        "sex": None,
        "preexisting_conditions": [],
        "current_medications": [],
        "prescribed_medications": [],
    }


if __name__ == "__main__":
    text = "patient is a female complaining of pain. Currently taking advil. Has diabetes. Doctor prescribed ibuprofen"
    result = parse_patient_text(text)
    print(json.dumps(result, indent=2))
