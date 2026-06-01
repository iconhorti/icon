import requests

r1 = requests.post('http://localhost:8000/api/v1/auth/login', json={'username': '9888888888', 'password': 'icon123'})
token = r1.json()['token']

apis = [
    'dealers/',
    'lookups/area-types',
    'lookups/agencies',
    'banks/',
    'structures/',
    'structures/?component_type=Crop',
    'structures/?component_type=Component',
    'dashboard/stats?role=admin',
    'dashboard/role-kpis?role=office_staff',
]

h = {'Authorization': f'Bearer {token}'}
for path in apis:
    r = requests.get(f'http://localhost:8000/api/v1/{path}', headers=h)
    data = r.json()
    count = len(data) if isinstance(data, list) else 'N/A'
    status = 'OK' if r.status_code == 200 else 'FAIL'
    print(f'{status} [{r.status_code}] {path} -> {count} items')
