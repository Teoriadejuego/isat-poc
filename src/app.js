(function () {
  "use strict";
  const C = window.IsatCore,
    N = window.IsatEgoNetwork,
    E = C.escape,
    $ = (id) => document.getElementById(id);
  let book = null,
    model = null,
    tab = "group",
    worker = null,
    generation = 0,
    readingTimer = null,
    readingFile = false,
    studentQuery = "",
    returnView = "group",
    listState = newListState(),
    review = newReview(),
    activeCell = null,
    lastActivity = null,
    summaryReturn = null;
  const viewTypes = ["group", "list", "student"];
  const PAGE_SIZE = 50;
  const IDLE_LIMIT = 15 * 60 * 1000;
  const expandedStudents = new Set();
  const expandedGroups = new Set();
  const listScopes = [
    ["all", "Toda la clase"],
    ["care", "Peticiones y menciones de ayuda"],
    ["ownOnly", "Petición propia y 0–1 menciones"],
    ["both", "Petición propia y ≥2 menciones"],
    ["peerOnly", "Sin petición propia y ≥2 menciones"],
    ["neither", "Sin petición propia y 0–1 menciones"],
    ["missing", "Datos de ayuda incompletos"],
    ["pendingLow", "Sin respuesta propia y 0–1 menciones"],
    ["pendingHigh", "Sin respuesta propia y ≥2 menciones"],
  ];
  function newListState() {
    return {
      query: "",
      scope: "all",
      extra: false,
      sort: "care",
      direction: -1,
      page: 0,
    };
  }
  function newReview() {
    const bytes = new Uint32Array(2);
    window.crypto.getRandomValues(bytes);
    return {
      code: Array.from(bytes, (v) => v.toString(16).padStart(8, "0")).join("-"),
      cells: new Map(),
      confidence: new Map(),
      opinions: new Map(),
      drafts: new Map(),
    };
  }
  const num = (x) =>
    x === null || x === undefined
      ? "Pendiente"
      : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(x);
  const pct = (x) =>
    x === null ? "Pendiente" : x > 0 && x < 0.1 ? "<0,1 %" : num(x) + " %";
  const dateLabel = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value.slice(8, 10) + "/" + value.slice(5, 7) + "/" + value.slice(0, 4)
      : value;
  const name = (s) => s.id;
  const studentsLabel = (count) =>
    `${num(count)} ${count === 1 ? "estudiante" : "estudiantes"}`;
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
    readingFile = false;
  }
  function removeModel() {
    model = null;
    studentQuery = "";
    returnView = "group";
    listState = newListState();
    review = newReview();
    expandedStudents.clear();
    expandedGroups.clear();
    lastActivity = Date.now();
    $("idle-warning").hidden = true;
    closeCellReview(false);
    closeSummary(false);
    closeHelp(false);
    syncReviewButton();
    $("consultation").hidden = true;
    $("report").hidden = true;
    $("data-screen").hidden = false;
    $("show-data").hidden = true;
    $("back-consultation").hidden = true;
    $("dataset-summary").textContent = "";
    $("consultation-quality").textContent = "";
    $("report").innerHTML = empty();
    $("report").setAttribute("role", "region");
    $("report").setAttribute("aria-label", "Ficha de consulta");
    $("report").removeAttribute("aria-labelledby");
    $("report").tabIndex = -1;
    $("error").textContent = "";
    $("open").innerHTML = 'Abrir fichas <span aria-hidden="true">→</span>';
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
    lastActivity = null;
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
    const summary = model && reviewCount() ? reviewSummary() : null;
    reset();
    if (summary) showSummary(summary, true);
    else $("file").focus();
  };
  function showData() {
    closeCellReview(false);
    $("data-screen").hidden = false;
    $("consultation").hidden = true;
    $("report").hidden = true;
    $("back-consultation").hidden = !model;
    $("file").focus();
  }
  function showConsultation() {
    if (!model) return;
    $("data-screen").hidden = true;
    $("consultation").hidden = false;
    $("report").hidden = false;
    $("show-data").hidden = false;
    $("back-consultation").hidden = false;
    $("tab-" + tab).focus();
  }
  $("show-data").onclick = showData;
  $("back-consultation").onclick = showConsultation;
  function hasSessionContent() {
    return !!(
      model ||
      book ||
      worker ||
      readingFile ||
      $("review-summary").open
    );
  }
  function checkInactivity() {
    if (!hasSessionContent() || lastActivity === null) {
      $("idle-warning").hidden = true;
      return false;
    }
    const elapsed = Date.now() - lastActivity;
    if (elapsed >= IDLE_LIMIT) {
      reset();
      $("status").textContent =
        "La consulta se ha cerrado tras 15 minutos sin actividad. Vuelve a cargar el Excel para continuar.";
      $("file").focus();
      return true;
    }
    $("idle-warning").hidden = elapsed < IDLE_LIMIT - 60 * 1000;
    return false;
  }
  function recordActivity() {
    if (checkInactivity() || !hasSessionContent()) return;
    lastActivity = Date.now();
    $("idle-warning").hidden = true;
  }
  for (const event of [
    "pointerdown",
    "keydown",
    "input",
    "wheel",
    "touchstart",
  ])
    document.addEventListener(event, recordActivity, { passive: true });
  setInterval(checkInactivity, 5000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkInactivity();
  });
  $("idle-continue").onclick = recordActivity;
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
    readingFile = true;
    startTimeout(version);
    try {
      const bytes = await file.arrayBuffer();
      if (version !== generation) return;
      readingFile = false;
      const parser = new Worker("src/parser-worker.js?v=0.9.1");
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
        generation++;
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
    if (model) {
      showConsultation();
      return;
    }
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
    lastActivity = Date.now();
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
    showConsultation();
    $("clear").hidden = false;
    $("clear").textContent = "Cerrar consulta";
    $("open").disabled = false;
    $("open").innerHTML =
      'Volver a las fichas <span aria-hidden="true">→</span>';
    $("status").textContent =
      `${model.students.length} estudiantes · ${model.groups.length} clases o titulaciones. ${model.students.filter((s) => s.status === "Completado").length} cuestionarios completados.`;
    $("dataset-summary").textContent = $("status").textContent;
    const w = model.warnings,
      issues =
        w.unresolved +
        w.categories +
        w.conflicts +
        w.routes +
        w.academic +
        (w.responses || 0);
    $("quality").textContent = issues
      ? `${issues === 1 ? "Se ha detectado 1 incidencia" : `Se han detectado ${issues} incidencias`} de lectura. Las referencias, rutas o categorías no interpretables se excluyen de los indicadores afectados; las respuestas originales permanecen visibles cuando es posible.`
      : "";
    $("consultation-quality").textContent = $("quality").textContent;
    $("tab-group").focus();
  }
  function setTab() {
    for (const type of viewTypes) {
      $("tab-" + type).setAttribute("aria-selected", String(tab === type));
      $("tab-" + type).tabIndex = tab === type ? 0 : -1;
    }
    $("report").setAttribute("role", "tabpanel");
    $("report").removeAttribute("aria-label");
    $("report").tabIndex = 0;
    $("report").setAttribute("aria-labelledby", "tab-" + tab);
    $("search-field").hidden = tab === "group";
    $("student-field").hidden = tab !== "student";
    $("search").value = tab === "list" ? listState.query : studentQuery;
  }
  function chooseTab(type) {
    if (type === "student" && tab !== "student") returnView = tab;
    closeCellReview(false);
    tab = type;
    setTab();
    updateStudents();
    render();
  }
  for (const type of viewTypes) {
    $("tab-" + type).onclick = () => chooseTab(type);
    $("tab-" + type).onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? viewTypes.length - 1
              : (viewTypes.indexOf(type) +
                  (e.key === "ArrowRight" ? 1 : -1) +
                  viewTypes.length) %
                viewTypes.length;
        chooseTab(viewTypes[next]);
        $("tab-" + tab).focus();
      }
    };
  }
  function group() {
    return model?.groups.find((g) => g.key === $("class").value);
  }
  function updateClasses() {
    studentQuery = "";
    listState.query = "";
    listState.page = 0;
    $("search").value = "";
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
      q = tab === "student" ? C.norm(studentQuery) : "",
      rows =
        group()?.rows.filter((s) => C.norm(name(s) + " " + s.id).includes(q)) ||
        [];
    const sorted = [...rows].sort((a, b) =>
      name(a).localeCompare(name(b), "es", { numeric: true }),
    );
    $("student").innerHTML = options(
      sorted.map((s) => [s.id, s.id]),
      rows.some((s) => s.id === old) ? old : sorted[0]?.id,
    );
  }
  $("study").onchange = updateClasses;
  $("class").onchange = () => {
    studentQuery = "";
    listState.query = "";
    listState.page = 0;
    $("search").value = "";
    updateStudents();
    render();
  };
  $("search").oninput = () => {
    if (tab === "list") {
      listState.query = $("search").value;
      listState.page = 0;
    } else studentQuery = $("search").value;
    updateStudents();
    render();
  };
  $("student").onchange = render;
  function openCareStudent(id) {
    const s = group()?.rows.find((student) => student.id === id);
    if (!s) return;
    returnView = tab === "list" ? "list" : "group";
    studentQuery = "";
    $("search").value = "";
    tab = "student";
    setTab();
    updateStudents();
    $("student").value = s.id;
    render();
    focusReport();
  }
  function studentSequence(g, s) {
    const filtered = returnView === "list" && !studentQuery ? listRows(g) : [];
    if (filtered.some((row) => row.id === s.id))
      return { rows: filtered, label: "de la lista" };
    const ids = Array.from($("student").options, (option) => option.value);
    return {
      rows: ids
        .map((id) => g.rows.find((row) => row.id === id))
        .filter(Boolean),
      label: "de la selección",
    };
  }
  function studentNavigation(s, g) {
    const sequence = studentSequence(g, s);
    const index = sequence.rows.findIndex((row) => row.id === s.id);
    return `<nav class="student-navigation" aria-label="Recorrer fichas"><button class="back-to-class" type="button" data-return-class>← Volver a ${returnView === "list" ? "la lista de estudiantes" : "la ficha de clase"}</button><div><button class="btn secondary" type="button" data-student-step="-1"${index <= 0 ? " disabled" : ""} aria-label="Ficha anterior">← Anterior</button><span>${index + 1} de ${sequence.rows.length} ${sequence.label}</span><button class="btn secondary" type="button" data-student-step="1"${index < 0 || index >= sequence.rows.length - 1 ? " disabled" : ""} aria-label="Ficha siguiente">Siguiente →</button></div></nav>`;
  }
  function focusReport() {
    $("report").focus({ preventScroll: true });
    $("report").scrollIntoView?.({ block: "start" });
  }
  function openNetworkStudent(id) {
    const s = model?.students.find((student) => student.id === id);
    const targetGroup = s && model.groups.find((g) => g.rows.includes(s));
    if (!targetGroup) return;
    if (targetGroup.key === group()?.key) {
      openCareStudent(id);
      return;
    }
    returnView = "group";
    $("study").value = targetGroup.study;
    studentQuery = "";
    listState.query = "";
    listState.page = 0;
    tab = "student";
    setTab();
    updateClasses();
    $("class").value = targetGroup.key;
    updateStudents();
    $("student").value = s.id;
    render();
    focusReport();
  }
  $("report").addEventListener("click", (event) => {
    const step = event.target.closest("button[data-student-step]");
    if (step && !step.disabled && tab === "student") {
      const g = group(),
        current = g?.rows.find((s) => s.id === $("student").value);
      if (!current) return;
      const sequence = studentSequence(g, current);
      const index =
        sequence.rows.findIndex((s) => s.id === current.id) +
        Number(step.dataset.studentStep);
      const next = sequence.rows[index];
      if (!next) return;
      if (sequence.label === "de la lista")
        listState.page = Math.floor(index / PAGE_SIZE);
      $("student").value = next.id;
      render();
      focusReport();
      return;
    }
    const zoomButton = event.target.closest("button[data-ego-zoom]");
    if (zoomButton) {
      N.zoom(zoomButton.closest(".ego-network"), zoomButton.dataset.egoZoom);
      return;
    }
    const networkLink = event.target.closest("a[data-network-student]");
    if (networkLink) {
      event.preventDefault();
      openNetworkStudent(networkLink.dataset.networkStudent);
      return;
    }
    const studentLink = event.target.closest("a[data-care-student]");
    if (studentLink) {
      event.preventDefault();
      openCareStudent(studentLink.dataset.careStudent);
      return;
    }
    if (event.target.closest("button[data-return-class]")) {
      chooseTab(returnView);
      focusReport();
      return;
    }
    const sort = event.target.closest("button[data-sort]");
    if (sort) {
      listState.direction =
        listState.sort === sort.dataset.sort ? -listState.direction : 1;
      listState.sort = sort.dataset.sort;
      listState.page = 0;
      render();
      $("report").querySelector(`[data-sort="${sort.dataset.sort}"]`)?.focus();
      return;
    }
    if (event.target.closest("button[data-prioritize]")) {
      listState.sort = "care";
      listState.direction = -1;
      listState.page = 0;
      render();
      $("report").querySelector("[data-prioritize]")?.focus();
      return;
    }
    const page = event.target.closest("button[data-list-page]");
    if (page) {
      listState.page += Number(page.dataset.listPage);
      render();
      focusReport();
      return;
    }
    if (event.target.closest("button[data-open-list]")) {
      listState.scope = "all";
      listState.query = "";
      listState.page = 0;
      chooseTab("list");
      focusReport();
      return;
    }
    const confidenceAction = event.target.closest(
      "button[data-confidence-action]",
    );
    if (confidenceAction) {
      const id = confidenceAction.dataset.confidenceAction;
      saveConfidence(id, review.confidence.has(id) ? null : 0);
      return;
    }
    const matrixCell = event.target.closest("button[data-care-scope]");
    if (
      matrixCell &&
      listScopes.some(([scope]) => scope === matrixCell.dataset.careScope)
    ) {
      listState.scope = matrixCell.dataset.careScope;
      listState.query = "";
      listState.page = 0;
      listState.sort = "care";
      listState.direction = -1;
      chooseTab("list");
      focusReport();
      return;
    }
    const cell = event.target.closest("button[data-cell-key]");
    if (cell) openCellReview(cell);
    if (event.target.closest("button[data-review-summary]"))
      showSummary(reviewSummary(), false);
  });
  $("report").addEventListener("change", (event) => {
    const feedbackForm = event.target.closest("form[data-sheet-feedback]");
    if (feedbackForm) {
      saveFeedbackDraft(feedbackForm);
      return;
    }
    if (event.target.id === "list-scope") {
      listState.scope = event.target.value;
      listState.page = 0;
      render();
      $("list-scope").focus();
    } else if (event.target.id === "list-extra") {
      listState.extra = event.target.checked;
      if (
        !listState.extra &&
        listColumns.some((col) => col.key === listState.sort && col.extra)
      )
        listState.sort = "care";
      render();
      $("list-extra").focus();
    } else if (event.target.matches('input[type="range"][data-confidence]')) {
      saveConfidence(
        event.target.dataset.confidence,
        Number(event.target.value),
      );
    }
  });
  const confidenceLabel = (value) =>
    value === undefined ? "Sin valorar" : `${value > 0 ? "+" : ""}${value}`;
  function setConfidence(id, value) {
    if (!group()?.rows.some((s) => s.id === id)) return false;
    if (value === null) review.confidence.delete(id);
    else if (Number.isInteger(value) && value >= -5 && value <= 5)
      review.confidence.set(id, value);
    else return false;
    return true;
  }
  function saveConfidence(id, value) {
    if (!setConfidence(id, value)) return;
    if (listState.sort === "confidence")
      listState.page = Math.floor(
        listRows(group()).findIndex((s) => s.id === id) / PAGE_SIZE,
      );
    render();
    Array.from($("report").querySelectorAll("[data-confidence]"))
      .find((el) => el.dataset.confidence === id)
      ?.focus();
    $("view-announcement").textContent =
      value === null
        ? "Valoración de confianza retirada."
        : "Confianza guardada durante esta consulta.";
  }
  function previewConfidence(input) {
    const id = input.dataset.confidence;
    const value = Number(input.value);
    if (!setConfidence(id, value)) return;
    const control = input.closest(".confidence-control");
    control.classList.remove("is-unrated");
    control.querySelector(".confidence-value").textContent =
      confidenceLabel(value);
    input.setAttribute("aria-valuetext", confidenceLabel(value));
    const action = control.querySelector("[data-confidence-action]");
    action.textContent = "×";
    action.title = "Quitar valoración";
    action.setAttribute(
      "aria-label",
      `Quitar valoración de confianza de ${id}`,
    );
    syncReviewButton();
    const summaryButton = $("report").querySelector("[data-review-summary]");
    summaryButton.disabled = !reviewCount();
    summaryButton.textContent = `Mi revisión (${reviewCount()})`;
  }
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
  function participationNote(g) {
    const a = g.summary;
    const completed = pct((100 * a.completed) / a.n);
    return `<aside class="participation-note" aria-label="Participación y resultados provisionales"><strong>Encuesta completada por el ${completed} de la clase (${a.completed} de ${studentsLabel(a.n)}).</strong><p>Se utilizan las respuestas disponibles, incluidas las de encuestas en curso. Los resultados pueden cambiar al actualizar el Excel. «Pendiente» indica que falta una respuesta necesaria; no equivale a cero ni a «No».</p></aside>`;
  }
  function hero(title, subtitle, type, status = "") {
    return `<div class="report-hero"><div><span class="eyebrow">ISAT · CUIDADO DEL ESTUDIANTE</span><h2>${E(title)}</h2><p>${E(subtitle)}</p></div><div class="hero-meta"><span class="hero-type">${E(type)}</span>${status}</div></div>`;
  }
  function progress(value, total, label) {
    if (value === null || !total)
      return '<span class="missing">Pendiente</span>';
    const p = Math.min(100, Math.max(0, (100 * value) / total));
    return `<progress max="100" value="${p}" aria-label="${E(label)}">${num(p)} %</progress>`;
  }
  function rateCard(title, r, context) {
    const unit = r.unit
      ? r.denominator === 1 && r.unit === "elecciones posibles"
        ? "elección posible"
        : r.unit
      : r.denominator === 1
        ? "respuesta válida"
        : "respuestas válidas";
    return `<div class="rate-card"><h4>${E(title)}</h4><div class="big-value">${pct(r.percent)}</div>${progress(r.count, r.denominator, title)}<p>${r.denominator ? `${num(r.count)} de ${num(r.denominator)} ${unit}` : "Sin respuestas disponibles"}</p>${context ? `<p class="small-note">${E(context)}</p>` : ""}</div>`;
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
    return `<section class="care-panel" aria-labelledby="care-title"><div class="care-heading"><div><span class="eyebrow">UNIDAD DE CUIDADO DEL ESTUDIANTE</span><h3 id="care-title">Peticiones y menciones de ayuda</h3></div><span class="care-total">${cases.length} ${cases.length === 1 ? "ficha para consultar" : "fichas para consultar"}</span></div><div class="care-stats"><div><h4>Han pedido ayuda</h4><strong>${num(care.selfRequests)}</strong><p>${care.selfRequests === null ? "No hay respuestas «Sí» o «No» registradas para esta pregunta." : `De ${studentsLabel(care.selfAnswered)} con respuesta «Sí» o «No».`}</p></div><div><h4>Con menciones de dos o más personas</h4><strong>${num(care.peerCases)}</strong><p>${care.peerCases === null ? "No hay respuestas interpretables para contar las menciones de ayuda." : `De ${studentsLabel(g.rows.length)} de la clase.`}</p></div></div>${careMatrix(care.matrix)}<p class="care-intro">Petición propia o menciones de al menos dos personas. Cada estudiante se cuenta una sola vez.</p><button class="btn" type="button" data-care-scope="care">Revisar estas fichas (${cases.length}) →</button>${
      cases.length
        ? `<details class="care-details"><summary>${cases.length === 1 ? "Consultar la ficha individual" : `Consultar las ${cases.length} fichas individuales`}</summary><ul class="care-list">${cases
            .map((item) => {
              const s = students.get(item.id);
              return `<li><div class="care-person"><strong>${E(name(s))}</strong><div class="care-reasons">${careReasons(item)}</div></div><a class="care-link" href="#report" data-care-student="${E(s.id)}" aria-label="${E(`Ver ficha individual del código ${s.id}`)}">Ver ficha individual <span aria-hidden="true">→</span></a></li>`;
            })
            .join("")}</ul></details>`
        : `<p class="care-empty">${unavailable}</p>`
    }<button class="btn secondary" type="button" data-open-list>Ver lista de la clase →</button><p class="care-coverage">Base del recuento: ${care.peerRespondents} respuestas interpretables en todo el Excel, incluidas otras clases.</p></section>`;
  }
  function careMatrix(matrix) {
    const value = (scope, label) => {
      const count = matrix[scope];
      const available = matrix.known || matrix.pendingLow || matrix.pendingHigh;
      const content = `<strong>${available ? count : "Pendiente"}</strong><span>${label}</span>`;
      return available && count > 0
        ? `<button type="button" class="matrix-count" data-care-scope="${scope}" aria-label="${E(`${label}: ${count} ${count === 1 ? "estudiante" : "estudiantes"}. Ver lista.`)}">${content}<span class="matrix-action" aria-hidden="true">Ver estudiantes →</span></button>`
        : content;
    };
    return `<div class="care-matrix"><table><caption>Petición propia y menciones registradas</caption><thead><tr><th rowspan="2" scope="col">Petición propia</th><th colspan="2" scope="colgroup">Personas distintas que indican que necesita ayuda</th></tr><tr><th scope="col">0 o 1 persona</th><th scope="col">2 o más personas</th></tr></thead><tbody><tr><th scope="row">Sí</th><td class="matrix-own">${value("ownOnly", "Petición propia")}</td><td class="matrix-both">${value("both", "Ambos criterios")}</td></tr><tr><th scope="row">No</th><td>${value("neither", "Sin petición y con 0–1 menciones")}</td><td class="matrix-peer">${value("peerOnly", "Menciones de otras personas")}</td></tr>${matrix.pendingLow + matrix.pendingHigh ? `<tr class="matrix-pending"><th scope="row">Sin respuesta propia</th><td>${value("pendingLow", "0–1 menciones")}</td><td>${value("pendingHigh", "2 o más menciones")}</td></tr>` : ""}</tbody></table><p class="care-matrix-note">${matrix.known} con respuesta propia Sí/No; ${matrix.pendingLow + matrix.pendingHigh} sin respuesta propia.${matrix.missing > matrix.pendingLow + matrix.pendingHigh ? ` ${matrix.missing - matrix.pendingLow - matrix.pendingHigh} fuera de la matriz por falta de recuento de menciones.` : ""}</p>${matrix.missing ? `<button type="button" class="text-button" data-care-scope="missing">Consultar datos de ayuda incompletos (${matrix.missing})</button>` : ""}</div>`;
  }
  function studentCare(s) {
    const care = s.care;
    const requested =
      care.requested === null ? "Pendiente" : care.requested ? "Sí" : "No";
    return `<div class="student-care"><div class="care-heading"><h4>Peticiones y menciones de ayuda</h4>${careReasons({ requested: care.requested === true, peerReports: care.peerReports })}</div><div class="response-grid"><div class="response-card"><h4>Petición propia de ayuda</h4><p class="response-value">${requested}</p></div><div class="response-card"><h4>Personas que indican que necesita ayuda</h4><p class="response-value">${num(care.peerReports)}</p><p class="small-note">Base: ${care.peerCoverage} otras personas con respuesta interpretable en todo el Excel.</p></div></div></div>`;
  }
  function dist(field, d) {
    return `<div class="distribution"><h4>${E(C.FIELDS[field])}</h4><p class="coverage">${d.denominator} ${d.denominator === 1 ? "respuesta registrada" : "respuestas registradas"}</p>${d.items.length ? d.items.map((x) => `<div class="distribution-row"><div><span>${E(x.label)}</span><strong>${x.count} <small>· ${pct(x.percent)}</small></strong></div>${progress(x.count, d.denominator, x.label)}</div>`).join("") : '<p class="missing">Pendiente</p>'}</div>`;
  }
  function metric(title, value, description, denominator) {
    return `<div class="metric"><h4>${E(title)}</h4><div class="metric-line"><strong${value === null || value === undefined ? ' class="metric-state"' : ""}>${num(value)}</strong>${denominator ? `<span>${E(denominator)}</span>` : ""}</div><p>${E(description)}</p></div>`;
  }
  function responseCard(field, s) {
    const value = s.responses[field];
    const selections =
      value !== null &&
      ["activities", "subjectReasons", "dropoutReasons"].includes(field)
        ? [
            ...new Map(
              value
                .split("|")
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => [C.norm(v), v]),
            ).values(),
          ]
        : [];
    const content =
      selections.length > 1
        ? `<ul class="response-options">${selections.map((v) => `<li>${E(v)}</li>`).join("")}</ul>`
        : `<p class="response-value${value === null ? " missing" : ""}">${E(selections[0] ?? value ?? "Pendiente")}</p>`;
    return `<div class="response-card"><h4>${E(C.FIELDS[field])}</h4>${content}</div>`;
  }
  function predictionMetric(s, kind) {
    const m = s.metrics,
      emitted = m[kind + "Predictions"],
      evaluable = m[kind + "Evaluable"],
      label = kind === "friend" ? "positivas" : "negativas",
      title = `Aciertos de predicciones ${label}`;
    if (emitted === null)
      return metric(
        title,
        null,
        "Aciertos confirmados con las valoraciones recibidas.",
      );
    if (emitted === 0) {
      if (!s.quality.predictions.complete)
        return metric(
          title,
          null,
          "Aciertos confirmados con las valoraciones recibidas.",
        );
      return `<div class="metric"><h4>${E(title)}</h4><div class="metric-line"><strong class="metric-state">No procede</strong></div><p>No ha emitido predicciones ${label} sobre su clase; no hay aciertos que evaluar.</p></div>`;
    }
    const scope = s.quality.predictions.complete
      ? emitted === 1
        ? "emitida"
        : "emitidas"
      : emitted === 1
        ? "interpretable"
        : "interpretables";
    const predictionCount = `${num(emitted)} ${emitted === 1 ? "predicción" : "predicciones"} ${scope}`;
    if (!evaluable)
      return metric(title, null, `${predictionCount} · 0 verificables.`);
    const pending = emitted - evaluable;
    const description = `${predictionCount}${pending ? ` · ${num(pending)} ${pending === 1 ? "pendiente" : "pendientes"} de comprobación` : ""}.`;
    return metric(
      title,
      m[kind + "Correct"],
      description,
      `de ${num(evaluable)} ${evaluable === 1 ? "verificable" : "verificables"}`,
    );
  }
  function declaredDescription(positive) {
    const labels = positive ? "Buena o Muy buena" : "Mala o Muy mala";
    return `Personas de su clase valoradas con ${labels} relación.`;
  }
  function reciprocalDescription(positive) {
    return `Valoraciones ${positive ? "positivas" : "negativas"} confirmadas en ambos sentidos.`;
  }
  const listColumns = [
    { key: "student", label: "Estudiante", value: (s) => name(s) },
    {
      key: "status",
      label: "Encuesta",
      value: (s) =>
        s.status === "Completado" ? 2 : s.status === "En curso" ? 1 : 0,
    },
    {
      key: "requested",
      label: "Pide ayuda",
      value: (s) =>
        s.care.requested === null ? null : Number(s.care.requested),
      display: (s) =>
        s.care.requested === null
          ? "Pendiente"
          : s.care.requested
            ? "Sí"
            : "No",
    },
    {
      key: "peer",
      label: "Menciones de ayuda",
      value: (s) => s.care.peerReports,
    },
    ...["alone", "fun", "general"].map((key) => ({
      key,
      label: C.FIELDS[key],
      extra: true,
      value: (s) => C.frequency(s.responses[key]),
      display: (s) => s.responses[key] ?? "Pendiente",
    })),
    ...[
      ["friendsDeclared", "Relaciones positivas declaradas"],
      ["friendsReceived", "Relaciones positivas recibidas"],
      ["rejectionsDeclared", "Relaciones negativas declaradas"],
      ["rejectionsReceived", "Relaciones negativas recibidas"],
    ].map(([key, label]) => ({
      key,
      label,
      extra: true,
      value: (s) => s.metrics[key],
    })),
    {
      key: "confidence",
      label: "Tu confianza",
      value: (s) => review.confidence.get(s.id) ?? null,
    },
  ];
  const needsConsultation = (s) =>
    s.care.requested === true || s.care.peerReports >= 2;
  const careOrder = (s) =>
    (s.care.requested === true ? 2 : 0) + (s.care.peerReports >= 2 ? 1 : 0);
  function listRows(g) {
    const q = C.norm(listState.query);
    const rows = g.rows.filter(
      (s) =>
        C.norm(name(s) + " " + s.id).includes(q) &&
        (listState.scope === "all" ||
          (listState.scope === "care"
            ? needsConsultation(s)
            : ["pendingLow", "pendingHigh"].includes(listState.scope)
              ? s.care.requested === null &&
                Number.isInteger(s.care.peerReports) &&
                (listState.scope === "pendingHigh"
                  ? s.care.peerReports >= 2
                  : s.care.peerReports < 2)
              : C.careCategory(s.care) === listState.scope)),
    );
    const col = listColumns.find((c) => c.key === listState.sort);
    const compareNames = (a, b) =>
      name(a).localeCompare(name(b), "es", { numeric: true }) ||
      a.id.localeCompare(b.id, "es", { numeric: true });
    return rows.sort((a, b) => {
      if (!col)
        return (
          careOrder(b) - careOrder(a) ||
          (b.care.peerReports ?? -1) - (a.care.peerReports ?? -1) ||
          compareNames(a, b)
        );
      const x = col.value(a),
        y = col.value(b);
      if (x === null || x === undefined)
        return y === null || y === undefined ? compareNames(a, b) : 1;
      if (y === null || y === undefined) return -1;
      const result =
        typeof x === "number"
          ? x - y
          : String(x).localeCompare(String(y), "es", { numeric: true });
      return result * listState.direction || compareNames(a, b);
    });
  }
  function listCell(s, col) {
    if (col.key === "student")
      return `<a class="student-list-link" href="#report" data-care-student="${E(s.id)}">${E(name(s))}</a>`;
    if (col.key === "confidence") {
      const current = review.confidence.get(s.id);
      const unrated = current === undefined;
      const actionLabel = unrated
        ? `Valorar como neutra (0) la confianza en los datos de ${s.id}`
        : `Quitar valoración de confianza de ${s.id}`;
      return `<div class="confidence-control${unrated ? " is-unrated" : ""}"><input class="confidence-slider" type="range" min="-5" max="5" step="1" value="${current ?? 0}" data-confidence="${E(s.id)}" aria-label="${E(`Tu confianza en los datos de ${s.id}`)}" aria-valuetext="${confidenceLabel(current)}"><span class="confidence-value">${confidenceLabel(current)}</span><button class="confidence-action" type="button" data-confidence-action="${E(s.id)}" aria-label="${E(actionLabel)}" title="${unrated ? "Marcar 0 (neutra)" : "Quitar valoración"}">${unrated ? "0" : "×"}</button></div>`;
    }
    const key = JSON.stringify([s.id, col.key]);
    const reaction = review.cells.get(key);
    const label =
      col.key === "status"
        ? s.status === "Completado"
          ? "Completada"
          : s.status === "En curso"
            ? "En curso"
            : "Sin inicio registrado"
        : col.display
          ? col.display(s)
          : num(col.value(s));
    return `<button class="cell-value${reaction ? " cell-reviewed" : ""}" type="button" data-cell-key="${E(key)}" aria-haspopup="dialog" aria-label="${E(`${col.label}: ${label}. Valorar este dato de ${name(s)}, código ${s.id}${reaction ? `. Tu valoración: ${reaction}` : ""}`)}"><span>${E(label)}</span>${reaction ? `<span class="cell-reaction">${E(reaction)}</span>` : '<span class="cell-affordance" aria-hidden="true">· · ·</span>'}</button>`;
  }
  function listReport(g) {
    const rows = listRows(g);
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    listState.page = Math.max(0, Math.min(listState.page, pages - 1));
    const start = listState.page * PAGE_SIZE;
    const columns = listColumns.filter((col) => !col.extra || listState.extra);
    return `<article class="report list-report">${hero(className(g), `${g.rows.length} estudiantes · ${g.summary.care.cases.length} cumplen los criterios de consulta`, "Lista de estudiantes")}<div class="report-body"><p class="list-intro">Abre una ficha pulsando su código. Filtra los casos que quieras revisar y recórrelos con «Anterior» y «Siguiente».</p><div class="list-tools"><label class="field">Mostrar<select id="list-scope" aria-label="Mostrar">${options(
      listScopes,
      listState.scope,
    )}</select></label><label class="column-toggle"><input id="list-extra" type="checkbox"${listState.extra ? " checked" : ""}>Bienestar y relaciones</label><button class="btn secondary" type="button" data-prioritize>Priorizar ayuda</button></div><p class="list-hint">Pulsa un encabezado para ordenar o un dato para valorarlo.</p><div class="student-table-wrap" role="region" aria-label="Lista de estudiantes: tabla desplazable horizontalmente" tabindex="0"><table class="student-table"><caption>${rows.length} de ${g.rows.length} estudiantes${listState.sort === "care" ? " · Peticiones y menciones de ayuda primero" : ""}</caption><thead><tr>${columns.map((col) => `<th scope="col" aria-sort="${listState.sort === col.key ? (listState.direction > 0 ? "ascending" : "descending") : "none"}"><button type="button" data-sort="${col.key}">${E(col.label)}<span aria-hidden="true">${listState.sort === col.key ? (listState.direction > 0 ? " ↑" : " ↓") : " ↕"}</span></button></th>`).join("")}</tr></thead><tbody>${
      rows.length
        ? rows
            .slice(start, start + PAGE_SIZE)
            .map(
              (s) =>
                `<tr data-list-student="${E(s.id)}"${needsConsultation(s) ? ' class="priority-row"' : ""}>${columns.map((col) => `<${col.key === "student" ? 'th scope="row"' : "td"}>${listCell(s, col)}</${col.key === "student" ? "th" : "td"}>`).join("")}</tr>`,
            )
            .join("")
        : `<tr><td colspan="${columns.length}" class="list-empty">No hay estudiantes que coincidan con esta búsqueda y filtro.</td></tr>`
    }</tbody></table></div><div class="list-pagination"><span>${rows.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} de ${rows.length}` : "0 coincidencias"}</span><div><button type="button" class="btn secondary" data-list-page="-1"${listState.page === 0 ? " disabled" : ""}>Anterior</button><button type="button" class="btn secondary" data-list-page="1"${listState.page >= pages - 1 ? " disabled" : ""}>Siguiente</button></div></div><p class="list-hint">Tu confianza: −5 baja · 0 neutra · +5 alta. Las valoraciones no modifican los datos.</p><div class="review-toolbar"><button class="btn secondary" type="button" data-review-summary${reviewCount() ? "" : " disabled"}>Mi revisión (${reviewCount()})</button><span>Se conserva mientras esta consulta esté abierta.</span></div>${sheetFeedback("list", g)}</div></article>`;
  }
  function reviewCount() {
    return review.cells.size + review.confidence.size + review.opinions.size;
  }
  function syncReviewButton() {
    $("review-open").hidden = !model;
    $("review-open").disabled = !reviewCount();
    $("review-open").textContent = `Mi revisión (${reviewCount()})`;
  }
  function openDialog(dialog) {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function closeDialog(dialog) {
    if (!dialog.open) return;
    if (dialog.close) dialog.close();
    else dialog.removeAttribute("open");
  }
  let helpReturn = null;
  $("help-open").onclick = () => {
    helpReturn = document.activeElement;
    closeCellReview(false);
    closeSummary(false);
    openDialog($("help-dialog"));
    $("help-close").focus();
  };
  function closeHelp(restore = true) {
    closeDialog($("help-dialog"));
    if (restore && helpReturn?.isConnected) helpReturn.focus();
    helpReturn = null;
  }
  $("help-close").onclick = () => closeHelp();
  $("help-dialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeHelp();
  });
  $("review-open").onclick = () => {
    if (model && reviewCount()) showSummary(reviewSummary(), false);
  };
  function focusCell(key) {
    Array.from($("report").querySelectorAll("[data-cell-key]"))
      .find((el) => el.dataset.cellKey === key)
      ?.focus();
  }
  function closeCellReview(restore = true) {
    const key = activeCell?.key;
    activeCell = null;
    closeDialog($("cell-review"));
    $("cell-review-context").textContent = "";
    if (restore && key) focusCell(key);
  }
  function openCellReview(button) {
    if (!model || tab !== "list") return;
    const [id, column] = JSON.parse(button.dataset.cellKey);
    const s = group()?.rows.find((person) => person.id === id);
    const col = listColumns.find((entry) => entry.key === column);
    if (!s || !col || ["student", "confidence"].includes(column)) return;
    activeCell = { key: button.dataset.cellKey, id, column };
    $("cell-review-context").textContent =
      `${name(s)} · Código: ${s.id}\n${col.label}: ${button.querySelector("span").textContent}`;
    $("remove-reaction").hidden = !review.cells.has(activeCell.key);
    for (const option of $("cell-review").querySelectorAll("[data-reaction]"))
      option.setAttribute(
        "aria-pressed",
        String(review.cells.get(activeCell.key) === option.dataset.reaction),
      );
    openDialog($("cell-review"));
    $("cell-review").querySelector("[data-reaction]").focus();
  }
  function saveReaction(value) {
    if (!activeCell || !model) return;
    const key = activeCell.key;
    if (review.cells.get(key) === value) value = null;
    if (value === null) review.cells.delete(key);
    else if (["OK", "Revisar", "Me sorprende"].includes(value))
      review.cells.set(key, value);
    closeCellReview(false);
    render();
    focusCell(key);
    $("view-announcement").textContent =
      value === null
        ? "Valoración retirada."
        : `Valoración guardada: ${value}.`;
  }
  for (const button of $("cell-review").querySelectorAll("[data-reaction]"))
    button.onclick = () => saveReaction(button.dataset.reaction);
  $("remove-reaction").onclick = () => saveReaction(null);
  $("cell-review-close").onclick = () => closeCellReview();
  $("cell-review").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCellReview();
  });
  function sheetFeedback(type, g, s = null) {
    const key = JSON.stringify([type, s?.id ?? g.key]);
    const saved = review.opinions.get(key);
    const draft = review.drafts.get(key);
    const current = draft ?? saved;
    return `<details class="sheet-feedback"${draft ? " open" : ""}><summary>¿Te resulta útil esta ${type === "list" ? "lista" : "ficha"}?</summary><form data-sheet-feedback="${E(key)}"><div class="feedback-fields"><label class="field">Utilidad de esta vista<select name="rating" required>${options(
      [
        ["", "Selecciona una valoración"],
        ["1", "1 · Poco útil"],
        ["2", "2"],
        ["3", "3"],
        ["4", "4"],
        ["5", "5 · Muy útil"],
      ],
      current ? String(current.rating) : "",
    )}</select></label><label class="field">Comentario opcional<textarea name="comment" maxlength="600" rows="3" placeholder="Sobre la ficha, sin nombres de personas.">${E(current?.comment ?? "")}</textarea></label></div><button class="btn secondary" type="submit">Guardar valoración</button><p class="feedback-note" role="status">${draft ? "Cambios pendientes. Pulsa «Guardar valoración» para incluirlos en tu revisión." : saved ? "Valoración guardada durante esta consulta." : "Tu opinión permanece en este navegador durante la consulta."}</p></form></details>`;
  }
  function saveFeedbackDraft(form) {
    if (!model) return;
    const key = form.dataset.sheetFeedback;
    const rating = form.elements.namedItem("rating").value;
    const comment = form.elements.namedItem("comment").value.slice(0, 600);
    const saved = review.opinions.get(key);
    const changed =
      rating !== String(saved?.rating ?? "") ||
      comment.trim() !== (saved?.comment ?? "");
    if (changed) review.drafts.set(key, { rating, comment });
    else review.drafts.delete(key);
    const message = changed
      ? "Cambios pendientes. Pulsa «Guardar valoración» para incluirlos en tu revisión."
      : saved
        ? "Valoración guardada durante esta consulta."
        : "Tu opinión permanece en este navegador durante la consulta.";
    const note = form.querySelector(".feedback-note");
    if (note.textContent !== message) note.textContent = message;
  }
  $("report").addEventListener("input", (event) => {
    if (event.target.matches('input[type="range"][data-confidence]')) {
      previewConfidence(event.target);
      return;
    }
    const form = event.target.closest("form[data-sheet-feedback]");
    if (form) saveFeedbackDraft(form);
  });
  $("report").addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-sheet-feedback]");
    if (!form) return;
    event.preventDefault();
    if (!model) return;
    const rating = Number(form.elements.namedItem("rating").value);
    const comment = form.elements.namedItem("comment").value.trim();
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      comment.length > 600
    )
      return;
    const [type, id] = JSON.parse(form.dataset.sheetFeedback);
    const g = group();
    if (
      !g ||
      !viewTypes.includes(type) ||
      (type === "student" ? !g.rows.some((s) => s.id === id) : id !== g.key)
    )
      return;
    review.opinions.set(form.dataset.sheetFeedback, {
      type,
      id,
      group: g.key,
      rating,
      comment,
    });
    review.drafts.delete(form.dataset.sheetFeedback);
    syncReviewButton();
    form.querySelector(".feedback-note").textContent =
      "Valoración guardada durante esta consulta.";
    const summaryButton = $("report").querySelector("[data-review-summary]");
    if (summaryButton) {
      summaryButton.disabled = false;
      summaryButton.textContent = `Mi revisión (${reviewCount()})`;
    }
  });
  function reviewSummary() {
    const students = new Map(model.students.map((s) => [s.id, s]));
    const codes = new Map(
      model.groups.map((g, index) => [
        g.key,
        "G" + String(index + 1).padStart(3, "0"),
      ]),
    );
    const classCode = (s) => codes.get(C.groupKey(s));
    const table = (headers, rows) =>
      `<div class="summary-table-wrap" role="region" aria-label="${E(`Tabla de revisión: ${headers.join(", ")}`)}" tabindex="0"><table><thead><tr>${headers.map((h) => `<th scope="col">${E(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${E(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const cells = Array.from(review.cells, ([key, value]) => {
      const [id, col] = JSON.parse(key);
      return [
        classCode(students.get(id)),
        id,
        listColumns.find((c) => c.key === col).label,
        value,
      ];
    });
    const confidence = Array.from(review.confidence, ([id, value]) => [
      classCode(students.get(id)),
      id,
      value > 0 ? "+" + value : value,
    ]);
    const opinions = Array.from(review.opinions.values(), (item) => [
      codes.get(item.group),
      item.type === "student" ? item.id : "—",
      { group: "Grupo", list: "Lista", student: "Individual" }[item.type],
      item.rating + "/5",
      item.comment || "Sin comentario",
    ]);
    return `<p class="session-code">Código de sesión: ${E(review.code)}</p>${cells.length ? `<h3>Reacciones a datos (${cells.length})</h3>${table(["Grupo", "Código de estudiante", "Indicador", "Reacción"], cells)}` : ""}${confidence.length ? `<h3>Confianza en los datos (${confidence.length})</h3>${table(["Grupo", "Código de estudiante", "Confianza"], confidence)}` : ""}${opinions.length ? `<h3>Opiniones sobre las fichas (${opinions.length})</h3>${table(["Grupo", "Código de estudiante", "Vista", "Utilidad", "Comentario"], opinions)}` : ""}${!reviewCount() ? "<p>No has guardado valoraciones en esta consulta.</p>" : ""}`;
  }
  function showSummary(html, closed) {
    summaryReturn = closed ? null : document.activeElement;
    closeHelp(false);
    lastActivity = Date.now();
    $("review-content").innerHTML = html;
    $("summary-note").textContent = closed
      ? "Consulta cerrada. Se han retirado el Excel y las fichas. Este resumen muestra códigos y tus valoraciones, sin adjuntar respuestas ni nombres del Excel. Cierra el resumen para retirarlo de la página."
      : "Tu revisión de esta consulta, identificada con códigos. No modifica el Excel ni se envía a ningún servicio.";
    openDialog($("review-summary"));
    $("summary-close").focus();
  }
  function closeSummary(restore = true) {
    const returnTarget = summaryReturn;
    summaryReturn = null;
    closeDialog($("review-summary"));
    $("review-content").innerHTML = "";
    $("summary-note").textContent = "";
    if (restore) {
      if (
        model &&
        returnTarget?.isConnected &&
        !returnTarget.closest("[hidden]")
      )
        returnTarget.focus();
      else (model ? $("report") : $("file")).focus();
    }
  }
  $("summary-close").onclick = () => closeSummary();
  $("review-summary").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSummary();
  });
  function groupReport(g) {
    const a = g.summary;
    return `<article class="report">${hero(className(g), studentsLabel(a.n), "Ficha de grupo")}<div class="report-body">${carePanel(g)}${surveySummary(a)}
    ${section("01", "Integración y bienestar", `<div class="rate-grid">${rateCard("Soledad frecuente", a.loneliness, "Casi siempre o siempre en la última semana.")}${rateCard("Poco disfrute con sus amistades", a.lowEnjoyment, "Nunca o casi nunca en la última semana.")}${rateCard("Experiencia universitaria poco positiva", a.lowUniversity, "Nunca o casi nunca en la última semana.")}</div>`, "neutral")}<details class="expanded-indicators" data-extra-group="${E(g.key)}"${expandedGroups.has(g.key) ? " open" : ""}><summary>Ver más indicadores del grupo<span>Relaciones, adaptación académica y participación</span></summary>${section("02", "Relaciones y bienestar", `<div class="rate-grid single">${rateCard("Densidad de relaciones negativas observadas", a.rejection, "Valoraciones negativas / elecciones posibles de quienes han respondido relaciones. Mínimo observado en la clase.")}</div><div class="distribution-grid">${["alone", "fun", "general"].map((f) => dist(f, a.distributions[f])).join("")}</div>`)}
    ${section("03", "Adaptación académica", `<div class="rate-grid four">${rateCard("Dificultades en asignaturas", a.difficulty)}${rateCard("Se han planteado abandonar", a.dropout)}${rateCard("Organización del tiempo difícil", a.time, "Respuestas Mal o Muy mal.")}${rateCard("Carga de trabajo alta", a.workload, "Respuestas Alta o Muy alta.")}</div><div class="distribution-grid">${["time", "workload", "dropout"].map((f) => dist(f, a.distributions[f])).join("")}</div>`, "neutral")}
    ${section("04", "Participación y motivos", `<div class="distribution-grid">${["activities", "subjectReasons", "dropoutReasons"].map((f) => dist(f, a.distributions[f])).join("")}</div><p class="section-note">En las preguntas con varias opciones, una persona puede elegir más de una. Los porcentajes no tienen que sumar 100 %.</p>`)}
    </details>${sheetFeedback("group", g)}</div></article>`;
  }
  function studentOverview(s) {
    const rows = (items) =>
      `<dl>${items.map(([label, value]) => `<div class="overview-item"><dt>${E(label)}</dt><dd>${E(value)}</dd></div>`).join("")}</dl>`;
    return `<section class="student-overview" aria-labelledby="overview-title"><h3 id="overview-title">En un vistazo</h3><div class="overview-grid"><section class="overview-panel"><h4>Bienestar en la última semana</h4>${rows(["alone", "fun", "general"].map((field) => [C.FIELDS[field], s.responses[field] ?? "Pendiente"]))}</section><section class="overview-panel"><h4>Relaciones en la clase</h4>${rows(
      [
        ["Positivas recibidas", num(s.metrics.friendsReceived)],
        ["Positivas declaradas", num(s.metrics.friendsDeclared)],
        ["Negativas recibidas", num(s.metrics.rejectionsReceived)],
        ["Negativas declaradas", num(s.metrics.rejectionsDeclared)],
      ],
    )}</section></div></section>`;
  }
  $("report").addEventListener(
    "toggle",
    (event) => {
      const details = event.target;
      if (
        model &&
        details.isConnected &&
        details.matches?.("details[data-extra-group]")
      ) {
        const key = details.dataset.extraGroup;
        if (details.open) expandedGroups.add(key);
        else expandedGroups.delete(key);
        return;
      }
      if (
        !details.matches?.("details[data-extra-student]") ||
        !details.isConnected ||
        !model
      )
        return;
      const id = details.dataset.extraStudent;
      if (!group()?.rows.some((s) => s.id === id)) return;
      if (details.open) expandedStudents.add(id);
      else expandedStudents.delete(id);
    },
    true,
  );
  function studentReport(s, g) {
    const m = s.metrics;
    const highlighted = s.care.requested === true || s.care.peerReports > 2;
    const receivedDescription = (positive) =>
      `Valoraciones ${positive ? "Buena o Muy buena" : "Mala o Muy mala"} relación recibidas de otras personas de la clase.`;
    return `<article class="report${highlighted ? " report-care" : ""}">${hero(name(s), `${className(g)} · ${studentsLabel(g.rows.length)}`, "Ficha individual", surveyStatus(s))}<div class="report-body">${studentNavigation(s, g)}${studentCare(s)}<div class="reading"><span class="coverage">${E(s.lastDate ? `Finalización: ${dateLabel(s.lastDate)}` : "Finalización sin registrar")}</span></div>
    ${studentOverview(s)}<details class="expanded-indicators" data-extra-student="${E(s.id)}"${expandedStudents.has(s.id) ? " open" : ""}><summary>Ver más indicadores<span>Relaciones, predicciones, contactos, adaptación académica y red de relaciones</span></summary>
    ${section("01", "Relaciones e integración", `<div class="metric-grid">${metric("Relaciones positivas recibidas observadas", m.friendsReceived, receivedDescription(true))}${metric("Relaciones positivas declaradas", m.friendsDeclared, declaredDescription(true))}${metric("Relaciones positivas recíprocas observadas", m.friendsMutual, reciprocalDescription(true))}${metric("Relaciones negativas recibidas observadas", m.rejectionsReceived, receivedDescription(false))}${metric("Relaciones negativas declaradas", m.rejectionsDeclared, declaredDescription(false))}${metric("Relaciones negativas recíprocas observadas", m.rejectionsMutual, reciprocalDescription(false))}</div><p class="prediction-intro">Predicciones: cómo cree que otras personas valoran su relación. Los aciertos se contrastan con las respuestas de esas personas.</p><div class="metric-grid compact">${predictionMetric(s, "friend")}${predictionMetric(s, "rejection")}</div>`)}
    ${section("02", "Contactos y papel en el grupo", `<div class="metric-grid">${metric("Nominaciones como persona popular", m.popularVotes, "Veces que otras personas de su clase la señalan como popular.")}${metric("Nominaciones como conexión entre grupos", m.connectorVotes, "Veces que otras personas de su clase la señalan como conectora.")}${metric("Contactos previos identificados", s.contacts?.length ?? null, "Personas señaladas en la pregunta de conocidos, incluidas otras clases.")}${metric("Contactos fuera de la clase", s.outsideCount, "Selecciones de la pregunta de contactos en otros grupos.")}</div>`)}
    ${section("03", "Adaptación académica", `<div class="response-grid">${["time", "workload", "difficulty", "dropout", "activities"].map((f) => responseCard(f, s)).join("")}</div><div class="response-details">${["subjects", "subjectReasons", "subjectOther", "dropoutReasons", "dropoutOther"].map((f) => responseCard(f, s)).join("")}</div>`, "neutral")}
    ${N.view(s, model.students)}
    </details>${sheetFeedback("student", g, s)}${s.story === null ? "" : section("04", "Su historia", `<div class="story">${E(s.story)}</div>`, "story")}
    </div></article>`;
  }
  function render() {
    if (!model) return;
    syncReviewButton();
    const g = group();
    if (!g) {
      $("report").innerHTML = empty();
      return;
    }
    if (tab === "group") {
      $("report").innerHTML = groupReport(g);
      $("view-announcement").textContent =
        `Ficha de clase actualizada: ${g.rows.length} estudiantes.`;
    } else if (tab === "list") {
      $("report").innerHTML = listReport(g);
      $("view-announcement").textContent =
        `Lista actualizada: ${listRows(g).length} de ${g.rows.length} estudiantes. Página ${listState.page + 1}.`;
    } else {
      const s = g.rows.find((x) => x.id === $("student").value);
      $("report").innerHTML = s
        ? studentReport(s, g)
        : '<section class="empty-state"><h2>No hay coincidencias.</h2><p>Busca otro código en esta clase.</p></section>';
      $("view-announcement").textContent = s
        ? `Ficha individual actualizada. ${$("student").options.length} coincidencias. ${s.status === "Completado" ? "Encuesta completada" : s.status === "En curso" ? "Encuesta en curso" : "Sin inicio registrado"}.`
        : "No hay estudiantes que coincidan con la búsqueda en esta clase.";
    }
    $("report")
      .querySelector("article.report")
      ?.insertAdjacentHTML("beforeend", participationNote(g));
  }
  window.addEventListener("pagehide", reset);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) reset();
  });
})();
