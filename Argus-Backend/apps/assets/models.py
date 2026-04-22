import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization

User = get_user_model()


class ConfigurationItem(models.Model):
    class Type(models.TextChoices):
        SERVER = "SERVER", "Server"
        KUBERNETES_CLUSTER = "KUBERNETES_CLUSTER", "Kubernetes Cluster"
        DATABASE = "DATABASE", "Database"
        APPLICATION = "APPLICATION", "Application"
        NETWORK = "NETWORK", "Network"
        STORAGE = "STORAGE", "Storage"
        CONTAINER = "CONTAINER", "Container"
        VM = "VM", "Virtual Machine"
        LOAD_BALANCER = "LOAD_BALANCER", "Load Balancer"

    class Status(models.TextChoices):
        LIVE = "LIVE", "Live"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        DECOMMISSIONED = "DECOMMISSIONED", "Decommissioned"
        PLANNED = "PLANNED", "Planned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    type = models.CharField(max_length=30, choices=Type.choices, default=Type.SERVER, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LIVE, db_index=True)
    
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    serial_number = models.CharField(max_length=255, blank=True, null=True)
    asset_tag = models.CharField(max_length=255, blank=True, null=True)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    model = models.CharField(max_length=255, blank=True, null=True)
    version = models.CharField(max_length=255, blank=True, null=True)
    
    location = models.CharField(max_length=255, blank=True, null=True)
    rack_position = models.CharField(max_length=100, blank=True, null=True)
    data_center = models.CharField(max_length=255, blank=True, null=True)
    
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    mac_address = models.CharField(max_length=255, blank=True, null=True)
    hostname = models.CharField(max_length=255, blank=True, null=True)
    fqdn = models.CharField(max_length=255, blank=True, null=True)
    
    cpu = models.CharField(max_length=255, blank=True, null=True)
    memory = models.CharField(max_length=255, blank=True, null=True)
    storage = models.CharField(max_length=255, blank=True, null=True)
    
    os = models.CharField(max_length=255, blank=True, null=True)
    os_version = models.CharField(max_length=255, blank=True, null=True)
    
    owner = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_assets')
    support_group = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='supported_assets')
    
    vendor = models.CharField(max_length=255, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    warranty_expiry = models.DateField(blank=True, null=True)
    end_of_life = models.DateField(blank=True, null=True)
    end_of_support = models.DateField(blank=True, null=True)
    
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    monthly_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cost_center = models.CharField(max_length=100, blank=True, null=True)
    
    monitoring_enabled = models.BooleanField(default=True)
    prometheus_job = models.CharField(max_length=255, blank=True, null=True)
    grafana_dashboard = models.CharField(max_length=255, blank=True, null=True)
    loki_labels = models.JSONField(blank=True, null=True)
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='assets')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "configuration_items"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["type", "status"]),
            models.Index(fields=["hostname"]),
            models.Index(fields=["ip_address"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.type})"
