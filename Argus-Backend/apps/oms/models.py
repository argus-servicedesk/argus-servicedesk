from django.db import models


class Order(models.Model):
    order_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50, choices=[('pending', 'Pending'), ('processed', 'Processed'), ('failed', 'Failed')])
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
