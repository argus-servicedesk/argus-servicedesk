from django.db import models


class ILLBandwidth(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=[('Internet', 'Internet'), ('MPLS', 'MPLS'), ('Cloud', 'Cloud'), ('VPN', 'VPN'), ('Firewall', 'Firewall'), ('Infrastructure', 'Infrastructure'), ('Management', 'Management')])
    priority = models.CharField(max_length=2, choices=[('P1', 'P1'), ('P2', 'P2'), ('P3', 'P3')])
    capacity_mbps = models.FloatField()
    used_mbps = models.FloatField()
    status = models.CharField(max_length=50, choices=[('active', 'Active'), ('down', 'Down'), ('maintenance', 'Maintenance')])
    timestamp = models.DateTimeField(auto_now_add=True)
    
    @property
    def utilization_percentage(self):
        if self.capacity_mbps == 0:
            return 0
        return (self.used_mbps / self.capacity_mbps) * 100
    
    class Meta:
        ordering = ['-timestamp']
