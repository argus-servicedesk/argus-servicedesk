import requests

# 1. Login
url = "http://localhost:8000/api/v1/auth/login"
data = {"username": "admin@argus.com", "password": "AdminArgus123!"}
try:
    resp = requests.post(url, json=data)
    token = resp.json()['data']['access']
    headers = {"Authorization": f"Bearer {token}"}

    # 2. MFA Setup (GET)
    mfa_setup_url = "http://localhost:8000/api/v1/auth/mfa/setup"
    resp = requests.get(mfa_setup_url, headers=headers)
    print(f"MFA Setup GET Status: {resp.status_code}")
    print(f"MFA Setup GET Data: {resp.json()}")
except Exception as e:
    print(f"Error: {e}")
