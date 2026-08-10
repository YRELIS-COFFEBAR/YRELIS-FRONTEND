import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable, interval, takeWhile, map, timeout, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product.service';

export type PaymentMethod = 'yape' | 'plin' | 'visa';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderInfo {
  orderNumber: number;
  customerName: string;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  subtotal: number;
  total: number;
  createdAt: Date;
  paymentStatus?: PaymentStatus;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  addonName?: string;
  addonPrice?: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  tableNumber?: number;
  paymentMethod: string;
  subtotal: number;
  total: number;
  status: string;
  paymentStatus: string;
  items?: OrderItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
  nuevo?: boolean;
}

export interface PaymentResponse {
  orderNumber: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionId?: string;
  amount: number;
  message?: string;
}

const CART_KEY = 'yrelis-cart';

interface OrderItemPayload {
  productId: string;
  quantity: number;
  addonName?: string;
  addonPrice?: number;
}

interface CreateOrderPayload {
  customerName: string;
  paymentMethod: PaymentMethod;
  items: OrderItemPayload[];
}

interface OrderResponse {
  orderNumber: number;
  customerName: string;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  transactionId?: string;
  subtotal: number;
  total: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl || 'http://localhost:8080/api';

  private readonly itemsSignal = signal<CartItem[]>(this.loadCart());
  readonly items = this.itemsSignal.asReadonly();

  readonly count = computed(() => this.itemsSignal().reduce((total, item) => total + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.product.price * item.quantity, 0)
  );
  readonly isEmpty = computed(() => this.itemsSignal().length === 0);

  private readonly lastOrderSignal = signal<OrderInfo | null>(null);
  readonly lastOrder = this.lastOrderSignal.asReadonly();

  private readonly paymentStatusSignal = signal<PaymentStatus | null>(null);
  readonly paymentStatus = this.paymentStatusSignal.asReadonly();

  private readonly isProcessingPaymentSignal = signal<boolean>(false);
  readonly isProcessingPayment = this.isProcessingPaymentSignal.asReadonly();

  private readonly paymentErrorSignal = signal<string | null>(null);
  readonly paymentError = this.paymentErrorSignal.asReadonly();

  // ===== OPERACIONES DEL CARRITO =====

  add(product: Product): void {
    this.itemsSignal.update((items) => {
      const index = items.findIndex((item) => item.product.id === product.id);
      if (index >= 0) {
        const next = [...items];
        next[index] = { ...next[index], quantity: next[index].quantity + 1 };
        return next;
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  increment(productId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  decrement(productId: string): void {
    this.itemsSignal.update((items) =>
      items
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  remove(productId: string): void {
    this.itemsSignal.update((items) => items.filter((item) => item.product.id !== productId));
  }

  clear(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem(CART_KEY);
    this.paymentStatusSignal.set(null);
    this.paymentErrorSignal.set(null);
  }

  getQuantity(productId: string): number {
    return this.itemsSignal().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  // ===== PROCESAR PEDIDO Y PAGO =====

  async placeOrder(customerName: string, paymentMethod: PaymentMethod): Promise<OrderInfo> {
    const items = this.itemsSignal();
    const payload: CreateOrderPayload = {
      customerName: customerName.trim() || 'Cliente',
      paymentMethod: paymentMethod.toLowerCase() as PaymentMethod,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        addonName: item.product.addon_label,
        addonPrice: item.product.addon_price,
      })),
    };

    try {
      console.log('📤 Creando pedido...');
      const order = await firstValueFrom(
        this.http.post<OrderResponse>(`${this.API_URL}/orders`, payload)
      );
      console.log('✅ Pedido creado:', order);

      this.isProcessingPaymentSignal.set(true);
      this.paymentStatusSignal.set('PENDING');
      this.paymentErrorSignal.set(null);

      console.log('💳 Procesando pago...');
      const payment = await firstValueFrom(
        this.http.post<PaymentResponse>(`${this.API_URL}/orders/${order.orderNumber}/payments`, {
          paymentMethod: paymentMethod.toLowerCase(),
        })
      );

      console.log('📊 Respuesta de pago:', payment);
      this.paymentStatusSignal.set(payment.status);
      this.isProcessingPaymentSignal.set(false);

      if (payment.status === 'REJECTED' || payment.status === 'FAILED') {
        this.paymentErrorSignal.set(payment.message || 'Pago rechazado');
        throw new Error(payment.message || 'El pago fue rechazado.');
      }

      const info: OrderInfo = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        paymentMethod,
        items,
        subtotal: order.subtotal,
        total: order.total,
        createdAt: new Date(order.createdAt),
        paymentStatus: payment.status
      };

      this.lastOrderSignal.set(info);
      
      if (payment.status === 'APPROVED') {
        this.itemsSignal.set([]);
        localStorage.removeItem(CART_KEY);
      }

      return info;

    } catch (error) {
      this.isProcessingPaymentSignal.set(false);
      this.paymentStatusSignal.set('FAILED');
      this.paymentErrorSignal.set(error instanceof Error ? error.message : 'Error desconocido');
      console.error('❌ Error en placeOrder:', error);
      throw error;
    }
  }

  // ===== CANCELAR PAGO =====

  async cancelPayment(orderNumber: number): Promise<any> {
    try {
      console.log(`❌ Cancelando pago del pedido #${orderNumber}...`);
      const response = await firstValueFrom(
        this.http.post(`${this.API_URL}/orders/${orderNumber}/payments/cancel`, {})
      );
      console.log('✅ Pago cancelado:', response);
      
      this.isProcessingPaymentSignal.set(false);
      this.paymentStatusSignal.set('CANCELLED');
      this.paymentErrorSignal.set(null);
      
      return response;
    } catch (error) {
      console.error('❌ Error al cancelar pago:', error);
      throw error;
    }
  }

  // ===== MÉTODOS PARA VERIFICAR PAGO =====

  checkPaymentStatus(orderId: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.API_URL}/orders/${orderId}/payment-status`).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error al verificar pago:', error);
        return of({
          orderNumber: orderId,
          paymentMethod: '',
          status: 'FAILED' as PaymentStatus,
          amount: 0,
          message: 'Error al verificar pago'
        });
      })
    );
  }

  waitForPaymentConfirmation(orderId: number, maxAttempts: number = 30): Observable<PaymentResponse> {
    let attempts = 0;
    return interval(1000).pipe(
      takeWhile(() => attempts < maxAttempts),
      switchMap(() => {
        attempts++;
        return this.checkPaymentStatus(orderId);
      })
    );
  }

  // ===== MÉTODOS PARA MESERO =====

  getOrders(page: number = 0, size: number = 10, status?: string): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<any>(`${this.API_URL}/orders`, { params });
  }

  getActiveOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/orders/active`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/orders/${orderId}`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.API_URL}/orders/${orderId}/status`, { status });
  }

  completeOrder(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${this.API_URL}/orders/${orderId}/complete`, {});
  }

  startPreparingOrder(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${this.API_URL}/orders/${orderId}/start-preparing`, {});
  }

  markOrderReady(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${this.API_URL}/orders/${orderId}/ready`, {});
  }

  cancelOrder(orderId: number, reason?: string): Observable<Order> {
    return this.http.patch<Order>(`${this.API_URL}/orders/${orderId}/cancel`, { reason });
  }

  getDailyStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/orders/stats/daily`);
  }

  getOrdersByTable(tableNumber: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.API_URL}/orders/table/${tableNumber}`);
  }

  // ===== PERSISTENCIA LOCAL =====

  private loadCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(this.itemsSignal()));
  }

  constructor() {
    effect(() => {
      this.persist();
    });
  }
}