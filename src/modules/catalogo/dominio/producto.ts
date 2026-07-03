import { Dinero } from '@shared/dominio/dinero';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';

export enum UnidadVenta {
  PIE2 = 'PIE2', // vidrio crudo, catedral, espejo (regla del dueño)
  M2 = 'M2', // vidrio templado
  BARRILLA_600 = 'BARRILLA_600', // perfil de aluminio 6.00 m
  BARRILLA_640 = 'BARRILLA_640', // perfil de aluminio 6.40 m
  UNIDAD = 'UNIDAD', // accesorios
}

export enum Familia {
  VIDRIO = 'VIDRIO',
  PERFIL = 'PERFIL',
  ACCESORIO = 'ACCESORIO',
}

/** Subfamilias de vidrio que se venden por pie² (las demás de vidrio van por m²). */
const SUBFAMILIAS_PIE2 = ['Crudo', 'Catedral', 'Espejo'];

export interface PropsProducto {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly familia: Familia;
  readonly subfamilia: string;
  readonly unidadVenta: UnidadVenta;
  readonly precio: Dinero; // inc. IGV, por unidad de venta
  readonly stockMinimo: number;
  readonly grosorMm?: number;
}

/**
 * Entidad rica: protege las invariantes del catálogo.
 * Nadie puede construir un Producto inválido — `crear` es la única puerta y retorna Resultado.
 */
export class Producto {
  private constructor(private props: PropsProducto) {}

  static crear(props: PropsProducto): Resultado<Producto> {
    if (props.nombre.trim().length < 3) {
      return fallo('NOMBRE_INVALIDO', 'El nombre del producto debe tener al menos 3 caracteres.');
    }
    if (props.precio.centimos <= 0) {
      return fallo('PRECIO_INVALIDO', 'El precio debe ser mayor que cero.');
    }
    if (props.stockMinimo < 0) {
      return fallo('STOCK_MINIMO_INVALIDO', 'El stock mínimo no puede ser negativo.');
    }
    // Invariante del dueño: la unidad de venta del vidrio depende de la subfamilia.
    if (props.familia === Familia.VIDRIO) {
      const esPie2 = SUBFAMILIAS_PIE2.includes(props.subfamilia);
      if (esPie2 && props.unidadVenta !== UnidadVenta.PIE2) {
        return fallo('UNIDAD_INCOHERENTE', `El vidrio ${props.subfamilia.toLowerCase()} se vende por pie².`);
      }
      if (props.subfamilia === 'Templado' && props.unidadVenta !== UnidadVenta.M2) {
        return fallo('UNIDAD_INCOHERENTE', 'El vidrio templado se vende por m².');
      }
      if (props.grosorMm === undefined) {
        return fallo('GROSOR_REQUERIDO', 'Todo vidrio debe indicar su grosor en milímetros.');
      }
    }
    return ok(new Producto({ ...props, nombre: props.nombre.trim() }));
  }

  /** Cambiar precio es exclusivo del GERENTE (regla del dueño); el rol se valida en aplicación. */
  cambiarPrecio(nuevo: Dinero): Resultado<void> {
    if (nuevo.centimos <= 0) {
      return fallo('PRECIO_INVALIDO', 'El precio debe ser mayor que cero.');
    }
    this.props = { ...this.props, precio: nuevo };
    return ok(undefined);
  }

  get id(): string {
    return this.props.id;
  }
  get codigo(): string {
    return this.props.codigo;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get familia(): Familia {
    return this.props.familia;
  }
  get subfamilia(): string {
    return this.props.subfamilia;
  }
  get unidadVenta(): UnidadVenta {
    return this.props.unidadVenta;
  }
  get precio(): Dinero {
    return this.props.precio;
  }
  get stockMinimo(): number {
    return this.props.stockMinimo;
  }
  get grosorMm(): number | undefined {
    return this.props.grosorMm;
  }
}
