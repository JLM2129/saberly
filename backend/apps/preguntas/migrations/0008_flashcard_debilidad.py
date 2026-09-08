from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('preguntas', '0007_training_sessions'),
    ]

    operations = [
        migrations.AddField(
            model_name='flashcard',
            name='debilidad',
            field=models.CharField(default='', max_length=150),
        ),
    ]