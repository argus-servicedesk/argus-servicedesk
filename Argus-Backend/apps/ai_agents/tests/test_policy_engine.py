from django.test import TestCase
from apps.ai_agents.policy.policy_engine import PolicyEngine
from apps.ai_agents.schemas import SuggestedAction, CIMetrics
from apps.incidents.models import Incident
from apps.organizations.models import Organization
from apps.accounts.models import User


class PolicyEngineTestCase(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(
            username="test",
            email="test@test.com",
            password="test",
            organization=self.org
        )
        
    def test_policy_allows_low_risk_p3_incident(self):
        """Test that P3 incident with low-risk actions is allowed"""
        incident = Incident.objects.create(
            number="INC001",
            short_description="Test",
            priority="P3",
            organization=self.org,
            created_by=self.user
        )
        
        actions = [
            SuggestedAction(
                action="Add timeline note",
                risk="low",
                auto_executable=True,
                reason="Safe operation"
            )
        ]
        
        ci_metrics = CIMetrics(is_critical=False)
        
        engine = PolicyEngine()
        result = engine.evaluate(incident, actions, ci_metrics, 0.8)
        
        self.assertTrue(result.allowed)
        self.assertEqual(len(result.blocked_reasons), 0)
    
    def test_policy_blocks_p1_incident(self):
        """Test that P1 incident is blocked"""
        incident = Incident.objects.create(
            number="INC002",
            short_description="Test",
            priority="P1",
            organization=self.org,
            created_by=self.user
        )
        
        actions = [
            SuggestedAction(
                action="Add timeline note",
                risk="low",
                auto_executable=True,
                reason="Safe operation"
            )
        ]
        
        ci_metrics = CIMetrics(is_critical=False)
        
        engine = PolicyEngine()
        result = engine.evaluate(incident, actions, ci_metrics, 0.8)
        
        self.assertFalse(result.allowed)
        self.assertIn("priority", result.blocked_reasons[0].lower())
    
    def test_policy_blocks_critical_ci(self):
        """Test that critical CI blocks execution"""
        incident = Incident.objects.create(
            number="INC003",
            short_description="Test",
            priority="P3",
            organization=self.org,
            created_by=self.user
        )
        
        actions = [
            SuggestedAction(
                action="Add timeline note",
                risk="low",
                auto_executable=True,
                reason="Safe operation"
            )
        ]
        
        ci_metrics = CIMetrics(is_critical=True)
        
        engine = PolicyEngine()
        result = engine.evaluate(incident, actions, ci_metrics, 0.8)
        
        self.assertFalse(result.allowed)
        self.assertIn("critical", result.blocked_reasons[0].lower())
    
    def test_policy_blocks_low_confidence(self):
        """Test that low confidence blocks execution"""
        incident = Incident.objects.create(
            number="INC004",
            short_description="Test",
            priority="P3",
            organization=self.org,
            created_by=self.user
        )
        
        actions = [
            SuggestedAction(
                action="Add timeline note",
                risk="low",
                auto_executable=True,
                reason="Safe operation"
            )
        ]
        
        ci_metrics = CIMetrics(is_critical=False)
        
        engine = PolicyEngine()
        result = engine.evaluate(incident, actions, ci_metrics, 0.5)  # Low confidence
        
        self.assertFalse(result.allowed)
        self.assertIn("confidence", result.blocked_reasons[0].lower())
