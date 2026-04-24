from rest_framework import serializers
from .models import TransitionLog


class TransitionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransitionLog
        fields = '__all__'
        read_only_fields = '__all__'


class TransitionRequestSerializer(serializers.Serializer):
    module = serializers.ChoiceField(choices=['INCIDENT', 'PROBLEM', 'CHANGE'])
    record_id = serializers.UUIDField()
    from_state = serializers.CharField(max_length=50)
    to_state = serializers.CharField(max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True)
    field_updates = serializers.DictField(required=False, default=dict)
    
    def validate(self, data):
        # Additional validation can be added here
        return data