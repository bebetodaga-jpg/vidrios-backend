import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LaminaDisponible, PanoCorte, Plan2D } from '../dominio/corte.calculos';
import { OptimizadorExterno } from '../dominio/produccion.puertos';

interface RespuestaServicio {
  ok: boolean;
  plan?: Plan2D; // el servicio devuelve el plan completo (mismo formato que la heurística TS)
}

/**
 * Adaptador del puerto OptimizadorExterno: llama al servicio Python (OR-Tools) por HTTP.
 * Ante cualquier fallo (servicio caído, timeout, paño que no cabe, acomodo no guillotina) retorna
 * null para que el caso de uso caiga a la heurística TS — el corte nunca se queda sin respuesta.
 */
@Injectable()
export class OptimizadorOrToolsHttp implements OptimizadorExterno {
  private readonly log = new Logger(OptimizadorOrToolsHttp.name);
  private readonly url: string;
  private readonly segundos: number;

  constructor(config: ConfigService) {
    this.url = config.get<string>('OPTIMIZADOR_URL') ?? 'http://localhost:8000';
    this.segundos = Number(config.get<string>('OPTIMIZADOR_SEGUNDOS') ?? '15');
  }

  async optimizar(plancha: { anchoMm: number; altoMm: number }, panos: PanoCorte[], retazos: LaminaDisponible[]): Promise<Plan2D | null> {
    try {
      const respuesta = await fetch(`${this.url}/optimizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planchaAnchoMm: plancha.anchoMm,
          planchaAltoMm: plancha.altoMm,
          segundos: this.segundos,
          panos: panos.map((p) => ({ etiqueta: p.etiqueta, anchoMm: p.anchoMm, altoMm: p.altoMm })),
          retazos: retazos.map((r) => ({ id: r.id, anchoMm: r.anchoMm, altoMm: r.altoMm })),
        }),
        // Margen amplio: en multiplancha el motor hace varias resoluciones encadenadas.
        signal: AbortSignal.timeout((this.segundos * 4 + 15) * 1000),
      });
      if (!respuesta.ok) {
        return null;
      }
      const datos = (await respuesta.json()) as RespuestaServicio;
      return datos.ok && datos.plan ? datos.plan : null;
    } catch (error) {
      this.log.warn(`Optimizador OR-Tools no disponible (${String(error)}); se usa la heurística TS.`);
      return null;
    }
  }
}
