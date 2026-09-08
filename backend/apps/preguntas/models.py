from django.db import models
from django.conf import settings
from django.utils import timezone
import random

class Area(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Área'
        verbose_name_plural = 'Áreas'


class SubArea(models.Model):
    """Mantiene compatibilidad con estructura anterior"""
    area = models.ForeignKey(Area, related_name='subareas', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.area.nombre} - {self.nombre}"

    class Meta:
        verbose_name = 'Sub-área'
        verbose_name_plural = 'Sub-áreas'


class Contexto(models.Model):
    """
    Contexto compartido para preguntas del ICFES.
    Puede ser un texto, imagen, tabla o gráfica que sirve para varias preguntas.
    """
    TIPO_CONTEXTO = [
        ('texto', 'Texto'),
        ('imagen', 'Imagen'),
        ('tabla', 'Tabla'),
        ('grafica', 'Gráfica'),
        ('audio', 'Audio'),
    ]

    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='contextos')
    tipo = models.CharField(max_length=50, choices=TIPO_CONTEXTO)
    titulo = models.CharField(max_length=200, blank=True, help_text="Título del contexto")
    contenido = models.TextField(
        help_text="Texto del contexto o descripción si es imagen/gráfica/tabla"
    )
    archivo = models.ImageField(
        upload_to='contextos/',
        null=True,
        blank=True,
        help_text="Opcional: imagen, tabla o gráfica"
    )
    url_externa = models.URLField(
        blank=True,
        null=True,
        help_text="URL alternativa para recursos externos"
    )

    def __str__(self):
        return f"{self.area.nombre} - {self.tipo} - {self.titulo or 'Sin título'}"

    class Meta:
        verbose_name = 'Contexto'
        verbose_name_plural = 'Contextos'


class Pregunta(models.Model):
    """
    Pregunta del ICFES con soporte para múltiples tipos y contextos.
    """
    TIPO_PREGUNTA = [
        ('seleccion_unica', 'Selección múltiple única'),
        ('asociada_contexto', 'Asociada a contexto'),
        ('interpretacion', 'Interpretación de datos'),
        ('analisis', 'Análisis de situación'),
        ('inferencia', 'Inferencia'),
        ('error_conceptual', 'Identificación de error'),
        ('lectura_critica', 'Lectura crítica'),
        ('razonamiento_cuantitativo', 'Razonamiento cuantitativo'),
        ('ingles_parte1', 'Inglés - Parte 1 (Léxico)'),
        ('ingles_parte2', 'Inglés - Parte 2 (Avisos)'),
        ('ingles_parte3', 'Inglés - Parte 3 (Conversación)'),
        ('ingles_parte4', 'Inglés - Parte 4 (Gramática)'),
        ('ingles_parte5', 'Inglés - Parte 5 (Comprensión)'),
        ('ingles_parte6', 'Inglés - Parte 6 (Inferencial)'),
        ('ingles_parte7', 'Inglés - Parte 7 (Léxico/Gramática)'),
    ]
    
    DIFICULTAD_CHOICES = [
        ('facil', 'Fácil'),
        ('media', 'Media'),
        ('dificil', 'Difícil'),
    ]

    COMPETENCIA_CHOICES = [
        ('interpretar', 'Interpretar'),
        ('argumentar', 'Argumentar'),
        ('proponer', 'Proponer'),
        ('modelar', 'Modelar'),
        ('razonar', 'Razonar'),
        ('comunicar', 'Comunicar'),
        ('inferir', 'Inferir'),
        ('analizar', 'Analizar'),
    ]

    # Relaciones
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='preguntas')
    subarea = models.ForeignKey(
        SubArea,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preguntas',
        help_text="Opcional: para compatibilidad con estructura anterior"
    )
    contexto = models.ForeignKey(
        Contexto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preguntas',
        help_text="Contexto compartido (texto, imagen, tabla, etc.)"
    )

    # Campos principales
    enunciado = models.TextField(help_text="Texto de la pregunta")
    tipo = models.CharField(max_length=30, choices=TIPO_PREGUNTA, default='seleccion_unica')
    dificultad = models.CharField(max_length=20, choices=DIFICULTAD_CHOICES, default='media')
    competencia = models.CharField(
        max_length=100,
        choices=COMPETENCIA_CHOICES,
        default='interpretar',
        help_text="Competencia que evalúa la pregunta"
    )
    
    # Campos adicionales
    explicacion = models.TextField(
        blank=True,
        help_text="Explicación de la respuesta correcta"
    )
    imagen_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL de imagen específica de la pregunta (si aplica)"
    )
    active = models.BooleanField(default=True)
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.subarea:
            return f"{self.subarea.nombre} - {self.enunciado[:50]}"
        return f"{self.area.nombre} - {self.enunciado[:50]}"

    def obtener_opciones_aleatorias(self):
        """
        Retorna las opciones en orden aleatorio con letras asignadas.
        """
        opciones = list(self.opciones.all())
        random.shuffle(opciones)
        
        letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        return {
            letras[i]: opciones[i]
            for i in range(min(len(opciones), len(letras)))
        }

    class Meta:
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['-created_at']


class OpcionRespuesta(models.Model):
    """
    Opción de respuesta para una pregunta.
    Soporta múltiples opciones (A-H para inglés Parte 1, por ejemplo).
    """
    pregunta = models.ForeignKey(
        Pregunta,
        related_name='opciones',
        on_delete=models.CASCADE
    )
    texto = models.TextField()
    es_correcta = models.BooleanField(default=False)
    orden = models.IntegerField(
        default=0,
        help_text="Orden de presentación (0 para aleatorio)"
    )

    def __str__(self):
        return f"{self.texto[:50]} - {'✓' if self.es_correcta else '✗'}"

    class Meta:
        verbose_name = 'Opción de respuesta'
        verbose_name_plural = 'Opciones de respuesta'
        ordering = ['orden', 'id']


class Flashcard(models.Model):
    """
    Cartas de estudio generadas por IA basadas en errores del usuario.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcards'
    )
    pregunta_relacionada = models.ForeignKey(
        Pregunta,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='flashcards_generadas'
    )
    frente = models.TextField()
    dorso = models.TextField()
    debilidad = models.CharField(max_length=150, blank=True, default='')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Flashcard - {self.user.username} - {self.fecha_creacion.date()}"

    class Meta:
        verbose_name = 'Flashcard'
        verbose_name_plural = 'Flashcards'
        ordering = ['-fecha_creacion']


class SesionEntrenamiento(models.Model):
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sesiones_entrenamiento'
    )
    debilidad = models.CharField(max_length=150)
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='sesiones_entrenamiento')
    nivel_inicial = models.CharField(max_length=20, choices=Pregunta.DIFICULTAD_CHOICES, default='facil')
    nivel_actual = models.CharField(max_length=20, choices=Pregunta.DIFICULTAD_CHOICES, default='facil')
    preguntas_generadas = models.IntegerField(default=0)
    intentos_totales = models.IntegerField(default=0)
    aciertos_totales = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    creada_at = models.DateTimeField(auto_now_add=True)
    finalizada_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creada_at']


class PreguntaIA(models.Model):
    """
    Pregunta dinámica generada por IA para refuerzo personalizado.
    """
    ESTADO_VALIDACION_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preguntas_ia'
    )
    sesion = models.ForeignKey(
        SesionEntrenamiento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preguntas'
    )
    debilidad_objetivo = models.CharField(
        max_length=150,
        help_text="Concepto o tema de debilidad específica, e.g. proporcionalidad"
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='preguntas_ia'
    )
    enunciado = models.TextField(help_text="Texto de la pregunta generada")
    dificultad = models.CharField(
        max_length=20,
        choices=Pregunta.DIFICULTAD_CHOICES,
        default='media'
    )
    pista = models.TextField(blank=True, help_text="Scaffolding Nivel 1: pista socrática")
    ejemplo = models.TextField(blank=True, help_text="Scaffolding Nivel 2: ejemplo resuelto")
    explicacion = models.TextField(blank=True, help_text="Scaffolding Nivel 3: explicación completa")
    
    # Metadatos e indicadores pedagógicos
    tasa_exito = models.FloatField(default=0.0, help_text="Tasa de éxito del estudiante en esta pregunta")
    veces_respondida = models.IntegerField(default=0)
    veces_correcta = models.IntegerField(default=0)
    
    estado_validacion = models.CharField(
        max_length=20,
        choices=ESTADO_VALIDACION_CHOICES,
        default='pendiente'
    )
    promocionada = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PreguntaIA - {self.usuario.username} - {self.debilidad_objetivo} - {self.enunciado[:50]}"

    class Meta:
        verbose_name = 'Pregunta IA'
        verbose_name_plural = 'Preguntas IA'
        ordering = ['-created_at']


class OpcionRespuestaIA(models.Model):
    """
    Opción de respuesta para una pregunta IA.
    """
    pregunta_ia = models.ForeignKey(
        PreguntaIA,
        related_name='opciones',
        on_delete=models.CASCADE
    )
    texto = models.TextField()
    es_correcta = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.texto[:50]} - {'✓' if self.es_correcta else '✗'}"

    class Meta:
        verbose_name = 'Opción de respuesta IA'
        verbose_name_plural = 'Opciones de respuesta IA'


class IntentoEntrenamiento(models.Model):
    sesion = models.ForeignKey(SesionEntrenamiento, on_delete=models.CASCADE, related_name='intentos')
    pregunta_ia = models.ForeignKey(PreguntaIA, on_delete=models.CASCADE, related_name='intentos')
    opcion_seleccionada = models.ForeignKey(OpcionRespuestaIA, on_delete=models.SET_NULL, null=True, blank=True)
    numero_intento = models.PositiveSmallIntegerField()
    es_correcta = models.BooleanField(default=False)
    pista_utilizada = models.BooleanField(default=False)
    ejemplo_utilizado = models.BooleanField(default=False)
    explicacion_mostrada = models.BooleanField(default=False)
    tiempo_respuesta_ms = models.PositiveIntegerField(null=True, blank=True)
    creado_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['creado_at']
        constraints = [
            models.UniqueConstraint(
                fields=['pregunta_ia', 'numero_intento'],
                name='unique_pregunta_ia_intento'
            )
        ]


class ProgresoDebilidad(models.Model):
    """
    Progreso detallado del estudiante para una debilidad específica.
    """
    NIVEL_CHOICES = [
        ('bajo', 'Bajo'),
        ('medio', 'Medio'),
        ('alto', 'Alto'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='progresos_debilidades'
    )
    debilidad = models.CharField(max_length=150)
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='progresos_debilidades'
    )
    intentos_totales = models.IntegerField(default=0)
    aciertos_totales = models.IntegerField(default=0)
    porcentaje_mejora = models.FloatField(
        default=0.0,
        help_text="Mejora porcentual de precisión reciente vs histórica"
    )
    precision_reciente = models.FloatField(
        default=0.0,
        help_text="Precisión de los últimos cinco intentos"
    )
    racha_actual = models.IntegerField(default=0)
    microvictorias = models.IntegerField(default=0)
    nivel_actual = models.CharField(
        max_length=20,
        choices=NIVEL_CHOICES,
        default='bajo'
    )
    historial_recuperacion = models.JSONField(
        default=list,
        help_text="Historial de intentos: [{'fecha': '...', 'es_correcta': bool, 'dificultad': '...'}]"
    )
    ultimo_entrenamiento = models.DateTimeField(auto_now=True)

    def calcular_precision(self):
        if self.intentos_totales == 0:
            return 0.0
        return (self.aciertos_totales / self.intentos_totales) * 100.0

    def registrar_intento(self, es_correcta, dificultad='media', tipo_error=None, origen='entrenamiento'):
        historial_anterior = list(self.historial_recuperacion or [])
        resultados_anteriores = [bool(item.get('es_correcta')) for item in historial_anterior[-5:]]
        precision_anterior = self.calcular_precision()

        self.intentos_totales += 1
        if es_correcta:
            self.aciertos_totales += 1
            self.racha_actual += 1
        else:
            self.racha_actual = 0

        self.historial_recuperacion = historial_anterior + [{
            'fecha': timezone.now().isoformat(),
            'es_correcta': bool(es_correcta),
            'dificultad': dificultad,
            'tipo_error': tipo_error,
            'origen': origen,
        }]
        resultados_recientes = resultados_anteriores + [bool(es_correcta)]
        self.precision_reciente = (
            sum(resultados_recientes) / len(resultados_recientes) * 100.0
            if resultados_recientes else 0.0
        )
        self.porcentaje_mejora = self.precision_reciente - precision_anterior
        if es_correcta and (self.racha_actual == 1 or self.precision_reciente >= 75.0):
            self.microvictorias += 1

        precision_nueva = self.calcular_precision()
        if precision_nueva >= 75.0 and self.intentos_totales >= 4:
            self.nivel_actual = 'alto'
        elif precision_nueva >= 45.0:
            self.nivel_actual = 'medio'
        else:
            self.nivel_actual = 'bajo'

        self.save()

    def __str__(self):
        return f"{self.usuario.username} - {self.debilidad} - Nivel {self.nivel_actual}"

    class Meta:
        verbose_name = 'Progreso de Debilidad'
        verbose_name_plural = 'Progresos de Debilidades'
        unique_together = ('usuario', 'debilidad')

