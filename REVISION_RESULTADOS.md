# Revisión de ISAT

**Actualización 0.3.0:** el significado de UCE y ayuda ha sido confirmado posteriormente. UCE es una petición propia de ayuda y ayuda contiene señalamientos de personas que necesitan ayuda. Esta definición sustituye la interpretación anterior como «a quién acudir» y la duda sobre UCE recogidas en el informe histórico siguiente. El foco de las fichas pasa a los recuentos, la matriz de petición propia por señalamientos y la lista de casos con enlaces a fichas. La suite completa suma 47 pruebas superadas.

Se contrastó el listado con un recuento independiente del cuestionario en local. Se comprobó que cada persona aparece una sola vez, que las selecciones repetidas no alcanzan artificialmente el umbral y que las respuestas ausentes quedan fuera de la matriz. En navegador se verificó el enlace a la ficha exacta y el regreso a la clase. La matriz, las tarjetas y los enlaces se revisaron a 320 y 1280 píxeles, sin desbordamiento de contenido ni errores de consola. El artefacto de publicación sigue limitado a nueve recursos de la aplicación, sin archivos de consulta.

## Informe histórico: versión 0.2.0

Diez agentes revisaron la aplicación desde ámbitos distintos. La implementación se depuró de forma secuencial, reproduciendo los defectos con pruebas sintéticas. Los prompts están en `REVISION_PROMPTS.md`.

## Revisiones y correcciones

| Revisión          | Resultado aplicado                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01. Lectura       | Cabeceras identificables, rutas Par/Impar coherentes, exclusión de alias contradictorios y conservación de evidencia cuando solo hay una autonominación.                                    |
| 02. Medidas       | Ausencia separada de cero, selección de apoyo separada de acceso a la pregunta, predicciones verificables, categorías válidas y multiselecciones sin duplicados.                            |
| 03. Privacidad    | Al cerrar se retiran también los nombres de filtros ocultos, búsqueda, hoja y fichas. Se cancelan lecturas y se ignoran respuestas antiguas. El agente confirmó el cierre de sus hallazgos. |
| 04. Textos        | Español inclusivo, denominadores explícitos, fechas legibles, estados sin ambigüedad y explicación del sentido de los ítems de bienestar.                                                   |
| 05. Accesibilidad | Regiones de estado presentes, anuncios de búsqueda y actualización, pestañas por teclado, foco al abrir/cerrar y contraste de barras mejorado.                                              |
| 06. Diseño        | Tarjetas adaptables, ajuste de estados en móvil, texto largo sin desbordamiento y contexto familiar retirado.                                                                               |
| 07. Regresiones   | Pruebas del ciclo completo de consulta, sustitución, cancelación antes y durante la preparación, escape de historias y navegación por teclado.                                              |
| 08. Rendimiento   | Lectura y preparación íntegramente en Worker; índices Map y resúmenes por clase. El agente confirmó cancelación, timeout y aislamiento de resultados antiguos.                              |
| 09. Publicación   | Dependencias de pruebas fijadas, instalación en CI y construcción con inventario explícito de nueve recursos públicos.                                                                      |
| 10. Requisitos    | README actualizado, separación respecto a PBIS, sin llaves, ejemplos, correo ni servicios externos.                                                                                         |

## Cambios solicitados durante la revisión

- El contexto familiar desaparece de las fichas. «Su historia» es la sección 04 y continúa al final.
- Las fichas individuales destacan «Encuesta completada», «Encuesta en curso» o «Encuesta sin iniciar». La ficha de clase resume los tres estados.
- Soledad frecuente cuenta Casi siempre/Siempre. Poco disfrute con amistades y experiencia universitaria poco positiva cuentan Nunca/Casi nunca. Se muestran por separado, sin crear un índice global.
- «A quién acudir» se basa en personas seleccionadas en ayuda. Una marca de acceso sin selección no demuestra una respuesta negativa.
- Una tasa positiva inferior al 0,1 % se muestra como «<0,1 %», evitando presentarla como cero.

## Depuración y verificación

1. Se corrigió y comprobó el cierre y la cancelación de consultas.
2. Se corrigieron las categorías, rutas, referencias, denominadores y predicciones.
3. Se aplicaron los cambios de fichas, estados y sentidos de bienestar.
4. Se trasladó la preparación al Worker y se comprobaron resultados tardíos y límites del lector.
5. Se ajustaron textos, teclado, foco y tamaños pequeños de pantalla.
6. Se verificaron las pruebas, los libros de trabajo en local y el inventario publicado.

Resultado: **38 pruebas automáticas superadas**, sin fallos. Incluyen lectura real de Excel generado en memoria, pruebas de la interfaz con jsdom, indicadores y publicación.

Se comprobaron dos libros del cuestionario en local, sin modificarlos ni incorporarlos al repositorio. En navegador se verificaron carga, fichas de clase e individuales, cambios de clase/estudiante, estados e historia final. Las vistas comprobadas fueron 320, 390 y 1280 píxeles de ancho; no se observaron desbordamientos de contenido en las tarjetas. No se registraron errores de consola en la comprobación local.

## Límites de lo verificado

UCE conserva su etiqueta hasta confirmar el enunciado. La prueba de teclado no constituye una auditoría completa con lectores de pantalla. Las vistas móviles se comprobaron mediante tamaños de navegador; no se certificó funcionamiento en dispositivos físicos de todas las plataformas. El rendimiento con clases de tamaño excepcional debe medirse en los equipos de destino.

La finalización del cuestionario depende de la marca end y no garantiza respuestas completas a todas las preguntas. Cerrar la consulta libera referencias de la aplicación; no borra el Excel original ni implica eliminación forense de memoria.
