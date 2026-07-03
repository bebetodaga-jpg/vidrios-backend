// Demo de aceptación S2+S3 (se ejecuta contra la API viva): flujo completo de tienda.
// Uso: node scripts/demo-caja.mjs
const BASE = 'http://localhost:3000/api';

async function pedir(metodo, ruta, token, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const login = async (usuario) =>
  (await pedir('POST', '/auth/login', null, { usuario, password: 'galaxi123' })).json.token;

const S = (c) => 'S/ ' + (c / 100).toFixed(2);

const rosa = await login('rosa');
const gerente = await login('gerente');

// clienteId del seed
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const cliente = await prisma.cliente.findFirst();
await prisma.$disconnect();

console.log('=== 5. Venta Yape: 2 garruchas ===');
const v2 = await pedir('POST', '/ventas', rosa, { items: [{ codigo: '7752001', cantidad: 2 }], metodoPago: 'YAPE_PLIN' });
console.log(`${v2.json.numero} — ${S(v2.json.totalCentimos)}`);

console.log('=== 6. Egreso (cajera sola): compra silicona S/ 12 ===');
const eg = await pedir('POST', '/caja/movimientos', rosa, { tipo: 'EGRESO', metodo: 'EFECTIVO', concepto: 'Compra silicona ferretería', montoCentimos: 1200 });
console.log(eg.ok ? 'OK' : eg.json.mensaje);

console.log('=== 7. Venta al CRÉDITO: 10 garruchas a Juan Torres (15 días) ===');
const v3 = await pedir('POST', '/ventas', rosa, { items: [{ codigo: '7752001', cantidad: 10 }], metodoPago: 'CREDITO', clienteId: cliente.id });
console.log(`${v3.json.numero} — ${S(v3.json.totalCentimos)}`);

console.log('=== 8. Intento vender 200 garruchas (stock atómico) ===');
const v4 = await pedir('POST', '/ventas', rosa, { items: [{ codigo: '7752001', cantidad: 200 }], metodoPago: 'EFECTIVO' });
console.log(v4.json.mensaje);

console.log('--- espera 4s al OUTBOX ---');
await new Promise((r) => setTimeout(r, 4000));

console.log('=== 9. Cuentas por cobrar (creada por el evento venta.confirmada) ===');
const ctas = (await pedir('GET', '/caja/cuentas-por-cobrar', rosa)).json;
for (const c of ctas) console.log(`${c.numeroVenta} · ${c.cliente} · saldo ${S(c.saldoCentimos)} · ${c.estado}`);

console.log('=== 10. Cobro parcial de S/ 20 en efectivo ===');
const cobro = await pedir('POST', `/caja/cuentas-por-cobrar/${ctas[0].id}/cobros`, rosa, { montoCentimos: 2000, metodo: 'EFECTIVO' });
console.log(`Saldo restante: ${S(cobro.json.saldoRestanteCentimos)}`);

console.log('=== 11. CIERRE CIEGO: Rosa declara (faltante de S/ 3 a propósito) ===');
const cierre = await pedir('POST', '/caja/cerrar', rosa, { efectivoCentimos: 36860, tarjetaCentimos: 0, yapeCentimos: 700 });
console.log(cierre.json.mensaje);

console.log('=== 12. Rosa intenta ver el reporte (solo gerente) ===');
const intento = await pedir('GET', `/caja/cierres/${cierre.json.sesionId}/reporte`, rosa);
console.log(`HTTP ${intento.status} — prohibido para la cajera`);

console.log('=== 13. REPORTE DEL GERENTE (semáforo ±S/5) ===');
const rep = await pedir('GET', `/caja/cierres/${cierre.json.sesionId}/reporte`, gerente);
for (const f of rep.json.filas)
  console.log(`${f.metodo}: esperado ${S(f.esperadoCentimos)} · declarado ${S(f.declaradoCentimos)} · dif ${S(f.diferenciaCentimos)} → ${f.estado}`);

console.log('=== 14. Kárdex de garruchas (150 − 4 − 2 − 10 = 134) ===');
const kardex = (await pedir('GET', '/inventario/kardex/7752001', gerente)).json;
for (const f of kardex.slice(-3)) console.log(`${f.tipo} ${f.referencia}: ${f.cantidad} → saldo ${f.saldo}`);
