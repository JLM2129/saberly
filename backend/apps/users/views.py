from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserRegistrationSerializer, UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class PasswordResetRequestView(views.APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        # Logic to send email would go here.
        # For now, just simulate success.
        if User.objects.filter(email=email).exists():
             return Response({"message": "If the email exists, a reset link has been sent."}, status=status.HTTP_200_OK)
        return Response({"message": "If the email exists, a reset link has been sent."}, status=status.HTTP_200_OK)

class EmailVerifyView(views.APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        # Logic to verify token
        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
