
from google import genai
import time
import json
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()


text = "patient is a female complaining of pain. Currently taking advil. Has diabetes. Doctor prescribed ibuprofen"
prompt = f""" Extract the following fields from this text and return a strict JSON. Always include all fields. Use null if the information is missing. 

For the sex, use 1 for "male" and 2 for "female". Fix capitalization for medicines and conditions (first letter capitalized). Fields: age, sex, preexisting_conditions, current_medications, prescribed_medications. 

Text: \"{text}\" """

for attempt in range(5):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-05-20",
            contents=prompt,
        )
        output = response.text
        print(output)
        raw = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        print(json.loads(raw))
        break
    except Exception as e:
        print(f"Attempt {attempt+1} failed:", e)
        time.sleep(2 ** attempt)


'''Extract the following fields from this text and return a JSON exactly like this:
age, sex, preexisting_conditions, current_medications, prescribed_medications.
Example:
Text: "patient is a female complaining of pain. Currently taking advil. Has diabetes. Doctor prescribed ibuprofen"
Output:
{{
  "age": null,
  "sex": 2,
  "preexisting_conditions": ["Diabetes"],
  "current_medications": ["Advil"],
  "prescribed_medications": ["Ibuprofen"]
}}'''



# from pydantic import BaseModel
# from typing import List, Optional


# class PatientRecord(BaseModel):
#     age: Optional[int]
#     sex: Optional[str]
#     preexisting_conditions: List[str] = []
#     current_medications: List[str] = []
#     prescribed_medications: List[str] = []

# try:
#     record = PatientRecord.parse_raw(output)
# except Exception as e:
#     print("Invalid JSON from model:", e)
#     record = PatientRecord()  # fallback with defaults/nulls

# print(record.dict())

# class ContactInfo(BaseModel):
#     age: int | None
#     sex: str | None
#     curr_meds: str[] | None
#     pre_conditions: str[] | None
#     prescribed: str[] | None

# response = client.models.generate_content(
#             model="gemini-2.5-flash-preview-05-20",
#             contents="Explain how AI works in a few words",
#         )
#         print(response.text)
#         break

# model = genai.GenerativeModel(
#     "gemini-1.5-flash",
#     generation_config={
#         "response_mime_type": "application/json",
#         "response_schema": ContactInfo,
#     }
# )

# def parse_contact(text: str) -> ContactInfo:
#     response = model.generate_content(f"Extract contact info from: {text}")
#     return ContactInfo.model_validate_json(response.text)