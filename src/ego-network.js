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
        ? "Sin respuesta propia interpretable: se muestran las valoraciones recibidas disponibles."
        : !student.quality.relations.complete
          ? "Respuesta propia parcial: puede haber vínculos que no se han podido leer."
          : "";
    return `<div class="ego-result" role="status">${count} ${count === 1 ? "persona vinculada" : "personas vinculadas"} · ${network.outgoing} ${network.outgoing === 1 ? "valoración declarada" : "valoraciones declaradas"} · ${network.incoming} ${network.incoming === 1 ? "valoración recibida" : "valoraciones recibidas"} · ${network.otherClass} de otras clases</div>${notes ? `<p class="ego-missing-note">${E(notes)}</p>` : ""}${!count ? `<p class="ego-empty">${network.kind === "all" && network.direction === "both" ? "Sin valoraciones positivas o negativas registradas. Esto no permite concluir que no tenga relaciones." : "Sin vínculos registrados para esta selección."}</p>` : ""}<div class="ego-stage" tabindex="0" role="region" aria-label="Red de relaciones. Se puede desplazar cuando está ampliada." data-ego-scale="1">${svg(network)}</div><p class="ego-coverage">La red incluye otras clases, con borde discontinuo; los recuentos de la ficha corresponden a su clase.</p>`;
  }
  function view(student, students) {
    return `<section class="ego-network" aria-labelledby="ego-heading"><div class="ego-heading"><div><span class="eyebrow">VALORACIONES DEL CUESTIONARIO</span><h3 id="ego-heading">Red de relaciones</h3></div></div><p class="ego-intro">Las flechas van desde quien valora hacia la persona valorada. Pulsa un código para abrir su ficha.</p><div class="ego-legend" aria-label="Leyenda de la red"><span><i class="ego-legend-positive" aria-hidden="true"></i>Buena relación</span><span><i class="ego-legend-positive ego-legend-strong" aria-hidden="true"></i>Muy buena relación</span><span><i class="ego-legend-negative" aria-hidden="true"></i>Mala relación</span><span><i class="ego-legend-negative ego-legend-strong" aria-hidden="true"></i>Muy mala relación</span></div><div class="ego-zoom"><span>Amplía para explorar la red.</span><div><button type="button" data-ego-zoom="out" aria-label="Reducir la red" disabled>−</button><button type="button" data-ego-zoom="in" aria-label="Ampliar la red">+</button><button type="button" data-ego-zoom="fit">Ajustar</button><output data-ego-zoom-label aria-live="polite">Ajustado</output></div></div><div data-ego-body>${body(student, students)}</div></section>`;
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
  // The class graph uses only recorded ratings. Neutral/unknown ratings are not links.
  function classBuild(rows, students, filters = {}) {
    const members = new Set(rows.map((s) => s.id));
    const byId = new Map(students.map((s) => [s.id, s]));
    const kind = ["positive", "negative", "mutual"].includes(filters.kind) ? filters.kind : "all";
    let edges = [];
    for (const source of students) for (const r of source.relations || []) {
      if (!byId.has(r.id) || r.id === source.id || ![-1, 1].includes(r.rating)) continue;
      if (filters.external ? !members.has(source.id) && !members.has(r.id) : !members.has(source.id) || !members.has(r.id)) continue;
      if (kind === "positive" && r.rating < 0 || kind === "negative" && r.rating > 0) continue;
      edges.push({ from: source.id, to: r.id, rating: r.rating, intensity: /^(muy buena|muy mala) relacion$/.test(C.norm(r.label)) ? 2 : 1, label: r.label || (r.rating > 0 ? "Buena relación" : "Mala relación") });
    }
    if (kind === "mutual") {
      const pairs = new Set(edges.map((e) => JSON.stringify([e.from, e.to, e.rating])));
      edges = edges.filter((e) => pairs.has(JSON.stringify([e.to, e.from, e.rating])));
    }
    const unique = new Map(edges.map((e) => [JSON.stringify([e.from, e.to]), e]));
    edges = [...unique.values()];
    const included = new Set([...members, ...edges.flatMap((e) => [e.from, e.to])]);
    const degree = new Map([...included].map((id) => [id, 0]));
    for (const e of edges) { degree.set(e.from, degree.get(e.from) + 1); degree.set(e.to, degree.get(e.to) + 1); }
    return { nodes: [...included].map((id) => ({ student: byId.get(id), external: !members.has(id), degree: degree.get(id) })).sort((a,b) => a.student.id.localeCompare(b.student.id, "es", {numeric:true})), edges, kind, linked: rows.filter((s) => degree.get(s.id) > 0).length, total: rows.length };
  }
  function classSvg(net, layout = "links", focus = "") {
    const side = Math.max(840, Math.min(5000, Math.ceil(Math.sqrt(net.nodes.length)) * 86));
    const positions = new Map(net.nodes.map((n, i) => {
      const angle = 2 * Math.PI * i / Math.max(1, net.nodes.length);
      return [n.student.id, {x:side/2 + side*.39*Math.cos(angle), y:side/2 + side*.39*Math.sin(angle)}];
    }));
    // Bound the expensive layout; larger graphs keep a deterministic circular layout.
    if (layout === "links" && net.nodes.length > 1 && net.nodes.length <= 220) {
      const ids = [...positions.keys()];
      for (let step=0; step<80; step++) {
        const forces = new Map(ids.map((id) => [id, {x:0,y:0}]));
        for (let i=0;i<ids.length;i++) for (let j=i+1;j<ids.length;j++) {
          const a=positions.get(ids[i]), b=positions.get(ids[j]);
          const dx=a.x-b.x || .1, dy=a.y-b.y || .1, d2=Math.max(80,dx*dx+dy*dy), f=250/d2;
          forces.get(ids[i]).x+=dx*f; forces.get(ids[i]).y+=dy*f;
          forces.get(ids[j]).x-=dx*f; forces.get(ids[j]).y-=dy*f;
        }
        for (const e of net.edges) {
          const a=positions.get(e.from), b=positions.get(e.to), k=e.rating>0?.018:.004;
          forces.get(e.from).x+=(b.x-a.x)*k; forces.get(e.from).y+=(b.y-a.y)*k;
          forces.get(e.to).x+=(a.x-b.x)*k; forces.get(e.to).y+=(a.y-b.y)*k;
        }
        for (const id of ids) {
          const p=positions.get(id), f=forces.get(id), cool=1-step/100;
          f.x-=(p.x-side/2)*.015; f.y-=(p.y-side/2)*.015;
          p.x=Math.max(45,Math.min(side-45,p.x+Math.max(-10,Math.min(10,f.x))*cool));
          p.y=Math.max(45,Math.min(side-45,p.y+Math.max(-10,Math.min(10,f.y))*cool));
        }
      }
    }
    const neighbors=new Set([focus]);
    for (const e of net.edges) if(e.from===focus||e.to===focus){neighbors.add(e.from);neighbors.add(e.to);}
    return `<svg class="ego-svg class-network-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" role="img" aria-label="Red de la clase: ${net.total} estudiantes, ${net.linked} con vínculos en esta selección"><defs>${["positive","negative"].map(k=>`<marker id="class-arrow-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" class="ego-${k}-fill"/></marker>`).join("")}</defs>${net.edges.map(e=>{
      const a=positions.get(e.from),b=positions.get(e.to),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,k=e.rating>0?"positive":"negative";
      const dim=focus&&e.from!==focus&&e.to!==focus;
      return `<path class="ego-edge ego-${k}${dim?" class-network-dim":""}" d="M ${fixed(a.x+dx/len*13)} ${fixed(a.y+dy/len*13)} Q ${fixed((a.x+b.x)/2+nx*12)} ${fixed((a.y+b.y)/2+ny*12)} ${fixed(b.x-dx/len*15)} ${fixed(b.y-dy/len*15)}" fill="none" stroke-width="${e.intensity===2?2.8:1.2}" marker-end="url(#class-arrow-${k})"><title>${E(e.from)} → ${E(e.to)}: ${E(e.label)}</title></path>`;
    }).join("")}${net.nodes.map(n=>{
      const p=positions.get(n.student.id),dim=focus&&!neighbors.has(n.student.id);
      return `<a href="#report" data-network-student="${E(n.student.id)}" class="class-network-node${n.external?" class-network-external":""}${dim?" class-network-dim":""}" aria-label="Ver ficha del código ${E(n.student.id)}"><title>${E(n.student.id)} · ${E(classLabel(n.student))}${n.degree?"":" · Sin vínculos registrados en esta selección"}</title><circle cx="${fixed(p.x)}" cy="${fixed(p.y)}" r="${n.student.id===focus?13:9}"/><text x="${fixed(p.x)}" y="${fixed(p.y+25)}" text-anchor="middle">${E(n.student.id)}</text></a>`;
    }).join("")}</svg>`;
  }
  function classBody(rows, students, filters = {}) {
    const net=classBuild(rows,students,filters);
    return `<p class="ego-result" role="status">${net.linked} de ${net.total} estudiantes con vínculos · ${net.edges.length} valoraciones · ${net.nodes.filter(n=>n.external).length} personas de otras clases</p>${net.edges.length?"":'<p class="ego-empty">No hay vínculos registrados para esta selección. Esto no permite concluir que no existan relaciones.</p>'}<div class="ego-stage" tabindex="0" role="region" aria-label="Red de la clase. Amplía para recorrerla." data-ego-scale="1">${classSvg(net,filters.layout,filters.focus)}</div>`;
  }
  function classView(rows, students) {
    return `<section class="ego-network class-network" aria-labelledby="class-network-title"><h3 id="class-network-title">Red de la clase</h3><p class="ego-intro">Cada círculo representa un estudiante. Las flechas van desde quien valora hacia la persona valorada. Pulsa un código para abrir su ficha.</p><div class="class-network-controls"><label>Relaciones<select data-class-network="kind"><option value="all">Positivas y negativas</option><option value="positive">Solo positivas</option><option value="negative">Solo negativas</option><option value="mutual">Mutuas del mismo tipo</option></select></label><label>Distribución<select data-class-network="layout"><option value="links">Según los vínculos</option><option value="circle">En círculo</option></select></label><label>Destacar estudiante<select data-class-network="focus"><option value="">Toda la clase</option>${rows.map(s=>`<option value="${E(s.id)}">${E(s.id)}</option>`).join("")}</select></label><label class="class-network-checkbox"><input type="checkbox" data-class-network="external">Incluir vínculos con otras clases</label></div><div class="ego-legend"><span><i class="ego-legend-positive"></i>Positiva</span><span><i class="ego-legend-negative"></i>Negativa</span><span>Mayor grosor: Muy buena o Muy mala</span><span>Borde discontinuo: otra clase</span></div><div class="ego-zoom"><span>Amplía para leer los códigos.</span><div><button type="button" data-ego-zoom="out" disabled aria-label="Reducir la red de clase">−</button><button type="button" data-ego-zoom="in" aria-label="Ampliar la red de clase">+</button><button type="button" data-ego-zoom="fit">Ajustar</button><output data-ego-zoom-label>Ajustado</output></div></div><div data-class-network-body>${classBody(rows,students)}</div><p class="ego-coverage">La posición facilita la lectura; no representa popularidad ni grupos calculados. Un círculo sin vínculos indica ausencia de registros en esta selección.</p></section>`;
  }
  return { build, geometry, svg, body, view, zoom, classBuild, classSvg, classBody, classView };
});
