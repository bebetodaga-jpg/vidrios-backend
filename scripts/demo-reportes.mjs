// DEMO S11 — Reportes: panel gerencial CQRS (el resumen se actualiza al vender), alertas y permisos.
const BASE = 'http://localhost:3000/api';
const S = (c) => `S/ ${(c / 100).toFixed(2)}`;

async function api(metodo, ruta, token, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const login = async (usuario) => (await api('POST', '/auth/login', null, { usuario, password: 'galaxi123' })).json.token;

const gerente = await login('gerente');
const rosa = await login('rosa');
const carlos = await login('carlos');

console.log('— 1. Panel inicial (reconstruye el resumen si es la primera vez) —');
const antes = (await api('GET', '/reportes/panel', gerente)).json;
console.log(`hoy: ${S(antes.ventasHoy.ventasCentimos)} (${antes.ventasHoy.tickets} tickets) · mes: ${S(antes.ventasMes.ventasCentimos)} · serie: ${antes.serie.length} días`);
console.log(`por cobrar: ${S(antes.porCobrar.totalCentimos)} (${antes.porCobrar.vencidas} vencidas) · desperdicio: ${antes.desperdicioPromedioPct}%`);
console.log(`top producto: ${antes.rankingProductos[0]?.nombre ?? '—'} ${S(antes.rankingProductos[0]?.importeCentimos ?? 0)}`);
console.log(`top vendedor: ${antes.rankingVendedores[0]?.nombre ?? '—'} (${antes.rankingVendedores[0]?.tickets ?? 0} tickets)`);
for (const m of antes.margenObras) console.log(`margen ${m.obraCodigo}: contratado ${S(m.contratadoCentimos)} − costos ${S(m.costosPersonalCentimos)} = ${m.margenPct}%`);

console.log('— 2. CQRS en vivo: una venta nueva debe sumar al resumen del día —');
await api('POST', '/caja/abrir', rosa, { montoInicialCentimos: 20000 }); // idempotente
const venta = await api('POST', '/ventas', rosa, { items: [{ codigo: '7752001', cantidad: 1 }], metodoPago: 'EFECTIVO' });
console.log(`venta ${venta.json.numero ?? venta.json.mensaje}: ${S(venta.json.totalCentimos ?? 0)}`);
await new Promise((r) => setTimeout(r, 4000)); // espera al despachador del outbox
const despues = (await api('GET', '/reportes/panel', gerente)).json;
const delta = despues.ventasHoy.ventasCentimos - antes.ventasHoy.ventasCentimos;
console.log(`hoy ahora: ${S(despues.ventasHoy.ventasCentimos)} (${despues.ventasHoy.tickets} tickets) → Δ ${S(delta)} ${delta === venta.json.totalCentimos ? '✓ el evento actualizó el resumen' : '✗ NO CUADRA'}`);

console.log('— 3. Alertas —');
const alertas = (await api('GET', '/reportes/alertas', gerente)).json;
console.log(`stock mínimo: ${alertas.stockMinimo.length} · pagos vencidos: ${alertas.pagosVencidos.length} · obras atrasadas: ${alertas.obrasAtrasadas.length}`);
for (const s of alertas.stockMinimo.slice(0, 3)) console.log(`  stock: ${s.nombre} (${s.saldo} ≤ ${s.minimo})`);
for (const p of alertas.pagosVencidos.slice(0, 3)) console.log(`  vencido: ${p.cliente} ${S(p.saldoCentimos)} (${p.numeroVenta})`);
for (const o of alertas.obrasAtrasadas.slice(0, 3)) console.log(`  obra: ${o.codigo} ${o.cliente} — ${o.dias} días en ${o.estado}`);

console.log('— 4. Permisos: solo el gerente ve las cifras —');
const carlosPanel = await api('GET', '/reportes/panel', carlos);
const rosaAlertas = await api('GET', '/reportes/alertas', rosa);
console.log(`vendedora pide panel: ${carlosPanel.status} (esperado 403) · cajera pide alertas: ${rosaAlertas.status} (esperado 403)`);

console.log('\nDEMO S11 OK');
