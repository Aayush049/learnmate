import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic

# Unit mapping: Unit Number -> Subject ID
UNIT_SUBJECT_MAP = {
    1: 18,  # Building Material Construction
    2: 19,  # Estimation-Costing
    3: 13,  # Soil Mechanics
    4: 20,  # Solid Mechanics
    5: 21,  # Navigation Channel Harbour Dock
    6: 22,  # Reinforcement Cement Concrete
    7: 39,  # Earthquake
    8: 12,  # Fluid Mechanics
    9: 24,  # Hydraulic Machine
    10: 25, # Open Channel Flow
    11: 26, # Surveying
    12: 27, # Hydrology
    13: 28, # Irrigation
    14: 11, # Environmental Engineering
    15: 29, # Highway Engineering
    16: 30, # Airport engineering
    17: 31, # Tunnel Engineering
    18: 40, # Bridge Engineering
    19: 33, # Railway Engineering
    20: 34, # CPM & PERT
    21: 35, # Applied Mechanics
    22: 36, # Structural Analysis
    23: 37, # Design of Steel Structure
    24: 41, # Auto Cad
}

# Canonical Topics per Unit
UNIT_TOPICS = {
    1: [
        (28, 66, "Important Indian Standard Codes"),
        (29, 67, "Cement"),
        (30, 68, "Concrete"),
        (31, 69, "Timber"),
        (32, 70, "Aggregates"),
        (33, 71, "Bricks"),
        (34, 72, "Brick Masonry"),
        (35, 73, "Mortar & Lime"),
        (36, 74, "STONE"),
        (37, 75, "Door, Window & Roof"),
        (38, 76, "Stair Case"),
        (39, 77, "Floors"),
        (40, 78, "Steel & Glass"),
        (41, 79, "Paint & Varnish"),
        (42, 80, "Building Maintenance Engineering"),
        (43, 81, "Building Laws"),
    ],
    2: [
        (44, 82, "Basic Measurement & Work"),
        (45, 83, "Valuation"),
        (46, 84, "Estimation and Area Types"),
        (47, 85, "Material Calculation & other miscellaneous topics"),
    ],
    3: [
        (48, 86, "Soil Origin & Its Properties"),
        (49, 87, "Index Properties of Soil"),
        (50, 88, "Classification of Soil"),
        (51, 89, "Clay Mineral & Soil Structure"),
        (52, 90, "Compaction of Soil"),
        (53, 91, "Compressibility and Consolidation"),
        (54, 92, "Effective Stress, Capillarity and Permeability"),
        (55, 93, "Seepage Through Soil"),
        (56, 94, "Shear Strength of Soil"),
        (57, 95, "Earth pressure and Retaining walls"),
        (58, 96, "Shallow Foundation"),
        (59, 97, "Deep Foundation"),
        (60, 98, "Vertical Stressess"),
        (61, 99, "Stability of slopes"),
        (62, 100, "Soil Exploration"),
        (63, 101, "Expansive Soil"),
        (64, 102, "Soil Stabilization"),
    ],
    4: [
        (65, 103, "Properties of Material"),
        (66, 104, "Shear Force & Bending Moment"),
        (67, 105, "Deflection of Beams"),
        (68, 106, "Principal Stress & Principal Strain"),
        (69, 107, "Theories of Failure"),
        (70, 108, "Bending Stress"),
        (71, 109, "Shear Stress"),
        (72, 110, "Combined Stress"),
        (73, 111, "Columns"),
        (74, 112, "Springs"),
        (75, 113, "Torsion of Circular Shaft"),
        (76, 114, "Thick & Thin Cylinder/Sphere"),
    ],
    5: [
        (77, 115, "Navigation Channel"),
        (78, 116, "Harbour"),
        (79, 117, "Breakwaters"),
        (80, 118, "Dock"),
    ],
    6: [
        (81, 119, "Basic of RCC"),
        (82, 120, "Limit State Method & Beam"),
        (83, 121, "Codal Provisions for Beam and Slab"),
        (84, 122, "Shear"),
        (85, 123, "Bond and Anchorage"),
        (86, 124, "Torsion"),
        (87, 125, "Column"),
        (88, 126, "Wall & Footing"),
        (89, 127, "Pre-Stressed Concrete Basic"),
        (90, 128, "IS Code Recommendations for Pre-Stressed Concrete"),
        (91, 129, "Analysis of Pre-Stress And Bending Stresses"),
        (92, 130, "Losses & Deflection in Pre-Stress Concrete"),
    ],
    7: [], # Misc unit
    8: [
        (93, 131, "Properties of Fluid"),
        (94, 132, "Pressure and its Measurement"),
        (95, 133, "Hydrostatic-Forces"),
        (96, 134, "Buoyancy and Floatation"),
        (97, 135, "Liquid in Relative Equilibrium"),
        (98, 136, "Fluid Kinematics"),
        (99, 137, "Fluid Dynamics"),
        (100, 138, "Momentum Equation and Application"),
        (101, 139, "Weir and Notches"),
        (102, 140, "Laminar Flow"),
        (103, 141, "Turbulent Flow"),
        (104, 142, "Boundary Layer Thickness"),
        (105, 143, "Dimensional Analysis and Model Studies"),
        (106, 144, "Flow Through Pipes"),
    ],
    9: [
        (107, 145, "Turbines"),
        (108, 146, "Hydraulic Pumps"),
    ],
    10: [
        (109, 147, "Introduction"),
        (110, 148, "Uniform - Flow"),
        (111, 149, "Energy-Depth Relationship"),
        (112, 150, "Gradually Varied Flow"),
        (113, 151, "Rapid Varied Flow"),
    ],
    11: [
        (114, 152, "Fundamentals of Surveying"),
        (115, 153, "Linear Measurement"),
        (116, 154, "Compass- Surveying"),
        (117, 155, "Theodolite"),
        (118, 156, "Traversing"),
        (119, 157, "Levelling"),
        (120, 158, "Techeometry"),
        (121, 159, "Plane-Table Surveying"),
        (122, 160, "Contouring"),
        (123, 161, "Curves"),
        (124, 162, "Field Astronomy"),
        (125, 163, "Measurement of Area and Volume"),
        (126, 164, "Photogrammetry"),
        (127, 165, "Theory of Errors"),
    ],
    12: [
        (128, 166, "Introduction"),
        (129, 167, "Precipitation and Measurement"),
        (130, 168, "Abstractions from Precipitation"),
        (131, 169, "Stream Flow Measurement"),
        (132, 170, "Runoff & Drought"),
        (133, 171, "Hydrograph"),
        (134, 172, "Floods & Flood Routing"),
    ],
    13: [
        (135, 173, "Irrigation & Methods"),
        (136, 174, "Soil-moisture Plant Relationship"),
        (137, 175, "Water Requirement of Crops"),
        (138, 176, "Canal-Design"),
        (139, 177, "Earthen-Dams"),
        (140, 178, "Canal-Irrigation"),
        (141, 179, "Water-Logging"),
        (142, 180, "Gravity Dams"),
        (143, 181, "Spillway"),
    ],
    14: [
        (144, 182, "Water Demand, Source & Conveyance"),
        (145, 183, "Quality Parameters of Water"),
        (146, 184, "Treatment of Water"),
        (147, 185, "Distribution System"),
        (148, 186, "Waste Water Characteristics"),
        (149, 187, "Disposal of Sewage Waste"),
        (150, 188, "Design of Sewerage System and Sewer Appurtenances"),
        (151, 189, "Sewage Treatment"),
        (152, 190, "Solid Waste Management"),
        (153, 191, "Air Pollution"),
        (154, 192, "Noise Pollution"),
    ],
    15: [
        (155, 193, "Introduction"),
        (156, 194, "Geometric Design"),
        (157, 195, "Horizontal Alignment"),
        (158, 196, "Vertical Alignment"),
        (159, 197, "Traffic Engineering Studies"),
        (160, 198, "Traffic Control Regulation"),
        (161, 199, "Highway Material"),
        (162, 200, "Pavement Design"),
        (163, 201, "Flexible Pavement Design"),
        (164, 202, "Design of Rigid Pavement"),
        (165, 203, "Highway Maintenance"),
    ],
    16: [
        (166, 204, "Introduction"),
        (167, 205, "Airport Planning"),
        (168, 206, "Runway Design"),
        (169, 207, "Airport Capacity"),
        (170, 208, "Taxiway Design"),
    ],
    17: [], # Misc unit
    18: [], # Misc unit
    19: [
        (171, 209, "Basic of Railway and Rail Joints"),
        (172, 210, "Sleepers and Track Fasteners"),
        (173, 211, "Ballast and Track Alignment"),
        (174, 212, "Track Stress and Creep"),
        (175, 213, "Geometric Design of the track"),
        (176, 214, "Points and Cross"),
        (177, 215, "Railway Station and Station Yard"),
        (178, 216, "Signalling and control Systems"),
        (179, 217, "Traction and Tractive Resistance"),
    ],
    20: [
        (180, 218, "Project Management"),
        (181, 219, "Network Technique"),
        (182, 220, "Programme Evaluation Review Technique"),
        (183, 221, "Critical Path Method"),
        (184, 222, "CRASHING, Updating & Resource Allocation"),
        (185, 223, "Fundamental of Equipments"),
        (186, 224, "Excavation Equipment"),
    ],
    21: [
        (187, 225, "Basic Fundamental"),
        (188, 226, "Velocity & Projectile Motion"),
        (189, 227, "Friction"),
        (190, 228, "Force"),
        (191, 229, "Work, Power & Energy"),
    ],
    22: [
        (192, 230, "Determinacy, Indeterminacy & Stability of Structure"),
        (193, 231, "Force Method Of Analysis"),
        (194, 232, "Slope-Deflection Method"),
        (195, 233, "Moment-Distribution Method"),
        (196, 234, "Arches"),
        (197, 235, "Trusses"),
        (198, 236, "Influence-Line Diagram"),
        (199, 237, "Matrix-Method Of Analysis"),
    ],
    23: [
        (200, 238, "Rivets"),
        (201, 239, "Limit State Method of Design"),
        (202, 240, "Bolts"),
        (203, 241, "Welded Connections"),
        (204, 242, "Tension Member"),
        (205, 243, "Compression-Members"),
        (206, 244, "Column Bases and Caps"),
        (207, 245, "Beams (WSM)"),
        (208, 246, "Plate-Girders"),
        (209, 247, "Industrial Building"),
        (210, 248, "Plastic-Analysis"),
    ],
    24: [], # Misc unit
}

def remap_database():
    db = SessionLocal()
    try:
        print("Starting syllabus hierarchy remapping...")

        # 1. Update Subjects
        for unit_num, sub_id in UNIT_SUBJECT_MAP.items():
            sub = db.query(Subject).filter(Subject.id == sub_id).first()
            if sub:
                sub.display_order = unit_num
                print(f"Updated Subject [{sub.id}] '{sub.name}' -> display_order={unit_num}")

        # 2. Update Chapters & Topics within each Unit
        for unit_num, topics_list in UNIT_TOPICS.items():
            for idx, (chap_id, top_id, top_name) in enumerate(topics_list, start=1):
                # Update Chapter
                chap = db.query(Chapter).filter(Chapter.id == chap_id).first()
                if chap:
                    chap.display_order = idx

                # Update Topic
                top = db.query(Topic).filter(Topic.id == top_id).first()
                if top:
                    top.display_order = idx
                    # Clean up topic name if needed
                    # e.g., if it has " Concepts" at the end, keep clean name
                    clean_name = top_name
                    top.name = clean_name
                    print(f"  Unit {unit_num}.{idx} -> Topic [{top.id}] '{top.name}' (display_order={idx})")

        db.commit()
        print("\nSUCCESS: All Subjects, Chapters, and Topics remapped successfully!")
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    remap_database()
