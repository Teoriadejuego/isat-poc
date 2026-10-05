# Prompts de revisión de ISAT

## Alcance compartido

Revisa el visualizador ISAT existente. Conserva la carga de un único Excel, las fichas de clase e individuales, los nombres o códigos del propio archivo y la historia al final. Retira el contexto familiar y destaca si la encuesta está completada, en curso o sin iniciar. Respeta los sentidos de los ítems: soledad frecuente es Casi siempre/Siempre; poco disfrute con amistades y experiencia universitaria poco positiva son Nunca/Casi nunca. No crees una escala global. No añadas llaves, acceso con contraseña, datos precargados, correo, analítica ni servicios externos. No publiques Excel, identificadores ni historias reales. Reproduce los defectos con datos sintéticos y diferencia hechos comprobados de dudas sobre el cuestionario. Entrega prioridad, ubicación, reproducción, consecuencia y corrección propuesta. Los agentes revisan; la implementación y la depuración se realizan de forma secuencial.

## 01. Lectura del cuestionario

Comprueba cabeceras, rutas Par/Impar, marcas de tiempo, códigos como texto y aliases. Prueba columnas reordenadas, ausentes, duplicadas y variantes del formato. Identifica fallos que cambien silenciosamente el significado de los datos.

## 02. Medidas y denominadores

Revisa relaciones recibidas, declaradas y recíprocas, predicciones, peticiones de ayuda y adaptación académica. Distingue una respuesta ausente de cero, limita cada medida a su población y usa denominadores verificables. No inventes puntuaciones globales ni significados que no estén confirmados por quien define el cuestionario.

## 03. Privacidad y seguridad

Comprueba el escape de contenido, la política CSP, la ausencia de transmisión y almacenamiento, el cierre de consulta, la sustitución del archivo y la restauración de la página. Revisa que el despliegue no incluya datos personales.

## 04. Textos e instrucciones

Revisa el español de España, el lenguaje inclusivo, las etiquetas y los mensajes de error. Sustituye formulaciones ambiguas por instrucciones concretas. Mantén la diferencia entre ausencia de respuesta, ninguna selección y una respuesta negativa.

## 05. Accesibilidad

Revisa navegación por teclado, foco, etiquetas, pestañas, anuncios de estado, contraste y lectura de porcentajes. Propón cambios compatibles con la interfaz actual y compruébalos con criterios observables.

## 06. Diseño adaptable

Revisa móvil, escritorio, textos largos, nombres duplicados, títulos de clase, historias extensas y valores sin datos. Conserva la paleta de ISAT y evita cortes, solapamientos y desplazamiento horizontal.

## 07. Pruebas de regresión

Busca vacíos en las pruebas que puedan ocultar fallos reales. Diseña casos sintéticos de lectura, filtros, cambios de hoja, sustitución de archivo, cierre y contenido HTML. Cada prueba debe proteger un comportamiento útil.

## 08. Rendimiento y cancelación

Comprueba los límites del lector, el Web Worker, los archivos grandes y las operaciones simultáneas. Mide con datos sintéticos y evita bloquear la interfaz. Revisa cancelación, errores y resultados antiguos.

## 09. Publicación y dependencias

Revisa GitHub Pages, el servidor local, las rutas relativas, la licencia y versión del lector Excel y la composición del artefacto publicado. Comprueba que se publica exclusivamente la aplicación y que las pruebas se ejecutan antes del despliegue.

## 10. Requisitos y mantenimiento

Contrasta el producto y el README con los requisitos del usuario. Revisa separación respecto a PBIS, claridad del código y documentación de supuestos. Señala promesas no verificadas y funciones necesarias que falten.

## Proceso de depuración

1. Reunir y deduplicar los hallazgos de los diez agentes.
2. Reproducir cada defecto antes de modificarlo.
3. Corregir un problema o un conjunto estrictamente relacionado.
4. Ejecutar su prueba de regresión y las comprobaciones afectadas.
5. Registrar el resultado y continuar con el siguiente problema.
6. Revisar escritorio y móvil, comprobar el Excel original en local y publicar solo el código.

## Mejora 11. Casos para la Unidad de Cuidado del Estudiante

Con el significado confirmado por quien define el cuestionario, interpreta uce = Sí como petición propia y ayuda como señalamientos de personas que necesitan ayuda. Muestra al principio de la ficha de clase los casos que cumplen petición propia o al menos dos personas distintas, sin duplicar quienes cumplen ambos criterios. Cuenta cada remitente una vez por destinatario, resuelve alias y excluye autonominaciones. Considera todos los señalamientos del Excel y muestra el caso en la clase de quien los recibe. Conserva las ausencias y no limites el criterio a encuestas finalizadas. Añade enlaces internos a la ficha individual y un retorno a la misma clase. Comprueba umbral 1/2, superposición, códigos duplicados en listas, otras clases, ausencia de preguntas, teclado, nombres iguales, escape de textos, sustitución y cierre. No añadas nombres o códigos a URLs, almacenamiento o transmisiones.

Prioriza los recuentos y añade debajo una matriz de petición propia Sí/No por 0–1 o 2 o más señalamientos. Identifica las cuatro combinaciones y cuántas personas quedan fuera por falta de datos, sin tratar las ausencias como No. Mantén el listado de fichas debajo de la matriz. Las relaciones, el bienestar y la adaptación académica pasan a ser información complementaria.
