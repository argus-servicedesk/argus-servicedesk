from rest_framework import serializers
from .models import ConfigurationItem
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


class ConfigurationItemSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    support_group = serializers.SerializerMethodField()
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = ConfigurationItem
        fields = [
            'id', 'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels', 'organization', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_support_group(self, obj):
        if obj.support_group:
            return {'id': str(obj.support_group.id), 'name': obj.support_group.name}
        return None


class ConfigurationItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationItem
        fields = [
            'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels'
        ]

    def create(self, validated_data):
        validated_data['organization'] = self.context['request'].user.organization
        return super().create(validated_data)


class ConfigurationItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationItem
        fields = [
            'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels'
        ]
