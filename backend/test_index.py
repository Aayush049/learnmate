import time, requests

t0 = time.time()
r = requests.get('http://127.0.0.1:8001/api/v1/questions/pyq-index', params={'is_pyq': 'true', 'year': 2023, 'shift': 'Shift-1'})
dt = time.time() - t0
print(f"Status: {r.status_code}")
print(f"Time: {dt:.4f}s")
if r.status_code == 200:
    data = r.json()
    print(f"Count: {len(data)}")
    if len(data) > 0:
        print(f"First item: {data[0]}")
else:
    print(r.text)
