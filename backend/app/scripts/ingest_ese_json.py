import json
import os
import sys
import glob

# Add the current directory to Python path
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models.exam import Exam
from app.models.branch import Branch
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.topic import Topic
from app.models.question import Question, QuestionOption, DifficultyLevel

def get_or_create(session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
        params.update(defaults or {})
        instance = model(**params)
        session.add(instance)
        # Flush right away so we can use its ID
        session.flush()
        return instance, True

def ingest_ese_jsons(json_folder):
    db = SessionLocal()
    try:
        exam, _ = get_or_create(db, Exam, name="SSC JE")
        branch, _ = get_or_create(db, Branch, exam_id=exam.id, name="Civil Engineering")
        total_q = 0
        json_files = glob.glob(os.path.join(json_folder, "*.json"))
        print(f"Found {len(json_files)} JSON files in {json_folder}.")

        for file_path in json_files:
            filename = os.path.basename(file_path).replace(".json", "")

            # Intelligent Syllabus Mapping
            mapping = {
                "10_Boundary_Layer_Theory": ("Fluid Mechanics", "Boundary Layer Thickness"),
                "11_Drag_and_Lift": ("Fluid Mechanics", "Fluid Dynamics"),
                "12_Flow_Through_Pipes": ("Fluid Mechanics", "Flow Through Pipes"),
                "13_Modal_and_Dimensional_Analysis": ("Fluid Mechanics", "Dimensional Analysis and Model Studies"),
                "14_Open_Channel_Flow_Part_1_Q1-16": ("Open Channel Flow", "Introduction"),
                "14_Open_Channel_Flow_Part_2_Q17-40": ("Open Channel Flow", "Uniform - Flow"),
                "14_Open_Channel_Flow_Part_3_Q41-64": ("Open Channel Flow", "Energy-Depth Relationship"),
                "14_Open_Channel_Flow_Part_4_Q65-91": ("Open Channel Flow", "Gradually Varied Flow"),
                "14_Open_Channel_Flow_Part_5_Q92-111": ("Open Channel Flow", "Rapid Varied Flow"),
                "15_Hydraulic_Machines_Part_1_Q1-25": ("Hydraulic Machine", "Turbines"),
                "15_Hydraulic_Machines_Part_2_Q26-50": ("Hydraulic Machine", "Turbines"),
                "15_Hydraulic_Machines_Part_3_Q51-75": ("Hydraulic Machine", "Hydraulic Pumps"),
                "15_Hydraulic_Machines_Part_4_Q76-107": ("Hydraulic Machine", "Hydraulic Pumps"),
                "9_Turbulent_Flow": ("Fluid Mechanics", "Turbulent Flow"),
                "Fluid_Mechanics_Chapter_1": ("Fluid Mechanics", "Properties of Fluid"),
                "Tunneling_Tunnel_Engineering": ("Tunnel Engineering", "Basics of Tunneling")
            }

            subject_str = "Fluid Mechanics"
            chapter_name = filename.replace("ESE_", "").replace("Chapter_", "").replace("_Digital", "").replace("_", " ")

            for key, (subj_str, chap_str) in mapping.items():
                if key in filename:
                    subject_str = subj_str
                    chapter_name = chap_str
                    break

            subject, _ = get_or_create(db, Subject, branch_id=branch.id, name=subject_str)
            chapter, _ = get_or_create(db, Chapter, subject_id=subject.id, name=chapter_name)

            topic_name = f"{chapter_name} Concepts"
            topic, _ = get_or_create(db, Topic, chapter_id=chapter.id, name=topic_name)

            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except Exception as e:
                    print(f"Could not parse {file_path}: {e}")
                    continue

            if not isinstance(data, list):
                continue

            for q_data in data:
                # Is question correct check
                if q_data.get("is_question_correct") == False or str(q_data.get("correct_option")).lower() == "none":
                    continue # Skip invalid/erroneous questions

                q_text = q_data.get("question_text", "").strip()
                if not q_text:
                    continue

                existing_q = db.query(Question).filter_by(topic_id=topic.id, question_text=q_text).first()
                if existing_q:
                    continue

                solution = q_data.get("solution", "")
                correct_opt = str(q_data.get("correct_option", "")).lower().strip()

                # Check options
                options_dict = q_data.get("options", {})
                if not isinstance(options_dict, dict) or not options_dict:
                    continue

                new_q = Question(
                    topic_id=topic.id,
                    question_text=q_text,
                    explanation=solution,
                    difficulty=DifficultyLevel.MEDIUM,
                    marks=1,
                    is_pyq=True,
                    source="ESE/SSC JE PYQ"
                )
                db.add(new_q)
                db.flush()

                for label in ["a", "b", "c", "d"]:
                    opt_text = options_dict.get(label)
                    if opt_text is not None:
                        is_correct = (label == correct_opt)
                        new_opt = QuestionOption(
                            question_id=new_q.id,
                            option_text=str(opt_text).strip(),
                            option_label=label.upper(),
                            is_correct=is_correct
                        )
                        db.add(new_opt)

                total_q += 1

        db.commit()
        print(f"Successfully processed and ingested {total_q} valid questions into database.")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(backend_dir, "..", "pdfdata", "ese_pdfs_json"))
    ingest_ese_jsons(folder)
