from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from django.apps import apps
from apps.common.responses import success
from apps.common.mixins import OrgQuerysetMixin
from .engine import WorkflowEngine
from .serializers import TransitionLogSerializer, TransitionRequestSerializer
from .models import TransitionLog


class ValidateTransitionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        module = data['module']
        record_id = data['record_id']
        from_state = data['from_state']
        to_state = data['to_state']
        
        # Fetch record from correct model
        record = self._get_record(module, record_id, request.organization)
        
        # Call WorkflowEngine.validate()
        validation_result = WorkflowEngine.validate(
            module, record, request.user, from_state, to_state
        )
        
        return success({
            "allowed": validation_result["allowed"],
            "errors": validation_result["errors"],
            "missing_fields": validation_result["missing_fields"]
        })
    
    def _get_record(self, module, record_id, org):
        model_map = {
            'INCIDENT': 'incidents.Incident',
            'PROBLEM': 'problems.Problem',
            'CHANGE': 'changes.Change',
        }
        
        model_path = model_map.get(module)
        if not model_path:
            raise ValueError(f"Unknown module: {module}")
        
        app_label, model_name = model_path.split('.')
        model = apps.get_model(app_label, model_name)
        
        return model.objects.filter(organization=org).get(id=record_id)


class ExecuteTransitionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        module = data['module']
        record_id = data['record_id']
        from_state = data['from_state']
        to_state = data['to_state']
        notes = data.get('notes', '')
        field_updates = data.get('field_updates', {})
        
        # Fetch record from correct model
        record = ValidateTransitionView()._get_record(module, record_id, request.organization)
        
        # Call WorkflowEngine.execute()
        transition_log = WorkflowEngine.execute(
            module, record, request.user, request.organization,
            from_state, to_state, notes, field_updates
        )
        
        return success({
            "new_state": record.state,
            "actions_executed": transition_log.actions_executed,
            "log_id": str(transition_log.id)
        })


class TransitionLogListView(OrgQuerysetMixin, ListAPIView):
    organization_lookup = "org"
    serializer_class = TransitionLogSerializer
    permission_classes = [IsAuthenticated]
    queryset = TransitionLog.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        module = self.request.query_params.get('module')
        record_id = self.request.query_params.get('record_id')
        if module:
            queryset = queryset.filter(module=module.upper())
        if record_id:
            queryset = queryset.filter(record_id=record_id)
        return queryset
