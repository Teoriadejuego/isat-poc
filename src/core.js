/* ISAT: deterministic parsing and descriptive summaries. No storage or network. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.IsatCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const text = (v) =>
    v === null || v === undefined ? null : String(v).trim() || null;
  const answer = (v) => {
    const s = text(v);
    return s === null
      ? null
      : text(s.replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\s*->\s*/, ""));
  };
  const norm = (v) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const yesNo = (v) => {
    const s = norm(v);
    return /^s[i\uFFFD]$/.test(s) ? "Sí" : s === "no" ? "No" : null;
  };
  const split = (v) =>
    v === null
      ? null
      : [
          ...new Set(
            String(v)
              .split("|")
              .map((x) => x.trim())
              .filter(Boolean),
          ),
        ];
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const groupKey = (s) => JSON.stringify([s.study, s.course, s.group]);
  const frequencies = new Map([
    ["nunca", 0],
    ["casi nunca", 1],
    ["algunas veces", 2],
    ["casi siempre", 3],
    ["siempre", 4],
  ]);
  const frequency = (v) => frequencies.get(norm(v)) ?? null;
  const storyAnswer = (value) => {
    if (value === null) return null;
    let letters = 0;
    for (const character of value)
      if (/\p{L}/u.test(character) && ++letters >= 4) return value;
    return null;
  };
  const categories = Object.freeze({
    time: ["Muy bien", "Bien", "Regular", "Mal", "Muy mal"],
    workload: ["Muy baja", "Baja", "Adecuada", "Alta", "Muy alta"],
    dropout: [
      "No",
      "Sí, alguna vez",
      "Sí, varias veces",
      "Sí, lo estoy considerando actualmente",
    ],
  });
  const recognized = (field, value) =>
    categories[field]?.find((label) => norm(label) === norm(value)) ?? null;
  const indicatorRules = Object.freeze({
    loneliness: { field: "alone", read: frequency, matches: (v) => v >= 3 },
    lowEnjoyment: { field: "fun", read: frequency, matches: (v) => v <= 1 },
    lowUniversity: {
      field: "general",
      read: frequency,
      matches: (v) => v <= 1,
    },
    difficulty: {
      field: "difficulty",
      read: yesNo,
      matches: (v) => v === "Sí",
    },
    dropout: {
      field: "dropout",
      read: (v) => recognized("dropout", v),
      matches: (v) => v !== "No",
    },
    time: {
      field: "time",
      read: (v) => recognized("time", v),
      matches: (v) => ["Mal", "Muy mal"].includes(v),
    },
    workload: {
      field: "workload",
      read: (v) => recognized("workload", v),
      matches: (v) => ["Alta", "Muy alta"].includes(v),
    },
  });
  // A null result stays outside both the numerator and the valid-answer base.
  function indicatorValue(student, key) {
    if (Object.hasOwn(student?.focus || {}, key)) return student.focus[key];
    if (!Object.hasOwn(indicatorRules, key)) return null;
    const rule = indicatorRules[key],
      value = rule.read(student?.responses?.[rule.field]);
    return value === null || value === undefined ? null : rule.matches(value);
  }
  function indicatorMatches(student, key) {
    return indicatorValue(student, key) === true;
  }
  const ratio = (n, d) =>
    n === null || !d ? null : Math.round((100 * n) / d) / 10;
  const FIELDS = Object.freeze({
    alone: "Ha sentido soledad",
    fun: "Ha disfrutado con sus amistades",
    general: "Le ha ido bien en la universidad",
    uce: "Solicita ayuda a la Unidad de Cuidado del Estudiante",
    time: "Cómo organiza su tiempo",
    activities: "En qué actividades participa",
    workload: "Cómo percibe la carga de trabajo",
    difficulty: "Ha tenido dificultades en las asignaturas",
    subjects: "Asignaturas que le resultan difíciles",
    subjectReasons: "Qué le resulta difícil",
    subjectOther: "Otra respuesta sobre las dificultades",
    dropout: "Se ha planteado dejar los estudios",
    dropoutReasons: "Por qué se ha planteado dejar los estudios",
    dropoutOther: "Otra respuesta sobre dejar los estudios",
    siblings: "Tiene hermanos o hermanas",
    brothers: "Número de hermanos",
    sisters: "Número de hermanas",
    position: "Posición entre hermanos y hermanas",
  });
  function parseTable(table) {
    if (!Array.isArray(table) || table.length < 2)
      throw Error("La hoja seleccionada no contiene registros de estudiantes.");
    const h = table[0].map(text),
      headerMap = new Map();
    h.forEach((v, i) => {
      if (v !== null) {
        if (headerMap.has(norm(v)))
          throw Error("La hoja contiene cabeceras repetidas: " + v + ".");
        headerMap.set(norm(v), i);
      }
    });
    const find = (names, required = false) => {
      for (const n of names)
        if (headerMap.has(norm(n))) return headerMap.get(norm(n));
      if (required)
        throw Error(
          "Falta la columna " +
            names[0] +
            ". Selecciona la hoja Users del cuestionario ISAT.",
        );
      return -1;
    };
    const cols = {
      id: find(["Usuario Id", "ID"], true),
      alias: find(["Alumno Id"]),
      course: find(["Curso"], true),
      group: find(["Grupo"], true),
      study: find(["Estudio"]),
      name: find(["Nombre", "Nombre completo"]),
      route: find(["dia"]),
      r1: find(["redes1"]),
      r2: find(["redes2"]),
      p1: find(["beliefs1"]),
      p2: find(["beliefs2"]),
      popular: find(["popular"]),
      central: find(["central"]),
      known: find(["conocidos"]),
      others: find(["otros"]),
      help: find(["ayuda"]),
      helpEvent: find(["eayuda"]),
      story: find(["circunstancia", "historia"]),
      personal: find(["personal"]),
      alone: find(["alone"]),
      fun: find(["fun"]),
      general: find(["general"]),
      uce: find(["uce"]),
      siblings: find(["siblings"]),
      brothers: find(["brothers"]),
      sisters: find(["sisters"]),
      position: find(["posicion"]),
      difficulty: find(["dificultad"]),
      subjects: find(["asignaturas"]),
      subjectReasons: find(["motivoasig"]),
      subjectOther: find(["motivoasig1"]),
      dropout: find(["abandono"]),
      dropoutReasons: find(["motivoabandono"]),
      dropoutOther: find(["motivoabandono1"]),
      start: find(["start"]),
      end: find(["end"]),
    };
    const academicColumn = (field, aliases, pattern) => {
      const exact = h
        .map((v, i) =>
          aliases.some((label) => norm(label) === norm(v)) ? i : -1,
        )
        .filter((i) => i >= 0);
      const matches = exact.length
        ? exact
        : h
            .map((v, i) => (pattern.test(norm(v)) ? i : -1))
            .filter((i) => i >= 0);
      if (matches.length > 1)
        throw Error(
          "Hay varias columnas para " +
            FIELDS[field] +
            ". Conserva una única pregunta identificable.",
        );
      return matches[0] ?? -1;
    };
    cols.time = academicColumn(
      "time",
      ["Organización del tiempo", "time"],
      /^¿?como estas llevando la organizacion de tu tiempo/,
    );
    cols.activities = academicColumn(
      "activities",
      [
        "Actividades universitarias",
        "Te has apuntado a actividades",
        "activities",
      ],
      /^¿?te has apuntado a (algunas|alguna|actividades)/,
    );
    cols.workload = academicColumn(
      "workload",
      ["Carga de trabajo", "workload"],
      /^¿?consideras que la carga de trabajo/,
    );
    if (cols.r1 < 0 || cols.r2 < 0 || cols.alone < 0 || cols.dropout < 0)
      throw Error(
        "No se reconoce el cuestionario ISAT. Faltan preguntas de relaciones, bienestar o adaptación académica.",
      );
    const students = [],
      ids = new Set(),
      warnings = {
        unresolved: 0,
        crossClass: 0,
        self: 0,
        categories: 0,
        conflicts: 0,
        routes: 0,
        academic: 0,
        responses: 0,
      };
    const val = (r, k) => (cols[k] < 0 ? null : answer(r[cols[k]]));
    table.slice(1).forEach((r, i) => {
      if (!Array.isArray(r) || r.every((v) => text(v) === null)) return;
      const id = text(r[cols.id]);
      if (!id)
        throw Error("La fila " + (i + 2) + " no tiene código de estudiante.");
      if (ids.has(id))
        throw Error("Hay códigos de estudiante duplicados: " + id + ".");
      ids.add(id);
      const course = text(r[cols.course]),
        group = text(r[cols.group]);
      if (!course || !group)
        throw Error("Falta Curso o Grupo en la fila " + (i + 2) + ".");
      const s = {
        id,
        alias: cols.alias < 0 ? null : text(r[cols.alias]),
        name: cols.name < 0 ? null : text(r[cols.name]),
        course,
        group,
        study: cols.study < 0 ? "Estudio" : text(r[cols.study]) || "Estudio",
        status:
          val(r, "end") !== null ||
          (cols.end >= 0 && text(r[cols.end]) !== null)
            ? "Completado"
            : cols.start >= 0 && text(r[cols.start]) !== null
              ? "En curso"
              : "Sin iniciar",
        responses: {},
        story: storyAnswer(val(r, "story")),
        raw: {},
        quality: {},
      };
      for (const field of Object.keys(FIELDS)) {
        const value = val(r, field);
        s.responses[field] = ["uce", "difficulty", "siblings"].includes(field)
          ? (yesNo(value) ?? value)
          : value;
        if (field === "dropout" && value !== null)
          s.responses[field] = value.replace(/^S\uFFFD(?=,|\s|$)/, "Sí");
        if (
          ["uce", "difficulty"].includes(field) &&
          value !== null &&
          yesNo(value) === null
        )
          warnings.responses++;
        if (["alone", "fun", "general"].includes(field) && value !== null) {
          const level = frequency(value);
          if (level === null) warnings.responses++;
          else
            s.responses[field] = [
              "Nunca",
              "Casi nunca",
              "Algunas veces",
              "Casi siempre",
              "Siempre",
            ][level];
        }
      }
      for (const field of Object.keys(categories))
        if (s.responses[field] !== null) {
          const label = recognized(field, s.responses[field]);
          if (label) s.responses[field] = label;
          else warnings.academic++;
        }
      const personal = storyAnswer(val(r, "personal"));
      if (personal && personal !== s.story)
        s.story = [s.story, personal].filter(Boolean).join("\n\n");
      const route = norm(val(r, "route")),
        branch1 = val(r, "r1") !== null || val(r, "p1") !== null,
        branch2 = val(r, "r2") !== null || val(r, "p2") !== null;
      const branch =
        route === "par"
          ? 1
          : route === "impar"
            ? 2
            : branch1 && !branch2
              ? 1
              : branch2 && !branch1
                ? 2
                : null;
      if (branch === null && branch1 && branch2) warnings.routes++;
      // Questionnaire order, not spreadsheet column order. The two routes
      // reverse relations/predictions; event markers are not answers.
      const path = [
        ...(branch === 1 ? ["r1", "p1"] : branch === 2 ? ["p2", "r2"] : []),
        "popular",
        "central",
        "known",
        "others",
        "alone",
        "fun",
        "general",
        "uce",
        "help",
        "story",
        "personal",
        "siblings",
        "brothers",
        "sisters",
        "position",
        "time",
        "activities",
        "workload",
        "difficulty",
        "subjects",
        "subjectReasons",
        "subjectOther",
        "dropout",
        "dropoutReasons",
        "dropoutOther",
      ];
      const passedEmpty = (field) =>
        cols[field] >= 0 &&
        val(r, field) === null &&
        path.indexOf(field) >= 0 &&
        path
          .slice(path.indexOf(field) + 1)
          .some((next) => val(r, next) !== null);
      if (passedEmpty("uce")) {
        s.responses.uce = "No";
        s.quality.uce = { inferredNo: true };
      }
      s.emptySelections = [];
      for (const [field, source] of [
        ["relations", branch === 1 ? "r1" : branch === 2 ? "r2" : null],
        ["predictions", branch === 1 ? "p1" : branch === 2 ? "p2" : null],
        ["popular", "popular"],
        ["connector", "central"],
        ["contacts", "known"],
        ["outside", "others"],
        ["help", "help"],
      ])
        if (source && passedEmpty(source)) s.emptySelections.push(field);
      s.raw.relations =
        branch === null ? null : val(r, branch === 1 ? "r1" : "r2");
      s.raw.predictions =
        branch === null ? null : val(r, branch === 1 ? "p1" : "p2");
      for (const k of ["popular", "central", "known", "others", "help"])
        s.raw[k] = val(r, k);
      s.helpReached = cols.helpEvent >= 0 && text(r[cols.helpEvent]) !== null;
      s.lastDate =
        cols.end >= 0 && text(r[cols.end])
          ? text(r[cols.end]).slice(0, 10)
          : null;
      students.push(s);
    });
    if (!students.length) throw Error("La hoja no contiene estudiantes.");
    const aliases = new Map(students.map((s) => [s.id, s]));
    for (const s of students)
      if (s.alias) {
        if (aliases.has(s.alias) && aliases.get(s.alias) !== s)
          throw Error(
            "Un identificador coincide con dos estudiantes distintos.",
          );
        aliases.set(s.alias, s);
      }
    const emptyValue = (v) =>
      [
        "ninguno",
        "ninguna",
        "nadie",
        "sin nominaciones",
        "ningun compañero",
        "ningun companero",
      ].includes(norm(v));
    function nominations(value, owner, ratings = false, field) {
      const quality = { complete: value !== null, rejected: 0 };
      owner.quality[field] = quality;
      if (value === null) {
        if (owner.emptySelections.includes(field)) {
          quality.complete = true;
          quality.inferredEmpty = true;
          return [];
        }
        return null;
      }
      if (emptyValue(value)) return [];
      const result = new Map(),
        conflicts = new Set();
      const reject = () => {
        quality.complete = false;
        quality.rejected++;
      };
      for (const token of split(value)) {
        let code = token,
          rating = 1,
          label = null;
        if (ratings) {
          const m = token.match(/^(.+?)\s*\(([^()]*)\)$/);
          if (!m) {
            warnings.categories++;
            reject();
            continue;
          }
          code = m[1].trim();
          label = m[2].trim();
          const n = norm(label);
          rating = /^(muy )?buena relacion$/.test(n)
            ? 1
            : /^(muy )?mala relacion$/.test(n)
              ? -1
              : /^(normal|regular|neutra)$/.test(n)
                ? 0
                : null;
          if (rating === null) {
            warnings.categories++;
            reject();
            continue;
          }
        }
        const target = aliases.get(code);
        if (!target) {
          warnings.unresolved++;
          reject();
          continue;
        }
        if (target.id === owner.id) {
          warnings.self++;
          continue;
        }
        if (conflicts.has(target.id)) continue;
        if (result.has(target.id)) {
          if (result.get(target.id).rating !== rating) {
            result.delete(target.id);
            conflicts.add(target.id);
            warnings.conflicts++;
            reject();
          }
          continue;
        }
        const sameClass = groupKey(target) === groupKey(owner);
        if (!sameClass) warnings.crossClass++;
        result.set(target.id, { id: target.id, rating, label, sameClass });
      }
      // An unrecognized nonempty list is missing data, never zero nominations.
      return result.size || quality.complete ? [...result.values()] : null;
    }
    for (const s of students) {
      s.relations = nominations(s.raw.relations, s, true, "relations");
      s.predictions = nominations(s.raw.predictions, s, true, "predictions");
      s.popularChoice = nominations(s.raw.popular, s, false, "popular");
      s.connectorChoice = nominations(s.raw.central, s, false, "connector");
      s.contacts = nominations(s.raw.known, s, false, "contacts");
      s.help = nominations(s.raw.help, s, false, "help");
      // A later answer confirms an empty selection; a visit marker alone does not.
      s.outsideCount =
        s.raw.others === null
          ? s.emptySelections.includes("outside")
            ? 0
            : null
          : emptyValue(s.raw.others)
            ? 0
            : split(s.raw.others).length;
      s.friends =
        s.relations === null
          ? null
          : s.relations.filter((x) => x.rating > 0 && x.sameClass);
      s.rejections =
        s.relations === null
          ? null
          : s.relations.filter((x) => x.rating < 0 && x.sameClass);
    }
    // Count different people across the whole workbook, including other classes.
    // The nominations parser already deduplicates aliases and excludes self-reports.
    const careReporters = new Map();
    const peerRespondents = students.filter((s) => s.help !== null).length;
    for (const source of students) {
      for (const target of source.help || []) {
        if (!careReporters.has(target.id))
          careReporters.set(target.id, new Set());
        careReporters.get(target.id).add(source.id);
      }
    }
    for (const s of students) {
      const own = yesNo(s.responses.uce);
      const peerCoverage = peerRespondents - (s.help !== null ? 1 : 0);
      s.care = {
        requested: own === null ? null : own === "Sí",
        peerReports: peerCoverage ? careReporters.get(s.id)?.size || 0 : null,
        peerCoverage,
        peerRespondents,
        selfQuestionPresent: cols.uce >= 0,
        peerQuestionPresent: cols.help >= 0,
      };
    }
    const grouped = new Map();
    for (const s of students) {
      const key = groupKey(s);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(s);
    }
    const groups = [...grouped]
      .map(([key, rows]) => {
        const first = rows[0],
          byId = new Map(rows.map((s) => [s.id, s]));
        const edges = new Map(
          rows.map((s) => [
            s.id,
            s.relations === null
              ? null
              : new Map(s.relations.map((t) => [t.id, t.rating])),
          ]),
        );
        const incomingPositive = new Map(),
          incomingNegative = new Map(),
          popular = new Map(),
          connector = new Map();
        const increment = (map, id) => map.set(id, (map.get(id) || 0) + 1);
        const available = {
            relations: 0,
            popularChoice: 0,
            connectorChoice: 0,
          },
          allComplete = rows.every((s) => s.quality.relations.complete);
        for (const source of rows) {
          for (const field of Object.keys(available))
            if (source[field] !== null) available[field]++;
          for (const target of source.relations || [])
            if (target.sameClass) {
              if (target.rating > 0) increment(incomingPositive, target.id);
              else if (target.rating < 0)
                increment(incomingNegative, target.id);
            }
          for (const [field, map] of [
            ["popularChoice", popular],
            ["connectorChoice", connector],
          ])
            for (const target of source[field] || [])
              if (target.sameClass) increment(map, target.id);
        }
        for (const s of rows) {
          const coverage = (field) =>
            available[field] - (s[field] !== null ? 1 : 0);
          const reciprocal = (list) =>
            list === null
              ? null
              : list.filter((t) => edges.get(t.id)?.get(s.id) === t.rating);
          s.metrics = {
            friendsReceived: coverage("relations")
              ? incomingPositive.get(s.id) || 0
              : null,
            friendsDeclared: s.friends?.length ?? null,
            rejectionsReceived: coverage("relations")
              ? incomingNegative.get(s.id) || 0
              : null,
            rejectionsDeclared: s.rejections?.length ?? null,
            friendsMutual: reciprocal(s.friends)?.length ?? null,
            rejectionsMutual: reciprocal(s.rejections)?.length ?? null,
            relationsCoverage: coverage("relations"),
            peers: rows.length - 1,
            popularVotes: coverage("popularChoice")
              ? popular.get(s.id) || 0
              : null,
            connectorVotes: coverage("connectorChoice")
              ? connector.get(s.id) || 0
              : null,
          };
          for (const [kind, rate] of [
            ["friend", 1],
            ["rejection", -1],
          ]) {
            const p =
              s.predictions?.filter((t) => t.sameClass && t.rating === rate) ??
              null;
            const evaluable =
              p?.filter((t) => {
                const source = byId.get(t.id);
                return (
                  source.relations !== null &&
                  (source.quality.relations.complete ||
                    edges.get(t.id).has(s.id))
                );
              }) ?? null;
            const correct = evaluable?.length
              ? evaluable.filter((t) => edges.get(t.id).get(s.id) === rate)
                  .length
              : null;
            s.metrics[kind + "Predictions"] = p?.length ?? null;
            s.metrics[kind + "Evaluable"] = evaluable?.length ?? null;
            s.metrics[kind + "Correct"] = correct;
          }
          s.metrics.mutualComplete = allComplete;
        }
        return {
          key,
          study: first.study,
          course: first.course,
          group: first.group,
          rows,
        };
      })
      .sort(
        (a, b) =>
          a.course.localeCompare(b.course, "es", { numeric: true }) ||
          a.group.localeCompare(b.group, "es"),
      );
    prepareFocus(students);
    return { students, groups, warnings };
  }
  function careCategory(care) {
    if (
      typeof care?.requested !== "boolean" ||
      !Number.isInteger(care.peerReports) ||
      care.peerReports < 0
    )
      return "missing";
    return care.requested
      ? care.peerReports >= 2
        ? "both"
        : "ownOnly"
      : care.peerReports >= 2
        ? "peerOnly"
        : "neither";
  }
  function careSummary(rows) {
    const cases = rows
      .filter((s) => s.care?.requested === true || s.care?.peerReports >= 2)
      .map((s) => ({
        id: s.id,
        requested: s.care.requested === true,
        peerReports: s.care.peerReports,
      }));
    const selfAnswered = rows.filter(
      (s) => s.care?.requested !== null && s.care?.requested !== undefined,
    ).length;
    const peerAnswered = rows.filter(
      (s) => s.care?.peerReports !== null && s.care?.peerReports !== undefined,
    ).length;
    const matrix = {
      ownOnly: 0,
      both: 0,
      peerOnly: 0,
      neither: 0,
      known: 0,
      missing: 0,
      pendingLow: 0,
      pendingHigh: 0,
    };
    for (const s of rows) {
      const cell = careCategory(s.care);
      if (cell === "missing") {
        matrix.missing++;
        if (Number.isInteger(s.care?.peerReports)) {
          if (s.care.peerReports >= 2) matrix.pendingHigh++;
          else matrix.pendingLow++;
        }
        continue;
      }
      matrix.known++;
      matrix[cell]++;
    }
    return {
      cases,
      matrix,
      selfRequests: selfAnswered
        ? rows.filter((s) => s.care.requested === true).length
        : null,
      selfAnswered,
      peerCases: peerAnswered
        ? rows.filter((s) => s.care?.peerReports >= 2).length
        : null,
      peerAny: peerAnswered
        ? rows.filter((s) => s.care?.peerReports >= 1).length
        : null,
      peerRespondents: rows[0]?.care?.peerRespondents || 0,
      selfQuestionPresent: !!rows[0]?.care?.selfQuestionPresent,
      peerQuestionPresent: !!rows[0]?.care?.peerQuestionPresent,
    };
  }
  function summary(rows) {
    const n = rows.length;
    const rate = (key) => {
      const values = rows
        .map((s) => indicatorValue(s, key))
        .filter((v) => v !== null && v !== undefined);
      const count = values.length
        ? values.filter((v) => v === true).length
        : null;
      return {
        count,
        denominator: values.length,
        percent: values.length ? (100 * count) / values.length : null,
      };
    };
    const categorical = (field, multi = false) => {
      const valid = rows
          .map((s) => s.responses[field])
          .filter((v) => v !== null),
        counts = new Map();
      for (const v of valid) {
        const selections = new Map(
          (multi ? split(v) : [v]).map((item) => [norm(item), item]),
        );
        for (const [key, label] of selections) {
          const entry = counts.get(key) || { label, count: 0 };
          entry.count++;
          counts.set(key, entry);
        }
      }
      const items = [...counts.values()].map(({ label, count }) => ({
        label,
        count,
        percent: (100 * count) / valid.length,
      }));
      items.sort((a, b) =>
        ["alone", "fun", "general"].includes(field)
          ? (frequency(a.label) ?? 99) - (frequency(b.label) ?? 99)
          : b.count - a.count || a.label.localeCompare(b.label, "es"),
      );
      return { denominator: valid.length, items };
    };
    const relationRows = rows.filter((s) => s.relations !== null),
      peerSlots = relationRows.length * (n - 1);
    const rejectionCount = relationRows.length
      ? relationRows.reduce((sum, s) => sum + s.rejections.length, 0)
      : null;
    return {
      n,
      care: careSummary(rows),
      completed: rows.filter((s) => s.status === "Completado").length,
      started: rows.filter((s) => s.status === "En curso").length,
      notStarted: rows.filter((s) => s.status === "Sin iniciar").length,
      relationCoverage: relationRows.length,
      loneliness: rate("loneliness"),
      lowEnjoyment: rate("lowEnjoyment"),
      lowUniversity: rate("lowUniversity"),
      difficulty: rate("difficulty"),
      dropout: rate("dropout"),
      time: rate("time"),
      workload: rate("workload"),
      rejection: {
        count: rejectionCount,
        denominator: peerSlots,
        percent: peerSlots ? (100 * rejectionCount) / peerSlots : null,
        unit: "elecciones posibles",
      },
      distributions: Object.fromEntries(
        [
          "alone",
          "fun",
          "general",
          "uce",
          "time",
          "activities",
          "workload",
          "difficulty",
          "subjectReasons",
          "dropout",
          "dropoutReasons",
          "siblings",
          "position",
        ].map((f) => [
          f,
          categorical(
            f,
            ["activities", "subjectReasons", "dropoutReasons"].includes(f),
          ),
        ]),
      ),
    };
  }
  function overviewSummary(rows) {
    const base = summary(rows);
    const links = rows.flatMap((s) => (s.relations || []).filter(
      (link) => link.sameClass && (link.rating === 1 || link.rating === -1),
    ));
    const negativeCount = links.filter((link) => link.rating === -1).length;
    const wellbeing = rows.map((s) => {
      const values = [frequency(s.responses.fun), frequency(s.responses.general), frequency(s.responses.alone)];
      return values.every((v) => v !== null)
        ? (10 * (values[0] + values[1] + 4 - values[2])) / 12 : null;
    }).filter((v) => v !== null);
    return {
      ...base,
      negativeLinks: { count: links.length ? negativeCount : null, denominator: links.length,
        percent: links.length ? 100 * negativeCount / links.length : null },
      wellbeing: { mean: wellbeing.length ? wellbeing.reduce((a, b) => a + b, 0) / wellbeing.length : null,
        denominator: wellbeing.length },
    };
  }
  const FOCUS_LABELS = Object.freeze({
    ownHelp: "Piden ayuda",
    peerHelp: "Con menciones de ayuda de 2 o más personas",
    imminent: "Consideran dejar la universidad ahora",
    lowHappiness: "Felicidad por debajo de 5",
    noFriends: "No han señalado amistades",
    negativeBalance: "Reciben más vínculos negativos que positivos",
  });
  function prepareFocus(students) {
    const incoming = new Map(students.map(s => [s.id, {positive:0, negative:0}]));
    const linked = new Set();
    const respondents = students.filter(s => s.relations !== null).length;
    for (const s of students) for (const link of s.relations || []) {
      if (!incoming.has(link.id) || ![-1,1].includes(link.rating)) continue;
      incoming.get(link.id)[link.rating === 1 ? "positive" : "negative"]++;
      linked.add(s.id); linked.add(link.id);
    }
    for (const s of students) {
      const f = [frequency(s.responses.fun),frequency(s.responses.general),frequency(s.responses.alone)];
      const happiness = f.every(v => v !== null) ? 10*(f[0]+f[1]+4-f[2])/12 : null;
      const received = incoming.get(s.id);
      const known = respondents - (s.relations !== null ? 1 : 0) > 0;
      s.focus = {
        ownHelp: s.care.requested,
        peerHelp: s.care.peerReports === null ? null : s.care.peerReports >= 2,
        imminent: s.responses.dropout === null ? null : norm(s.responses.dropout) === norm("Sí, lo estoy considerando actualmente"),
        lowHappiness: happiness === null ? null : happiness < 5,
        noFriends: s.relations === null || !s.quality.relations.complete ? null : !s.relations.some(r => r.rating > 0),
        negativeBalance: known ? received.negative > received.positive : null,
        happiness, receivedPositive: known ? received.positive : null, receivedNegative: known ? received.negative : null,
        linked: linked.has(s.id),
      };
    }
  }
  function focusSummary(rows) {
    return Object.fromEntries(Object.keys(FOCUS_LABELS).map(key => {
      const values = rows.map(s => s.focus[key]).filter(v => typeof v === "boolean");
      const count = values.filter(Boolean).length;
      return [key,{count:values.length ? count : null, denominator:values.length,
        percent:values.length ? 100*count/values.length : null}];
    }));
  }
  function linkCoverage(rows) {
    const count = rows.filter(s => s.focus?.linked).length;
    return {count, total:rows.length, percent:rows.length ? 100*count/rows.length : 0, eligible:rows.length > 0 && count*5 >= rows.length*4};
  }
  return Object.freeze({
    FOCUS_LABELS, focusSummary, linkCoverage,
    overviewSummary,
    parseTable,
    summary,
    indicatorMatches,
    careSummary,
    careCategory,
    answer,
    text,
    norm,
    yesNo,
    frequency,
    escape,
    ratio,
    groupKey,
    FIELDS,
  });
});
