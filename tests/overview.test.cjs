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
test('universidad incluye todos los grupos, ordena y permite pasar al resumen y a los casos', async t => {
  const app = createApp(t);
  await app.load(data());
  app.get('tab-university').click();
  assert.equal(app.get('class-field').hidden, true);
  assert.equal(app.get('search-field').hidden, true);
  assert.match(app.get('report').textContent, /4 estudiantes · 2 grupos/);
  assert.equal(app.get('report').querySelectorAll('[data-care-scope]').length, 0);
  assert.equal(app.get('report').querySelectorAll('.snapshot-highlight').length, 0, 'no destaca grupos con bases de una o dos respuestas');
  let cards = [...app.get('report').querySelectorAll('[data-summary-group]')];
  assert.match(cards[0].textContent, /A/);
  const select = app.get('report').querySelector('[data-overview-sort]');
  select.closest('details').open = true;
  select.value = 'wellbeing';
  select.dispatchEvent(new app.window.Event('change', {bubbles:true}));
  assert.equal(app.get('report').querySelector('.snapshot-all-groups').open, true);
  cards = [...app.get('report').querySelectorAll('[data-summary-group]')];
  cards[1].querySelector('button').click();
  assert.equal(app.get('tab-overview').getAttribute('aria-selected'), 'true');
  assert.equal(app.get('class-field').hidden, false);
  assert.match(app.get('report').textContent, /El grupo y la universidad/);
  app.get('report').querySelector('[data-open-list]').click();
  assert.equal(app.get('tab-list').getAttribute('aria-selected'), 'true');
  assert.match(app.get('report').textContent, /B1/);
  app.get('clear').click();
  await app.load([headers, row({'Usuario Id':'N1', Curso:'Nuevo', Estudio:'Otro', Grupo:'1'})]);
  app.get('tab-university').click();
  assert.doesNotMatch(app.get('report').textContent, /Sevilla/);
  assert.match(app.get('report').textContent, /Nuevo/);
});
test('los destacados omiten el cien por cien de una sola respuesta y permiten consultar los grupos con base suficiente', async t => {
  const app = createApp(t);
  const table = [headers, ...Array.from({length:20}, (_,i) => row({
    'Usuario Id': `P${i}`, Estudio:'Centro', Curso:i < 10 ? 'Base suficiente' : 'Una respuesta', Grupo:'1',
    abandono:i < 10 ? log(i < 3 ? 'Sí, alguna vez' : 'No') : i === 10 ? log('Sí, alguna vez') : null,
  }))];
  await app.load(table);
  app.get('tab-university').click();
  const highlight = app.get('report').querySelector('.snapshot-highlight');
  assert.match(highlight.textContent, /Base suficiente/);
  assert.match(highlight.textContent, /30 %/);
  assert.match(highlight.textContent, /3 \/ 10 respuestas/);
  highlight.querySelector('button').click();
  assert.equal(app.get('tab-overview').getAttribute('aria-selected'), 'true');
  assert.match(app.get('report').textContent, /Base suficiente/);
});
