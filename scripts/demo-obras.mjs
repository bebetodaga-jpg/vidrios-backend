// Demo de aceptación S5 (obras): crear cliente+obra+ambiente, sincronización offline idempotente, remetreo.
const BASE = 'http://localhost:3000/api';
const api = async (m, ruta, token, body) => {
  const r = await fetch(BASE + ruta, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
};
const uuid = () => crypto.randomUUID();

const gerente = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;
const ayudante = (await api('POST', '/auth/login', null, { usuario: 'pedro', password: 'galaxi123' })).json.token; // CORTADOR (no remetrea)
const maestro = (await api('POST', '/auth/login', null, { usuario: 'maestro', password: 'galaxi123' })).json.token;

console.log('=== 1. Crear cliente + obra + ambiente ===');
const cliente = (await api('POST', '/clientes', gerente, { tipoDoc: 'DNI', numeroDoc: '70123456', nombre: 'Familia Ramírez' })).json;
const obra = (await api('POST', '/obras', gerente, { clienteId: cliente.id, direccion: 'Calle Las Flores 200 — La Molina' })).json;
const amb = (await api('POST', `/obras/${obra.id}/ambientes`, gerente, { nombre: 'Sala' })).json;
console.log(`  Cliente ${cliente.id.slice(0, 8)} · Obra ${obra.codigo} · Ambiente ${amb.id.slice(0, 8)}`);

console.log('=== 2. Sincronizar lote OFFLINE (2 vanos con medida inicial) ===');
const v1 = uuid(), v2 = uuid();
const m1 = uuid(), m2 = uuid();
const lote = {
  ambienteId: amb.id,
  vanos: [
    { id: v1, codigo: 'V-01', nombre: 'Ventana frontal', tipo: 'Ventana corrediza (serie)', cantidad: 1, tieneDetalle: false, medidas: [{ id: m1, tipo: 'INICIAL', anchoCm: 150, altoCm: 120 }] },
    { id: v2, codigo: 'V-02', nombre: 'Mampara terraza', tipo: 'Mampara (serie)', cantidad: 1, tieneDetalle: true, fotoUrl: 'https://s3/foto.jpg', medidas: [{ id: m2, tipo: 'INICIAL', anchoCm: 241, altoCm: 211 }] },
  ],
};
let sync = (await api('POST', '/obras/sincronizar', ayudante, lote)).json;
console.log(`  Sincronizados: ${sync.vanos} vanos, ${sync.medidas} medidas`);

console.log('=== 3. Re-sincronizar el MISMO lote (idempotencia: no debe duplicar) ===');
sync = (await api('POST', '/obras/sincronizar', ayudante, lote)).json;
console.log(`  Re-sync: ${sync.vanos} vanos, ${sync.medidas} medidas nuevas (esperado 0 medidas)`);

console.log('=== 4. Remetreo: el ayudante (cortador) NO puede ===');
const remAyu = await api('POST', `/obras/vanos/${v2}/medidas`, ayudante, { anchoCm: 240, altoCm: 210 });
console.log(`  ${remAyu.json.mensaje}`);

console.log('=== 5. Remetreo: el MAESTRO sí puede (no sobrescribe, agrega versión) ===');
const remMae = await api('POST', `/obras/vanos/${v2}/medidas`, maestro, { anchoCm: 240, altoCm: 210 });
console.log(`  V-02 nueva medida: ${remMae.json.tipo}`);

console.log('=== 6. Detalle de la obra (medida actual = remetreo, historial completo) ===');
const detalle = (await api('GET', `/obras/${obra.id}`, gerente)).json;
for (const a of detalle.ambientes) {
  for (const v of a.vanos) {
    console.log(`  ${v.codigo} ${v.nombre}: actual ${v.medidaActual.anchoCm}×${v.medidaActual.altoCm} cm · ${v.medidas.length} versión(es): ${v.medidas.map((x) => x.tipo).join(' → ')}`);
  }
}
