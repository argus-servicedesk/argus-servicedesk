class OrganizationContextMiddleware:
    """
    Reads X-Organization-Id for tenant scoping.
    Use request.organization_id in views/services.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization_id = request.headers.get("X-Organization-Id")
        return self.get_response(request)

