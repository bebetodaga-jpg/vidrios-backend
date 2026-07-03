// Demo de aceptación S8–S9 ★: orden de corte por cola (retazos primero), cubicación, compras → kárdex.
const BASE = 'http://localhost:3000/api';
const api = async (m, ruta, token, body) => {
  const r = await fetch(BASE + ruta, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, json: await r.json().catch(() => ({})) };
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

const aceptar = async (id) => {
  await api('POST', `/cotizaciones/${id}/estado`, token, { estado: 'ENVIADA' });
  await api('POST', `/cotizaciones/${id}/estado`, token, { estado: 'ACEPTADA' });
};

console.log('=== 1. Cotización para corte: corrediza crudo 150×120 + fijo catedral 80×60 ===');
const cot = (await api('POST', '/cotizaciones', token, {
  items: [
    { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: '7750001', color: 'natural', anchoCm: 150, altoCm: 120, cantidad: 1 },
    { vanoCodigo: 'V-02', modelo: 'fijo', vidrioCodigo: '7750005', color: 'natural', anchoCm: 80, altoCm: 60, cantidad: 1 },
  ],
})).json;
console.log(`  ${cot.numero}`);

console.log('=== 2. Orden de corte sobre BORRADOR → rechazada ===');
const noAceptada = await api('POST', '/produccion/ordenes-corte', token, { cotizacionId: cot.id });
console.log(`  ${noAceptada.json.mensaje}`);

await aceptar(cot.id);
console.log('=== 3. Generar orden de corte (va a la COLA, respuesta inmediata) ===');
const odc = (await api('POST', '/produccion/ordenes-corte', token, { cotizacionId: cot.id })).json;
let det = (await api('GET', `/produccion/ordenes-corte/${odc.id}`, token)).json;
console.log(`  ${odc.numero} creada en estado ${det.estado}`);
for (let i = 0; i < 10 && det.estado === 'PENDIENTE'; i++) {
  await dormir(800);
  det = (await api('GET', `/produccion/ordenes-corte/${odc.id}`, token)).json;
}
console.log(`  → tras el worker: ${det.estado}`);
for (const v of det.resultado.vidrios) {
  console.log(`  ${v.vidrioNombre}: ${v.plan.planchasNuevas} plancha(s) nueva(s) · retazos usados [${v.plan.retazosUsados.join(', ') || '—'}] · retazos creados [${v.retazosCreados.join(', ') || '—'}] · desperdicio ${v.plan.desperdicioPct}%`);
  const l = v.plan.laminas[0];
  console.log(`    ${l.origen} ${l.anchoCm}×${l.altoCm}: ${l.colocaciones.map((c) => `${c.anchoCm}×${c.altoCm}@(${c.x},${c.y})${c.rotado ? 'R' : ''}`).join(' · ')}`);
}
console.log(`  Perfiles: ${det.resultado.perfiles.totalBarras} barrilla(s) de 6 m · desperdicio ${det.resultado.perfiles.desperdicioPct}%`);

console.log('=== 4. Cubicación de una obra grande (espejo, para forzar faltante) ===');
const grande = (await api('POST', '/cotizaciones', token, {
  items: [{ vanoCodigo: 'V-01', modelo: 'fijo', vidrioCodigo: '7750006', color: 'natural', anchoCm: 170, altoCm: 170, cantidad: 13 }],
})).json;
await aceptar(grande.id);
const cub = (await api('GET', `/produccion/cubicacion/${grande.id}`, token)).json;
const esp = cub.vidrios[0];
console.log(`  ${esp.nombre}: ${esp.m2} m² → ${esp.planchasEstimadas} planchas · stock ${esp.stockPlanchas} · FALTAN ${esp.faltantePlanchas}`);
console.log(`  Perfiles: ${cub.perfiles.map((p) => `${p.nombre} ${p.metrosLineales} m (${p.barrillasEstimadas} brr)`).join(' · ')}`);

console.log('=== 5. Orden de compra por el faltante → recibir → ENTRADA al kárdex (outbox) ===');
const oc = (await api('POST', '/produccion/ordenes-compra', token, {
  items: [{ codigo: esp.codigo, nombre: esp.nombre, cantidad: esp.faltantePlanchas }],
})).json;
console.log(`  ${oc.numero} creada (PENDIENTE)`);
const rec = (await api('POST', `/produccion/ordenes-compra/${oc.id}/recibir`, token, { costos: [{ codigo: esp.codigo, costoCentimos: 4000 }] })).json;
console.log(`  ${rec.numero} RECIBIDA — esperando outbox…`);
await dormir(4000);
const kardex = (await api('GET', `/inventario/kardex/${esp.codigo}`, token)).json;
const ultima = kardex.at(-1);
console.log(`  Kárdex ${esp.codigo}: ${ultima.tipo} "${ultima.referencia}" +${ultima.cantidad} → saldo ${ultima.saldo}`);

console.log('=== 6. Recibir dos veces la misma OC → rechazada ===');
const dosVeces = await api('POST', `/produccion/ordenes-compra/${oc.id}/recibir`, token, { costos: [{ codigo: esp.codigo, costoCentimos: 4000 }] });
console.log(`  ${dosVeces.json.mensaje}`);
