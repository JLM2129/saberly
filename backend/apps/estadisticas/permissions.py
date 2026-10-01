from rest_framework import permissions

class IsSchoolMember(permissions.BasePermission):
    """
    Permite el acceso a docentes y administradores.
    Si es un docente normal, verifica sus permisos de docente.
    Si es un administrador (staff/superuser/content_admin), se concede acceso global.
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        
        # Permitir a administradores globales sin importar si tienen 'school' definido
        if user.is_staff or user.is_superuser or user.is_content_admin:
            return True

        # Para docentes normales, requerir is_teacher=True
        return bool(user.is_teacher)

class IsSaberlyAdmin(permissions.BasePermission):
    """
    Permite el acceso solo a administradores globales de Saberly (Content Admin, Staff o Superuser).
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and 
            user.is_authenticated and 
            (user.is_content_admin or user.is_staff or user.is_superuser)
        )
