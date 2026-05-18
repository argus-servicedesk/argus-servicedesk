from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Role
from apps.assignments.models import CategoryGroupMapping
from apps.organizations.models import Organization
from apps.teams.models import Team, TeamMember


TEAM_MEMBERS = {
    "Infra Team": ["Devendra Reddy", "Edukondalu", "Siva", "Udhayakumar"],
    "DevOps Team": ["Rajkumar-Madhu", "Hoysala Bisa"],
    "Software Team": ["Vediyappan M", "Rajkumar-Ashokan"],
}

CATEGORY_MAPPINGS = {
    "Network": "Infra Team",
    "Security": "Infra Team",
    "Infrastructure": "Infra Team",
    "Hardware": "Infra Team",
    "Cloud": "DevOps Team",
    "Cloud Infrastructure": "DevOps Team",
    "DevOps": "DevOps Team",
    "Software": "Software Team",
    "Application": "Software Team",
    "Database": "Software Team",
    "Configuration": "Software Team",
}


def email_for(name, org):
    slug = "".join(ch.lower() if ch.isalnum() else "." for ch in name).strip(".")
    while ".." in slug:
        slug = slug.replace("..", ".")
    return f"{slug}.{org.id}@argus.io"


def split_name(name):
    parts = name.split(" ", 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


class Command(BaseCommand):
    help = "Sync assignment teams and members to the production Argus service desk team model."

    def handle(self, *args, **options):
        User = get_user_model()
        engineer_role, _ = Role.objects.get_or_create(
            name="ENGINEER",
            defaults={"description": "Service desk engineer", "is_system": True},
        )
        orgs = Organization.objects.all().order_by("name")
        if not orgs.exists():
            self.stdout.write(self.style.WARNING("No organizations found."))
            return

        allowed_team_names = set(TEAM_MEMBERS)
        for org in orgs:
            self.stdout.write(f"Syncing assignment teams for {org.name}")

            CategoryGroupMapping.objects.filter(organization=org).delete()
            Team.objects.filter(organization=org).exclude(name__in=allowed_team_names).delete()

            teams = {}
            for team_name, member_names in TEAM_MEMBERS.items():
                team, _ = Team.objects.update_or_create(
                    organization=org,
                    name=team_name,
                    defaults={
                        "description": f"{team_name} resolver group for {org.name}",
                        "is_active": True,
                    },
                )
                teams[team_name] = team
                TeamMember.objects.filter(team=team).delete()

                for index, full_name in enumerate(member_names):
                    first_name, last_name = split_name(full_name)
                    email = email_for(full_name, org)
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            "username": email,
                            "first_name": first_name,
                            "last_name": last_name,
                            "organization": org,
                            "is_active": True,
                        },
                    )
                    user.username = user.username or email
                    user.first_name = first_name
                    user.last_name = last_name
                    user.organization = org
                    user.is_active = True
                    if created:
                        user.set_password("EngineerPass123!")
                    user.save()
                    user.roles.add(engineer_role)
                    TeamMember.objects.create(
                        team=team,
                        user=user,
                        role=Team.MemberRole.LEAD if index == 0 else Team.MemberRole.MEMBER,
                    )

            for category, team_name in CATEGORY_MAPPINGS.items():
                CategoryGroupMapping.objects.create(
                    organization=org,
                    category=category,
                    team=teams[team_name],
                )

        self.stdout.write(self.style.SUCCESS("Assignment teams synced."))
