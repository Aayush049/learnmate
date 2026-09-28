import json
import os
import time
import glob
import google.generativeai as genai
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()
API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-flash-lite-latest', generation_config={"response_mime_type": "application/json"})

# The syllabus structure
syllabus = {
    "Building Material Construction": [
        "Important Indian Standard Codes", "Cement", "Concrete", "Timber", "Aggregates", "Bricks",
        "Brick Masonry", "Mortar & Lime", "STONE", "Door, Window & Roof", "Stair Case", "Floors",
        "Steel & Glass", "Paint & Varnish", "Building Maintenance Engineering", "Building Laws"
    ],
    "Estimation-Costing": [
        "Basic Measurement & Work", "Valuation", "Estimation and Area Types", "Material Calculation & other miscellaneous topics"
    ],
    "Soil Mechanics": [
        "Soil Origin & Its Properties", "Index Properties of Soil", "Classification of Soil",
        "Clay Mineral & Soil Structure", "Compaction of Soil", "Compressibility and Consolidation",
        "Effective Stress, Capillarity and Permeability", "Seepage Through Soil", "Shear Strength of Soil",
        "Earth pressure and Retaining walls", "Shallow Foundation", "Deep Foundation",
        "Vertical Stressess", "Stability of slopes", "Soil Exploration", "Expansive Soil", "Soil Stabilization"
    ],
    "Solid Mechanics": [
         "Properties of Material", "Shear Force & Bending Moment", "Deflection of Beams",
         "Principal Stress & Principal Strain", "Theories of Failure", "Bending Stress",
         "Shear Stress", "Combined Stress", "Columns", "Springs", "Torsion of Circular Shaft",
         "Thick & Thin Cylinder/Sphere"
    ],
    "Navigation Channel Harbour Dock": [
        "Navigation Channel", "Harbour", "Breakwaters", "Dock"
    ],
    "Reinforcement Cement Concrete": [
        "Basic of RCC", "Limit State Method & Beam", "Codal Provisions for Beam and Slab",
        "Shear", "Bond and Anchorage", "Torsion", "Column", "Wall & Footing", "Pre-Stressed Concrete Basic",
        "IS Code Recommendations for Pre-Stressed Concrete", "Analysis of Pre-Stress And Bending Stresses",
        "Losses & Deflection in Pre-Stress Concrete"
    ],
    "Earthquake": [],
    "Fluid Mechanics": [
        "Properties of Fluid", "Pressure and its Measurement", "Hydrostatic-Forces", "Buoyancy and Floatation",
        "Liquid in Relative Equilibrium", "Fluid Kinematics", "Fluid Dynamics", "Momentum Equation and Application",
        "Weir and Notches", "Laminar Flow", "Turbulent Flow", "Boundary Layer Thickness",
        "Dimensional Analysis and Model Studies", "Flow Through Pipes"
    ],
    "Hydraulic Machine": [
        "Turbines", "Hydraulic Pumps"
    ],
    "Open Channel Flow": [
        "Introduction", "Uniform - Flow", "Energy-Depth Relationship", "Gradually Varied Flow", "Rapid Varied Flow"
    ],
    "Surveying": [
        "Fundamentals of Surveying", "Linear Measurement", "Compass- Surveying", "Theodolite", "Traversing",
        "Levelling", "Techeometry", "Plane-Table Surveying", "Contouring", "Curves", "Field Astronomy",
        "Measurement of Area and Volume", "Photogrammetry", "Theory of Errors"
    ],
    "Hydrology": [
        "Introduction", "Precipitation and Measurement", "Abstractions from Precipitation", "Stream Flow Measurement",
        "Runoff & Drought", "Hydrograph", "Floods & Flood Routing"
    ],
    "Irrigation": [
        "Irrigation & Methods", "Soil-moisture Plant Relationship", "Water Requirement of Crops", "Canal-Design",
        "Earthen-Dams", "Canal-Irrigation", "Water-Logging", "Gravity Dams", "Spillway"
    ],
    "Environmental Engineering": [
        "Water Demand, Source & Conveyance", "Quality Parameters of Water", "Treatment of Water", "Distribution System",
        "Waste Water Characteristics", "Disposal of Sewage Waste", "Design of Sewerage System and Sewer Appurtenances",
        "Sewage Treatment", "Solid Waste Management", "Air Pollution", "Noise Pollution"
    ],
    "Highway Engineering": [
        "Introduction", "Geometric Design", "Horizontal Alignment", "Vertical Alignment", "Traffic Engineering Studies",
        "Traffic Control Regulation", "Highway Material", "Pavement Design", "Flexible Pavement Design",
        "Design of Rigid Pavement", "Highway Maintenance"
    ],
    "Airport Engineering": [
        "Introduction", "Airport Planning", "Runway Design", "Airport Capacity", "Taxiway Design"
    ],
    "Tunnel Engineering": [],
    "Bridge Engineering": [],
    "Railway Engineering": [
        "Basic of Railway and Rail Joints", "Sleepers and Track Fasteners", "Ballast and Track Alignment",
        "Track Stress and Creep", "Geometric Design of the track", "Points and Cross", "Railway Station and Station Yard",
        "Signalling and control Systems", "Traction and Tractive Resistance"
    ],
    "CPM & PERT": [
        "Project Management", "Network Technique", "Programme Evaluation Review Technique", "Critical Path Method",
        "CRASHING, Updating & Resource Allocation", "Fundamental of Equipments", "Excavation Equipment"
    ],
    "Applied Mechanics": [
        "Basic Fundamental", "Velocity & Projectile Motion", "Friction", "Force", "Work, Power & Energy"
    ],
    "Structural Analysis": [
        "Determinacy, Indeterminacy & Stability of Structure", "Force Method Of Analysis", "Slope-Deflection Method",
        "Moment-Distribution Method", "Arches", "Trusses", "Influence-Line Diagram", "Matrix-Method Of Analysis"
    ],
    "Design of Steel Structure": [
        "Rivets", "Limit State Method of Design", "Bolts", "Welded Connections", "Tension Member",
        "Compression-Members", "Column Bases and Caps", "Beams (WSM)", "Plate-Girders", "Industrial Building", "Plastic-Analysis"
    ],
    "Auto Cad": []
}

def is_valid(q):
    opts = q.get('options', {})
    if not (opts.get('A') and opts.get('B') and opts.get('C') and opts.get('D')): return False
    if not q.get('question_text') or len(q['question_text']) < 10: return False
    return True

print("Loading data...")
qs = []
qs_dict = {}

for filename in ['../pdfdata/main pdfs/Civil_AE_1_complete.json', '../pdfdata/main pdfs/Civil_AE_2_complete.json']:
    if not os.path.exists(filename): continue
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for item in data:
            if is_valid(item):
                global_id = f"{os.path.basename(filename)}_{item.get('question_id')}"
                item['global_id'] = global_id
                qs.append(item)
                qs_dict[global_id] = item

print(f"Total valid questions to process: {len(qs)}")

prompt_template = """
You are an expert Civil Engineering classifier.
I have {N} multiple-choice questions. Map each question to ONE subject and ONE topic exactly as given in the syllabus below.
Pick the most appropriate topic.

Syllabus hierarchy (Subject -> [Topics]):
{syllabus_str}

OUTPUT JSON FORMAT:
{{
  "results": [
    {{
      "global_id": "string",
      "subject": "string",
      "topic": "string"
    }}, ...
  ]
}}

QUESTIONS:
{questions}
"""

def generate_with_retry(prompt, retries=10):
    for i in range(retries):
        try:
            response = model.generate_content(prompt, request_options={"timeout": 60})
            if not response.text:
                raise Exception("Empty response text")
            return json.loads(response.text).get('results', [])
        except Exception as e:
            err_str = str(e)
            if "Deadline" in err_str or "504" in err_str or "503" in err_str:
                print(f"  -> Timeout/Unavailable on try {i+1}. Retrying in 5s...")
                time.sleep(5)
            elif "429" in err_str or "Quota exceeded" in err_str:
                print(f"  -> Rate limited on try {i+1}. Sleeping for 60s...")
                time.sleep(60)
            else:
                print(f"  -> Error on try {i+1}: {e}")
                time.sleep(5)
    print("  -> Max retries exceeded.")
    return []

out_dir = "../extracted_data/topics_classified"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

mapping_file = os.path.join(out_dir, "mapping_progress.json")
if os.path.exists(mapping_file):
    with open(mapping_file, 'r', encoding='utf-8') as f:
        mapping_res = json.load(f)
else:
    mapping_res = {}

# Only process ones that are not mapped yet
unmapped = [q for q in qs if q['global_id'] not in mapping_res]
print(f"Found {len(unmapped)} unmapped questions remainder.")

batch_size = 50
for i in range(0, len(unmapped), batch_size):
    batch = unmapped[i:i+batch_size]
    print(f"Processing batch {i//batch_size + 1}/{len(unmapped)//batch_size + 1} ({len(batch)} items)...")

    questions_str = ""
    for q in batch:
        questions_str += f"\n--- ID: {q['global_id']} ---\nQ: {q['question_text']}\n"

    prompt = prompt_template.format(
        N=len(batch),
        syllabus_str=json.dumps(syllabus, indent=2),
        questions=questions_str
    )

    results = generate_with_retry(prompt)
    if results:
        for r in results:
            mapping_res[r['global_id']] = r

        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_res, f, indent=4)
        print(f"  -> Successfully mapped {len(results)} items. Stored.")
    else:
        print(f"  -> Failed to map batch. Skipping for now.")

print("\nAll batches processed. Grouping into topic files...")

# Group by topic and deduplicate
grouped = defaultdict(lambda: defaultdict(list))
seen_questions = set()

for d_item in qs:
    gid = d_item['global_id']
    if gid in mapping_res:
        subj = mapping_res[gid].get('subject')
        topic = mapping_res[gid].get('topic')
        if not subj or not topic:
            continue

        # Deduplication check by simple text hashing
        q_text = d_item.get('question_text', '').strip()
        q_hash = q_text[:100].lower().replace(" ", "")
        if q_hash in seen_questions:
            continue
        seen_questions.add(q_hash)

        # We can clean up the global_id from the final output
        clean_item = d_item.copy()
        clean_item['subject'] = subj
        clean_item['topic'] = topic

        grouped[subj][topic].append(clean_item)

# Save to topic wise files
for subj, topics in grouped.items():
    subj_safe = subj.replace(" ", "_").replace("&", "and").replace("/", "_")
    subj_dir = os.path.join(out_dir, subj_safe)
    if not os.path.exists(subj_dir):
        os.makedirs(subj_dir)

    for topic, q_list in topics.items():
        topic_safe = topic.replace(" ", "_").replace("&", "and").replace("/", "_")
        filename = os.path.join(subj_dir, f"{topic_safe}.json")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(q_list, f, indent=4, ensure_ascii=False)

print(f"Processing complete! Check {out_dir}")
