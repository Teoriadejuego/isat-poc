/* Deterministic greedy modularity on the undirected positive network.
   Negative ratings never determine the partition; they are aggregated afterwards. */
(function(root,factory){
  if(typeof module === "object" && module.exports) module.exports=factory(require("./core.js"));
  else root.IsatCommunities=factory(root.IsatCore);
})(typeof globalThis!=="undefined"?globalThis:this,function(C){
  "use strict";
  function build(rows,students){
    const members=new Set(rows.map(s=>s.id)), known=new Set(students.map(s=>s.id));
    const adj=new Map(rows.map(s=>[s.id,new Map()]));
    for(const s of rows) for(const e of s.relations||[]){
      if(e.rating!==1||!members.has(e.id)||e.id===s.id)continue;
      const w=/^muy buena/.test(C.norm(e.label))?2:1;
      adj.get(s.id).set(e.id,(adj.get(s.id).get(e.id)||0)+w);
      adj.get(e.id).set(s.id,(adj.get(e.id).get(s.id)||0)+w);
    }
    const ids=[...members].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
    const buckets=new Map(ids.map(id=>[id,{ids:[id],degree:[...adj.get(id).values()].reduce((a,b)=>a+b,0)}]));
    const owner=new Map(ids.map(id=>[id,id]));
    const m2=[...buckets.values()].reduce((a,b)=>a+b.degree,0);
    if(m2) for(let step=0;step<Math.min(ids.length,500);step++){
      const weights=new Map();
      for(const from of ids) for(const [to,w] of adj.get(from)){
        const a=owner.get(from),b=owner.get(to);
        if(a>=b)continue;
        const key=JSON.stringify([a,b]); weights.set(key,(weights.get(key)||0)+w);
      }
      let best=null,gain=1e-12;
      for(const [key,w] of weights){
        const [a,b]=JSON.parse(key);
        const delta=2*w/m2-2*buckets.get(a).degree*buckets.get(b).degree/(m2*m2);
        if(delta>gain+1e-12){best=[a,b];gain=delta;}
      }
      if(!best)break;
      const [a,b]=best, left=buckets.get(a),right=buckets.get(b);
      left.ids.push(...right.ids);left.degree+=right.degree;buckets.delete(b);
      for(const id of right.ids)owner.set(id,a);
    }
    const groups=[...buckets.values()].filter(g=>g.ids.length>1).sort((a,b)=>b.ids.length-a.ids.length||a.ids[0].localeCompare(b.ids[0]));
    const communities=groups.map((g,i)=>({key:`c${i}`,label:`Comunidad ${i+1}`,ids:g.ids,internal:0,kind:"community"}));
    const assigned=new Map(communities.flatMap(g=>g.ids.map(id=>[id,g.key])));
    const unassigned=ids.filter(id=>!assigned.has(id));
    const nodes=[...communities];
    if(unassigned.length){nodes.push({key:"unassigned",label:"Sin comunidad positiva",ids:unassigned,internal:0,kind:"unassigned"});for(const id of unassigned)assigned.set(id,"unassigned");}
    const pairs=new Map(),outside=new Set();let internal=0,between=0,external=0,unassignedNegative=0;
    for(const s of students)for(const e of s.relations||[]){
      if(e.rating!==-1||!known.has(e.id)||!members.has(s.id)&&!members.has(e.id))continue;
      const a=assigned.get(s.id)||"external",b=assigned.get(e.id)||"external";
      if(a==="external")outside.add(s.id);if(b==="external")outside.add(e.id);
      if(a===b){nodes.find(n=>n.key===a).internal++;if(a==="unassigned")unassignedNegative++;else internal++;continue;}
      if(a==="external"||b==="external")external++;else between++;
      const key=JSON.stringify([a,b].sort());pairs.set(key,(pairs.get(key)||0)+1);
    }
    if(outside.size)nodes.push({key:"external",label:"Otras clases",ids:[...outside],internal:0,kind:"external"});
    return {communities,nodes,edges:[...pairs].map(([key,count])=>({keys:JSON.parse(key),count})),unassigned:unassigned.length,unassignedNegative,internal,between,external,total:rows.length};
  }
  const E=C.escape;
  function view(rows,students){
    const g=build(rows,students),n=g.nodes.length, cols=Math.min(4,Math.max(1,n)),height=Math.max(300,Math.ceil(n/cols)*220);
    const positions=new Map(g.nodes.map((v,i)=>[v.key,{x:120+(i%cols)*220,y:125+Math.floor(i/cols)*220,r:Math.min(65,30+Math.sqrt(v.ids.length)*4)}]));
    const colors=["#192a67","#023e83","#117c91","#526dad","#297485","#6b70a8"];
    const svg=`<svg viewBox="0 0 ${cols*220+20} ${height}" role="img" aria-label="${g.communities.length} comunidades positivas. ${g.internal} vínculos negativos dentro, ${g.between} entre agrupaciones y ${g.external} con otras clases.">${g.edges.map(e=>{
      const a=positions.get(e.keys[0]),b=positions.get(e.keys[1]),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
      return `<g><path d="M${a.x+dx/l*(a.r+4)} ${a.y+dy/l*(a.r+4)} L${b.x-dx/l*(b.r+4)} ${b.y-dy/l*(b.r+4)}" stroke="#bf3448" stroke-width="${Math.min(10,1+Math.log2(1+e.count))}"/><rect x="${(a.x+b.x)/2-14}" y="${(a.y+b.y)/2-12}" width="28" height="24" rx="7" fill="white"/><text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2+5}" text-anchor="middle" fill="#a72436">${e.count}</text><title>${E(g.nodes.find(n=>n.key===e.keys[0]).label)} ↔ ${E(g.nodes.find(n=>n.key===e.keys[1]).label)}: ${e.count} valoraciones negativas dirigidas, sumadas en ambos sentidos</title></g>`;
    }).join("")}${g.nodes.map((node,i)=>{
      const p=positions.get(node.key), color=node.kind==="community"?colors[i%colors.length]:"#68727f";
      return `<g><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${color}"${node.kind!=="community"?' stroke="#192a67" stroke-dasharray="5 4"':""}/><text x="${p.x}" y="${p.y+8}" text-anchor="middle" fill="white" font-size="25">${node.ids.length}</text><text x="${p.x}" y="${p.y+p.r+23}" text-anchor="middle" fill="#192a67" font-size="12">${node.label}</text>${node.internal?`<path d="M${p.x-p.r*.6} ${p.y-p.r*.8} C${p.x-p.r*1.5} ${p.y-p.r-52} ${p.x+p.r*1.5} ${p.y-p.r-52} ${p.x+p.r*.6} ${p.y-p.r*.8}" fill="none" stroke="#bf3448" stroke-width="3"/><text x="${p.x}" y="${p.y-p.r-22}" text-anchor="middle" fill="#a72436" font-size="13">${node.internal} dentro</text>`:""}</g>`;
    }).join("")}</svg>`;
    return `<section class="community-map"><h3>Comunidades y relaciones negativas</h3><div class="community-totals"><span><strong>${g.communities.length}</strong> comunidades positivas</span><span><strong>${g.internal}</strong> vínculos negativos dentro</span><span><strong>${g.between}</strong> entre agrupaciones</span><span><strong>${g.external}</strong> con otras clases</span>${g.unassignedNegative?`<span><strong>${g.unassignedNegative}</strong> entre personas sin comunidad</span>`:""}</div><p>El tamaño indica cuántas personas reúne cada agrupación. Las líneas rojas suman las valoraciones negativas en ambos sentidos.</p><div class="community-canvas" tabindex="0" role="region" aria-label="Mapa de comunidades">${svg}</div><p class="snapshot-note">${g.unassigned} estudiantes sin comunidad positiva asignada. Las comunidades se estiman por los vínculos positivos registrados; pueden cambiar con nuevas respuestas.</p><details><summary>Ver integrantes de las comunidades</summary>${g.nodes.filter(n=>n.kind!=="external").map(n=>`<div><h4>${n.label}</h4><p>${n.ids.map(id=>`<a href="#report" data-network-student="${E(id)}">${E(id)}</a>`).join(" · ")}</p></div>`).join("")}</details></section>`;
  }
  return {build,view};
});
