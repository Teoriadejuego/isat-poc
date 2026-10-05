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

## Mejora 12. Diseño con la paleta de Loyola

Actúa como revisor de diseño de interfaces. Observa https://www.uloyola.es/ y extrae los colores aplicados en la página, sin asumir que constituyen un manual oficial de marca. Adapta ISAT a los colores observados: azul marino `#192A67`, azul claro `#8CD1E7`, azul de enlaces `#023E83`, texto azul `#243162` y fondo claro `#DEF7FF`. Usa blanco y grises para las superficies secundarias y conserva los estados de error comprensibles. Aplica las variables locales a cabeceras, botones, filtros, fichas, barras, matriz y favicon. Utiliza los tonos claros con texto oscuro. Las cuatro celdas deben poder entenderse por sus etiquetas, sin depender del color. Comprueba contraste, foco, móvil y escritorio. Conserva ISAT como identidad propia; no copies logotipos, fotografías ni textos institucionales y no añadas recursos remotos ni rastreadores.

## Mejora 13. Revisión de copy

Actúa como revisor de redacción de interfaces en español de España, como rol simulado. Revisa `index.html` y `src/app.js`: títulos, instrucciones de carga, botones, filtros, estados vacíos, mensajes de error, recuentos y matriz. Escribe textos claros, breves, respetuosos e inclusivos. Utiliza «estudiantes» y diferencia petición propia, menciones de otras personas, cero registrado y ausencia de respuesta. Define «menciones de ayuda» una vez, sin convertirlas en un diagnóstico. Presenta 8–12 cambios concretos con antes, después y motivo. No cambies las preguntas, sus categorías, los cálculos ni el umbral de dos personas distintas. No accedas a Excel privados. La implementación corresponde al agente principal.

## Mejora 14. Revisión educativa

Actúa como revisor de comunicación educativa y acompañamiento universitario, como rol simulado. Verifica que las fichas permiten entender qué ha respondido cada estudiante y qué han indicado otras personas, sin etiquetar a nadie ni confundir necesidad de ayuda con ser una persona a quien acudir. UCE = Sí es petición propia; ayuda contiene personas que quien responde considera que necesitan ayuda. El listado reúne petición propia O menciones de al menos dos personas distintas, sin duplicados y sin exigir encuesta finalizada. Las ausencias no equivalen a No. Explica qué respuestas sostienen cada recuento y distingue las marcas de inicio/finalización de las respuestas a preguntas. Mantén el orden solicitado: recuentos → matriz → listado → información complementaria. Propón 5–8 correcciones concretas, sin inventar criterios clínicos, índices, nuevas preguntas ni protocolos institucionales. No modifiques archivos ni accedas a Excel privados.

## Mejora 15. Revisión de comunicación y marketing

Actúa como revisor de comunicación de producto y marketing responsable, como rol simulado. Mejora la claridad de la propuesta de ISAT y del recorrido: seleccionar Excel, revisar hoja, abrir ficha de clase y consultar fichas individuales. Entrega 6–8 propuestas antes/después para título, descripción, instrucciones, navegación, llamadas a la acción y mensajes de confianza. Mantén una pantalla de consulta, sin añadir una web comercial, registro, llaves, ejemplos, correo ni analítica. Solo afirma comportamientos verificables: procesamiento en el navegador, archivo original sin cambios y retirada de la consulta al cerrarla. No prometas seguridad absoluta, borrado forense, diagnósticos, eficacia certificada ni respaldo institucional. Respeta los criterios confirmados y la prioridad de los recuentos y la matriz. Revisa sin editar, publicar o abrir Excel privados.

## Aplicación de las revisiones 12–15

El agente principal reúne los hallazgos de las tres revisiones de textos, resuelve contradicciones con los requisitos y aplica los cambios uno a uno. El orden de la matriz pedido por el usuario prevalece sobre propuestas de situar primero el listado. Comprueba carga, cambios de clase, enlace a estudiante, retorno, ausencia de datos y cierre. Revisa visualmente escritorio y móvil, ejecuta las regresiones existentes y publica exclusivamente los recursos de la aplicación.
