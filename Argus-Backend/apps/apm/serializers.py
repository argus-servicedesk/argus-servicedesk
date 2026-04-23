from rest_framework import serializers
from .models import APMMetric


class APMMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = APMMetric
        fields = '__all__'
