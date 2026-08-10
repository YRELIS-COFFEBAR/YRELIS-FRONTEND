import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket;
  private newOrderSubject = new Subject<any>();
  private orderUpdateSubject = new Subject<any>();
  private paymentConfirmedSubject = new Subject<any>();
  private paymentCancelledSubject = new Subject<any>();
  private paymentErrorSubject = new Subject<any>();

  constructor() {
    this.socket = io(environment.wsUrl || 'http://localhost:8080', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Conectado al WebSocket del mesero');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado del WebSocket');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });

    this.socket.on('new_order', (data) => {
      console.log('📦 Nuevo pedido recibido:', data);
      this.newOrderSubject.next(data);
    });

    this.socket.on('order_updated', (data) => {
      console.log('🔄 Pedido actualizado:', data);
      this.orderUpdateSubject.next(data);
    });

    this.socket.on('payment_confirmed', (data) => {
      console.log('💳 Pago confirmado:', data);
      this.paymentConfirmedSubject.next(data);
    });

    this.socket.on('payment_cancelled', (data) => {
      console.log('❌ Pago cancelado:', data);
      this.paymentCancelledSubject.next(data);
    });

    this.socket.on('payment_error', (data) => {
      console.error('❌ Error en pago:', data);
      this.paymentErrorSubject.next(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Error en WebSocket:', error);
      this.paymentErrorSubject.next(error);
    });
  }

  // ===== MÉTODOS PARA ESCUCHAR EVENTOS =====

  onNewOrder(): Observable<any> {
    return this.newOrderSubject.asObservable();
  }

  onOrderUpdate(): Observable<any> {
    return this.orderUpdateSubject.asObservable();
  }

  onPaymentConfirmed(): Observable<any> {
    return this.paymentConfirmedSubject.asObservable();
  }

  onPaymentCancelled(): Observable<any> {
    return this.paymentCancelledSubject.asObservable();
  }

  onPaymentError(): Observable<any> {
    return this.paymentErrorSubject.asObservable();
  }

  // ===== EMITIR EVENTOS AL BACKEND =====

  notifyOrderReady(orderId: number): void {
    this.socket.emit('order_ready', { orderId });
    console.log(`📢 Notificando pedido #${orderId} listo`);
  }

  notifyOrderCompleted(orderId: number): void {
    this.socket.emit('order_completed', { orderId });
    console.log(`📢 Notificando pedido #${orderId} completado`);
  }

  confirmPayment(orderId: number, status: string): void {
    this.socket.emit('confirm_payment', { orderId, status });
    console.log(`📢 Enviando confirmación de pago #${orderId}: ${status}`);
  }

  // ===== UTILIDADES =====

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  reconnect(): void {
    if (!this.socket?.connected) {
      this.socket?.connect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.newOrderSubject.complete();
    this.orderUpdateSubject.complete();
    this.paymentConfirmedSubject.complete();
    this.paymentCancelledSubject.complete();
    this.paymentErrorSubject.complete();
  }
}