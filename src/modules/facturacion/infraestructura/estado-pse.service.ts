import { Injectable } from '@nestjs/common';

/**
 * Interruptor de SIMULACIÓN del estado del PSE (espejo del toggle "Simular PSE caído"
 * del prototipo UX). Solo desarrollo: permite demostrar la contingencia sin tumbar NubeFact.
 * En producción el adaptador real llama a la API de NubeFact y este flag no existe.
 */
@Injectable()
export class EstadoPseSimulado {
  private caido = false;

  estaCaido(): boolean {
    return this.caido;
  }

  fijar(caido: boolean): void {
    this.caido = caido;
  }
}
