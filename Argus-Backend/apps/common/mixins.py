from rest_framework.exceptions import PermissionDenied


class OrgQuerysetMixin:
    organization_lookup = "organization"

    def get_queryset(self):
        queryset = super().get_queryset()
        organization = getattr(self.request, "organization", None)
        if organization is None:
            raise PermissionDenied("Organization access denied")
        return queryset.filter(**{self.organization_lookup: organization})
