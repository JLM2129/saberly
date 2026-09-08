from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('preguntas', '0005_preguntaia_opcionrespuestaia_progresodebilidad'),
    ]

    operations = [
        migrations.AddField(
            model_name='progresodebilidad',
            name='microvictorias',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='progresodebilidad',
            name='precision_reciente',
            field=models.FloatField(default=0.0, help_text='Precisión de los últimos cinco intentos'),
        ),
        migrations.AddField(
            model_name='progresodebilidad',
            name='racha_actual',
            field=models.IntegerField(default=0),
        ),
    ]