from django.core.exceptions import ValidationError
from .definitions import incident, problem, change
from .actions import ACTION_MAP
from .models import TransitionLog


class WorkflowEngine:
    
    @staticmethod
    def get_definition(module, from_state, to_state):
        """Import correct definitions dict based on module string"""
        definitions_map = {
            'INCIDENT': incident.TRANSITIONS,
            'PROBLEM': problem.TRANSITIONS,
            'CHANGE': change.TRANSITIONS,
        }
        
        definitions = definitions_map.get(module)
        if not definitions:
            return None
            
        return definitions.get((from_state, to_state))
    
    @staticmethod
    def validate(module, record, user, from_state, to_state):
        """Returns: { "allowed": bool, "errors": list[str], "missing_fields": list[str] }"""
        result = {
            "allowed": False,
            "errors": [],
            "missing_fields": []
        }
        
        # 1. Get definition
        definition = WorkflowEngine.get_definition(module, from_state, to_state)
        if not definition:
            result["errors"].append("Invalid transition")
            return result
        
        # 2. Check system_only
        if definition.get("system_only", False):
            # For now, assume all calls are user-initiated
            result["errors"].append("This transition can only be performed by the system")
            return result
        
        # 3. Check min_role
        min_role = definition.get("min_role")
        if min_role:
            role_hierarchy = {"ENGINEER": 1, "MANAGER": 2, "ADMIN": 3}
            user_role_level = role_hierarchy.get(getattr(user, 'role', 'ENGINEER'), 1)
            min_role_level = role_hierarchy.get(min_role, 1)
            
            if user_role_level < min_role_level:
                result["errors"].append(f"Minimum role required: {min_role}")
                return result
        
        # 4. Check required_fields
        required_fields = definition.get("required_fields", [])
        for field in required_fields:
            value = getattr(record, field, None)
            if value is None or (isinstance(value, str) and not value.strip()):
                result["missing_fields"].append(field)
        
        # 5. Return result
        # allowed=True even with missing_fields — frontend shows modal to collect them
        # allowed=False only when there are hard errors (permission, invalid transition)
        if not result["errors"]:
            result["allowed"] = True

        return result
    @staticmethod
    def execute(module, record, user, org, from_state, to_state, notes="", field_updates={}):
        """Execute workflow transition"""
        # 1. Validate
        validation = WorkflowEngine.validate(module, record, user, from_state, to_state)
        if not validation["allowed"]:
            raise ValidationError(validation["errors"])
        
        # 2. Apply field_updates to record
        for field, value in field_updates.items():
            setattr(record, field, value)
        
        # 3. Set record.state = to_state
        record.state = to_state
        
        # 4. Save record
        record.save()
        
        # 5. Run each action in definition["actions"]
        definition = WorkflowEngine.get_definition(module, from_state, to_state)
        actions_executed = []
        
        for action_name in definition.get("actions", []):
            action_func = ACTION_MAP.get(action_name)
            if action_func:
                try:
                    action_func(record, user, org, {"notes": notes, "field_updates": field_updates})
                    actions_executed.append(action_name)
                except Exception as e:
                    # Log error but continue with other actions
                    actions_executed.append(f"{action_name} (failed: {str(e)})")
        
        # 6. Create TransitionLog entry
        transition_log = TransitionLog.objects.create(
            org=org,
            module=module,
            record_id=record.id,
            record_number=getattr(record, 'number', str(record.id)),
            from_state=from_state,
            to_state=to_state,
            transitioned_by=user,
            notes=notes,
            actions_executed=actions_executed,
            success=True
        )
        
        # 7. Return TransitionLog instance
        return transition_log