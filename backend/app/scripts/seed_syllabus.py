import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models.exam import Exam
from app.models.branch import Branch
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question

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
    "Airport engineering": [
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
        "Rivets", "Limit State Method of Design", "Bolts", "Welded Connections", "Tension Member", "Compression-Members",
        "Column Bases and Caps", "Beams (WSM)", "Plate-Girders", "Industrial Building", "Plastic-Analysis"
    ],
    "Auto Cad": []
}


def get_or_create(session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
        params.update(defaults or {})
        instance = model(**params)
        session.add(instance)
        session.flush()
        return instance, True


def seed_database():
    db = SessionLocal()
    try:
        exam, _ = get_or_create(db, Exam, name="SSC JE")
        branch, _ = get_or_create(db, Branch, exam_id=exam.id, name="Civil Engineering")
        
        for subject_name, chapter_list in syllabus.items():
            print(f"Adding/Verifying Subject: {subject_name}...")
            subject, _ = get_or_create(db, Subject, branch_id=branch.id, name=subject_name)
            
            for index, chapter_name in enumerate(chapter_list, 1):
                chapter, _ = get_or_create(db, Chapter, subject_id=subject.id, name=chapter_name)
                
                # Adding default topic for questions to attach to cleanly
                topic, _ = get_or_create(db, Topic, chapter_id=chapter.id, name=f"{chapter_name} Concepts")
                
        db.commit()
        print("Syllabus successfully seeded to the database!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
