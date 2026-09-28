import requests, time

t0 = time.time()
r = requests.get('http://127.0.0.1:8003/api/v1/questions/1366')
t1 = time.time()
print(f"Time: {t1-t0:.4f}s")
print(f"Status: {r.status_code}")
