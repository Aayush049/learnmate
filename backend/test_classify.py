import json
import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-flash-lite-latest', generation_config={"response_mime_type": "application/json"})

with open('app/scripts/seed_syllabus.py', 'r') as f:
    # Just a simple way to get syllabus vocabulary
    content = f.read()

# We need the syllabus dict
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
import random

def load_clean_qs():
    qs = []
    for filename in ['../pdfdata/main pdfs/Civil_AE_1_complete.json', '../pdfdata/main pdfs/Civil_AE_2_complete.json']:
        if not os.path.exists(filename): continue
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                if is_valid(item):
                    # add a global id
                    item['global_id'] = f"{os.path.basename(filename)}_{item.get('question_id')}"
                    qs.append(item)
    return qs

qs = load_clean_qs()
print(f"Total valid questions to process: {len(qs)}")
# Let's test with just 5 questions first
qs = qs[:5]

prompt_template = """
You are an expert Civil Engineering classifier.
I have {N} multiple-choice questions. Map each question to ONE subject and ONE topic exactly as given in the syllabus below.

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

def process_batch(batch):
    questions_str = ""
    for q in batch:
        questions_str += f"\n--- ID: {q['global_id']} ---\nQ: {q['question_text']}\n"

    prompt = prompt_template.format(
        N=len(batch),
        syllabus_str=json.dumps(syllabus, indent=2),
        questions=questions_str
    )

    try:
        response = model.generate_content(prompt, request_options={"timeout": 60})
        return json.loads(response.text).get('results', [])
    except Exception as e:
        print("Error:", e)
        return []

print("Processing batch...")
res = process_batch(qs)
print("Result:")
print(json.dumps(res, indent=2))
