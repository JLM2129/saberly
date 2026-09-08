from rest_framework.throttling import ScopedRateThrottle


class TutorAIThrottle(ScopedRateThrottle):
    scope = 'ai'