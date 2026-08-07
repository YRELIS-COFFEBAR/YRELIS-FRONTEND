import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

import { CartItem, OrderInfo, PaymentMethod, Product } from '../models/product.model';
import { Order } from '../models/order.model';

const CART_KEY = 'yrelis-cart';
const API_URL = 'http://localhost:8080';

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

type PaymentResultStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

interface PaymentResponse {
  orderNumber: number;
  paymentMethod: string;
  status: PaymentResultStatus;
  transactionId?: string;
  amount: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  /* ---------------- Estado del carrito ---------------- */
  private readonly itemsSignal = signal<CartItem[]>(this.loadCart());
  readonly items = this.itemsSignal.asReadonly();

  readonly count = computed(() => this.itemsSignal().reduce((total, item) => total + item.quantity, 0));

  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.product.price * item.quantity, 0),
  );

  readonly isEmpty = computed(() => this.itemsSignal().length === 0);

  private readonly lastOrderSignal = signal<OrderInfo | null>(null);
  readonly lastOrder = this.lastOrderSignal.asReadonly();

  /* ---------------- Operaciones del carrito ---------------- */
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
      items.map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  }

  decrement(productId: string): void {
    this.itemsSignal.update((items) =>
      items
        .map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  remove(productId: string): void {
    this.itemsSignal.update((items) => items.filter((item) => item.product.id !== productId));
  }

  clear(): void {
    this.itemsSignal.set([]);
  }

  getQuantity(productId: string): number {
    return this.itemsSignal().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  /* ---------------- Pedido (backend Spring Boot + Izipay) ---------------- */
  async placeOrder(customerName: string, paymentMethod: PaymentMethod): Promise<OrderInfo> {
    const items = this.itemsSignal();
    const payload: CreateOrderPayload = {
      customerName: customerName.trim() || 'Cliente',
      paymentMethod,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        addonName: item.product.addon?.label,
        addonPrice: item.product.addon?.price,
      })),
    };

    const order = await firstValueFrom(this.http.post<OrderResponse>(`${API_URL}/api/orders`, payload));

    const payment = await firstValueFrom(
      this.http.post<PaymentResponse>(`${API_URL}/api/orders/${order.orderNumber}/payments`, {
        paymentMethod,
      }),
    );

    if (payment.status !== 'APPROVED') {
      throw new Error(payment.message ?? 'El pago fue rechazado.');
    }

    const info: OrderInfo = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      paymentMethod,
      items,
      subtotal: order.subtotal,
      total: order.total,
      createdAt: new Date(order.createdAt),
    };
    this.lastOrderSignal.set(info);
    this.itemsSignal.set([]);
    return info;
  }

  /* ================================================================
     🔥 NUEVOS MÉTODOS PARA EL MESERO
     ================================================================ */

  /**
   * Obtener todos los pedidos con paginación y filtros
   */
  getOrders(page: number = 0, size: number = 10, status?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<any>(`${API_URL}/api/orders`, { params });
  }

  /**
   * Obtener pedidos activos (PENDING, PAID, PREPARING, READY)
   */
  getActiveOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/api/orders/active`);
  }

  /**
   * Obtener pedido por ID
   */
  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${API_URL}/api/orders/${orderId}`);
  }

  /**
   * Actualizar estado del pedido
   */
  updateOrderStatus(orderId: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/api/orders/${orderId}/status`, { status });
  }

  /**
   * Marcar pedido como completado
   */
  completeOrder(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/api/orders/${orderId}/complete`, {});
  }

  /**
   * Marcar pedido como en preparación
   */
  startPreparingOrder(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/api/orders/${orderId}/start-preparing`, {});
  }

  /**
   * Marcar pedido como listo para servir
   */
  markOrderReady(orderId: number): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/api/orders/${orderId}/ready`, {});
  }

  /**
   * Cancelar pedido
   */
  cancelOrder(orderId: number, reason?: string): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/api/orders/${orderId}/cancel`, { reason });
  }

  /**
   * Obtener estadísticas del día
   */
  getDailyStats(): Observable<any> {
    return this.http.get<any>(`${API_URL}/api/orders/stats/daily`);
  }

  /**
   * Obtener pedidos por mesa
   */
  getOrdersByTable(tableNumber: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/api/orders/table/${tableNumber}`);
  }

  /* ---------------- Persistencia local ---------------- */
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