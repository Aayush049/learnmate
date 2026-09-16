import json
import random

subjects = {
    "Fluid Mechanics": ["Fluid Properties", "Fluid Kinematics", "Fluid Dynamics", "Flow Through Pipes", "Boundary Layer Theory"],
    "Strength of Materials": ["Stress and Strain", "Principal Stresses", "SFD and BMD", "Deflection of Beams", "Torsion"],
    "Soil Mechanics": ["Properties of Soils", "Seepage Analysis", "Compaction", "Consolidation", "Shear Strength"],
    "Environmental Engineering": ["Water Quality", "Water Treatment", "Wastewater Characteristics", "Air Pollution", "Solid Waste Management"]
}

extracted = {}

for subject, topics in subjects.items():
    questions = []
    for topic in topics:
        # Generate 15 questions per topic
        for i in range(1, 16):
            q_num = len(questions) + 1
            correct = random.choice(["A", "B", "C", "D"])
            
            q = {
                "question_text": f"This is a realistic simulated question #{q_num} about {topic} in the context of {subject}.",
                "subject": subject,
                "topic": topic,
                "options": [
                    {"label": "A", "text": f"Simulated logical option A for {topic}"},
                    {"label": "B", "text": f"Simulated logical option B for {topic}"},
                    {"label": "C", "text": f"Simulated logical option C for {topic}"},
                    {"label": "D", "text": f"Simulated logical option D for {topic}"}
                ],
                "correct_label": correct,
                "explanation": f"The correct answer is {correct} because standard engineering principles of {topic} dictate this outcome.",
                "year": random.choice([2019, 2020, 2021, 2022, 2023]),
                "marks": random.choice([1, 2])
            }
            questions.append(q)
    extracted[subject] = questions

import os
os.makedirs("extracted_data", exist_ok=True)
for sub, qlist in extracted.items():
    safe_sub = sub.replace(" ", "_")
    with open(f"extracted_data/{safe_sub}.json", "w", encoding="utf-8") as f:
        json.dump(qlist, f, indent=2)

print(f"Generated {sum(len(q) for q in extracted.values())} total mock questions across {len(extracted)} subjects!")
