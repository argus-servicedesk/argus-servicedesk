import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.assignments.models import AssignmentRule, CategoryGroupMapping, SkillRequirement, UserSkill
from apps.teams.models import Team, TeamMember
from apps.organizations.models import Organization
from apps.accounts.models import User

def seed():
    org = Organization.objects.first()
    if not org:
        print("No organization found. Please run seed_test_data.py first.")
        return

    # 1. Create/Get Teams
    noc, _ = Team.objects.get_or_create(name="NOC Team", organization=org, defaults={"description": "Network Operations Center"})
    dbas, _ = Team.objects.get_or_create(name="DBA Team", organization=org, defaults={"description": "Database Administrators"})
    app_support, _ = Team.objects.get_or_create(name="App Support", organization=org, defaults={"description": "Application Support"})

    # 2. Assignment Rules
    AssignmentRule.objects.get_or_create(
        name="Network Critical Rule",
        organization=org,
        defaults={
            "order": 10,
            "conditions": {
                "match": "ALL",
                "rules": [
                    {"field": "category", "operator": "equals", "value": "Network"},
                    {"field": "impact", "operator": "in", "value": ["ENTERPRISE", "DEPARTMENT"]}
                ]
            },
            "target_group": noc
        }
    )

    # 3. Category Mappings
    CategoryGroupMapping.objects.get_or_create(category="Database", organization=org, defaults={"team": dbas})
    CategoryGroupMapping.objects.get_or_create(category="Application", organization=org, defaults={"team": app_support})
    CategoryGroupMapping.objects.get_or_create(category="Network", organization=org, defaults={"team": noc})

    # 4. User Skills
    # Assign some skills to random users for testing
    users = User.objects.all()[:5]
    if users.exists():
        for user in users:
            UserSkill.objects.get_or_create(
                user=user, 
                skill_name="Networking", 
                organization=org,
                defaults={"proficiency": 4}
            )
            # Add them to NOC team
            TeamMember.objects.get_or_create(team=noc, user=user)

    print("Successfully seeded assignment data!")

if __name__ == "__main__":
    seed()
