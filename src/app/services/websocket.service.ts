import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket;
  private newOrderSubject = new Subject<any>();
  private orderUpdateSubject = new Subject<any>();

  constructor() {
    this.socket = io('http://localhost:8080', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Escuchar eventos del backend
    this.socket.on('connect', () => {
      console.log('🔌 Conectado al WebSocket del mesero');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado del WebSocket');
    });

    this.socket.on('new_order', (data) => {
      console.log('📦 Nuevo pedido recibido:', data);
      this.newOrderSubject.next(data);
    });

    this.socket.on('order_updated', (data) => {
      console.log('🔄 Pedido actualizado:', data);
      this.orderUpdateSubject.next(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Error en WebSocket:', error);
    });
  }

  // Métodos para escuchar eventos
  onNewOrder(): Observable<any> {
    return this.newOrderSubject.asObservable();
  }

  onOrderUpdate(): Observable<any> {
    return this.orderUpdateSubject.asObservable();
  }

  // Emitir eventos al backend
  notifyOrderReady(orderId: number): void {
    this.socket.emit('order_ready', { orderId });
    console.log(`📢 Notificando pedido #${orderId} listo`);
  }

  notifyOrderCompleted(orderId: number): void {
    this.socket.emit('order_completed', { orderId });
    console.log(`📢 Notificando pedido #${orderId} completado`);
  }

  // Desconectar
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}