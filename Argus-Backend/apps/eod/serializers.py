from rest_framework import serializers
from .models import EODTask


class EODTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = EODTask
        fields = '__all__'
