(function () {
  "use strict";
  const C = window.IsatCore,
    E = C.escape,
    $ = (id) => document.getElementById(id);
  let book = null,
    model = null,
    tab = "group",
    worker = null,
    generation = 0,
    readingTimer = null;
  const num = (x) =>
    x === null || x === undefined
      ? "Sin datos"
      : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(x);
  const pct = (x) =>
    x === null ? "Sin datos" : x > 0 && x < 0.1 ? "<0,1 %" : num(x) + " %";
  const dateLabel = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value.slice(8, 10) + "/" + value.slice(5, 7) + "/" + value.slice(0, 4)
      : value;
  const name = (s) => s.name || s.id;
  const className = (g) => g.course + (g.group === "." ? "" : " · " + g.group);
  const options = (list, selected) =>
    list
      .map(
        ([v, label]) =>
          `<option value="${E(v)}"${v === selected ? " selected" : ""}>${E(label)}</option>`,
      )
      .join("");
  function empty() {
    return '<section class="empty-state"><span class="empty-icon" aria-hidden="true">↗</span><h2>Las fichas aparecerán aquí.</h2><p>Selecciona el cuestionario y pulsa «Abrir fichas». Después podrás elegir una clase o consultar la ficha de cada estudiante.</p></section>';
  }
  function clearTimer() {
    clearTimeout(readingTimer);
    readingTimer = null;
  }
  function stopReading() {
    clearTimer();
    worker?.terminate();
    worker = null;
  }
  function removeModel() {
    model = null;
    $("consultation").hidden = true;
    $("report").innerHTML = empty();
    $("report").setAttribute("role", "region");
    $("report").setAttribute("aria-label", "Ficha de consulta");
    $("report").removeAttribute("aria-labelledby");
    $("report").tabIndex = -1;
    $("error").textContent = "";
    $("quality").textContent = "";
    $("view-announcement").textContent = "";
    for (const id of ["study", "class", "student"]) $(id).innerHTML = "";
    $("search").value = "";
  }
  function reset() {
    generation++;
    stopReading();
    book = null;
    removeModel();
    $("file").value = "";
    $("filename").textContent = "Ningún archivo seleccionado";
    $("sheet").innerHTML = "";
    $("sheet-field").hidden = true;
    $("sheet").disabled = false;
    $("open").disabled = true;
    $("clear").hidden = true;
    $("report").setAttribute("aria-busy", "false");
    $("status").textContent =
      "Consulta cerrada. Se han retirado las fichas de esta página.";
  }
  $("clear").onclick = () => {
    reset();
    $("file").focus();
  };
  $("file").onchange = async () => {
    const version = ++generation;
    stopReading();
    book = null;
    removeModel();
    $("open").disabled = true;
    $("sheet-field").hidden = true;
    $("sheet").innerHTML = "";
    $("sheet").disabled = false;
    const file = $("file").files[0];
    $("filename").textContent = file?.name || "Ningún archivo seleccionado";
    $("status").textContent = "";
    $("clear").hidden = !file;
    $("clear").textContent = "Retirar archivo";
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      $("error").textContent = "Selecciona un archivo Excel .xlsx o .xls.";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      $("error").textContent =
        "El archivo supera los 20 MB. Guarda una copia con solo las hojas necesarias y vuelve a seleccionarla.";
      return;
    }
    $("status").textContent = "Leyendo el Excel…";
    $("clear").textContent = "Cancelar lectura";
    try {
      const bytes = await file.arrayBuffer();
      if (version !== generation) return;
      const parser = new Worker("src/parser-worker.js?v=0.3.1");
      worker = parser;
      startTimeout(version);
      parser.onmessage = (e) => {
        const result = e.data;
        if (parser !== worker || result.requestId !== generation) return;
        clearTimer();
        $("report").setAttribute("aria-busy", "false");
        $("clear").textContent = "Retirar archivo";
        $("sheet").disabled = false;
        if (result.error) {
          $("error").textContent = result.error;
          $("status").textContent = "";
          $("open").disabled = !book;
          if (result.operation === "read") {
            book = null;
            stopReading();
          }
          return;
        }
        if (result.type === "parsed") {
          useModel(result.model);
          return;
        }
        book = result;
        const preferred =
          result.sheets.find((s) => s.name === "Users" && !s.unsupported) ||
          result.sheets.find((s) => !s.unsupported);
        if (!preferred) {
          $("error").textContent =
            "Las hojas superan los límites de lectura. Guarda una copia con solo las hojas y los datos necesarios.";
          $("status").textContent = "";
          book = null;
          stopReading();
          return;
        }
        $("sheet").innerHTML = options(
          result.sheets
            .filter((s) => !s.unsupported)
            .map((s) => [s.name, s.name]),
          preferred.name,
        );
        $("sheet-field").hidden = false;
        $("open").disabled = false;
        $("status").textContent =
          "Excel leído. Revisa la hoja con respuestas y pulsa «Abrir fichas».";
      };
      parser.onerror = () => {
        if (parser === worker) {
          book = null;
          stopReading();
          $("sheet").disabled = false;
          $("open").disabled = true;
          $("report").setAttribute("aria-busy", "false");
          $("clear").textContent = "Retirar archivo";
          $("error").textContent =
            "No se pudo iniciar el lector. Recarga la página y vuelve a seleccionar el Excel.";
          $("status").textContent = "";
        }
      };
      parser.postMessage({ type: "read", requestId: version, bytes }, [bytes]);
    } catch {
      if (version === generation) {
        stopReading();
        $("clear").textContent = "Retirar archivo";
        $("status").textContent = "";
        $("error").textContent =
          "No se pudo acceder al archivo. Vuelve a seleccionarlo.";
      }
    }
  };
  function startTimeout(version) {
    clearTimer();
    $("report").setAttribute("aria-busy", "true");
    readingTimer = setTimeout(() => {
      if (version === generation) {
        book = null;
        stopReading();
        $("sheet").disabled = false;
        $("open").disabled = true;
        $("report").setAttribute("aria-busy", "false");
        $("clear").textContent = "Retirar archivo";
        $("status").textContent = "";
        $("error").textContent =
          "La preparación ha tardado demasiado. Guarda una copia con solo los datos necesarios y vuelve a seleccionarla.";
      }
    }, 30000);
  }
  $("sheet").onchange = () => {
    generation++;
    clearTimer();
    removeModel();
    $("report").setAttribute("aria-busy", "false");
    $("open").disabled = !book;
    $("clear").textContent = "Retirar archivo";
    $("status").textContent =
      "La hoja ha cambiado. Pulsa «Abrir fichas» para continuar.";
  };
  $("open").onclick = () => {
    if (!worker || !book) return;
    removeModel();
    const version = ++generation;
    $("open").disabled = true;
    $("sheet").disabled = true;
    $("clear").textContent = "Cancelar preparación";
    $("status").textContent = "Preparando las fichas…";
    startTimeout(version);
    worker.postMessage({
      type: "parse",
      requestId: version,
      sheet: $("sheet").value,
    });
  };
  function useModel(result) {
    model = result;
    const studies = [...new Set(model.groups.map((g) => g.study))];
    $("study-field").hidden = studies.length <= 1;
    $("study").innerHTML = options(
      studies.map((v) => [v, v]),
      studies[0],
    );
    $("search").value = "";
    tab = "group";
    setTab();
    updateClasses();
    $("consultation").hidden = false;
    $("clear").hidden = false;
    $("clear").textContent = "Cerrar consulta";
    $("open").disabled = false;
    $("status").textContent =
      `${model.students.length} estudiantes · ${model.groups.length} clases o titulaciones. ${model.students.filter((s) => s.status === "Completado").length} cuestionarios completados.`;
    const w = model.warnings,
      issues =
        w.unresolved + w.categories + w.conflicts + w.routes + w.academic;
    $("quality").textContent = issues
      ? `${issues === 1 ? "Se ha detectado 1 incidencia" : `Se han detectado ${issues} incidencias`} de lectura. Las referencias, rutas o categorías no interpretables se excluyen de los indicadores afectados; las respuestas originales permanecen visibles cuando es posible.`
      : "";
    $("tab-group").focus();
  }
  function setTab() {
    for (const type of ["group", "student"]) {
      $("tab-" + type).setAttribute("aria-selected", String(tab === type));
      $("tab-" + type).tabIndex = tab === type ? 0 : -1;
    }
    $("report").setAttribute("role", "tabpanel");
    $("report").removeAttribute("aria-label");
    $("report").tabIndex = 0;
    $("report").setAttribute("aria-labelledby", "tab-" + tab);
    $("search-field").hidden = tab !== "student";
    $("student-field").hidden = tab !== "student";
  }
  function chooseTab(type) {
    tab = type;
    setTab();
    updateStudents();
    render();
  }
  for (const type of ["group", "student"]) {
    $("tab-" + type).onclick = () => chooseTab(type);
    $("tab-" + type).onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        chooseTab(
          e.key === "Home"
            ? "group"
            : e.key === "End"
              ? "student"
              : type === "group"
                ? "student"
                : "group",
        );
        $("tab-" + tab).focus();
      }
    };
  }
  function group() {
    return model?.groups.find((g) => g.key === $("class").value);
  }
  function updateClasses() {
    const gs = model.groups.filter((g) => g.study === $("study").value);
    $("class").innerHTML = options(
      gs.map((g) => [g.key, className(g)]),
      gs[0]?.key,
    );
    updateStudents();
    render();
  }
  function updateStudents() {
    const old = $("student").value,
      q = C.norm($("search").value),
      rows =
        group()?.rows.filter((s) => C.norm(name(s) + " " + s.id).includes(q)) ||
        [];
    const sorted = [...rows].sort((a, b) =>
      name(a).localeCompare(name(b), "es", { numeric: true }),
    );
    $("student").innerHTML = options(
      sorted.map((s) => [s.id, s.name ? `${s.name} · ${s.id}` : s.id]),
      rows.some((s) => s.id === old) ? old : sorted[0]?.id,
    );
  }
  $("study").onchange = updateClasses;
  $("class").onchange = () => {
    $("search").value = "";
    updateStudents();
    render();
  };
  $("search").oninput = () => {
    updateStudents();
    render();
  };
  $("student").onchange = render;
  function openCareStudent(id) {
    const s = group()?.rows.find((student) => student.id === id);
    if (!s) return;
    $("search").value = "";
    tab = "student";
    setTab();
    updateStudents();
    $("student").value = s.id;
    render();
    focusReport();
  }
  function focusReport() {
    $("report").focus({ preventScroll: true });
    $("report").scrollIntoView?.({ block: "start" });
  }
  $("report").addEventListener("click", (event) => {
    const studentLink = event.target.closest("a[data-care-student]");
    if (studentLink) {
      event.preventDefault();
      openCareStudent(studentLink.dataset.careStudent);
      return;
    }
    if (event.target.closest("button[data-return-class]")) {
      chooseTab("group");
      focusReport();
    }
  });
  function section(number, title, body, style = "blue") {
    return `<section class="section-panel panel-${style}"><div class="section-label"><span class="section-number">${number}</span><h3>${E(title)}</h3></div>${body}</section>`;
  }
  function surveyStatus(s) {
    const state =
      s.status === "Completado"
        ? ["complete", "Encuesta completada"]
        : s.status === "En curso"
          ? ["progress", "Encuesta en curso"]
          : ["pending", "Sin inicio registrado"];
    return `<span class="survey-status survey-${state[0]}">${state[1]}</span>`;
  }
  function surveySummary(a) {
    return `<div class="survey-summary" aria-label="Estado de participación"><div><strong>${a.completed}</strong><span>Completadas</span></div><div><strong>${a.started}</strong><span>En curso</span></div><div><strong>${a.notStarted}</strong><span>Sin inicio registrado</span></div></div>`;
  }
  function hero(title, subtitle, type, status = "") {
    return `<div class="report-hero"><div><span class="eyebrow">ISAT · CUIDADO DEL ESTUDIANTE</span><h2>${E(title)}</h2><p>${E(subtitle)}</p></div><div class="hero-meta"><span class="hero-type">${E(type)}</span>${status}</div></div>`;
  }
  function progress(value, total, label) {
    if (value === null || !total)
      return '<span class="missing">Sin datos suficientes</span>';
    const p = Math.min(100, Math.max(0, (100 * value) / total));
    return `<progress max="100" value="${p}" aria-label="${E(label)}">${num(p)} %</progress>`;
  }
  function rateCard(title, r, context) {
    return `<div class="rate-card"><h4>${E(title)}</h4><div class="big-value">${pct(r.percent)}</div>${progress(r.count, r.denominator, title)}<p>${r.denominator ? `${num(r.count)} de ${num(r.denominator)} ${r.unit || "respuestas válidas"}` : "Sin respuestas disponibles"}</p>${context ? `<p class="small-note">${E(context)}</p>` : ""}</div>`;
  }
  function careReasons(care) {
    const reasons = [];
    if (care.requested)
      reasons.push('<span class="care-reason">Petición propia</span>');
    if (care.peerReports >= 2)
      reasons.push(
        `<span class="care-reason care-reason-peers">${num(care.peerReports)} personas indican que necesita ayuda</span>`,
      );
    return reasons.join("");
  }
  function carePanel(g) {
    const care = g.summary.care;
    const students = new Map(g.rows.map((s) => [s.id, s]));
    const cases = [...care.cases].sort((a, b) =>
      name(students.get(a.id)).localeCompare(name(students.get(b.id)), "es", {
        numeric: true,
      }),
    );
    const unavailable =
      !care.selfQuestionPresent && !care.peerQuestionPresent
        ? "Esta hoja no incluye las preguntas de petición propia y menciones de ayuda."
        : !care.selfAnswered && !care.peerRespondents
          ? "No hay respuestas interpretables para consultar estos criterios."
          : "Con las respuestas disponibles, ningún estudiante reúne los criterios del listado.";
    return `<section class="care-panel" aria-labelledby="care-title"><div class="care-heading"><div><span class="eyebrow">UNIDAD DE CUIDADO DEL ESTUDIANTE</span><h3 id="care-title">Peticiones y menciones de ayuda</h3></div><span class="care-total">${cases.length} ${cases.length === 1 ? "ficha para consultar" : "fichas para consultar"}</span></div><p class="care-definition">Las menciones son respuestas en las que otras personas indican que un estudiante necesita ayuda.</p><div class="care-stats"><div><h4>Han pedido ayuda</h4><strong>${num(care.selfRequests)}</strong><p>${care.selfRequests === null ? "No hay respuestas «Sí» o «No» registradas para esta pregunta." : `De ${care.selfAnswered} estudiantes con respuesta «Sí» o «No».`}</p></div><div><h4>Con menciones de dos o más personas</h4><strong>${num(care.peerCases)}</strong><p>${care.peerCases === null ? "No hay respuestas interpretables para contar las menciones de ayuda." : `Estudiantes con al menos una mención registrada: ${num(care.peerAny)}.`}</p></div></div>${careMatrix(care.matrix)}<p class="care-intro">El listado incluye a quienes han pedido ayuda o reciben menciones de al menos dos personas distintas. Cada estudiante aparece una sola vez, también cuando cumple ambos criterios.</p>${
      cases.length
        ? `<details class="care-details" open><summary>Consultar las ${cases.length} fichas individuales</summary><ul class="care-list">${cases
            .map((item) => {
              const s = students.get(item.id);
              return `<li><div class="care-person"><strong>${E(name(s))}</strong>${s.name ? `<span class="care-code">Código: ${E(s.id)}</span>` : ""}<div class="care-reasons">${careReasons(item)}</div></div><a class="care-link" href="#report" data-care-student="${E(s.id)}" aria-label="${E(`Ver ficha individual de ${name(s)}${s.name ? `, código ${s.id}` : ""}`)}">Ver ficha individual <span aria-hidden="true">→</span></a></li>`;
            })
            .join("")}</ul></details>`
        : `<p class="care-empty">${unavailable}</p>`
    }<p class="care-coverage">Las menciones se cuentan por personas distintas entre las ${care.peerRespondents} respuestas interpretables de todo el Excel. Aquí se muestran únicamente estudiantes de la clase seleccionada.</p></section>`;
  }
  function careMatrix(matrix) {
    const value = (count, label) =>
      `<strong>${matrix.known ? count : "Sin datos"}</strong><span>${label}</span>`;
    return `<div class="care-matrix"><table><caption>Petición propia y menciones registradas</caption><thead><tr><th rowspan="2" scope="col">Petición propia</th><th colspan="2" scope="colgroup">Personas distintas que indican que necesita ayuda</th></tr><tr><th scope="col">0 o 1 persona</th><th scope="col">2 o más personas</th></tr></thead><tbody><tr><th scope="row">Sí</th><td class="matrix-own">${value(matrix.ownOnly, "Petición propia")}</td><td class="matrix-both">${value(matrix.both, "Ambos criterios")}</td></tr><tr><th scope="row">No</th><td>${value(matrix.neither, "Sin petición y con 0–1 menciones")}</td><td class="matrix-peer">${value(matrix.peerOnly, "Menciones de otras personas")}</td></tr></tbody></table><p class="care-matrix-note">${matrix.known} estudiantes con respuesta «Sí» o «No» y recuento de menciones disponible. ${matrix.missing} fuera de la matriz por falta de datos. Las respuestas ausentes nunca equivalen a «No». Quienes cumplen un criterio conocido aparecen en el listado.</p></div>`;
  }
  function studentCare(s) {
    const care = s.care;
    const requested =
      care.requested === null
        ? "Sin respuesta interpretable"
        : care.requested
          ? "Sí"
          : "No";
    return `<div class="student-care"><div class="care-heading"><h4>Peticiones y menciones de ayuda</h4>${careReasons({ requested: care.requested === true, peerReports: care.peerReports })}</div><div class="response-grid"><div class="response-card"><h4>Petición propia de ayuda</h4><p class="response-value">${requested}</p></div><div class="response-card"><h4>Personas que indican que necesita ayuda</h4><p class="response-value">${num(care.peerReports)}</p><p class="small-note">Basado en las respuestas de ${care.peerCoverage} personas distintas de todo el Excel, excluyendo a quien corresponde esta ficha.</p></div></div><details class="care-outgoing"><summary>Personas que este estudiante considera que necesitan ayuda</summary><p>${E(contactNames(s.help))}</p></details></div>`;
  }
  function dist(field, d) {
    return `<div class="distribution"><h4>${E(C.FIELDS[field])}</h4><p class="coverage">${d.denominator} ${d.denominator === 1 ? "respuesta registrada" : "respuestas registradas"}</p>${d.items.length ? d.items.map((x) => `<div class="distribution-row"><div><span>${E(x.label)}</span><strong>${x.count} <small>· ${pct(x.percent)}</small></strong></div>${progress(x.count, d.denominator, x.label)}</div>`).join("") : '<p class="missing">Sin datos</p>'}</div>`;
  }
  function metric(title, value, description, denominator) {
    return `<div class="metric"><h4>${E(title)}</h4><div class="metric-line"><strong>${num(value)}</strong>${denominator ? `<span>${E(denominator)}</span>` : ""}</div><p>${E(description)}</p></div>`;
  }
  function responseCard(field, s) {
    const value = s.responses[field];
    return `<div class="response-card"><h4>${E(C.FIELDS[field])}</h4><p class="response-value${value === null ? " missing" : ""}">${E(value ?? "Sin datos")}</p></div>`;
  }
  function contactNames(list) {
    if (list === null) return "Sin selección registrada";
    if (!list.length) return "No ha indicado a ninguna persona";
    return list
      .map((x) => {
        const s = model.students.find((t) => t.id === x.id);
        return name(s) + (x.sameClass ? "" : " · otra clase");
      })
      .join(" · ");
  }
  function predictionDescription(m, kind) {
    const emitted = m[kind + "Predictions"],
      evaluable = m[kind + "Evaluable"];
    if (emitted === null)
      return "No hay predicciones interpretables disponibles.";
    if (emitted === 0) return "No se han señalado predicciones de este tipo.";
    if (!evaluable)
      return `Las ${num(emitted)} predicciones emitidas todavía no pueden verificarse.`;
    return `${num(evaluable)} predicciones verificables de ${num(emitted)} emitidas.`;
  }
  function groupReport(g) {
    const a = g.summary;
    return `<article class="report">${hero(className(g), `${a.n} estudiantes`, "Ficha de clase")}<div class="report-body">${carePanel(g)}${surveySummary(a)}<div class="reading"><span>Resultados descriptivos · cada indicador muestra su base de cálculo</span></div>
    ${section("01", "Integración y bienestar", `<div class="rate-grid">${rateCard("Soledad frecuente", a.loneliness, "Casi siempre o siempre en la última semana.")}${rateCard("Poco disfrute con sus amistades", a.lowEnjoyment, "Nunca o casi nunca en la última semana.")}${rateCard("Experiencia universitaria poco positiva", a.lowUniversity, "Nunca o casi nunca en la última semana.")}</div><p class="direction-note">En soledad, una mayor frecuencia es menos favorable. En disfrute y experiencia universitaria, una menor frecuencia es menos favorable.</p><div class="rate-grid single">${rateCard("Densidad de relaciones negativas observadas", a.rejection, "Nominaciones dentro de la clase, sobre las elecciones posibles de quienes tienen una lista de relaciones completamente interpretable.")}</div><div class="distribution-grid">${["alone", "fun", "general"].map((f) => dist(f, a.distributions[f])).join("")}</div><p class="section-note">Las redes tienen ${a.relationCoverage} de ${a.n} respuestas completamente interpretables. Los recuentos recibidos incluyen los vínculos reconocidos y pueden cambiar al completar o corregir respuestas.</p>`)}
    ${section("02", "Adaptación académica", `<div class="rate-grid four">${rateCard("Dificultades en asignaturas", a.difficulty)}${rateCard("Se han planteado abandonar", a.dropout)}${rateCard("Organización del tiempo difícil", a.time, "Respuestas Mal o Muy mal.")}${rateCard("Carga de trabajo alta", a.workload, "Respuestas Alta o Muy alta.")}</div><div class="distribution-grid">${["time", "workload", "dropout"].map((f) => dist(f, a.distributions[f])).join("")}</div>`, "neutral")}
    ${section("03", "Participación y motivos", `<div class="distribution-grid">${["activities", "subjectReasons", "dropoutReasons"].map((f) => dist(f, a.distributions[f])).join("")}</div><p class="section-note">En las preguntas con varias opciones, una persona puede elegir más de una. Los porcentajes no tienen que sumar 100 %.</p>`)}
    <p class="report-footer">Las historias y circunstancias personales se consultan únicamente en la ficha individual. Una respuesta ausente conserva el estado «Sin datos».</p></div></article>`;
  }
  function studentReport(s, g) {
    const m = s.metrics;
    const coverage = `De las otras ${m.peers} personas de la clase, ${m.relationsCoverage} tienen una respuesta de relaciones al menos parcialmente interpretable.`;
    return `<article class="report">${hero(name(s), `${className(g)} · ${g.rows.length} estudiantes`, "Ficha individual", surveyStatus(s))}<div class="report-body"><button class="back-to-class" type="button" data-return-class>← Volver a la ficha de clase</button>${studentCare(s)}<div class="reading"><span>${s.name ? `Código: ${E(s.id)}` : "Los códigos se muestran tal como figuran en el Excel."}</span><span class="coverage">${E(s.lastDate ? `Finalización: ${dateLabel(s.lastDate)}` : "Finalización sin registrar")}</span></div>
    ${section("01", "Relaciones e integración", `<div class="metric-grid">${metric("Relaciones positivas recibidas observadas", m.friendsReceived, coverage)}${metric("Relaciones positivas declaradas", m.friendsDeclared, "Personas de su clase valoradas con Buena o Muy buena relación.")}${metric("Relaciones positivas recíprocas observadas", m.friendsMutual, m.mutualComplete ? "Elecciones positivas correspondidas." : "Vínculos observados; hay respuestas ausentes o parcialmente interpretables.")}${metric("Relaciones negativas recibidas observadas", m.rejectionsReceived, coverage)}${metric("Relaciones negativas declaradas", m.rejectionsDeclared, "Personas de su clase valoradas con Mala o Muy mala relación.")}${metric("Relaciones negativas recíprocas observadas", m.rejectionsMutual, m.mutualComplete ? "Elecciones negativas correspondidas." : "Vínculos observados; hay respuestas ausentes o parcialmente interpretables.")}</div><div class="metric-grid compact">${metric("Aciertos de predicciones positivas", m.friendCorrect, predictionDescription(m, "friend"))}${metric("Aciertos de predicciones negativas", m.rejectionCorrect, predictionDescription(m, "rejection"))}</div><p class="section-note">Las relaciones dentro de la clase se cuentan por separado de las referencias a otras clases. Los recuentos recibidos reflejan las respuestas disponibles.</p>`)}
    ${section("02", "Bienestar y contactos", `<div class="response-grid">${["alone", "fun", "general"].map((f) => responseCard(f, s)).join("")}</div><div class="metric-grid compact">${metric("Nominaciones como persona popular", m.popularVotes, "Veces que otras personas de su clase la señalan como popular.")}${metric("Nominaciones como conexión entre grupos", m.connectorVotes, "Veces que otras personas de su clase la señalan como conectora.")}${metric("Contactos previos identificados", s.contacts?.length ?? null, "Personas señaladas en la pregunta de conocidos, incluidas otras clases.")}${metric("Contactos fuera de la clase", s.outsideCount, "Selecciones de la pregunta de contactos en otros grupos.")}</div>`)}
    ${section("03", "Adaptación académica", `<div class="response-grid">${["time", "workload", "difficulty", "dropout", "activities"].map((f) => responseCard(f, s)).join("")}</div><div class="response-details">${["subjects", "subjectReasons", "subjectOther", "dropoutReasons", "dropoutOther"].map((f) => responseCard(f, s)).join("")}</div>`, "neutral")}
    ${section("04", "Su historia", `<p class="story-intro">Circunstancias personales compartidas en el cuestionario.</p><div class="story${s.story === null ? " missing" : ""}">${E(s.story ?? "No hay un texto registrado para esta persona.")}</div><p class="section-note">El texto se muestra tal como se guardó en el Excel.</p>`, "story")}
    </div></article>`;
  }
  function render() {
    if (!model) return;
    const g = group();
    if (!g) {
      $("report").innerHTML = empty();
      return;
    }
    if (tab === "group") {
      $("report").innerHTML = groupReport(g);
      $("view-announcement").textContent =
        `Ficha de clase actualizada: ${g.rows.length} estudiantes.`;
    } else {
      const s = g.rows.find((x) => x.id === $("student").value);
      $("report").innerHTML = s
        ? studentReport(s, g)
        : '<section class="empty-state"><h2>No hay coincidencias.</h2><p>Prueba con otro nombre o código en esta clase.</p></section>';
      $("view-announcement").textContent = s
        ? `Ficha individual actualizada. ${$("student").options.length} coincidencias. ${s.status === "Completado" ? "Encuesta completada" : s.status === "En curso" ? "Encuesta en curso" : "Sin inicio registrado"}.`
        : "No hay estudiantes que coincidan con la búsqueda en esta clase.";
    }
  }
  window.addEventListener("pagehide", reset);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) reset();
  });
})();
