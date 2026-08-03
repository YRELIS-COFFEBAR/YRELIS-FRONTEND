import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderInfo, PaymentMethod } from '../../models/product.model';
import { OrderService } from '../../services/order.service';

type Step = 'method' | 'paying' | 'success';

@Component({
  selector: 'app-payment',
  imports: [RouterLink, DatePipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent {
  readonly step = signal<Step>('method');
  readonly paymentMethod = signal<PaymentMethod>('yape');
  readonly customerName = signal<string>('');
  readonly orderInfo = signal<OrderInfo | null>(null);

  private processing = false;

  constructor(
    readonly order: OrderService,
    private readonly router: Router,
  ) {}

  selectMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
  }

  onNameChange(event: Event): void {
    this.customerName.set((event.target as HTMLInputElement).value);
  }

  async confirmPayment(): Promise<void> {
    if (this.order.isEmpty() || this.processing) {
      return;
    }
    this.processing = true;
    this.step.set('paying');
    try {
      const info = await this.order.placeOrder(this.customerName(), this.paymentMethod());
      this.orderInfo.set(info);
      this.step.set('success');
    } finally {
      this.processing = false;
    }
  }

  /**
   * Vuelve al paso de selección de método de pago
   */
  goBackToMethod(): void {
    this.step.set('method');
  }

  newOrder(): void {
    this.router.navigate(['/menu']);
  }

  formatPrice(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }

  paymentLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      yape: 'Yape',
      plin: 'Plin',
      visa: 'Tarjeta Visa',
    };
    return labels[method];
  }

  // ===== MANEJO DE ERRORES DE IMÁGENES =====

  /**
   * Maneja errores de carga de logos de métodos de pago
   */
  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Evita bucles infinitos
    img.onerror = null;
    // Logo por defecto si la imagen no existe
    img.src = 'assets/images/payments/logo-default.png';
    // Opcional: agregar clase para estilizar el error
    img.classList.add('img-error');
    console.warn('Logo no encontrado, usando default:', img.src);
  }

  /**
   * Maneja errores de carga de códigos QR
   */
  onQrError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Evita bucles infinitos
    img.onerror = null;
    // Usar imagen de assets/images/qr/qr.jpg
    img.src = 'assets/images/qr/qr.jpg';
    // Si falla, mostrar alt
    img.alt = 'QR no disponible';
    img.classList.add('qr-error');
    console.warn('QR no encontrado, usando default');
  }
}