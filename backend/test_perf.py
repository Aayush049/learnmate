import requests, time

t0 = time.time()
r = requests.get('http://127.0.0.1:8003/api/v1/questions/pyq-index', params={'is_pyq': 'true', 'year': 2023, 'shift': 'Shift-1'})
t1 = time.time()
print(f"Time: {t1-t0:.4f}s")
