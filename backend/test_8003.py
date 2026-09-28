import requests

try:
    r = requests.get('http://127.0.0.1:8003/api/v1/questions/pyq-index', params={'is_pyq': 'true', 'year': 2023, 'shift': 'Shift-1'})
    print(r.status_code)
    print(len(r.json()))
except Exception as e:
    print(e)
