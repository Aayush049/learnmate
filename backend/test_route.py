from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

response = client.get("/api/v1/questions/pyq-index?is_pyq=true&year=2023&shift=Shift-1")
print(response.status_code)
if response.status_code == 200:
    data = response.json()
    print("Item Count:", len(data))
    if len(data) > 0:
        print("First Item keys:", data[0].keys())
        print("First Item text excerpt:", data[0].get("question_text", "")[:50])
else:
    print("Error:", response.json())
