(function (root, factory) {
  const core =
    typeof module === "object" && module.exports
      ? require("./core.js")
      : root.IsatCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IsatEgoNetwork = api;
})(typeof window === "undefined" ? globalThis : window, function (C) {
  "use strict";
  const E = C.escape;
  const displayName = (student) => student.id;
  const classKey = (student) =>
    JSON.stringify([student.study, student.course, student.group]);
  const classLabel = (student) =>
    student.course + (student.group === "." ? "" : " · " + student.group);
  function build(student, students, filters = {}) {
    const kind = ["positive", "negative"].includes(filters.kind)
      ? filters.kind
      : "all";
    const direction = ["incoming", "outgoing"].includes(filters.direction)
      ? filters.direction
      : "both";
    const byId = new Map(students.map((s) => [s.id, s]));
    const edges = [];
    function add(source, target, relation, edgeDirection) {
      if (
        !relation ||
        source.id === target.id ||
        ![-1, 1].includes(relation.rating)
      )
        return;
      const edgeKind = relation.rating > 0 ? "positive" : "negative";
      if (
        (kind !== "all" && kind !== edgeKind) ||
        (direction !== "both" && direction !== edgeDirection)
      )
        return;
      const label =
        relation.label ||
        (edgeKind === "positive" ? "Buena relación" : "Mala relación");
      edges.push({
        from: source.id,
        to: target.id,
        peerId: source.id === student.id ? target.id : source.id,
        kind: edgeKind,
        direction: edgeDirection,
        label,
        intensity: /^(muy buena|muy mala) relacion$/.test(C.norm(label))
          ? 2
          : 1,
      });
    }
    for (const relation of student.relations || []) {
      const target = byId.get(relation.id);
      if (target) add(student, target, relation, "outgoing");
    }
    for (const source of students) {
      if (source.id === student.id) continue;
      const relation = source.relations?.find((r) => r.id === student.id);
      add(source, student, relation, "incoming");
    }
    const peers = [...new Set(edges.map((edge) => edge.peerId))]
      .map((id) => byId.get(id))
      .sort(
        (a, b) =>
          displayName(a).localeCompare(displayName(b), "es", {
            numeric: true,
          }) || a.id.localeCompare(b.id),
      );
    return {
      student,
      peers,
      edges,
      kind,
      direction,
      edgeLookup: new Map(
        edges.map((edge) => [
          JSON.stringify([edge.peerId, edge.direction]),
          edge,
        ]),
      ),
      outgoing: edges.filter((edge) => edge.direction === "outgoing").length,
      incoming: edges.filter((edge) => edge.direction === "incoming").length,
      otherClass: peers.filter((peer) => classKey(peer) !== classKey(student))
        .length,
    };
  }
  function lines(value, max = 19, count = 2) {
    const words = String(value).split(/\s+/);
    const result = [];
    let current = "";
    for (const word of words) {
      if (current && (current + " " + word).length > max) {
        result.push(current);
        current = "";
      }
      current = current ? current + " " + word : word;
    }
    if (current) result.push(current);
    const visible = result
      .slice(0, count)
      .map((line) => (line.length > max ? line.slice(0, max - 1) + "…" : line));
    if (result.length > count)
      visible[count - 1] = visible[count - 1].slice(0, max - 1) + "…";
    return visible;
  }
  const fixed = (value) => Number(value.toFixed(2));
  function geometry(network) {
    const n = network.peers.length;
    const rx = Math.max(330, n * 36),
      ry = Math.max(235, n * 18);
    const cx = rx + 105,
      cy = ry + 55;
    const peers = network.peers.map((student, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(1, n);
      return {
        student,
        x: fixed(cx + rx * Math.cos(angle)),
        y: fixed(cy + ry * Math.sin(angle)),
      };
    });
    const positions = new Map(peers.map((peer) => [peer.student.id, peer]));
    const peerCounts = new Map();
    for (const edge of network.edges)
      peerCounts.set(edge.peerId, (peerCounts.get(edge.peerId) || 0) + 1);
    const paths = network.edges.map((edge) => {
      const node = positions.get(edge.peerId);
      const dx = node.x - cx,
        dy = node.y - cy,
        length = Math.hypot(dx, dy);
      const ux = dx / length,
        uy = dy / length,
        nx = -uy,
        ny = ux;
      const paired = peerCounts.get(edge.peerId) > 1;
      const lane = paired ? (edge.direction === "outgoing" ? -9 : 9) : 0;
      const nodeBoundary = Math.min(
        71 / Math.max(0.001, Math.abs(ux)),
        34 / Math.max(0.001, Math.abs(uy)),
      );
      const central = {
        x: cx + ux * 87 + nx * lane,
        y: cy + uy * 87 + ny * lane,
      };
      const outer = {
        x: node.x - ux * (nodeBoundary + 12) + nx * lane,
        y: node.y - uy * (nodeBoundary + 12) + ny * lane,
      };
      const start = edge.direction === "outgoing" ? central : outer;
      const end = edge.direction === "outgoing" ? outer : central;
      const control = {
        x: (start.x + end.x) / 2 + nx * lane,
        y: (start.y + end.y) / 2 + ny * lane,
      };
      return {
        ...edge,
        width: edge.intensity === 2 ? 5.5 : 2.3,
        path: `M ${fixed(start.x)} ${fixed(start.y)} Q ${fixed(control.x)} ${fixed(control.y)} ${fixed(end.x)} ${fixed(end.y)}`,
      };
    });
    return { width: rx * 2 + 210, height: ry * 2 + 110, cx, cy, peers, paths };
  }
  function svg(network) {
    const layout = geometry(network);
    const labels = (student, x, y, central = false) => {
      const text = lines(displayName(student), central ? 20 : 19);
      const first = y - (text.length > 1 ? 13 : 3);
      return `<text class="ego-node-name${central ? " ego-central-name" : ""}" text-anchor="middle">${text.map((line, index) => `<tspan x="${x}" y="${first + index * 16}">${E(line)}</tspan>`).join("")}</text><text class="ego-node-code" text-anchor="middle" x="${x}" y="${y + 21}">${E(lines(classLabel(student), 23, 1)[0])}</text>`;
    };
    const names = new Map([
      [network.student.id, displayName(network.student)],
      ...network.peers.map((s) => [s.id, displayName(s)]),
    ]);
    return `<svg class="ego-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="ego-svg-title ego-svg-description"><title id="ego-svg-title">Red de relaciones de ${E(displayName(network.student))}</title><desc id="ego-svg-description">${network.peers.length} personas vinculadas. ${network.outgoing} valoraciones declaradas y ${network.incoming} recibidas. Las flechas van desde quien valora hacia la persona valorada. Azul indica una valoración positiva y rojo una negativa; mayor grosor indica Muy buena o Muy mala relación.</desc><defs><marker id="ego-arrow-positive" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" class="ego-positive-fill" /></marker><marker id="ego-arrow-negative" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" class="ego-negative-fill" /></marker></defs>${layout.paths.map((edge) => `<path class="ego-edge ego-${edge.kind}" d="${edge.path}" stroke-width="${edge.width}" fill="none" marker-end="url(#ego-arrow-${edge.kind})" data-ego-direction="${edge.direction}" data-ego-peer="${E(edge.peerId)}" data-ego-intensity="${edge.intensity}"><title>${E(`${names.get(edge.from)} → ${names.get(edge.to)}: ${edge.label}`)}</title></path>`).join("")}${layout.peers.map((peer) => `<a href="#report" data-network-student="${E(peer.student.id)}" aria-label="${E(`Ver ficha del código ${peer.student.id}, ${classLabel(peer.student)}`)}"><title>Código ${E(peer.student.id)} · ${E(classLabel(peer.student))}</title><rect class="ego-peripheral-node${classKey(peer.student) !== classKey(network.student) ? " ego-other-class" : ""}" x="${peer.x - 71}" y="${peer.y - 34}" width="142" height="68" rx="16" />${labels(peer.student, peer.x, peer.y)}</a>`).join("")}<circle class="ego-central-node" cx="${layout.cx}" cy="${layout.cy}" r="80" /><text class="ego-central-caption" text-anchor="middle" x="${layout.cx}" y="${layout.cy - 39}">ESTUDIANTE</text>${labels(network.student, layout.cx, layout.cy, true)}</svg>`;
  }
  function body(student, students, filters = {}) {
    const network = build(student, students, filters);
    const count = network.peers.length;
    const notes =
      student.relations === null
        ? "Falta una respuesta propia interpretable. La red puede mostrar las valoraciones recibidas; la ausencia de flechas salientes no significa que no tenga amistades."
        : !student.quality.relations.complete
          ? "La respuesta propia es parcial: solo se dibujan los vínculos reconocidos. Puede haber otros."
          : "";
    return `<div class="ego-result" role="status">En esta vista: ${count} ${count === 1 ? "persona vinculada" : "personas vinculadas"} · ${network.outgoing} ${network.outgoing === 1 ? "valoración declarada" : "valoraciones declaradas"} · ${network.incoming} ${network.incoming === 1 ? "valoración recibida" : "valoraciones recibidas"} · ${network.otherClass} de otras clases</div>${notes ? `<p class="ego-missing-note">${E(notes)}</p>` : ""}${!count ? `<p class="ego-empty">${network.kind === "all" && network.direction === "both" ? "No hay relaciones positivas o negativas registradas para este código en el archivo. Las respuestas ausentes no permiten concluir que no tenga relaciones." : "No hay vínculos registrados que coincidan con estos filtros."}</p>` : ""}<div class="ego-stage" tabindex="0" role="region" aria-label="Red de relaciones. Se puede desplazar cuando está ampliada." data-ego-scale="1">${svg(network)}</div><p class="ego-coverage">La red incluye estudiantes de cualquier clase presente en el Excel. Un borde discontinuo identifica otra clase. Solo se dibujan valoraciones positivas o negativas registradas; las predicciones y las menciones de ayuda se consultan por separado. Los recuentos de relaciones de la ficha se refieren a la clase seleccionada.</p>`;
  }
  function view(student, students) {
    return `<section class="ego-network" aria-labelledby="ego-heading"><div class="ego-heading"><div><span class="eyebrow">VALORACIONES DEL CUESTIONARIO</span><h3 id="ego-heading">Red de relaciones</h3></div></div><p class="ego-intro">En el centro aparece el código del estudiante. Las flechas que salen muestran a quién ha valorado; las que llegan, quién le ha valorado. El grosor refleja la intensidad de la valoración registrada en el cuestionario. Pulsa un código para abrir su ficha.</p><div class="ego-legend" aria-label="Leyenda de la red"><span><i class="ego-legend-positive" aria-hidden="true"></i>Buena relación</span><span><i class="ego-legend-positive ego-legend-strong" aria-hidden="true"></i>Muy buena relación</span><span><i class="ego-legend-negative" aria-hidden="true"></i>Mala relación</span><span><i class="ego-legend-negative ego-legend-strong" aria-hidden="true"></i>Muy mala relación</span></div><div class="ego-zoom"><span>Amplía y desplaza el dibujo si lo necesitas.</span><div><button type="button" data-ego-zoom="out" aria-label="Reducir la red" disabled>−</button><button type="button" data-ego-zoom="in" aria-label="Ampliar la red">+</button><button type="button" data-ego-zoom="fit">Ajustar</button><output data-ego-zoom-label aria-live="polite">Ajustado</output></div></div><div data-ego-body>${body(student, students)}</div></section>`;
  }
  function zoom(panel, action) {
    const stage = panel.querySelector(".ego-stage"),
      svgElement = stage?.querySelector("svg");
    if (!stage || !svgElement) return;
    const scales = [1, 1.5, 2.25, 3.5, 5, 8];
    const current = scales.indexOf(Number(stage.dataset.egoScale));
    const index =
      action === "fit"
        ? 0
        : Math.max(
            0,
            Math.min(scales.length - 1, current + (action === "in" ? 1 : -1)),
          );
    const scale = scales[index];
    stage.dataset.egoScale = String(scale);
    stage.classList.toggle("is-zoomed", index > 0);
    svgElement.setAttribute(
      "width",
      String(Math.round(stage.clientWidth * scale)),
    );
    panel.querySelector('[data-ego-zoom="out"]').disabled = index === 0;
    panel.querySelector('[data-ego-zoom="in"]').disabled =
      index === scales.length - 1;
    panel.querySelector("[data-ego-zoom-label]").textContent = index
      ? `${scale * 100} %`
      : "Ajustado";
    if (!index) {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
  }
  return { build, geometry, svg, body, view, zoom };
});
