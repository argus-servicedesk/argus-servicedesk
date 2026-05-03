from rest_framework import serializers
from .models import Integration

class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ("id", "name", "type", "config", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
