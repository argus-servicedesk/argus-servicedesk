import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.teams.views import TeamListCreateView
from apps.accounts.models import User

factory = APIRequestFactory()
user = User.objects.get(email='admin@argus.com')
request = factory.get('/api/v1/teams/')
request.user = user
request.organization = user.organization
view = TeamListCreateView.as_view()
response = view(request)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    teams = response.data.get('data', [])
    print(f"Total Teams in API: {len(teams)}")
    for t in teams:
        print(f"  - Team: {t['name']} (ID: {t['id']})")
else:
    print(f"Error Response: {response.data}")
