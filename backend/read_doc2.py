import docx
doc = docx.Document("../pdfdata/ese word/ESE_Chapter_15_Hydraulic_Machines_Part_3_Q51-75.docx")
print("\n".join([p.text for p in doc.paragraphs if p.text.strip()]))
