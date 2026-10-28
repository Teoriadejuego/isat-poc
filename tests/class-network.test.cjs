const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../src/ego-network.js');
const {createApp}=require('./helpers/app-harness.cjs');
const {fixture}=require('./helpers/fixture.cjs');
function sample(){return [
 {id:'A',course:'Clase',group:'A',study:'Centro',relations:[{id:'B',rating:1,label:'Muy buena relación'},{id:'C',rating:-1,label:'Mala relación'},{id:'X',rating:1,label:'Buena relación'}]},
 {id:'B',course:'Clase',group:'A',study:'Centro',relations:[{id:'A',rating:1,label:'Buena relación'}]},
 {id:'C',course:'Clase',group:'A',study:'Centro',relations:null},
 {id:'Z',course:'Clase',group:'A',study:'Centro',relations:[]},
 {id:'X',course:'Otra',group:'B',study:'Centro',relations:[{id:'A',rating:-1,label:'Muy mala relación'}]},
 ];}
test('red de clase: vínculos dirigidos reales, mutuos, externos y nodos sin datos',()=>{
 const all=sample(),rows=all.slice(0,4),net=N.classBuild(rows,all);
 assert.equal(net.nodes.length,4);assert.equal(net.edges.length,3);assert.equal(net.linked,3);
 const positive=N.classBuild(rows,all,{kind:'positive'});assert.equal(positive.edges.length,2);
 const negative=N.classBuild(rows,all,{kind:'negative'});assert.equal(negative.edges.length,1);
 const mutual=N.classBuild(rows,all,{kind:'mutual',external:true});assert.equal(mutual.edges.length,2);
 assert.ok(mutual.edges.every(e=>e.rating===1));
 const external=N.classBuild(rows,all,{external:true});assert.equal(external.nodes.length,5);assert.equal(external.edges.length,5);
 assert.equal(external.edges.find(e=>e.from==='X').intensity,2);
 assert.equal(external.linked,3);
});
test('red de clase vacía y ampliada no inventa vínculos ni coordenadas inválidas',()=>{
 for(const rows of [[],[sample()[3]],sample()]){
  const g=N.classBuild(rows,rows);for(const layout of ['circle','links'])assert.doesNotMatch(N.classSvg(g,layout),/NaN|Infinity/);
 }
 assert.match(N.classBody([sample()[3]],[sample()[3]]),/No hay vínculos registrados/);
});
test('filtros de clase actualizan solo la red y un nodo abre su ficha',async t=>{
 const app=createApp(t);await app.load(fixture());
 const panel=app.window.document.querySelector('.class-network');assert.ok(panel);
 const kind=panel.querySelector('[data-class-network="kind"]');kind.value='negative';kind.dispatchEvent(new app.window.Event('change',{bubbles:true}));
 assert.equal(panel.querySelectorAll('.ego-positive').length,0);
 assert.equal(panel.querySelector('[data-ego-zoom-label]').textContent,'Ajustado');
 const link=panel.querySelector('[data-network-student]');const id=link.dataset.networkStudent;link.dispatchEvent(new app.window.MouseEvent('click',{bubbles:true}));
 assert.equal(app.get('student').value,id);assert.equal(app.get('tab-student').getAttribute('aria-selected'),'true');
});
test('recibidas y declaradas se distinguen en las etiquetas de recuentos',async t=>{
 const app=createApp(t);await app.load(fixture());app.get('tab-student').click();
 const overview=app.window.document.querySelector('.student-overview');
 assert.match(overview.textContent,/Personas que le valoran positivamente/);
 assert.match(overview.textContent,/Personas que valora positivamente/);
 assert.match(overview.textContent,/Ha sentido soledad/);
});
