// Demo de aceptación S7 (contratos): cotización aceptada → contrato → pagos a caja → firma → estados de obra.
const BASE = 'http://localhost:3000/api';
const api = async (m, ruta, token, body) => {
  const r = await fetch(BASE + ruta, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
};
const soles = (c) => 'S/ ' + (c / 100).toFixed(2);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

// Caja abierta para que el pago del contrato entre al día.
if (!(await api('GET', '/caja/actual', token)).json.abierta) {
  await api('POST', '/caja/abrir', token, { montoInicialCentimos: 30000 });
}

console.log('=== 1. Crear cotización (corrediza + fijo) ===');
const cot = (await api('POST', '/cotizaciones', token, {
  items: [
    { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: '7750001', color: 'natural', anchoCm: 150, altoCm: 120, cantidad: 1 },
    { vanoCodigo: 'V-02', modelo: 'fijo', vidrioCodigo: '7750006', color: 'natural', anchoCm: 80, altoCm: 60, cantidad: 2 },
  ],
})).json;
const det = (await api('GET', `/cotizaciones/${cot.id}`, token)).json;
console.log(`  ${cot.numero} en ${det.estado} · total ${soles(det.totalCentimos)}`);

console.log('=== 2. Contrato desde BORRADOR → debe rechazarse ===');
const intento = await api('POST', '/contratos', token, { cotizacionId: cot.id });
console.log(`  ${intento.json.mensaje}`);

console.log('=== 3. Aceptar la cotización y crear el contrato (adelanto 60%) ===');
await api('POST', `/cotizaciones/${cot.id}/estado`, token, { estado: 'ENVIADA' });
await api('POST', `/cotizaciones/${cot.id}/estado`, token, { estado: 'ACEPTADA' });
const ct = (await api('POST', '/contratos', token, { cotizacionId: cot.id })).json;
let dct = (await api('GET', `/contratos/${ct.id}`, token)).json;
console.log(`  ${ct.numero} · total ${soles(dct.totalCentimos)} · adelanto ${soles(dct.adelantoCentimos)} · saldo ${soles(dct.saldoCentimos)}`);

console.log('=== 4. Contrato duplicado → debe rechazarse ===');
const dup = await api('POST', '/contratos', token, { cotizacionId: cot.id });
console.log(`  ${dup.json.mensaje}`);

console.log('=== 5. Pagar el adelanto (efectivo) → entra a caja vía outbox ===');
const pago = (await api('POST', `/contratos/${ct.id}/pagos`, token, { montoCentimos: dct.adelantoCentimos, metodo: 'EFECTIVO' })).json;
console.log(`  Pagado ${soles(pago.pagadoCentimos)} · saldo pendiente ${soles(pago.saldoPendienteCentimos)}`);
await dormir(4000);
const movs = (await api('GET', '/caja/actual/movimientos', token)).json;
const movContrato = movs.filter((m) => m.concepto.includes(ct.numero));
console.log(`  Caja del día: ${movContrato.length ? `INGRESO "${movContrato[0].concepto}" ${soles(movContrato[0].montoCentimos)}` : 'NO LLEGÓ'}`);

console.log('=== 6. Pago que excede el saldo → debe rechazarse ===');
const exceso = await api('POST', `/contratos/${ct.id}/pagos`, token, { montoCentimos: dct.saldoCentimos + 10_000, metodo: 'EFECTIVO' });
console.log(`  ${exceso.json.mensaje}`);

console.log('=== 7. Guardar la firma capturada en pantalla ===');
await api('POST', `/contratos/${ct.id}/firma`, token, { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg' });
dct = (await api('GET', `/contratos/${ct.id}`, token)).json;
console.log(`  tieneFirma = ${dct.tieneFirma}`);

console.log('=== 8. Máquina de estados de la obra ===');
const cli = (await api('POST', '/clientes', token, { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Cliente Estados' })).json;
const obra = (await api('POST', '/obras', token, { clienteId: cli.id, direccion: 'Av. Prueba 100' })).json;
const salto = await api('POST', `/obras/${obra.id}/estado`, token, { estado: 'CORTE' });
console.log(`  MEDICION → CORTE directo: ${salto.json.mensaje}`);
await api('POST', `/obras/${obra.id}/estado`, token, { estado: 'REMETREO' });
const aCorte = (await api('POST', `/obras/${obra.id}/estado`, token, { estado: 'CORTE' })).json;
console.log(`  MEDICION → REMETREO → ${aCorte.estado} ✓ (una etapa a la vez)`);
