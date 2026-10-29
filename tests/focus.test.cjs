const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),N=require('../src/communities.js');
const {headers,row,log}=require('./helpers/fixture.cjs');
const {createApp}=require('./helpers/app-harness.cjs');
const table=records=>[headers,...records.map(r=>row({Estudio:'Centro',Curso:'Curso',Grupo:'A',dia:log('Par'),...r}))];
test('los seis indicadores distinguen abandono actual, felicidad menor de cinco y selección vacía confirmada',()=>{
 const m=C.parseTable(table([
  {'Usuario Id':'A',redes1:log(''),alone:log('Siempre'),fun:log('Nunca'),general:log('Nunca'),uce:log('Sí'),abandono:log('Sí, lo estoy considerando actualmente')},
  {'Usuario Id':'B',redes1:log('A (Mala relación)'),alone:log('Algunas veces'),fun:log('Algunas veces'),general:log('Algunas veces'),ayuda:log('A'),abandono:log('Sí, alguna vez')},
  {'Usuario Id':'C',redes1:log('A (Muy mala relación)'),ayuda:log('A')},
  {'Usuario Id':'D',redes1:log('respuesta ilegible'),alone:log('Nunca')},
  {'Usuario Id':'E'},
 ]));
 const [a,b,c,d,e]=m.students;
 assert.equal(a.focus.ownHelp,true);assert.equal(a.focus.peerHelp,true);
 assert.equal(a.focus.imminent,true);assert.equal(b.focus.imminent,false);
 assert.equal(a.focus.happiness,0);assert.equal(b.focus.happiness,5);
 assert.equal(a.focus.lowHappiness,true);assert.equal(b.focus.lowHappiness,false);
 assert.equal(a.focus.noFriends,true);assert.equal(d.focus.noFriends,null);assert.equal(e.focus.noFriends,null);
 assert.equal(a.focus.negativeBalance,true);assert.equal(a.focus.receivedNegative,2);
 assert.equal(c.focus.peerHelp,false);
 assert.equal(C.focusSummary(m.students).lowHappiness.denominator,2);
 assert.equal(C.indicatorMatches(a,'imminent'),true);
});
function coveredTable(){return table([
 ...Array.from({length:5},(_,i)=>({'Usuario Id':`A${i}`,redes1:i<3?log(`A${i+1} (Buena relación)`):null})),
 ...Array.from({length:5},(_,i)=>({'Usuario Id':`B${i}`,Grupo:'B',redes1:i<2?log(`B${i+1} (Buena relación)`):null})),
 ]);}
test('cobertura cuenta personas únicas con in o out, admite exactamente ochenta y oculta las de sesenta',async t=>{
 const m=C.parseTable(coveredTable());
 assert.equal(C.linkCoverage(m.groups[0].rows).percent,80);
 assert.equal(C.linkCoverage(m.groups[0].rows).eligible,true);
 assert.equal(C.linkCoverage(m.groups[1].rows).percent,60);
 const app=createApp(t,{coverageFilter:true});await app.load(coveredTable());
 assert.equal(app.get('coverage-filter').checked,true);
 assert.equal(app.get('class').options.length,1);
 assert.equal(app.get('tab-overview'),null);
 app.get('tab-university').click();
 assert.equal(app.get('report').querySelectorAll('[data-summary-group]').length,1);
 assert.match(app.get('report').textContent,/5 estudiantes · 1 grupos visibles/);
 app.get('report').querySelector('[data-overview-group]').click();
 assert.equal(app.get('tab-group').getAttribute('aria-selected'),'true');
 assert.equal(app.get('report').querySelectorAll('[data-focus-metric]').length,6);
 app.get('coverage-filter').checked=false;app.get('coverage-filter').dispatchEvent(new app.window.Event('change'));
 assert.equal(app.get('class').options.length,2);
});
test('un archivo sin grupos elegibles no revela sus clases y no bloquea el resumen',async t=>{
 const app=createApp(t,{coverageFilter:true});await app.load(table([{'Usuario Id':'X'}]));
 assert.equal(app.get('class').options.length,0);
 assert.match(app.get('report').textContent,/No hay grupos con esta cobertura/);
 app.get('tab-university').click();assert.match(app.get('report').textContent,/0 estudiantes/);
});
test('comunidades usan positivos, conservan aislados y agregan negativos intra, entre y de otras clases',()=>{
 const records=Array.from({length:9},(_,i)=>({'Usuario Id':`P${i}`,Grupo:i===8?'B':'A',redes1:i<8?log(Array.from({length:8},(_,j)=>j!==i&&Math.floor(i/4)===Math.floor(j/4)?`P${j} (Buena relación)`:null).filter(Boolean).join(' | ')):null}));
 records[0].redes1+= ' | P4 (Mala relación)';records[8].redes1=log('P0 (Mala relación)');
 const m=C.parseTable(table(records)),before=JSON.stringify(m),g=m.groups.find(g=>g.group==='A');
 const a=N.build(g.rows,m.students);
 assert.equal(a.communities.length,2);assert.deepEqual(a.communities.map(c=>c.ids.length),[4,4]);
 assert.equal(a.between,1);assert.equal(a.external,1);assert.equal(a.internal,0);
 assert.equal(JSON.stringify(m),before);
 assert.match(N.view(g.rows,m.students),/Otras clases/);
 const isolated=N.build([m.students[8]],m.students);assert.equal(isolated.communities.length,0);assert.equal(isolated.unassigned,1);
});
