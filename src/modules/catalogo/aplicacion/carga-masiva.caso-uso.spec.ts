import { Familia, Producto, UnidadVenta } from '../dominio/producto';
import { ProductoRepositorio } from '../dominio/producto.repositorio';
import { CargaMasivaCasoUso, FilaCarga } from './carga-masiva.caso-uso';

/** Repositorio en memoria: prueba la aplicación sin BD (estándar §6, gracia del puerto hexagonal). */
class RepoEnMemoria implements ProductoRepositorio {
  readonly guardados = new Map<string, Producto>();

  guardar(producto: Producto): Promise<void> {
    this.guardados.set(producto.codigo, producto);
    return Promise.resolve();
  }
  porCodigo(codigo: string): Promise<Producto | null> {
    return Promise.resolve(this.guardados.get(codigo) ?? null);
  }
  buscar(): Promise<Producto[]> {
    return Promise.resolve([...this.guardados.values()]);
  }
}

const fila = (parcial: Partial<FilaCarga>): FilaCarga => ({
  fila: 2,
  codigo: '7750010',
  nombre: 'Vidrio reflejante azul 6 mm',
  familia: Familia.VIDRIO,
  subfamilia: 'Reflejante',
  unidadVenta: UnidadVenta.M2,
  precioCentimos: 7_200,
  stockMinimo: 4,
  grosorMm: 6,
  ...parcial,
});

describe('CargaMasivaCasoUso (migración del Excel de la tienda)', () => {
  let repo: RepoEnMemoria;
  let casoUso: CargaMasivaCasoUso;

  beforeEach(() => {
    repo = new RepoEnMemoria();
    casoUso = new CargaMasivaCasoUso(repo);
  });

  it('importa las filas correctas y reporta las que tienen error, sin abortar', async () => {
    const reporte = await casoUso.ejecutar([
      fila({ fila: 2 }),
      fila({ fila: 3, codigo: '7751010', nombre: 'Perfil tubo 1"', familia: Familia.PERFIL, subfamilia: 'Tubulares', unidadVenta: UnidadVenta.BARRILLA_600, precioCentimos: 0, grosorMm: undefined }), // sin precio
      fila({ fila: 4, codigo: '7750011', nombre: 'Crudo 4 mm', subfamilia: 'Crudo', unidadVenta: UnidadVenta.M2, grosorMm: 4 }), // crudo por m² → inválido
      fila({ fila: 5, codigo: '7752011', nombre: 'Brocha de felpa', familia: Familia.ACCESORIO, subfamilia: 'Felpas y tornillería', unidadVenta: UnidadVenta.UNIDAD, precioCentimos: 120, grosorMm: undefined }),
    ]);

    expect(reporte.creados).toBe(2);
    expect(reporte.errores).toHaveLength(2);
    expect(reporte.errores[0]).toMatchObject({ fila: 3, mensaje: 'Falta el precio o no es válido.' });
    expect(reporte.errores[1].mensaje).toContain('pie²'); // el dominio explica la regla del dueño
    expect(repo.guardados.size).toBe(2);
  });

  it('es idempotente: re-ejecutar el mismo archivo actualiza en vez de duplicar', async () => {
    await casoUso.ejecutar([fila({})]);
    const segunda = await casoUso.ejecutar([fila({ precioCentimos: 7_500 })]);

    expect(segunda.creados).toBe(0);
    expect(segunda.actualizados).toBe(1);
    expect(repo.guardados.get('7750010')?.precio.centimos).toBe(7_500);
  });
});
