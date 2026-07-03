// Demo de aceptación S4 (contra la API viva): emisión SUNAT, contingencia, rechazo y anulación.
// Uso: node scripts/demo-facturacion.mjs
const BASE = 'http://localhost:3000/api';

async function pedir(metodo, ruta, token, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}
const login = async (u) => (await pedir('POST', '/auth/login', null, { usuario: u, password: 'galaxi123' })).json.token;
const S = (c) => 'S/ ' + (c / 100).toFixed(2);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarResuelto(token, id, intentos = 10) {
  for (let i = 0; i < intentos; i++) {
    const c = (await pedir('GET', `/facturacion/comprobantes/${id}`, token)).json;
    if (c.estado !== 'PENDIENTE') return c;
    await dormir(800);
  }
  return (await pedir('GET', `/facturacion/comprobantes/${id}`, token)).json;
}

const rosa = await login('rosa');
const gerente = await login('gerente');

// Caja abierta (idempotente: si ya hay una, seguimos).
await pedir('POST', '/caja/abrir', rosa, { montoInicialCentimos: 30000 });

async function venta(items, total) {
  const r = await pedir('POST', '/ventas', rosa, { items, metodoPago: 'EFECTIVO' });
  return r.json.id ?? null;
}

console.log('=== 1. Venta S/14 → BOLETA público general (< S/700) ===');
const vA = await venta([{ codigo: '7752001', cantidad: 4 }]);
let bA = (await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vA, tipo: 'BOLETA', cliente: { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Público general' } })).json;
console.log(`  ${bA.numero} ${bA.estado} · total ${bA.total} (gravada ${bA.gravada} + IGV ${bA.igv})`);
bA = await esperarResuelto(rosa, bA.id);
console.log(`  → tras el worker: ${bA.estado}${bA.enlacePdf ? ' · PDF ' + bA.enlacePdf : ''}`);

console.log('=== 2. Venta S/750 → BOLETA SIN DNI (debe rechazar la regla del límite) ===');
const vB = await venta([{ codigo: '7750003', cantidad: 1, anchoCm: 250, altoCm: 250 }]);
const sinDni = await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vB, tipo: 'BOLETA', cliente: { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Público general' } });
console.log(`  ${sinDni.json.mensaje}`);

console.log('=== 3. Misma venta → BOLETA con DNI → ACEPTADO ===');
let bB = (await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vB, tipo: 'BOLETA', cliente: { tipoDoc: 'DNI', numeroDoc: '41222333', nombre: 'GARCÍA FLORES, ANA' } })).json;
bB = await esperarResuelto(rosa, bB.id);
console.log(`  ${bB.numero} ${bB.estado} · ${bB.cliente} (DNI ${bB.documento}) · total ${bB.total}`);

console.log('=== 4. Venta → FACTURA con RUC → ACEPTADO ===');
const vC = await venta([{ codigo: '7752001', cantidad: 2 }]);
let fC = (await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vC, tipo: 'FACTURA', cliente: { tipoDoc: 'RUC', numeroDoc: '20123456789', nombre: 'INMOBILIARIA ANDES SAC' } })).json;
fC = await esperarResuelto(rosa, fC.id);
console.log(`  ${fC.numero} ${fC.estado} · ${fC.cliente} (RUC ${fC.documento})`);

console.log('=== 5. CONTINGENCIA: PSE caído → boleta queda PENDIENTE ===');
await pedir('POST', '/facturacion/_dev/pse', gerente, { caido: true });
const vD = await venta([{ codigo: '7752001', cantidad: 1 }]);
let bD = (await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vD, tipo: 'BOLETA', cliente: { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Público general' } })).json;
console.log(`  ${bD.numero} emitido como ${bD.estado} (la venta NO se detuvo)`);
await dormir(2500);
bD = (await pedir('GET', `/facturacion/comprobantes/${bD.id}`, rosa)).json;
console.log(`  Tras intentos con PSE caído: sigue ${bD.estado}`);
console.log('  → el PSE se recupera; reintentar...');
await pedir('POST', '/facturacion/_dev/pse', gerente, { caido: false });
await pedir('POST', `/facturacion/comprobantes/${bD.id}/reintentar`, rosa);
bD = await esperarResuelto(rosa, bD.id);
console.log(`  ${bD.numero} ahora ${bD.estado} ✓`);

console.log('=== 6. RECHAZO de SUNAT: cliente con documento no habido (00000000) ===');
const vE = await venta([{ codigo: '7752001', cantidad: 1 }]);
let bE = (await pedir('POST', '/facturacion/emitir', rosa, { ventaId: vE, tipo: 'BOLETA', cliente: { tipoDoc: 'DNI', numeroDoc: '00000000', nombre: 'DOC OBSERVADO' } })).json;
bE = await esperarResuelto(rosa, bE.id);
console.log(`  ${bE.numero} ${bE.estado} — ${bE.motivoRechazo}`);

console.log('=== 7. ANULAR la boleta de la venta 1 (nota de crédito, solo gerente) ===');
const anul = await pedir('POST', `/facturacion/comprobantes/${bA.id}/anular`, gerente, { motivo: 'Devolución del cliente' });
console.log(`  Nota de crédito ${anul.json.numero} (${anul.json.estado}) emitida; la boleta original queda ANULADA`);
const bAfinal = (await pedir('GET', `/facturacion/comprobantes/${bA.id}`, rosa)).json;
console.log(`  ${bA.numero} → ${bAfinal.estado}`);

console.log('=== 8. Listado final de comprobantes ===');
const lista = (await pedir('GET', '/facturacion/comprobantes', gerente)).json;
for (const c of lista.slice(0, 8)) console.log(`  ${c.numero.padEnd(12)} ${c.tipo.padEnd(13)} ${c.estado.padEnd(10)} ${S(Math.round(c.total * 100))} · ${c.cliente}`);
