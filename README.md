# ISAT

Visualizador ISAT centrado en las peticiones propias y las menciones de ayuda para la Unidad de Cuidado del Estudiante, derivado de la interfaz PBIS. La carga de un único Excel está separada de la consulta, organizada en **grupos → listas de estudiantes → fichas individuales**. Las relaciones y la adaptación académica aportan información complementaria. No incorpora datos de ejemplo, credenciales ni llave de nombres. El proyecto PBIS permanece separado.

**Abrir ISAT:** https://teoriadejuego.github.io/isat-poc/

## Uso

1. Selecciona un archivo `.xlsx` o `.xls` de hasta 20 MB.
2. Elige la hoja `Users` del cuestionario y pulsa **Abrir fichas**.
3. Al abrir las fichas se oculta la carga de datos. Elige **Ficha de grupo**, **Lista de estudiantes** o **Ficha individual** y selecciona la clase/titulación. **Datos cargados** vuelve al Excel; **Volver a la consulta** conserva la vista y las valoraciones si no cambias el archivo ni la hoja.
4. Consulta el estado destacado de la encuesta: completada, en curso o sin inicio registrado.
   En **Solicitudes y señales de ayuda** verás los casos de la clase para la Unidad de Cuidado del Estudiante. **Ver ficha** abre la ficha individual; **Volver a la ficha de clase** regresa al mismo grupo.
5. La lista incluye toda la clase, con las peticiones propias o dos o más menciones primero. Se puede buscar por nombre/código, filtrar por ese criterio y ordenar cada columna en ambos sentidos. **Bienestar y relaciones** muestra las columnas complementarias. «Sin datos» queda al final de cualquier orden. Las filas se muestran en páginas de 50; la búsqueda y los recuentos abarcan toda la clase.
6. Pulsa un dato para marcar **OK**, **Revisar** o **Me sorprende**. Puedes modificar o quitar la marca y valorar tu confianza de −5 a +5, conservando «Sin valorar» como estado distinto de 0. El nombre/código abre la ficha individual y el retorno conserva el filtro, la búsqueda, el orden y la página de la lista.
7. Las fichas y la lista permiten guardar una valoración de utilidad de 1 a 5 y un comentario opcional. Estas opiniones y las marcas permanecen en memoria durante la consulta; no alteran el Excel ni se envían.
8. **Cancelar lectura**, **Cancelar preparación**, **Retirar archivo** o **Cerrar consulta** interrumpen el proceso y retiran los datos de la aplicación. Al cerrar una consulta con valoraciones aparece un resumen con código aleatorio de sesión, códigos de grupo G001, G002… y los códigos de estudiante del Excel, sin adjuntar nombres ni respuestas. No hay una cuenta que identificar. El comentario se muestra tal como se ha escrito; se pide no incluir nombres. **Cerrar resumen** retira también ese contenido. Sustituir el archivo o la hoja inicia una nueva consulta y descarta las valoraciones anteriores. Salir de la página retira los datos sin generar un resumen.

Los nombres se leen del propio Excel, cuando existen. Los códigos se conservan como texto y permiten distinguir nombres iguales. La historia aparece al final de la ficha individual. Las preguntas de contexto familiar no se muestran. En pantalla, «menciones de ayuda» designa las respuestas en las que otras personas indican que un estudiante necesita ayuda; no designa personas a quienes acudir.

## Lectura del cuestionario

El formato inicial es ISAT T1 de 57 columnas. Se reconocen las preguntas por sus cabeceras, no por posiciones fijas. Se requieren Usuario Id/ID, Curso, Grupo, redes1/redes2, alone y abandono. Se permiten columnas adicionales; las cabeceras duplicadas o ambiguas producen un error.

Los registros con códigos de usuario se muestran con esos códigos. Si existe una columna Nombre o Nombre completo, se usa como etiqueta, sin ninguna llave adicional. Las nominaciones pueden referenciar tanto Usuario Id como Alumno Id. Cada alias debe identificar a una sola persona.

- **Relaciones:** redes1 para Par y redes2 para Impar. Buena/Muy buena relación son positivas; Mala/Muy mala, negativas. No se pondera la intensidad. Las referencias a otras clases y a uno mismo no se cuentan como vínculos dentro de la clase. Las rutas ambiguas se excluyen, sin mezclar recorridos.
- **Predicciones:** beliefs1/beliefs2 se comparan con las relaciones entrantes que pueden verificarse. Una respuesta ausente o parcialmente ilegible no se convierte en un error comprobado. No se generan posiciones 0–10.
- **Popularidad y conexión:** nominaciones directas de las preguntas popular y central. La segunda se presenta como conexión entre grupos percibida, sin confundirla con una centralidad matemática calculada.
- **Unidad de Cuidado del Estudiante:** `uce = Sí` registra una petición propia de ayuda. `ayuda` contiene las personas que quien responde considera que necesitan ayuda. La ficha de clase incluye a quienes han pedido ayuda **o** han sido señalados por **al menos dos personas distintas**. Una persona que cumple ambos criterios aparece una sola vez, con ambos motivos. Se cuentan señalamientos de todo el Excel, incluidas otras clases; cada ficha muestra solo los casos de su clase. Se excluyen autonominaciones y duplicados por código o alias. No se exige que la encuesta esté finalizada.
- **Ausencias en las preguntas de ayuda:** una selección ausente conserva «Sin datos»; eayuda solo indica que se alcanzó la pregunta. «Nadie» o «Ninguno» son respuestas vacías explícitas. Las preguntas ausentes, categorías no interpretables y falta de respuestas se distinguen de una lista vacía con respuestas disponibles.
- **Matriz de ayuda:** el primer bloque muestra las peticiones propias, los casos señalados por dos o más personas y, como contexto, cuántas personas tienen al menos un señalamiento. Debajo, una matriz cruza petición propia Sí/No con 0–1 o 2 o más señalamientos. Sus cuatro celdas son petición propia, ambos criterios, señalamiento por otras personas y ninguno de los dos criterios. Solo entran quienes tienen respuestas interpretables en ambas dimensiones. Los casos con una dimensión ausente pueden seguir apareciendo en el listado si cumplen el otro criterio.
- **Conocidos y otros:** contactos previos identificados y número de selecciones externas, respectivamente. Las etiquetas externas de otros no se vinculan a personas inventadas.
- **Bienestar:** se conservan las respuestas de frecuencia. Soledad frecuente corresponde a **Casi siempre/Siempre**; poco disfrute con sus amistades y experiencia universitaria poco positiva corresponden a **Nunca/Casi nunca**. Soledad tiene sentido opuesto a los dos ítems positivos. Se muestran tres indicadores independientes, sin sumar una escala global ni definir un punto de corte clínico.
- **Adaptación académica:** organización del tiempo, actividades, carga de trabajo, dificultades, asignaturas y motivos, pensamientos de abandono y motivos. Las categorías desconocidas permanecen visibles, pero se excluyen de las tasas que requieren categorías reconocibles. Cada opción de una multiselección se cuenta una vez por persona; sus porcentajes pueden sumar más de 100 %.
- **Historia:** circunstancia se muestra al final de la ficha individual, como texto, conservando los saltos de línea. Si personal contiene una respuesta real se incorpora también. Los eventos que solo contienen una marca de tiempo no se presentan como respuestas.

La marca end determina «Completada»; start sin end determina «En curso». Sin ambas marcas la interfaz muestra «Sin inicio registrado»: no se afirma que nadie haya contestado, ya que puede haber respuestas sin estas marcas. La finalización tampoco garantiza que cada pregunta tenga respuesta. Cada tasa informa su denominador de respuestas interpretables; la densidad negativa utiliza las elecciones posibles de quienes tienen una lista de relaciones completamente interpretable.

Las normalizaciones de etiquetas, duplicados y referencias se realizan en memoria. El Excel original no se modifica. Se informa de las incidencias sin sustituirlas silenciosamente por cero.

## Datos y publicación

El Excel se lee en el navegador y no se envía al servidor. Las reacciones, la confianza y las opiniones se guardan solo en memoria durante la consulta. No hay correo, analítica, almacenamiento local ni servicios externos. La política CSP bloquea conexiones salientes desde la página. Tanto la lectura como la preparación de indicadores se ejecutan en un Web Worker local, que se termina al cancelar, cerrar o sustituir el archivo.

Límites del lector: 20 hojas, 10 000 registros por hoja, 200 columnas, 1,5 millones de posiciones de celdas entre las hojas admitidas y 10 millones de caracteres. La preparación dispone de un tiempo máximo de 30 segundos. Las hojas no admitidas no se ofrecen para consulta.

El artefacto publicado se construye con una lista explícita de nueve recursos y se verifica antes del despliegue. Las pruebas, herramientas y documentación no se incluyen en la web servida.

El código del visualizador puede ser público; el Excel de trabajo y sus historias no se incluyen en el repositorio ni en la publicación. Esta arquitectura conserva los datos de consulta en memoria durante el uso; no equivale a borrar el archivo original ni garantiza eliminación forense de toda memoria del dispositivo.

Los enlaces internos a fichas no incluyen nombres ni códigos en la dirección web. El listado y sus filtros se retiran al cerrar la consulta o sustituir el archivo.

## Diseño y textos

La versión 0.3.1 adapta los colores observados en [la web de la Universidad Loyola](https://www.uloyola.es/) el 5 de octubre de 2026: `#192A67`, `#8CD1E7`, `#023E83`, `#243162` y `#DEF7FF`. Los fondos secundarios y bordes incluyen tonos derivados. No se incorporan logotipos, fotografías, fuentes remotas ni código de esa web.

Tres revisores automáticos con roles de redacción, comunicación educativa y marketing propusieron mejoras que se contrastaron con los requisitos antes de aplicarlas. La interfaz habla de fichas y menciones de ayuda, muestra las bases de los recuentos y conserva la matriz antes del listado. Las menciones que emite cada estudiante están en un desplegable dentro de su bloque de ayuda, separado de sus contactos. Los prompts y los resultados figuran en `REVISION_PROMPTS.md` y `REVISION_RESULTADOS.md`.

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

Si GitHub no consigue asignar un servidor de ejecución, **Actions → Publicar ISAT → Run workflow** permite seleccionar `macos-15` como alternativa a `ubuntu-latest`. Ambos recorridos ejecutan las pruebas y verifican los mismos nueve recursos antes del despliegue.

jsdom se utiliza únicamente en las pruebas. SheetJS 0.20.3 se distribuye localmente con su licencia en `vendor/LICENSE-SheetJS.txt`. Los prompts y el cierre de revisión figuran en `REVISION_PROMPTS.md` y `REVISION_RESULTADOS.md`.
