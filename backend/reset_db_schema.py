import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def reset_schema():
    print("Resetting database schema...")
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
    print("Schema reset complete.")

if __name__ == '__main__':
    reset_schema()
