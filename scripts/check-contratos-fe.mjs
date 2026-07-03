// Verificación FE S7: la superficie de /contratos coincide con shared/api/contratos.ts
const BASE = 'http://localhost:3000/api';

async function api(metodo, ruta, token, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${metodo} ${ruta} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const { token } = await api('POST', '/auth/login', null, { usuario: 'carlos', password: 'galaxi123' });
console.log('login vendedora OK');

const cots = await api('GET', '/cotizaciones', token);
const aceptadas = cots.filter((c) => c.estado === 'ACEPTADA');
console.log(`cotizaciones: ${cots.length} (ACEPTADAS: ${aceptadas.length})`);

const lista = await api('GET', '/contratos', token);
console.log(`contratos: ${lista.length}`);

const esperadosResumen = ['id', 'numero', 'estado', 'cliente', 'totalCentimos', 'adelantoCentimos', 'pagadoCentimos', 'saldoPendienteCentimos', 'tieneFirma', 'creadoEn'];
const esperadosDetalle = [...esperadosResumen, 'cotizacionNumero', 'saldoCentimos', 'firmaDataUrl'];

if (lista.length > 0) {
  const faltanR = esperadosResumen.filter((k) => !(k in lista[0]));
  console.log(faltanR.length ? `RESUMEN FALTAN: ${faltanR.join(', ')}` : 'campos resumen OK');

  const det = await api('GET', `/contratos/${lista[0].id}`, token);
  const faltanD = esperadosDetalle.filter((k) => !(k in det));
  console.log(faltanD.length ? `DETALLE FALTAN: ${faltanD.join(', ')}` : 'campos detalle OK');
  console.log(`muestra: ${det.numero} total=${det.totalCentimos} pagado=${det.pagadoCentimos} saldoPend=${det.saldoPendienteCentimos} firma=${det.tieneFirma}`);
} else {
  console.log('sin contratos para validar detalle (lista vacía)');
}
