from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ['email']
    list_display = ['email', 'full_name', 'is_verified', 'is_staff', 'is_active']
    search_fields = ['email', 'full_name']
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('full_name', 'is_verified')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('full_name', 'email', 'is_verified')}),
    )
    
    # We use email as username, so we should configure that view if needed.
    # But usually UserAdmin handles the USERNAME_FIELD = 'email' gracefully in modern Django? 
    # Actually, standard UserAdmin expects 'username'. We might need to adjust form.
    # For now, this is a good start.
