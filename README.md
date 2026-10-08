# ISAT

Visualizador ISAT centrado en las peticiones propias y las menciones de ayuda para la Unidad de Cuidado del Estudiante, derivado de la interfaz PBIS. La carga de un único Excel está separada de la consulta, organizada en **grupos → listas de estudiantes → fichas individuales**. Las relaciones y la adaptación académica aportan información complementaria. No incorpora datos de ejemplo, credenciales ni llave de nombres. El proyecto PBIS permanece separado.

**Abrir ISAT:** https://teoriadejuego.github.io/isat-poc/

## Entrega del prototipo · 0.9.1

**Interpretación de preguntas vacías.** En las preguntas de seleccionar personas, un vacío se interpreta como ninguna selección cuando existe una respuesta posterior en el recorrido del cuestionario. En UCE, un vacío con respuesta posterior se interpreta como «No», según el criterio confirmado para este cuestionario. Se respeta el orden Par/Impar; el orden de las columnas del Excel no cambia el resultado. Una marca de visita o de finalización por sí sola no basta, y las columnas ausentes y las respuestas no interpretables permanecen pendientes. El modelo conserva la procedencia de estas interpretaciones y no modifica el archivo.

La matriz incluye una fila **Sin respuesta propia** cuando hay estudiantes con menciones contabilizadas pero sin respuesta UCE interpretable. Así, el total de dos o más menciones puede comprobarse sumando las filas Sí, No y Sin respuesta propia. La fila pendiente no se mezcla con No y sus celdas abren la lista correspondiente.

ISAT permite a la Unidad de Cuidado del Estudiante consultar las peticiones propias y las menciones de ayuda, contrastarlas con el contexto de la clase y abrir las fichas individuales. Esta entrega es un **prototipo funcional para evaluación**, con los indicadores del cuestionario ISAT T1.

**Recorrido recomendado para la presentación:**

1. Abre la web, selecciona tu Excel y la hoja **Users**.
2. Elige una clase. Revisa los dos recuentos de ayuda y su matriz; no sumes las fuentes, porque pueden coincidir.
3. Pulsa **Revisar estas fichas**. La lista muestra únicamente petición propia o menciones de dos o más personas.
4. Abre un código y avanza con **Anterior / Siguiente**, manteniendo el filtro y el orden. Vuelve a la lista para comparar o valorar datos.
5. Amplía **Ver más indicadores** cuando necesites contexto. Consulta **Mi revisión** antes de cerrar.

La guía integrada se organiza en tres pasos y aclaraciones desplegables. La ficha de grupo mantiene ayuda y bienestar a primera vista, con las distribuciones y los indicadores complementarios al ampliar. Este enfoque se ha adaptado de la ficha resumida de la versión local de PBIS; se conservan los significados y cálculos propios de ISAT.

**Alcance de la entrega:** web sin instalación, carga de un Excel, códigos del archivo, tres niveles de consulta, red de relaciones, historias y revisión durante la sesión. No incluye cuentas, seguimiento de intervenciones, guardado permanente ni envío de opiniones. «Revisar» registra una valoración de los datos; no acredita que se haya atendido a un estudiante. La información apoya el criterio profesional y no determina diagnósticos ni decisiones automáticas.

**Para compartir:** envía el enlace del visualizador; entrega el cuestionario por el canal acordado con el cliente. Los Excel de trabajo no forman parte del código ni de la web publicada. La revisión temporal debe consultarse antes de cerrar; no se recupera después.

## Uso

1. Selecciona un archivo `.xlsx` o `.xls` de hasta 20 MB.
2. Elige la hoja `Users` del cuestionario y pulsa **Abrir fichas**.
3. Al abrir las fichas se oculta la carga de datos. Elige **Ficha de grupo**, **Lista de estudiantes** o **Ficha individual** y selecciona la clase/titulación. **Datos cargados** vuelve al Excel; **Volver a la consulta** conserva la vista y las valoraciones si no cambias el archivo ni la hoja.
4. Consulta el estado destacado de la encuesta: completada, en curso o sin inicio registrado.
   En **Peticiones y menciones de ayuda** verás los casos de la clase para la Unidad de Cuidado del Estudiante. **Ver ficha individual** abre la ficha individual; **Volver a la ficha de clase** regresa al mismo grupo. Las celdas de la matriz con estudiantes abren su lista filtrada; también puedes consultar quienes tienen datos de ayuda incompletos, sin tratarlos como respuestas «No».
   La ficha individual muestra primero petición propia, número de personas que indican necesidad de ayuda y un resumen de bienestar y relaciones. **Ver más indicadores** abre relaciones, predicciones, contactos y adaptación académica; la red de relaciones es su último bloque. La apertura se recuerda por estudiante durante la consulta. La historia queda fuera del desplegable, al final de la ficha. La cabecera, el borde y el bloque de ayuda se destacan en rojo cuando la petición propia es **Sí** o hay **más de dos menciones** (tres en adelante). Este marcado visual no cambia el criterio del listado de dos o más menciones ni constituye un diagnóstico.
5. La lista incluye toda la clase, con las peticiones propias o dos o más menciones primero. Se puede buscar por código, filtrar por ese criterio y ordenar cada columna en ambos sentidos. **Bienestar y relaciones** muestra las columnas complementarias. «Pendiente» queda al final de cualquier orden. Las filas se muestran en páginas de 50; la búsqueda y los recuentos abarcan toda la clase.
6. Pulsa un dato para marcar **OK**, **Revisar** o **Me sorprende**. Repetir la misma reacción la retira; también puedes usar **Quitar valoración**. Valora tu confianza con el pequeño deslizador de −5 a +5: «Sin valorar» sigue siendo distinto de 0. El botón **0** marca una confianza neutra y **×** retira la valoración. El código abre la ficha individual y el retorno conserva el filtro, la búsqueda, el orden y la página de la lista.
7. Las fichas y la lista permiten guardar una valoración de utilidad de 1 a 5 y un comentario opcional. Estas opiniones y las marcas permanecen en memoria durante la consulta; no alteran el Excel ni se envían.
8. **Cancelar lectura**, **Cancelar preparación**, **Retirar archivo** o **Cerrar consulta** interrumpen el proceso y retiran los datos de la aplicación. Al cerrar una consulta con valoraciones aparece un resumen con código aleatorio de sesión, códigos de grupo G001, G002… y los códigos de estudiante del Excel, sin adjuntar nombres ni respuestas. No hay una cuenta que identificar. El comentario se muestra tal como se ha escrito; se pide no incluir nombres. **Cerrar resumen** retira también ese contenido. Sustituir el archivo o la hoja inicia una nueva consulta y descarta las valoraciones anteriores. Salir de la página retira los datos sin generar un resumen.
9. **Mi revisión** en la cabecera permite consultar las valoraciones desde cualquier vista o desde **Datos cargados**, conservando la consulta. **Guía de uso** explica el recorrido y ofrece aclaraciones desplegables; puede cerrarse con Escape.
10. Tras **15 minutos sin actividad**, se retiran los datos, las valoraciones y cualquier resumen abierto. En el último minuto aparece **Continuar consulta**, que renueva el plazo. También se comprueba la caducidad al volver a una pestaña oculta; una interacción posterior al límite no restaura la consulta. Se debe cargar el archivo de nuevo. El Excel original permanece en su ubicación.

Volver a **Datos cargados** y pulsar **Volver a las fichas** conserva la selección, vista, filtros y revisión sin preparar de nuevo el mismo Excel. Cambiar de archivo o de hoja inicia una nueva consulta. Los borradores de opiniones se conservan por vista y estudiante en memoria durante la consulta, con el aviso **Cambios pendientes**; solo se incorporan al resumen al pulsar **Guardar valoración**. Cerrar, caducar o sustituir la consulta también retira los borradores.

La lista ofrece los filtros de las cuatro combinaciones de la matriz, además de toda la clase, el criterio de consulta y los datos de ayuda incompletos. Conserva el filtro al abrir una ficha individual y volver. Las opciones múltiples de actividades y motivos aparecen separadas, con selecciones repetidas normalizadas. Las frecuencias reconocidas se muestran con etiquetas uniformes; las respuestas desconocidas siguen visibles, se excluyen de los cálculos afectados y se contabilizan en el aviso de incidencias.

Los estudiantes se identifican por el código del propio Excel, conservado como texto; no se generan nombres ni se solicita una llave. La historia aparece al final de la ficha individual solo cuando alguna de sus respuestas contiene al menos cuatro letras. Las preguntas de contexto familiar no se muestran. En pantalla, «menciones de ayuda» designa las respuestas en las que otras personas indican que un estudiante necesita ayuda; no designa personas a quienes acudir. En la ficha individual se muestra el número de personas que lo han indicado, sin identificar a quienes emiten las menciones ni listar las personas que este estudiante ha señalado.

La **red de relaciones** sitúa el código del estudiante en el centro y los códigos relacionados a su alrededor. Incluye otras clases presentes en el Excel, indicadas por un borde discontinuo. Las flechas salen de quien valora y llegan a la persona valorada; pueden existir dos flechas de distinto signo. Azul representa Buena/Muy buena relación y rojo Mala/Muy mala; las categorías «Muy» tienen mayor grosor. No se generan flechas con predicciones, menciones de ayuda ni valoraciones neutras. Los códigos permiten abrir la ficha correspondiente, cambiando estudio y clase cuando hace falta. La red no tiene filtros de signo o dirección ni tabla de detalle; conserva leyenda, etiquetas de flechas y ampliación. El resumen de la red abarca el archivo, mientras los indicadores de relaciones de la ficha mantienen su base por clase, explicada en pantalla. Las respuestas ausentes no equivalen a ausencia de relaciones.

Al final de cada vista aparece una única nota con el porcentaje de estudiantes de la clase cuya encuesta tiene finalización registrada, calculado como completadas / estudiantes de la clase. Esa cifra no indica que todas las preguntas tengan respuesta. Los indicadores utilizan las respuestas disponibles de cada pregunta, incluso de encuestas en curso, y pueden cambiar al completar o corregir el Excel. Se conserva el recuento reconocido de respuestas parciales. Cuando falta una respuesta necesaria se muestra **Pendiente**; no se imputa cero, «No», una relación ni un error de predicción. Las explicaciones repetidas de ausencia en cada indicador se sustituyen por la nota común.

## Lectura del cuestionario

El formato inicial es ISAT T1 de 57 columnas. Se reconocen las preguntas por sus cabeceras, no por posiciones fijas. Se requieren Usuario Id/ID, Curso, Grupo, redes1/redes2, alone y abandono. Se permiten columnas adicionales; las cabeceras duplicadas o ambiguas producen un error.

Los registros se muestran con su código de usuario. No se utiliza una columna de nombres como etiqueta en esta edición. Las nominaciones pueden referenciar tanto Usuario Id como Alumno Id. Cada alias debe identificar a una sola persona.

- **Relaciones:** redes1 para Par y redes2 para Impar. Buena/Muy buena relación son positivas; Mala/Muy mala, negativas. Los recuentos no ponderan la intensidad; el grosor de las flechas conserva las categorías «Muy». Las referencias a otras clases y a uno mismo no se cuentan como vínculos dentro de la clase; la red individual sí incorpora otras clases presentes en el archivo, excluyendo autorreferencias. Las rutas ambiguas se excluyen, sin mezclar recorridos. «Pendiente» en relaciones declaradas significa falta de respuesta propia interpretable, nunca cero amistades. Los recuentos parcialmente interpretables se presentan como mínimos observados.
- **Predicciones:** beliefs1/beliefs2 se comparan con las relaciones entrantes que pueden verificarse. Pueden comprobarse aunque falte la respuesta propia sobre relaciones. La ficha distingue aciertos, predicciones verificables y predicciones que no pueden comprobarse: por ejemplo, 3 de 5 verificables entre 8 emitidas, con 3 sin comprobar. Una respuesta ausente o parcialmente ilegible no se convierte en un error comprobado. Si una respuesta interpretable no contiene predicciones de ese tipo, se muestra «No procede»; si no pueden verificarse o falta la respuesta, «Pendiente». No se generan posiciones 0–10.
- **Popularidad y conexión:** nominaciones directas de las preguntas popular y central. La segunda se presenta como conexión entre grupos percibida, sin confundirla con una centralidad matemática calculada.
- **Unidad de Cuidado del Estudiante:** `uce = Sí` registra una petición propia de ayuda. `ayuda` contiene las personas que quien responde considera que necesitan ayuda. La ficha de clase incluye a quienes han pedido ayuda **o** han sido señalados por **al menos dos personas distintas**. Una persona que cumple ambos criterios aparece una sola vez, con ambos motivos. Se cuentan señalamientos de todo el Excel, incluidas otras clases; cada ficha muestra solo los casos de su clase. Se excluyen autonominaciones y duplicados por código o alias. No se exige que la encuesta esté finalizada.
- **Ausencias en las preguntas de ayuda:** una selección ausente conserva «Pendiente»; eayuda solo indica que se alcanzó la pregunta. «Nadie» o «Ninguno» son respuestas vacías explícitas. Las preguntas ausentes, categorías no interpretables y falta de respuestas se distinguen de una lista vacía con respuestas disponibles.
- **Matriz de ayuda:** el primer bloque muestra las peticiones propias, los casos señalados por dos o más personas y, como contexto, cuántas personas tienen al menos un señalamiento. Debajo, una matriz cruza petición propia Sí/No con 0–1 o 2 o más señalamientos. Sus cuatro celdas son petición propia, ambos criterios, señalamiento por otras personas y ninguno de los dos criterios. Solo entran quienes tienen respuestas interpretables en ambas dimensiones. Los casos con una dimensión ausente pueden seguir apareciendo en el listado si cumplen el otro criterio.
- **Conocidos y otros:** contactos previos identificados y número de selecciones externas, respectivamente. Las etiquetas externas de otros no se vinculan a personas inventadas.
- **Bienestar:** se conservan las respuestas de frecuencia. Soledad frecuente corresponde a **Casi siempre/Siempre**; poco disfrute con sus amistades y experiencia universitaria poco positiva corresponden a **Nunca/Casi nunca**. Soledad tiene sentido opuesto a los dos ítems positivos. Se muestran tres indicadores independientes, sin sumar una escala global ni definir un punto de corte clínico.
- **Adaptación académica:** organización del tiempo, actividades, carga de trabajo, dificultades, asignaturas y motivos, pensamientos de abandono y motivos. Las categorías desconocidas permanecen visibles, pero se excluyen de las tasas que requieren categorías reconocibles. Cada opción de una multiselección se cuenta una vez por persona; sus porcentajes pueden sumar más de 100 %.
- **Historia:** circunstancia y personal se filtran por separado: solo se conservan respuestas con al menos cuatro letras Unicode, sin contar espacios, números ni signos. «No» y «Sí» no se suman para superar el umbral. Si no queda texto, se omite el apartado completo; si queda, aparece al final de la ficha individual, como texto literal, conservando los saltos de línea. Los eventos que solo contienen una marca de tiempo no se presentan como respuestas.

La marca end determina «Completada»; start sin end determina «En curso». Sin ambas marcas la interfaz muestra «Sin inicio registrado»: no se afirma que nadie haya contestado, ya que puede haber respuestas sin estas marcas. La finalización tampoco garantiza que cada pregunta tenga respuesta. Cada tasa informa su denominador de respuestas interpretables; la densidad negativa observada utiliza las elecciones posibles de quienes tienen una respuesta de relaciones al menos parcialmente interpretable. Incluye únicamente valoraciones reconocidas: con respuestas parciales es un mínimo observado dentro de esa base de cálculo.

Las normalizaciones de etiquetas, duplicados y referencias se realizan en memoria. El Excel original no se modifica. Se informa de las incidencias sin sustituirlas silenciosamente por cero.

## Datos y publicación

El Excel se lee en el navegador y no se envía al servidor. Las reacciones, la confianza y las opiniones se guardan solo en memoria durante la consulta. No hay correo, analítica, almacenamiento local ni servicios externos. La política CSP bloquea conexiones salientes desde la página. Tanto la lectura como la preparación de indicadores se ejecutan en un Web Worker local, que se termina al cancelar, cerrar o sustituir el archivo.

Límites del lector: 20 hojas, 10 000 registros por hoja, 200 columnas, 1,5 millones de posiciones de celdas entre las hojas admitidas y 10 millones de caracteres. La lectura inicial del archivo y la preparación disponen de un tiempo máximo de 30 segundos por etapa. Un resultado posterior al límite no restaura la consulta. Los archivos dañados muestran una explicación en español y permiten seleccionar otro archivo. Las hojas no admitidas no se ofrecen para consulta.

El artefacto publicado se construye con una lista explícita de once recursos y se verifica antes del despliegue. Las pruebas, herramientas y documentación no se incluyen en la web servida.

El código del visualizador puede ser público; el Excel de trabajo y sus historias no se incluyen en el repositorio ni en la publicación. Esta arquitectura conserva los datos de consulta en memoria durante el uso; no equivale a borrar el archivo original ni garantiza eliminación forense de toda memoria del dispositivo.

Los enlaces internos a fichas no incluyen nombres ni códigos en la dirección web. El listado y sus filtros se retiran al cerrar la consulta o sustituir el archivo.

## Mejoras adaptadas de PBIS

La versión 0.5.0 se contrastó con la última revisión pública de PBIS, [acb5a7a](https://github.com/Teoriadejuego/pbis-poc/commit/acb5a7a9c3bf4ea0ca7f0f10895d8a94c2fbf889). La lista ordenable, las reacciones, la confianza y las opiniones ya estaban adaptadas. Ahora se incorpora el resumen individual con ampliación de indicadores, una guía integrada, acceso global al resumen de revisión, retirada de una reacción al repetirla y cierre por inactividad con aviso previo. Se mantienen los significados del cuestionario ISAT, el foco de UCE, las ausencias, las predicciones verificables y el filtro de historias. ISAT continúa sin cuentas, llaves, ejemplos integrados, índice de felicidad ni envío de opiniones; la publicación sirve únicamente el visualizador.

## Diseño y textos

La versión 0.3.1 adapta los colores observados en [la web de la Universidad Loyola](https://www.uloyola.es/) el 5 de octubre de 2026: `#192A67`, `#8CD1E7`, `#023E83`, `#243162` y `#DEF7FF`. Los fondos secundarios y bordes incluyen tonos derivados. No se incorporan logotipos, fotografías, fuentes remotas ni código de esa web.

Tres revisores automáticos con roles de redacción, comunicación educativa y marketing propusieron mejoras que se contrastaron con los requisitos antes de aplicarlas. La interfaz habla de fichas y menciones de ayuda, muestra las bases de los recuentos y conserva la matriz antes del listado. Desde la versión 0.4.1, la ficha individual ofrece solo recuentos de ayuda, sin listas de personas vinculadas a esas respuestas, y aclara la diferencia entre relaciones declaradas y predicciones entrantes. Los prompts y los resultados figuran en `REVISION_PROMPTS.md` y `REVISION_RESULTADOS.md`.

## Desarrollo local

Requisitos: Node.js 24.19.0 y pnpm 11.19.0.

```sh
npm install --global pnpm@11.19.0 --ignore-scripts
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
pnpm start
```

Dirección local: `http://127.0.0.1:8892/`. Para servir la aplicación no hacen falta las dependencias de pruebas; `node tools/serve.mjs` es suficiente con Node.js instalado. GitHub Pages publica mediante `.github/workflows/pages.yml`, después de las pruebas y la verificación del artefacto.

Si GitHub no consigue asignar un servidor de ejecución, **Actions → Publicar ISAT → Run workflow** permite seleccionar `macos-15` como alternativa a `ubuntu-latest`. Ambos recorridos ejecutan las pruebas y verifican los mismos once recursos antes del despliegue.

jsdom se utiliza únicamente en las pruebas. SheetJS 0.20.3 se distribuye localmente con su licencia en `vendor/LICENSE-SheetJS.txt`. Los prompts y el cierre de revisión figuran en `REVISION_PROMPTS.md` y `REVISION_RESULTADOS.md`.
