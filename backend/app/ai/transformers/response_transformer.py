def merge_parsed_sections(biodata: dict, family: dict, education: dict, occupation: dict) -> dict:
    merged = {**biodata}
    for key in ["father_name", "father_occupation", "mother_name", "mother_occupation",
                "siblings", "family_type", "family_status", "native_place"]:
        if family.get(key):
            merged[key] = family[key]
    for key in ["highest_education", "degree", "college", "field_of_study"]:
        if education.get(key):
            merged[key] = education[key]
    merged.setdefault("education", education.get("highest_education"))
    for key in ["occupation", "employer", "job_title", "annual_income", "work_location"]:
        if occupation.get(key):
            merged[key] = occupation[key]
    confs = [d.get("confidence", 0) for d in [biodata, family, education, occupation]
             if d.get("confidence")]
    merged["ai_confidence"] = round(sum(confs) / len(confs), 2) if confs else 0.0
    return merged
