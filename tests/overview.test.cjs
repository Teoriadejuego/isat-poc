const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const { createApp } = require('./helpers/app-harness.cjs');
const { headers, row, log } = require('./helpers/fixture.cjs');
function data() {
  return [headers, ...[
    {'Usuario Id':'A1', Curso:'A', uce:log('Sí'), redes1:log('A2 (Mala relación) | B1 (Mala relación)'), alone:log('Nunca'), fun:log('Siempre'), general:log('Siempre'), abandono:log('Sí, alguna vez'), end:log('')},
    {'Usuario Id':'A2', Curso:'A', uce:log('No'), redes1:log('A1 (Buena relación)'), alone:log('Siempre'), fun:log('Nunca'), general:log('Nunca'), abandono:log('No')},
    {'Usuario Id':'B1', Curso:'B', uce:log('No'), redes1:log('B2 (Buena relación)'), alone:log('Nunca'), fun:log('Siempre'), general:log('Siempre'), abandono:log('No')},
    {'Usuario Id':'B2', Curso:'B', redes1:log('B1 (Normal)'), alone:log('Siempre')},
  ].map(v => row({Estudio:'Sevilla', Grupo:'1',dia:log('Par'), ...v}))];
}
test('resumen usa vínculos internos dirigidos, excluye neutros y bienestar exige tres respuestas', () => {
  const m = C.parseTable(data()), a = C.overviewSummary(m.students);
  assert.deepEqual(a.negativeLinks, {count:1, denominator:3, percent:100/3});
  assert.equal(a.wellbeing.denominator, 3);
  assert.ok(Math.abs(a.wellbeing.mean - 20/3) < 1e-10);
  assert.equal(a.dropout.denominator, 3);
  assert.equal(a.dropout.count, 1);
  const empty = C.overviewSummary([]);
  assert.equal(empty.wellbeing.mean, null);
  assert.equal(empty.negativeLinks.percent, null);
});
test('universidad ordena por los seis indicadores y abre la única ficha de grupo',async t=>{
 const app=createApp(t);await app.load(data());app.get('tab-university').click();
 assert.equal(app.get('class-field').hidden,true);
 assert.equal(app.get('report').querySelectorAll('[data-focus-metric]').length,6);
 const select=app.get('report').querySelector('[data-overview-sort]');select.value='ownHelp';
 select.dispatchEvent(new app.window.Event('change',{bubbles:true}));
 const cards=[...app.get('report').querySelectorAll('[data-summary-group]')];
 assert.match(cards[0].textContent,/A/);cards[1].querySelector('button').click();
 assert.equal(app.get('tab-group').getAttribute('aria-selected'),'true');
 assert.equal(app.get('tab-overview'),null);
 app.get('report').querySelector('[data-open-list]').click();
 assert.equal(app.get('tab-list').getAttribute('aria-selected'),'true');
 app.get('clear').click();await app.load([headers,row({'Usuario Id':'N1',Curso:'Nuevo',Estudio:'Otro',Grupo:'1'})]);
 app.get('tab-university').click();assert.doesNotMatch(app.get('report').textContent,/Sevilla/);
 assert.match(app.get('report').textContent,/Nuevo/);
});
