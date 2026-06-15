from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from django.contrib.auth.models import BaseUserManager

GENDER_CHOICES = [
    ('male', 'Masculino'),
    ('female', 'Femenino'),
    ('non_binary', 'No binario'),
    ('prefer_not_to_say', 'Prefiero no decirlo'),
]

LEARNING_STYLE_CHOICES = [
    ('visual', 'Visual'),
    ('auditory', 'Auditivo'),
    ('kinesthetic', 'Kinestésico'),
    ('mixed', 'Mixto'),
    ('not_sure', 'No estoy seguro'),
]

LANGUAGE_PREFERENCE_CHOICES = [
    ('spanish', 'Español'),
    ('english', 'Inglés'),
    ('other', 'Otro'),
]

DEVICE_ACCESS_CHOICES = [
    ('home_computer', 'Computadora en casa'),
    ('mobile_only', 'Solo móvil'),
    ('shared_device', 'Dispositivo compartido'),
    ('limited_access', 'Acceso limitado'),
    ('no_access', 'Sin acceso'),
]

STUDENT_TYPE_CHOICES = [
    ('regular', 'Alumno regular'),
    ('remedial', 'Refuerzo'),
    ('recovery', 'Recuperación'),
    ('other', 'Otro'),
]

class CustomUserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifiers
    for authentication instead of usernames.
    """
    def create_user(self, email, password, **extra_fields):
        """
        Create and save a User with the given email and password.
        """
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Create and save a SuperUser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    is_teacher = models.BooleanField(
        default=False, 
        help_text='Designa si este usuario es docente y puede agregar preguntas'
    )
    is_content_admin = models.BooleanField(
        default=False,
        help_text='Designa si este usuario puede realizar importaciones masivas de contenido'
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        help_text='URL del avatar seleccionado por el usuario'
    )
    birthdate = models.DateField(
        blank=True,
        null=True,
        help_text='Fecha de nacimiento del estudiante'
    )
    gender = models.CharField(
        max_length=30,
        choices=GENDER_CHOICES,
        blank=True,
        help_text='Género informado por el usuario'
    )
    school = models.CharField(
        max_length=255,
        blank=True,
        help_text='Institución educativa'
    )
    grade = models.CharField(
        max_length=100,
        blank=True,
        help_text='Grado o curso escolar'
    )
    learning_style = models.CharField(
        max_length=30,
        choices=LEARNING_STYLE_CHOICES,
        blank=True,
        help_text='Estilo de aprendizaje preferido'
    )
    study_habits = models.CharField(
        max_length=255,
        blank=True,
        help_text='Hábitos de estudio'
    )
    language_preference = models.CharField(
        max_length=30,
        choices=LANGUAGE_PREFERENCE_CHOICES,
        blank=True,
        help_text='Idioma preferido para el aprendizaje'
    )
    special_education_needs = models.TextField(
        blank=True,
        help_text='Necesidades educativas especiales o apoyos requeridos'
    )
    extra_support = models.BooleanField(
        default=False,
        help_text='El usuario recibe apoyo adicional fuera del aula'
    )
    access_to_devices = models.CharField(
        max_length=30,
        choices=DEVICE_ACCESS_CHOICES,
        blank=True,
        help_text='Acceso a dispositivos y conectividad'
    )
    student_type = models.CharField(
        max_length=30,
        choices=STUDENT_TYPE_CHOICES,
        blank=True,
        help_text='Tipo de estudiante según su trayectoria académica'
    )
    learning_goals = models.TextField(
        blank=True,
        help_text='Objetivos de aprendizaje del usuario'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email
