/* ISAT: deterministic parsing and descriptive summaries. No storage or network. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IsatCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>v===null||v===undefined?null:(String(v).trim()||null);
  const answer=v=>{const s=text(v);return s===null?null:text(s.replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\s*->\s*/,''));};
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const yesNo=v=>{const s=norm(v);return /^s[i\uFFFD]$/.test(s)?'Sí':s==='no'?'No':null;};
  const split=v=>v===null?null:[...new Set(String(v).split('|').map(x=>x.trim()).filter(Boolean))];
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groupKey=s=>JSON.stringify([s.study,s.course,s.group]);
  const frequency=v=>({nunca:0,'casi nunca':1,'algunas veces':2,'casi siempre':3,siempre:4})[norm(v)]??null;
  const ratio=(n,d)=>n===null||!d?null:Math.round(100*n/d)/10;
  const FIELDS=Object.freeze({
    alone:'Soledad en la última semana',fun:'Disfrute con sus amistades',general:'Cómo le ha ido en la universidad',uce:'UCE',
    time:'Organización del tiempo',activities:'Actividades universitarias',workload:'Carga de trabajo',difficulty:'Dificultades en las asignaturas',
    subjects:'Asignaturas con dificultades',subjectReasons:'Motivos de las dificultades',subjectOther:'Otros motivos de las dificultades',
    dropout:'Pensamientos de abandono',dropoutReasons:'Motivos para plantearse abandonar',dropoutOther:'Otros motivos de abandono',
    siblings:'Tiene hermanos o hermanas',brothers:'Número de hermanos',sisters:'Número de hermanas',position:'Posición entre hermanos y hermanas'
  });
  function parseTable(table){
    if(!Array.isArray(table)||table.length<2)throw Error('La hoja seleccionada no contiene registros de estudiantes.');
    const h=table[0].map(text),headerMap=new Map();
    h.forEach((v,i)=>{if(v!==null){if(headerMap.has(norm(v)))throw Error('La hoja contiene cabeceras repetidas: '+v+'.');headerMap.set(norm(v),i);}});
    const find=(names,required=false)=>{for(const n of names)if(headerMap.has(norm(n)))return headerMap.get(norm(n));if(required)throw Error('Falta la columna '+names[0]+'. Selecciona la hoja Users del cuestionario ISAT.');return -1;};
    const cols={id:find(['Usuario Id','ID'],true),alias:find(['Alumno Id']),course:find(['Curso'],true),group:find(['Grupo'],true),study:find(['Estudio']),name:find(['Nombre','Nombre completo']),
      route:find(['dia']),r1:find(['redes1']),r2:find(['redes2']),p1:find(['beliefs1']),p2:find(['beliefs2']),popular:find(['popular']),central:find(['central']),known:find(['conocidos']),others:find(['otros']),help:find(['ayuda']),helpEvent:find(['eayuda']),story:find(['circunstancia','historia']),personal:find(['personal']),
      alone:find(['alone']),fun:find(['fun']),general:find(['general']),uce:find(['uce']),siblings:find(['siblings']),brothers:find(['brothers']),sisters:find(['sisters']),position:find(['posicion']),
      difficulty:find(['dificultad']),subjects:find(['asignaturas']),subjectReasons:find(['motivoasig']),subjectOther:find(['motivoasig1']),dropout:find(['abandono']),dropoutReasons:find(['motivoabandono']),dropoutOther:find(['motivoabandono1']),start:find(['start']),end:find(['end'])};
    for(const [field,word] of [['time','organiza'],['activities','apuntado'],['workload','carga de trabajo']])cols[field]=h.findIndex(v=>norm(v).includes(word));
    if(cols.r1<0||cols.r2<0||cols.alone<0||cols.dropout<0)throw Error('No se reconoce el cuestionario ISAT. Faltan preguntas de relaciones, bienestar o adaptación académica.');
    const students=[],ids=new Set(),warnings={unresolved:0,crossClass:0,self:0,categories:0};
    const val=(r,k)=>cols[k]<0?null:answer(r[cols[k]]);
    table.slice(1).forEach((r,i)=>{
      if(!Array.isArray(r)||r.every(v=>text(v)===null))return;
      const id=text(r[cols.id]);if(!id)throw Error('La fila '+(i+2)+' no tiene código de estudiante.');
      if(ids.has(id))throw Error('Hay códigos de estudiante duplicados: '+id+'.');ids.add(id);
      const course=text(r[cols.course]),group=text(r[cols.group]);if(!course||!group)throw Error('Falta Curso o Grupo en la fila '+(i+2)+'.');
      const s={id,alias:cols.alias<0?null:text(r[cols.alias]),name:cols.name<0?null:text(r[cols.name]),course,group,study:cols.study<0?'Estudio':text(r[cols.study])||'Estudio',
        status:val(r,'end')!==null||(cols.end>=0&&text(r[cols.end])!==null)?'Completado':cols.start>=0&&text(r[cols.start])!==null?'En curso':'Sin iniciar',responses:{},story:val(r,'story'),raw:{}};
      for(const field of Object.keys(FIELDS)){
        const value=val(r,field);
        s.responses[field]=['uce','difficulty','siblings'].includes(field)?yesNo(value)??value:value;
        if(field==='dropout'&&value!==null)s.responses[field]=value.replace(/^S\uFFFD(?=,|\s|$)/,'Sí');
      }
      const personal=val(r,'personal');if(personal&&personal!==s.story)s.story=[s.story,personal].filter(Boolean).join('\n\n');
      const route=norm(val(r,'route'));s.raw.relations=route==='impar'?val(r,'r2'):route==='par'?val(r,'r1'):val(r,'r1')??val(r,'r2');
      s.raw.predictions=route==='impar'?val(r,'p2'):route==='par'?val(r,'p1'):val(r,'p1')??val(r,'p2');
      for(const k of ['popular','central','known','others','help'])s.raw[k]=val(r,k);
      s.helpReached=cols.helpEvent>=0&&text(r[cols.helpEvent])!==null;
      s.lastDate=cols.end>=0&&text(r[cols.end])?text(r[cols.end]).slice(0,10):null;
      students.push(s);
    });
    if(!students.length)throw Error('La hoja no contiene estudiantes.');
    const aliases=new Map(students.map(s=>[s.id,s]));
    for(const s of students)if(s.alias){if(aliases.has(s.alias)&&aliases.get(s.alias)!==s)throw Error('Un identificador coincide con dos estudiantes distintos.');aliases.set(s.alias,s);}
    const emptyValue=v=>['ninguno','ninguna','nadie','sin nominaciones','ningun compañero','ningun companero'].includes(norm(v));
    function nominations(value,owner,ratings=false){
      if(value===null)return null;if(emptyValue(value))return [];
      const result=[],seen=new Set();
      for(const token of split(value)){
        let code=token,rating=1,label=null;
        if(ratings){const m=token.match(/^(.+?)\s*\(([^()]*)\)$/);if(!m){warnings.categories++;continue;}code=m[1].trim();label=m[2].trim();const n=norm(label);rating=/^(muy )?buena relaci/.test(n)?1:/^(muy )?mala relaci/.test(n)?-1:/^(normal|regular|neutra)/.test(n)?0:null;if(rating===null){warnings.categories++;continue;}}
        const target=aliases.get(code);
        if(!target){warnings.unresolved++;continue;}
        if(target.id===owner.id){warnings.self++;continue;}
        if(seen.has(target.id))continue;seen.add(target.id);
        const sameClass=groupKey(target)===groupKey(owner);if(!sameClass)warnings.crossClass++;
        result.push({id:target.id,rating,label,sameClass});
      }
      // An unrecognized nonempty list is missing data, never zero nominations.
      return result.length?result:null;
    }
    for(const s of students){
      s.relations=nominations(s.raw.relations,s,true);s.predictions=nominations(s.raw.predictions,s,true);
      s.popularChoice=nominations(s.raw.popular,s);s.connectorChoice=nominations(s.raw.central,s);s.contacts=nominations(s.raw.known,s);s.help=nominations(s.raw.help,s);
      // This measures whether a person was selected, not a diagnosis.
      if(s.raw.help===null&&s.helpReached)s.help=[];
      s.outsideCount=s.raw.others===null?null:emptyValue(s.raw.others)?0:split(s.raw.others).length;
      s.hasSupport=s.help===null?null:s.help.length>0;
      s.friends=s.relations===null?null:s.relations.filter(x=>x.rating>0&&x.sameClass);
      s.rejections=s.relations===null?null:s.relations.filter(x=>x.rating<0&&x.sameClass);
    }
    const groups=[...new Set(students.map(groupKey))].map(key=>{
      const rows=students.filter(s=>groupKey(s)===key),first=rows[0];
      for(const s of rows){
        const peers=rows.filter(x=>x!==s),relationsKnown=peers.filter(x=>x.relations!==null);
        const incoming=rating=>relationsKnown.filter(x=>x.relations.some(t=>t.id===s.id&&t.sameClass&&t.rating===rating));
        const incomingFriends=incoming(1),incomingRejections=incoming(-1);
        const reciprocal=list=>list===null?null:list.filter(t=>rows.find(x=>x.id===t.id)?.relations?.some(z=>z.id===s.id&&z.rating===t.rating));
        s.metrics={friendsReceived:relationsKnown.length?incomingFriends.length:null,friendsDeclared:s.friends?.length??null,rejectionsReceived:relationsKnown.length?incomingRejections.length:null,rejectionsDeclared:s.rejections?.length??null,
          friendsMutual:reciprocal(s.friends)?.length??null,rejectionsMutual:reciprocal(s.rejections)?.length??null,relationsCoverage:relationsKnown.length,peers:peers.length,
          popularVotes:peers.some(x=>x.popularChoice!==null)?peers.filter(x=>x.popularChoice?.some(t=>t.id===s.id)).length:null,
          connectorVotes:peers.some(x=>x.connectorChoice!==null)?peers.filter(x=>x.connectorChoice?.some(t=>t.id===s.id)).length:null,
          helpVotes:peers.some(x=>x.help!==null)?peers.filter(x=>x.help?.some(t=>t.id===s.id)).length:null};
        for(const [kind,rate] of [['friend',1],['rejection',-1]]){
          const p=s.predictions?.filter(t=>t.sameClass&&t.rating===rate)??null;
          const evaluable=p?.filter(t=>rows.find(x=>x.id===t.id)?.relations!==null)??null;
          const correct=evaluable?.length?evaluable.filter(t=>rows.find(x=>x.id===t.id).relations.some(z=>z.id===s.id&&z.rating===rate)).length:null;
          s.metrics[kind+'Predictions']=p?.length??null;s.metrics[kind+'Evaluable']=evaluable?.length??null;s.metrics[kind+'Correct']=correct;
        }
        const mutualKnown=peers.every(x=>x.relations!==null);
        s.metrics.mutualComplete=mutualKnown;
      }
      return {key,study:first.study,course:first.course,group:first.group,rows};
    }).sort((a,b)=>a.course.localeCompare(b.course,'es',{numeric:true})||a.group.localeCompare(b.group,'es'));
    return {students,groups,warnings};
  }
  function summary(rows){
    const n=rows.length;
    const rate=(getter,predicate)=>{const values=rows.map(getter).filter(v=>v!==null&&v!==undefined);const count=values.length?values.filter(predicate).length:null;return {count,denominator:values.length,percent:values.length?100*count/values.length:null};};
    const categorical=(field,multi=false)=>{
      const valid=rows.map(s=>s.responses[field]).filter(v=>v!==null),counts=new Map();
      for(const v of valid)for(const item of multi?split(v):[v]){const clean=norm(item);const found=[...counts.keys()].find(k=>norm(k)===clean);const key=found||item;counts.set(key,(counts.get(key)||0)+1);}
      return {denominator:valid.length,items:[...counts].map(([label,count])=>({label,count,percent:100*count/valid.length})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es'))};
    };
    const relationRows=rows.filter(s=>s.relations!==null),peerSlots=relationRows.length*(n-1);
    const rejectionCount=relationRows.length?relationRows.reduce((sum,s)=>sum+s.rejections.length,0):null;
    return {n,completed:rows.filter(s=>s.status==='Completado').length,started:rows.filter(s=>s.status==='En curso').length,notStarted:rows.filter(s=>s.status==='Sin iniciar').length,relationCoverage:relationRows.length,
      loneliness:rate(s=>frequency(s.responses.alone),v=>v>=3),difficulty:rate(s=>yesNo(s.responses.difficulty),v=>v==='Sí'),
      dropout:rate(s=>s.responses.dropout===null?null:norm(s.responses.dropout),v=>/^s[i\uFFFD],/.test(v)),
      support:rate(s=>s.hasSupport,v=>v===true),time:rate(s=>s.responses.time===null?null:norm(s.responses.time),v=>['mal','muy mal'].includes(v)),
      workload:rate(s=>s.responses.workload===null?null:norm(s.responses.workload),v=>['alta','muy alta'].includes(v)),
      rejection:{count:rejectionCount,denominator:peerSlots,percent:peerSlots?100*rejectionCount/peerSlots:null,unit:'elecciones posibles'},
      distributions:Object.fromEntries(['alone','fun','general','uce','time','activities','workload','difficulty','subjectReasons','dropout','dropoutReasons','siblings','position'].map(f=>[f,categorical(f,['activities','subjectReasons','dropoutReasons'].includes(f))]))};
  }
  return Object.freeze({parseTable,summary,answer,text,norm,yesNo,frequency,escape,ratio,groupKey,FIELDS});
});
