// Verificación: medidas con 1 decimal (mm) en cotizador y POS — caso reportado por el dueño.
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
const login = async (u) => (await api('POST', '/auth/login', null, { usuario: u, password: 'galaxi123' })).json.token;

const carlos = await login('carlos');
const rosa = await login('rosa');

console.log('— 1. Cotizar 155.3 × 185.3 (el caso del error) —');
const productos = (await api('GET', '/catalogo/productos?buscar=', carlos)).json;
const vidrio = productos.find((p) => p.familia === 'VIDRIO' && p.subfamilia === 'Crudo');
const config = { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: vidrio.codigo, color: 'natural', anchoCm: 155.3, altoCm: 185.3, cantidad: 1 };
const prev = await api('POST', '/cotizaciones/cotizar-item', carlos, config);
if (prev.status !== 201 && prev.status !== 200) {
  console.log(`FALLÓ: ${prev.status} ${JSON.stringify(prev.json)}`);
  process.exit(1);
}
console.log(`preview OK: ${S(prev.json.totalCentimos)} · paño ${prev.json.despiece.panos[0].anchoCm}×${prev.json.despiece.panos[0].altoCm} cm · ${prev.json.m2Vidrio} m²`);

console.log('— 2. Crear y persistir la cotización con decimales —');
const cot = await api('POST', '/cotizaciones', carlos, { items: [config] });
console.log(`cotización ${cot.json.numero ?? JSON.stringify(cot.json)} creada (${cot.status})`);
const det = await api('GET', `/cotizaciones/${cot.json.id}`, carlos);
const item = det.json.itemsDetalle[0];
console.log(`persistido: ${item.anchoCm} × ${item.altoCm} cm ${item.anchoCm === 155.3 && item.altoCm === 185.3 ? '✓ sin perder el decimal' : '✗ SE PERDIÓ EL DECIMAL'}`);

console.log('— 3. POS: venta de vidrio a medida 120.5 × 80.4 —');
await api('POST', '/caja/abrir', rosa, { montoInicialCentimos: 20000 }); // idempotente
const venta = await api('POST', '/ventas', rosa, { items: [{ codigo: vidrio.codigo, cantidad: 1, anchoCm: 120.5, altoCm: 80.4 }], metodoPago: 'EFECTIVO' });
console.log(venta.status === 201 ? `venta ${venta.json.numero}: ${S(venta.json.totalCentimos)} ✓` : `FALLÓ: ${JSON.stringify(venta.json)}`);

console.log('— 4. Más de 1 decimal sigue rechazado —');
const malo = await api('POST', '/cotizaciones/cotizar-item', carlos, { ...config, anchoCm: 155.34 });
console.log(`155.34 → ${malo.status} (esperado 400): ${malo.json.mensaje ?? malo.json.message}`);

console.log('\nMEDIDAS MM OK');
