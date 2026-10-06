# Revisión de ISAT

## Actualización 0.5.1: comprobación con el Excel de trabajo

Se comprobó íntegramente el cuestionario autorizado en local, sin modificarlo, publicarlo ni copiar sus filas a las pruebas. El contraste independiente recorrió todas las clases y estudiantes: petición propia, personas distintas que indican necesidad de ayuda, matriz, relaciones declaradas y recibidas, reciprocidad, predicciones emitidas/verificables/correctas, denominadores de bienestar, estados de la encuesta y texto de historias. Se verificaron todas las fichas de grupo, todas las filas accesibles mediante paginación y todas las fichas individuales. El cierre retira los datos de los controles y de la ficha.

Los recuentos y la interpretación de ausencias coincidieron con la fuente. Se corrigió la concordancia de singular y plural al mostrar una sola predicción y una sola predicción verificable, sin cambiar los cálculos. Los datos y la herramienta privada de contraste quedan excluidos del repositorio y del artefacto público.

Verificación: 72 pruebas automáticas superadas y nueve recursos públicos verificados. En el navegador se comprobaron las ocho clases, la paginación 50/15 de la clase de 65 estudiantes, casos con petición propia ausente y menciones suficientes, predicciones sin respuesta propia y una historia larga al final. A 320 píxeles no se observaron desbordamientos de la página, la matriz, las tarjetas de ayuda ni la historia. El archivo original mantiene el mismo contenido tras la revisión.

## Actualización 0.5.0: mejoras de PBIS adaptadas a ISAT

Se verificó mediante la referencia remota de main que la última versión pública de PBIS corresponde a **acb5a7a9c3bf4ea0ca7f0f10895d8a94c2fbf889**. Se revisaron su código, guía, lista de clase y recorrido individual. La copia de PBIS tenía cambios locales previos en site-src/index.html y tools/build.mjs; no se modificaron. La lista ordenable, reacciones, confianza y opiniones ya estaban incorporadas en ISAT.

Se adaptaron estas mejoras:

- Ficha individual resumida: ayuda primero; después, bienestar y relaciones «En un vistazo». Los indicadores detallados están en «Ver más indicadores», cuya apertura se recuerda por estudiante durante la consulta. La historia continúa fuera del desplegable y al final, con el filtro de cuatro letras. No se duplica el resumen de bienestar dentro de los detalles.
- Guía integrada «Ayuda», con el recorrido, criterios de consulta, ausencias, predicciones, revisión y cierre. Se puede cerrar con Escape y recuperar el foco.
- «Mi revisión» en la cabecera, con recuento actualizado, disponible desde fichas, lista y pantalla de datos. El cierre del resumen devuelve el foco a su control de origen.
- Pulsar de nuevo la misma reacción retira la marca, como en PBIS. Se mantiene también la acción explícita de quitar valoración.
- Cierre tras quince minutos sin actividad, con aviso en el último minuto y opción para continuar. La comprobación al regresar a una pestaña oculta evita depender solo de los temporizadores. Caducar retira archivo leído, Worker, modelo, valoraciones y cuadros; también caduca un resumen dejado abierto tras el cierre manual. Una interacción posterior al límite no recupera la consulta.

Se conservaron el foco de UCE, la matriz, los recuentos de ayuda sin identidades, las tres respuestas independientes de bienestar, las predicciones verificables y la distinción entre ausencia y cero. El visualizador sigue leyendo un único Excel en el navegador; no se importan los perfiles, llave, ejemplos, índice de felicidad ni servicio de correo de PBIS.

Verificación: **72 pruebas automáticas superadas**. Diez nuevas regresiones cubren resumen y detalle, conservación de las últimas correcciones, apertura por estudiante, reacciones reversibles, guía y foco, acceso global a la revisión, límite exacto de inactividad, renovación, retorno de una pestaña, resumen posterior al cierre y retiro de un lector antiguo. Se ajustaron las comprobaciones de historia para referirse a la sección final de la ficha, fuera del nuevo desplegable. En navegador se comprobaron la guía por Escape, las fichas y sus historias, apertura recordada, reacciones y resumen desde la pantalla de datos. A 320 píxeles no se observaron desbordamientos de página, tarjetas ni guía. Los archivos de control y las capturas permanecen fuera del repositorio y de la web publicada.

## Actualización 0.4.1: interpretación de relaciones, ayuda e historias

Se comprobó en local el caso comunicado: falta la respuesta propia a las preguntas de relaciones, pero hay ocho predicciones positivas, cinco verificables y tres aciertos. No había una selección de recorrido errónea. Los aciertos se verifican con las respuestas de otras personas y no requieren que exista la respuesta propia de relaciones. Se conservan esos cálculos y la ficha explica que «Sin datos» no significa cero amistades. Presenta **3 de 5 verificables**, las ocho predicciones emitidas y las tres sin comprobar. También distingue una respuesta parcial y un recuento mínimo observado. Sin predicciones de ese tipo en una respuesta interpretable, se muestra «No procede».

La ficha individual de ayuda muestra petición propia y número de personas distintas que indican necesidad de ayuda. Se elimina el desplegable con las personas que ese estudiante había señalado y no se muestran las identidades de quienes emiten menciones. El listado de estudiantes que cumplen los criterios en la ficha de clase conserva sus enlaces.

«Su historia» solo aparece si circunstancia o personal contienen una respuesta con al menos cuatro letras Unicode. Cada respuesta se filtra por separado, sin sumar «No» y «Sí»; espacios, números y signos no cuentan. Se conservan el texto literal y los saltos de línea de las respuestas admitidas, con escape al mostrarlas. No aparece una tarjeta vacía cuando falta texto.

Verificación: **62 pruebas automáticas superadas**. Las siete nuevas regresiones comprueban el caso 3/5/8 con respuesta propia ausente, cero explícito, predicciones no verificables, respuestas parciales, recuentos de ayuda sin identidades y el límite de tres/cuatro letras. En navegador se utilizó un Excel sintético, excluido del repositorio, que reproduce 6 relaciones recibidas entre 37 respuestas de otras 94 personas. Se comprobaron las fichas en escritorio y a 320 píxeles, sin desbordamientos en las tarjetas ni en la página. Al cambiar de estudiante, la historia larga aparece y la respuesta «No» oculta todo el apartado. Los Excel de trabajo se consultaron solo en local y no forman parte de la publicación.

## Actualización 0.4.0: carga, grupos, listas e individuales

La carga de Excel y hoja está separada de la consulta. El recorrido ofrece ficha de grupo, lista de estudiantes y ficha individual. Volver a los datos conserva la consulta si no se sustituye el archivo o la hoja. La lista muestra toda la clase, prioriza petición propia o dos o más menciones, permite buscar/filtrar/ordenar y presenta páginas de 50 filas. Las ausencias quedan al final en ambos sentidos. Las tres respuestas de bienestar se mantienen separadas, sin importar una escala de felicidad de PBIS. La lista aclara que las menciones recibidas proceden de personas distintas de todo el Excel.

La revisión de datos admite OK, Revisar y Me sorprende; la confianza de −5 a +5 conserva «Sin valorar» como estado distinto de 0. La utilidad y el comentario de cada vista permanecen en memoria. El cierre retira el Excel y las fichas y puede mostrar un resumen con código de sesión, códigos G001/G002… de grupo y los códigos de estudiante del Excel, sin nombres ni respuestas adjuntas. El texto libre se muestra literal y escapado; se pide no incluir nombres. El resumen también se retira al cerrarlo o abandonar la página. ISAT sigue sin cuentas, llaves, ejemplos incluidos, correo ni almacenamiento persistente.

Verificación: **55 pruebas automáticas superadas**. Se añadieron regresiones de separación de pantallas, prioridad de ayuda, filtro, orden numérico y ausencias, homónimos, retorno a lista, valoraciones, confianza neutra, resumen codificado, escape de comentarios, sustitución, historial y paginación. En navegador se comprobó el recorrido con un Excel sintético de 24 registros y dos clases: menciones de otra clase, revisión por dato, confianza, ficha/retorno, comentario y cierre. A 320 píxeles no se observó desbordamiento de la página; las tablas amplias permiten desplazamiento dentro de su propia región. Se comprobó también el ancho de escritorio, con las columnas complementarias. El archivo de control queda fuera del repositorio y del artefacto público.

Las revisiones siguientes describen versiones anteriores. Los significados confirmados de UCE y ayuda prevalecen sobre las interpretaciones iniciales.

## Actualización 0.3.1: paleta y comunicación

Se observaron los estilos aplicados en https://www.uloyola.es/ el 5 de octubre de 2026. Se trasladaron a ISAT el azul marino `#192A67`, el azul claro `#8CD1E7`, el azul de enlaces `#023E83`, el texto azul `#243162` y el fondo `#DEF7FF`, con tonos secundarios derivados. Cabeceras, controles, fichas, barras, matriz y favicon utilizan la paleta local. Los colores de las celdas se acompañan de etiquetas explícitas.

Tres revisores automáticos adoptaron roles de copy, educación y comunicación de producto. Se aplicaron sus propuestas de aclarar las menciones, sustituir «casos» por «fichas», mostrar bases de respuestas y mejorar instrucciones, errores y estado vacío. «Sin inicio registrado» describe la falta de marcas del cuestionario sin negar que pueda haber respuestas. Las personas que cada estudiante considera que necesitan ayuda están en su bloque de ayuda, no bajo «red de apoyo».

Dos revisores propusieron colocar el listado antes de la matriz. Esa propuesta se descartó porque el usuario pidió los recuentos y, debajo, la matriz. Tampoco se añadieron una web comercial, promesas de seguridad absoluta ni respaldo institucional. Los indicadores, las categorías y el umbral confirmado conservan sus cálculos.

Verificación de 0.3.1: 47 pruebas automáticas superadas y artefacto limitado a nueve recursos, sin Excel ni datos de consulta. En navegador se revisaron la matriz a 320 y 1280 píxeles, la ficha individual, el retorno a la clase y el cierre que retira fichas y filtros. No se observaron desbordamientos ni errores de consola. Los pares principales de texto y fondo, junto con las barras y el foco, alcanzaron relaciones de contraste entre 7,33 y 13,39; esta comprobación no sustituye una auditoría integral de accesibilidad.

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
