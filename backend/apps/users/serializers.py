from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'first_name',
            'last_name',
            'password',
            'birthdate',
            'gender',
            'school',
            'grade',
            'learning_style',
            'study_habits',
            'language_preference',
            'special_education_needs',
            'extra_support',
            'access_to_devices',
            'student_type',
            'learning_goals'
        )

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '').strip()
        last_name = validated_data.pop('last_name', '').strip()
        full_name = validated_data.get('full_name') or ' '.join(filter(None, [first_name, last_name])).strip()

        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=full_name,
            birthdate=validated_data.get('birthdate'),
            gender=validated_data.get('gender', ''),
            school=validated_data.get('school', ''),
            grade=validated_data.get('grade', ''),
            learning_style=validated_data.get('learning_style', ''),
            study_habits=validated_data.get('study_habits', ''),
            language_preference=validated_data.get('language_preference', ''),
            special_education_needs=validated_data.get('special_education_needs', ''),
            extra_support=validated_data.get('extra_support', False),
            access_to_devices=validated_data.get('access_to_devices', ''),
            student_type=validated_data.get('student_type', ''),
            learning_goals=validated_data.get('learning_goals', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'avatar_url',
            'birthdate',
            'gender',
            'school',
            'grade',
            'learning_style',
            'study_habits',
            'language_preference',
            'special_education_needs',
            'extra_support',
            'access_to_devices',
            'student_type',
            'learning_goals',
            'is_verified',
            'is_teacher',
            'is_content_admin',
            'password',
            'new_password'
        )
        read_only_fields = ('id', 'is_verified', 'is_teacher', 'is_content_admin')

    def validate(self, attrs):
        password = attrs.get('password')
        new_password = attrs.get('new_password')

        if password or new_password:
            if not password or not new_password:
                raise serializers.ValidationError(
                    {"password": "Ambos campos 'Contraseña actual' y 'Nueva contraseña' son requeridos para cambiar la contraseña."}
                )
            
            user = self.instance
            if user and not user.check_password(password):
                raise serializers.ValidationError(
                    {"password": "La contraseña actual es incorrecta."}
                )

        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        new_password = validated_data.pop('new_password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if new_password:
            instance.set_password(new_password)

        instance.save()
        return instance
