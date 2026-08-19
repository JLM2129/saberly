import json
import zipfile
from io import BytesIO
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.preguntas.models import Area, Pregunta, OpcionRespuesta, Contexto

User = get_user_model()

class ImageAndTeacherApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(nombre="Matemáticas", descripcion="Área de prueba")
        
        self.teacher_user = User.objects.create_user(
            email="teacher@test.com",
            password="password123",
            first_name="Docente",
            is_teacher=True
        )
        
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="password123",
            first_name="Admin",
            is_content_admin=True,
            is_staff=True
        )

    def test_upload_image_api_success(self):
        self.client.force_authenticate(user=self.teacher_user)
        image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        uploaded_file = SimpleUploadedFile("test_img.png", image_content, content_type="image/png")
        
        response = self.client.post('/api/preguntas/upload-image/', {'image': uploaded_file}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get('status'), 'success')
        self.assertTrue(response.data.get('url').startswith('/media/imagenes/'))
        self.assertTrue(response.data.get('relative_path').startswith('imagenes/'))

    def test_teacher_pregunta_create_and_update_with_image(self):
        self.client.force_authenticate(user=self.teacher_user)
        
        # 1. Crear pregunta
        payload = {
            "area": self.area.id,
            "enunciado": "¿Cuánto es 5 x 5?",
            "tipo": "seleccion_unica",
            "dificultad": "media",
            "competencia": "interpretar",
            "explicacion": "5 por 5 es 25",
            "imagen_url": "imagenes/tabla5.png",
            "opciones": [
                {"texto": "20", "es_correcta": False, "orden": 0},
                {"texto": "25", "es_correcta": True, "orden": 1}
            ],
            "contexto_data": {
                "tipo": "imagen",
                "titulo": "Tabla de multiplicar",
                "contenido": "Ver gráfica de multiplicación",
                "archivo": "imagenes/contexto_tabla.png"
            }
        }
        
        response = self.client.post('/api/preguntas/teacher/', payload, format='json')
        if response.status_code != 201:
            print("CREATE ERROR RESPONSE:", response.data)
        self.assertEqual(response.status_code, 201)
        pregunta_id = response.data['id']
        
        # Verificar persistencia
        pregunta = Pregunta.objects.get(id=pregunta_id)
        self.assertEqual(pregunta.imagen_url, "imagenes/tabla5.png")
        self.assertIsNotNone(pregunta.contexto)
        self.assertEqual(pregunta.contexto.archivo, "imagenes/contexto_tabla.png")
        
        # 2. Actualizar pregunta (PUT)
        payload["enunciado"] = "¿Cuánto es 5 x 5 actualizado?"
        payload["imagen_url"] = "imagenes/tabla5_nueva.png"
        payload["opciones"] = [
            {"texto": "20", "es_correcta": False, "orden": 0},
            {"texto": "25", "es_correcta": True, "orden": 1},
            {"texto": "30", "es_correcta": False, "orden": 2}
        ]
        
        update_res = self.client.put(f'/api/preguntas/teacher/{pregunta_id}/', payload, format='json')
        self.assertEqual(update_res.status_code, 200)
        
        pregunta.refresh_from_db()
        self.assertEqual(pregunta.enunciado, "¿Cuánto es 5 x 5 actualizado?")
        self.assertEqual(pregunta.imagen_url, "imagenes/tabla5_nueva.png")
        self.assertEqual(pregunta.opciones.count(), 3)

    def test_import_confirm_with_zip_and_images(self):
        self.client.force_authenticate(user=self.admin_user)
        
        json_data = {
            "nombre": "Matemáticas",
            "contextos": [
                {
                    "tipo": "imagen",
                    "contexto": "Gráfica de prueba",
                    "archivo": "imagenes/grafica_zip.png",
                    "preguntas": [
                        {
                            "enunciado": "¿Qué representa la gráfica?",
                            "tipo": "seleccion_unica",
                            "dificultad": "media",
                            "competencia": "interpretar",
                            "explicacion": "Explicación de la gráfica",
                            "imagen_url": "imagenes/pregunta_img.png",
                            "opciones": [
                                {"texto": "Opción A", "es_correcta": True},
                                {"texto": "Opción B", "es_correcta": False}
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Crear archivo ZIP en memoria
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('preguntas.json', json.dumps(json_data).encode('utf-8'))
            zf.writestr('imagenes/grafica_zip.png', b'fake image data 1')
            zf.writestr('imagenes/pregunta_img.png', b'fake image data 2')
            
        zip_buffer.seek(0)
        zip_file = SimpleUploadedFile("paquete.zip", zip_buffer.read(), content_type="application/zip")
        
        # Confirmar importación
        response = self.client.post('/api/preguntas/import/confirm/', {'file': zip_file, 'ignorar_duplicadas': 'true'}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get('importadas'), 1)
        self.assertEqual(response.data.get('imagenes_extraidas'), 2)
        
        pregunta = Pregunta.objects.get(enunciado="¿Qué representa la gráfica?")
        self.assertEqual(pregunta.explicacion, "Explicación de la gráfica")
        self.assertEqual(pregunta.imagen_url, "imagenes/pregunta_img.png")
        self.assertEqual(pregunta.contexto.archivo, "imagenes/grafica_zip.png")
