import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderService, OrderInfo, PaymentMethod, PaymentStatus } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';

type Step = 'method' | 'paying' | 'success' | 'failed' | 'cancelled';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent implements OnInit, OnDestroy {
  readonly step = signal<Step>('method');
  readonly paymentMethod = signal<PaymentMethod>('yape');
  readonly customerName = signal<string>('');
  readonly orderInfo = signal<OrderInfo | null>(null);
  readonly paymentStatus = signal<PaymentStatus | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly cancelMessage = signal<string | null>(null);

  private currentOrderNumber: number | null = null;
  private processing = false;
  private wsSubscriptions: any[] = [];

  readonly order = inject(OrderService);
  private readonly router = inject(Router);
  private readonly wsService = inject(WebSocketService);

  ngOnInit() {
    // Escuchar confirmaciones de pago vía WebSocket
    this.wsSubscriptions.push(
      this.wsService.onPaymentConfirmed().subscribe((data: any) => {
        console.log('💳 Pago confirmado vía WebSocket:', data);
        if (this.currentOrderNumber === data.orderId) {
          if (data.status === 'APPROVED') {
            this.handlePaymentSuccess();
          } else if (data.status === 'REJECTED') {
            this.handlePaymentFailed(data.message || 'Pago rechazado');
          }
        }
      })
    );

    // Escuchar cancelación de pago
    this.wsSubscriptions.push(
      this.wsService.onPaymentCancelled().subscribe((data: any) => {
        console.log('❌ Pago cancelado vía WebSocket:', data);
        if (this.currentOrderNumber === data.orderId) {
          this.handlePaymentCancelled(data.message || 'Pago cancelado');
        }
      })
    );

    // Escuchar errores de WebSocket
    this.wsSubscriptions.push(
      this.wsService.onPaymentError().subscribe((error: any) => {
        console.error('❌ Error en pago vía WebSocket:', error);
        this.handlePaymentFailed(error.message || 'Error en el pago');
      })
    );

    // Verificar que el carrito tenga items
    if (this.order.isEmpty()) {
      this.router.navigate(['/menu']);
    }
  }

  ngOnDestroy() {
    this.currentOrderNumber = null;
    this.wsSubscriptions.forEach(sub => sub.unsubscribe());
  }

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
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.cancelMessage.set(null);
    this.step.set('paying');
    
    try {
      console.log('📤 Iniciando pago...');
      const info = await this.order.placeOrder(
        this.customerName(), 
        this.paymentMethod()
      );
      
      this.currentOrderNumber = info.orderNumber;
      this.orderInfo.set(info);
      this.paymentStatus.set(info.paymentStatus || null);
      
      // Si el pago fue aprobado inmediatamente
      if (info.paymentStatus === 'APPROVED') {
        this.handlePaymentSuccess();
      } else {
        console.log('⏳ Esperando confirmación de pago...');
        // Iniciar polling como fallback
        this.startPolling(info.orderNumber);
      }
      
    } catch (error) {
      console.error('❌ Error en pago:', error);
      // Si el error es de cancelación
      if (error instanceof Error && error.message.includes('cancelado')) {
        this.handlePaymentCancelled(error.message);
      } else {
        this.handlePaymentFailed(error instanceof Error ? error.message : 'Error desconocido');
      }
    } finally {
      this.processing = false;
      this.isProcessing.set(false);
    }
  }

  // ✅ NUEVO: Cancelar pago
  async cancelPayment(): Promise<void> {
    if (!this.currentOrderNumber) {
      console.warn('No hay pedido para cancelar');
      return;
    }

    try {
      this.isProcessing.set(true);
      console.log(`❌ Cancelando pago del pedido #${this.currentOrderNumber}...`);
      await this.order.cancelPayment(this.currentOrderNumber);
      // El WebSocket manejará la confirmación de cancelación
    } catch (error) {
      console.error('Error al cancelar pago:', error);
      this.handlePaymentCancelled('Error al cancelar el pago');
    } finally {
      this.isProcessing.set(false);
    }
  }

  private startPolling(orderId: number): void {
    let attempts = 0;
    const maxAttempts = 30;
    
    const interval = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        this.handlePaymentFailed('Tiempo de espera agotado');
        return;
      }
      
      this.order.checkPaymentStatus(orderId).subscribe({
        next: (response) => {
          if (response.status === 'APPROVED') {
            clearInterval(interval);
            this.handlePaymentSuccess();
          } else if (response.status === 'REJECTED' || response.status === 'FAILED') {
            clearInterval(interval);
            this.handlePaymentFailed(response.message || 'Pago rechazado');
          } else if (response.status === 'CANCELLED') {
            clearInterval(interval);
            this.handlePaymentCancelled(response.message || 'Pago cancelado');
          }
        },
        error: () => {
          // Continuar esperando
        }
      });
    }, 2000);
  }

  private handlePaymentSuccess(): void {
    this.step.set('success');
    this.order.clear();
    console.log('🎉 Pago exitoso!');
  }

  private handlePaymentFailed(message: string): void {
    this.errorMessage.set(message);
    this.step.set('failed');
    this.isProcessing.set(false);
    console.error('❌ Pago fallido:', message);
  }

  // ✅ NUEVO: Manejar cancelación
  private handlePaymentCancelled(message: string): void {
    this.cancelMessage.set(message || 'Pago cancelado por el usuario');
    this.step.set('cancelled');
    this.isProcessing.set(false);
    console.log('❌ Pago cancelado:', message);
  }

  goBackToMethod(): void {
    this.step.set('method');
    this.errorMessage.set(null);
    this.cancelMessage.set(null);
    this.isProcessing.set(false);
    this.currentOrderNumber = null;
  }

  newOrder(): void {
    this.order.clear();
    this.currentOrderNumber = null;
    this.step.set('method');
    this.router.navigate(['/menu']);
  }

  retryPayment(): void {
    this.errorMessage.set(null);
    this.step.set('method');
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
    return labels[method] || method;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = 'assets/images/payments/logo-default.png';
    img.classList.add('img-error');
  }

  onQrError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = 'assets/images/qr/qr.jpg';
    img.alt = 'QR no disponible';
    img.classList.add('qr-error');
  }
}