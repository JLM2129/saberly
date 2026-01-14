from apps.preguntas.models import Area, Contexto, Pregunta

def asegurar_contexto_por_area():
    """
    Crea un contexto genérico por área si no existe.
    """
    creados = 0
    for area in Area.objects.all():
        _, created = Contexto.objects.get_or_create(
            area=area,
            tipo='texto',
            titulo=f'Contexto general para {area.nombre}',
            defaults={
                'contenido': f'Este es un contexto genérico para el área {area.nombre}.',
                'orden': 999
            }
        )
        if created:
            creados += 1
    return creados


def asignar_contextos_a_preguntas():
    """
    Asigna el contexto de menor orden disponible por área.
    """
    asignadas = 0

    preguntas = Pregunta.objects.filter(contexto__isnull=True).select_related('area')

    for pregunta in preguntas:
        contexto = (
            Contexto.objects
            .filter(area=pregunta.area)
            .order_by('orden')
            .first()
        )

        if contexto:
            pregunta.contexto = contexto
            pregunta.save(update_fields=['contexto'])
            asignadas += 1

    return asignadas
