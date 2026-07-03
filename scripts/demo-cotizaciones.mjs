// Demo de aceptación S6 ★ (cotizaciones): modelos, precio al instante, multi-ítem, estados.
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

const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

console.log('=== 1. Modelos disponibles ===');
const m = (await api('GET', '/cotizaciones/modelos', token)).json;
console.log(`  ${m.modelos.length} modelos: ${m.modelos.map((x) => x.clave).join(', ')}`);
console.log(`  ${m.colores.length} colores de aluminio`);

console.log('=== 2. Precio al instante: corrediza 150×120, crudo 6mm, natural ===');
const item = (await api('POST', '/cotizaciones/cotizar-item', token, { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: '7750001', color: 'natural', anchoCm: 150, altoCm: 120, cantidad: 1 })).json;
console.log(`  ${soles(item.totalCentimos)} · ${item.metrosLinealesAluminio} m aluminio · ${item.m2Vidrio} m² vidrio`);
console.log(`  Paño con descuento de fabricación: ${item.despiece.panos[0].anchoCm}×${item.despiece.panos[0].altoCm} cm`);

console.log('=== 3. Mampara con crudo → rechazo de seguridad (exige templado) ===');
const mal = await api('POST', '/cotizaciones/cotizar-item', token, { vanoCodigo: 'V-02', modelo: 'mampara', vidrioCodigo: '7750001', color: 'natural', anchoCm: 240, altoCm: 210, cantidad: 1 });
console.log(`  ${mal.json.mensaje}`);

console.log('=== 4. Crear cotización multi-ítem (corrediza + mampara templada) ===');
const cot = (await api('POST', '/cotizaciones', token, {
  items: [
    { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: '7750001', color: 'natural', anchoCm: 150, altoCm: 120, cantidad: 2 },
    { vanoCodigo: 'V-02', modelo: 'mampara', vidrioCodigo: '7750003', color: 'negro', anchoCm: 240, altoCm: 210, cantidad: 1 },
  ],
})).json;
console.log(`  ${cot.numero} creada`);
const det = (await api('GET', `/cotizaciones/${cot.id}`, token)).json;
console.log(`  Estado ${det.estado} · ${det.itemsDetalle.length} ítems · TOTAL ${soles(det.totalCentimos)}`);
for (const it of det.itemsDetalle) console.log(`    ${it.vanoCodigo} ${it.modelo} ×${it.cantidad} → ${soles(it.totalCentimos)}`);

console.log('=== 5. Máquina de estados: borrador → enviada → aceptada ===');
await api('POST', `/cotizaciones/${cot.id}/estado`, token, { estado: 'ENVIADA' });
await api('POST', `/cotizaciones/${cot.id}/estado`, token, { estado: 'ACEPTADA' });
const final = (await api('GET', `/cotizaciones/${cot.id}`, token)).json;
console.log(`  Estado final: ${final.estado}`);
console.log('=== 6. Transición inválida (aceptada → enviada) ===');
const inv = await api('POST', `/cotizaciones/${cot.id}/estado`, token, { estado: 'ENVIADA' });
console.log(`  ${inv.json.mensaje}`);
