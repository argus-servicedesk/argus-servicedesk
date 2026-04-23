from django.db import models


class APMMetric(models.Model):
    name = models.CharField(max_length=255)
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
