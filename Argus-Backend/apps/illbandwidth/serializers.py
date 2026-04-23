from rest_framework import serializers
from .models import ILLBandwidth


class ILLBandwidthSerializer(serializers.ModelSerializer):
    utilization_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = ILLBandwidth
        fields = '__all__'
