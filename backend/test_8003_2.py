import requests

r = requests.get('http://127.0.0.1:8003/api/v1/questions/pyq-index', params={'is_pyq': 'true', 'year': 2023, 'shift': 'Shift-1'})
if r.status_code == 200:
    items = r.json()
    print("Num items:", len(items))
    if items: print("First item:", items[0])
