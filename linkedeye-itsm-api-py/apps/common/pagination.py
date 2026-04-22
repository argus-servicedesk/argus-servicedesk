from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class DefaultPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "limit"
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response(
            {
                "success": True,
                "data": data,
                "pagination": {
                    "count": self.page.paginator.count,
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
            }
        )

