from rest_framework.pagination import PageNumberPagination


class PreguntasPagination(PageNumberPagination):
    """
    Paginación del banco de preguntas.

    No se declara como DEFAULT_PAGINATION_CLASS a propósito: el panel docente
    consume /api/preguntas/areas/ esperando una lista plana, y paginar todos los
    endpoints de golpe dejaría vacío el selector de áreas.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200
