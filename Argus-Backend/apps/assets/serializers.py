from rest_framework import serializers
from .models import (
    AssetCatalog,
    AssetDiscoveryResult,
    AssetManagementEndpoint,
    AssetOnboardingRecord,
    AssetPortConnection,
    AssetRelationship,
    AssetSite,
    ConfigurationItem,
)
from apps.accounts.serializers import UserSerializer
from apps.organizations.serializers import OrganizationSerializer


CAMEL_TO_SNAKE = {
    'serialNumber': 'serial_number',
    'assetTag': 'asset_tag',
    'rackPosition': 'rack_position',
    'dataCenter': 'data_center',
    'ipAddress': 'ip_address',
    'macAddress': 'mac_address',
    'osVersion': 'os_version',
    'serviceName': 'service_name',
    'managementIpAddress': 'management_ip_address',
    'ownerId': 'owner',
    'supportGroupId': 'support_group',
    'siteId': 'site',
    'purchaseDate': 'purchase_date',
    'warrantyExpiry': 'warranty_expiry',
    'endOfLife': 'end_of_life',
    'endOfSupport': 'end_of_support',
    'purchaseCost': 'purchase_cost',
    'monthlyCost': 'monthly_cost',
    'costCenter': 'cost_center',
    'monitoringEnabled': 'monitoring_enabled',
    'prometheusJob': 'prometheus_job',
    'grafanaDashboard': 'grafana_dashboard',
    'lokiLabels': 'loki_labels',
    'healthScore': 'health_score',
    'lastSeenAt': 'last_seen_at',
    'externalId': 'external_id',
}


class CamelCaseInputMixin:
    camel_to_snake = CAMEL_TO_SNAKE

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        for camel_key, snake_key in self.camel_to_snake.items():
            if camel_key in data and snake_key not in data:
                data[snake_key] = data[camel_key]
        return super().to_internal_value(data)


class ConfigurationItemSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    support_group = serializers.SerializerMethodField()
    site = serializers.SerializerMethodField()
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = ConfigurationItem
        fields = [
            'id', 'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'service_name', 'management_ip_address', 'environment',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels', 'health_score', 'last_seen_at', 'external_id', 'metadata',
            'site', 'organization', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_support_group(self, obj):
        if obj.support_group:
            return {'id': str(obj.support_group.id), 'name': obj.support_group.name}
        return None

    def get_site(self, obj):
        if obj.site:
            return {'id': str(obj.site.id), 'name': obj.site.name, 'environment': obj.site.environment}
        return None


class ConfigurationItemCreateSerializer(CamelCaseInputMixin, serializers.ModelSerializer):
    class Meta:
        model = ConfigurationItem
        fields = [
            'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'service_name', 'management_ip_address', 'environment',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels', 'health_score', 'last_seen_at', 'external_id', 'metadata', 'site'
        ]

    def create(self, validated_data):
        request = self.context['request']
        validated_data['organization'] = getattr(request, "organization", None)
        return super().create(validated_data)


class ConfigurationItemUpdateSerializer(CamelCaseInputMixin, serializers.ModelSerializer):
    class Meta:
        model = ConfigurationItem
        fields = [
            'name', 'type', 'status', 'category', 'subcategory', 'description',
            'serial_number', 'asset_tag', 'manufacturer', 'model', 'version',
            'location', 'rack_position', 'data_center', 'ip_address', 'mac_address',
            'hostname', 'fqdn', 'cpu', 'memory', 'storage', 'os', 'os_version',
            'service_name', 'management_ip_address', 'environment',
            'owner', 'support_group', 'vendor', 'purchase_date', 'warranty_expiry',
            'end_of_life', 'end_of_support', 'purchase_cost', 'monthly_cost',
            'cost_center', 'monitoring_enabled', 'prometheus_job', 'grafana_dashboard',
            'loki_labels', 'health_score', 'last_seen_at', 'external_id', 'metadata', 'site'
        ]


class AssetSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetSite
        fields = [
            'id', 'name', 'slug', 'environment', 'location', 'country', 'state',
            'latitude', 'longitude', 'entity_host', 'entity_port', 'entity_secure',
            'websocket_host', 'websocket_port', 'websocket_secure', 'redis_url',
            'prometheus_url', 'grafana_url', 'redmine_url', 'incident_url',
            'status', 'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}


class AssetCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCatalog
        fields = ['id', 'category', 'name', 'parent', 'is_active', 'metadata', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetManagementEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetManagementEndpoint
        fields = [
            'id', 'configuration_item', 'protocol', 'management_ip', 'ilo_ip',
            'port', 'username', 'secret_ref', 'threshold', 'is_active',
            'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'configuration_item': {'required': False}}


class AssetRelationshipSerializer(serializers.ModelSerializer):
    source_ci_detail = ConfigurationItemSerializer(source='source_ci', read_only=True)
    target_ci_detail = ConfigurationItemSerializer(source='target_ci', read_only=True)

    class Meta:
        model = AssetRelationship
        fields = [
            'id', 'source_ci', 'target_ci', 'relationship_type', 'label',
            'source_port', 'target_port', 'metadata', 'source_ci_detail',
            'target_ci_detail', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {'source_ci': {'required': False}}


class AssetPortConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetPortConnection
        fields = [
            'id', 'source_ci', 'target_ci', 'source_modal', 'source_ip',
            'source_port', 'source_name', 'destination_modal', 'destination_ip',
            'destination_port', 'destination_name', 'status', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetDiscoveryResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetDiscoveryResult
        fields = [
            'id', 'site', 'scan_range_start', 'scan_range_end', 'ip_address',
            'hostname', 'asset_type', 'status', 'discovered_data', 'accepted_ci',
            'discovered_at', 'updated_at',
        ]
        read_only_fields = ['id', 'discovered_at', 'updated_at']


class AssetOnboardingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetOnboardingRecord
        fields = [
            'id', 'configuration_item', 'discovery_result', 'site', 'select_host',
            'ip_address', 'sub_ip_address', 'server_type', 'contact_email',
            'service_name', 'path_host', 'hostname', 'physical_ip_address',
            'main_ip_address', 'raw_json', 'raw_text', 'status', 'error_message',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'configuration_item', 'status', 'error_message', 'created_by', 'created_at', 'updated_at']
