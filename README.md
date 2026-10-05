# ISAT

Visualizador de integración social y adaptación académica, derivado de la interfaz PBIS. Se abre directamente en la carga de Excel y permite consultar fichas de clase e individuales. No incorpora datos de ejemplo, credenciales ni llave de nombres.

**Abrir ISAT:** https://teoriadejuego.github.io/isat-poc/

## Uso

1. Abre la web y selecciona un archivo `.xlsx` o `.xls` de hasta 20 MB.
2. Selecciona la hoja `Users` y pulsa **Abrir fichas**.
3. Elige **Ficha de clase** o **Ficha individual** y selecciona la clase/titulación. Puedes buscar a un estudiante por nombre o código.
4. **Cerrar consulta** retira las fichas y libera las referencias de la aplicación a los datos cargados. Los Excel originales siguen en el equipo de quien los custodia.

Para abrir una copia local con Node.js:

```sh
npm start
```

Dirección local: `http://127.0.0.1:8892/`. La misma web se publica con GitHub Pages mediante el flujo de `.github/workflows/pages.yml`.

## Lectura del cuestionario

El formato inicial es ISAT T1 de 57 columnas. Las preguntas se localizan por sus cabeceras, no por posiciones fijas. Son necesarios Usuario Id/ID, Curso, Grupo, redes1/redes2, alone y abandono. Se aceptan columnas adicionales. Los encabezados largos de las tres preguntas académicas se reconocen por organización, participación y carga de trabajo.

Los registros con códigos de usuario se muestran con esos códigos. Si existe una columna Nombre o Nombre completo, se usa como etiqueta, sin ninguna llave adicional. Las nominaciones pueden referenciar tanto Usuario Id como Alumno Id. Cada alias debe identificar a una sola persona.

- **Relaciones:** se elige redes1 para Par y redes2 para Impar. Buena/Muy buena relación son positivas; Mala/Muy mala, negativas. No se pondera la intensidad. Se cuentan los vínculos observados dentro de la clase. Las referencias a otras clases quedan diferenciadas. Las referencias a uno mismo se excluyen de estos recuentos.
- **Predicciones:** beliefs1/beliefs2 se comparan con las relaciones entrantes. Se muestra el número de aciertos sobre las predicciones que pueden comprobarse con respuestas disponibles. No se convierten respuestas pendientes en errores.
- **Popularidad y conexión:** nominaciones directas de las preguntas popular y central. La segunda se presenta como conexión entre grupos percibida, sin confundirla con una centralidad matemática calculada.
- **Apoyo:** la pregunta ayuda proporciona las personas a quienes acudir y las nominaciones recibidas como referentes. Se cuenta si se marca a alguien. Con la marca eayuda y ninguna selección registrada se cuenta sin personas señaladas; si no se llegó a la pregunta, el resultado queda sin datos. También se admite una respuesta explícita Ninguno/Nadie. El denominador incluye las preguntas de apoyo alcanzadas y las selecciones disponibles.
- **Conocidos y otros:** contactos previos identificados y número de selecciones externas, respectivamente. Las etiquetas externas de otros no se vinculan a personas inventadas.
- **Bienestar:** alone, fun y general conservan sus respuestas de frecuencia. No se crea una puntuación global ni un punto de corte clínico. Soledad frecuente significa Casi siempre o Siempre.
- **Adaptación académica:** organización del tiempo, actividades universitarias, carga, dificultad, asignaturas y motivos, pensamientos de abandono y motivos. Las distribuciones de selección múltiple pueden sumar más de 100 %.
- **Familia:** siblings, brothers, sisters y posicion se muestran según la respuesta registrada, sin rellenar ausencias con cero.
- **Historia:** circunstancia se muestra al final de la ficha individual, como texto, conservando los saltos de línea. Si personal contiene una respuesta real se incorpora también. Los eventos que solo contienen una marca de tiempo no se presentan como respuestas.
- **UCE:** se conserva esta etiqueta mientras se confirma el enunciado de la pregunta. No se interpreta como diagnóstico ni se usa para calcular otros indicadores.

El estado Completado requiere la marca end. Con start y sin end se presenta En curso. Se incluyen los registros Sin iniciar para mostrar el tamaño y la cobertura del grupo. Cada indicador usa sus respuestas válidas, sin limitarse a cuestionarios finalizados.

## Datos y publicación

La selección del Excel utiliza el navegador; no hay subida de su contenido al servidor. No se incluyen formularios de comentarios, correo, analítica, almacenamiento local ni servicio de opiniones. La política CSP bloquea conexiones salientes desde la página. El lector trabaja en un Web Worker local y se cancela al cerrar o sustituir una consulta.

El código del visualizador puede ser público; el Excel de trabajo y sus historias no se incluyen en el repositorio ni en la publicación. Esta arquitectura conserva los datos de consulta en memoria durante el uso; no equivale a borrar el archivo original ni garantiza eliminación forense de toda memoria del dispositivo.

## Desarrollo

```sh
npm test
```

Los tests usan registros sintéticos de desarrollo y no se incorporan al sitio publicado. SheetJS se distribuye localmente con su licencia en vendor/LICENSE-SheetJS.txt.
