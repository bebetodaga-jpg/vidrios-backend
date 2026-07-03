// DEMO S10 — Personal: alta, cuadrillas por obra, planilla inmutable y permisos por rol.
const BASE = 'http://localhost:3000/api';

async function api(metodo, ruta, token, body) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, json: data };
}
const login = async (usuario) => (await api('POST', '/auth/login', null, { usuario, password: 'galaxi123' })).json.token;

const gerente = await login('gerente');
const maestro = await login('maestro');
const cajera = await login('rosa');

console.log('— 1. Alta de personal (gerente) —');
const dni1 = String(40000000 + Math.floor(Math.random() * 9999999));
const dni2 = String(40000000 + Math.floor(Math.random() * 9999999));
const p1 = await api('POST', '/personal', gerente, { nombre: 'Pedro Quispe Mamani', dni: dni1, especialidad: 'CORTADOR', telefono: '987654321' });
const p2 = await api('POST', '/personal', gerente, { nombre: 'Luis Cárdenas Soto', dni: dni2, especialidad: 'AYUDANTE' });
console.log(`alta cortador: ${p1.status} · alta ayudante: ${p2.status}`);
const dup = await api('POST', '/personal', gerente, { nombre: 'Otro Con Mismo DNI', dni: dni1, especialidad: 'AYUDANTE' });
console.log(`DNI duplicado rechazado: ${dup.status} (${dup.json.mensaje ?? ''})`);
const dniMalo = await api('POST', '/personal', gerente, { nombre: 'Dni Malo', dni: '123', especialidad: 'AYUDANTE' });
console.log(`DNI de 3 dígitos rechazado: ${dniMalo.status}`);

console.log('— 2. Cuadrilla por obra (maestro) —');
const obras = (await api('GET', '/obras', maestro)).json;
const obra = obras[0];
const cua = await api('POST', '/personal/cuadrillas', maestro, { obraId: obra.id, nombre: 'Equipo instalación 1' });
console.log(`cuadrilla en ${obra.codigo}: ${cua.status}`);
const a1 = await api('POST', `/personal/cuadrillas/${cua.json.id}/asignaciones`, maestro, { personalId: p1.json.id, rol: 'CORTADOR' });
const a2 = await api('POST', `/personal/cuadrillas/${cua.json.id}/asignaciones`, maestro, { personalId: p2.json.id, rol: 'AYUDANTE' });
const aDup = await api('POST', `/personal/cuadrillas/${cua.json.id}/asignaciones`, maestro, { personalId: p1.json.id, rol: 'CORTADOR' });
console.log(`asignar x2: ${a1.status}/${a2.status} · re-asignar al mismo: ${aDup.status} (${aDup.json.mensaje ?? ''})`);
const lista = (await api('GET', '/personal/cuadrillas', gerente)).json;
const miCuadrilla = lista.find((c) => c.id === cua.json.id);
console.log(`integrantes: ${miCuadrilla.integrantes.map((i) => `${i.nombre} (${i.rol})`).join(' + ')}`);
const quitar = await api('DELETE', `/personal/cuadrillas/${cua.json.id}/asignaciones/${p2.json.id}`, maestro);
console.log(`quitar ayudante: ${quitar.status}`);

console.log('— 3. Planilla (solo gerente, inmutable) —');
await api('POST', `/personal/${p1.json.id}/pagos`, gerente, { tipo: 'ADELANTO', concepto: 'Adelanto semana 1', montoCentimos: 20000 });
await api('POST', `/personal/${p1.json.id}/pagos`, gerente, { tipo: 'DESTAJO', concepto: `Destajo corte ${obra.codigo} — 6 paños`, montoCentimos: 15000, obraId: obra.id });
const pagos = (await api('GET', `/personal/${p1.json.id}/pagos`, gerente)).json;
console.log(`pagos: ${pagos.pagos.length} · total S/ ${(pagos.resumen.totalCentimos / 100).toFixed(2)} (adelantos ${pagos.resumen.adelantosCentimos / 100} + destajos ${pagos.resumen.destajosCentimos / 100})`);
const pagoMalo = await api('POST', `/personal/${p1.json.id}/pagos`, gerente, { tipo: 'BONO', concepto: 'x', montoCentimos: 100 });
console.log(`tipo BONO rechazado: ${pagoMalo.status}`);

console.log('— 4. Permisos: nadie toca lo que no le corresponde —');
const cajeraLista = await api('GET', '/personal', cajera);
const maestroPaga = await api('POST', `/personal/${p1.json.id}/pagos`, maestro, { tipo: 'PAGO', concepto: 'Intento del maestro', montoCentimos: 100 });
const maestroAlta = await api('POST', '/personal', maestro, { nombre: 'Alta Del Maestro', dni: '49999999', especialidad: 'AYUDANTE' });
console.log(`cajera lista personal: ${cajeraLista.status} (esperado 403)`);
console.log(`maestro registra pago: ${maestroPaga.status} (esperado 403)`);
console.log(`maestro da de alta: ${maestroAlta.status} (esperado 403)`);

console.log('\\nDEMO S10 OK');
