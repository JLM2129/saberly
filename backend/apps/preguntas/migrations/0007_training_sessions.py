from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('preguntas', '0006_progresodebilidad_metrics'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SesionEntrenamiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('debilidad', models.CharField(max_length=150)),
                ('nivel_inicial', models.CharField(choices=[('facil', 'Fácil'), ('media', 'Media'), ('dificil', 'Difícil')], default='facil', max_length=20)),
                ('nivel_actual', models.CharField(choices=[('facil', 'Fácil'), ('media', 'Media'), ('dificil', 'Difícil')], default='facil', max_length=20)),
                ('preguntas_generadas', models.IntegerField(default=0)),
                ('intentos_totales', models.IntegerField(default=0)),
                ('aciertos_totales', models.IntegerField(default=0)),
                ('estado', models.CharField(choices=[('activa', 'Activa'), ('completada', 'Completada'), ('cancelada', 'Cancelada')], default='activa', max_length=20)),
                ('creada_at', models.DateTimeField(auto_now_add=True)),
                ('finalizada_at', models.DateTimeField(blank=True, null=True)),
                ('area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sesiones_entrenamiento', to='preguntas.area')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sesiones_entrenamiento', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-creada_at']},
        ),
        migrations.AddField(
            model_name='preguntaia',
            name='sesion',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='preguntas', to='preguntas.sesionentrenamiento'),
        ),
        migrations.CreateModel(
            name='IntentoEntrenamiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_intento', models.PositiveSmallIntegerField()),
                ('es_correcta', models.BooleanField(default=False)),
                ('pista_utilizada', models.BooleanField(default=False)),
                ('ejemplo_utilizado', models.BooleanField(default=False)),
                ('explicacion_mostrada', models.BooleanField(default=False)),
                ('tiempo_respuesta_ms', models.PositiveIntegerField(blank=True, null=True)),
                ('creado_at', models.DateTimeField(auto_now_add=True)),
                ('opcion_seleccionada', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='preguntas.opcionrespuestaia')),
                ('pregunta_ia', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intentos', to='preguntas.preguntaia')),
                ('sesion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intentos', to='preguntas.sesionentrenamiento')),
            ],
            options={'ordering': ['creado_at']},
        ),
        migrations.AddConstraint(
            model_name='intentoentrenamiento',
            constraint=models.UniqueConstraint(fields=('pregunta_ia', 'numero_intento'), name='unique_pregunta_ia_intento'),
        ),
    ]