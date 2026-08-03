import { Injectable, computed, effect, signal } from '@angular/core';

import { CartItem, OrderInfo, PaymentMethod, Product } from '../models/product.model';

const CART_KEY = 'yrelis-cart';
const ORDER_COUNTER_KEY = 'yrelis-order-counter';

@Injectable({ providedIn: 'root' })
export class OrderService {
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

  /* ---------------- Pedido ---------------- */
  /**
   * Registra el pedido de forma local.
   * TODO-backend: aquí se conectará con Spring Boot + Izipay.
   * 1. Enviar el pedido (items, cliente, método de pago) al backend.
   * 2. Iniciar transacción en el terminal POS Izipay (tarjeta) o generar QR (yape/plin).
   * 3. Recibir la confirmación del pago y guardar el pedido en MySQL.
   */
  placeOrder(customerName: string, paymentMethod: PaymentMethod): Promise<OrderInfo> {
    const items = this.itemsSignal();
    const order: OrderInfo = {
      orderNumber: this.nextOrderNumber(),
      customerName: customerName.trim() || 'Cliente',
      paymentMethod,
      items,
      subtotal: this.subtotal(),
      total: this.subtotal(),
      createdAt: new Date(),
    };

    return new Promise((resolve) => {
      setTimeout(() => {
        this.lastOrderSignal.set(order);
        this.itemsSignal.set([]);
        resolve(order);
      }, 1800);
    });
  }

  private nextOrderNumber(): number {
    const raw = localStorage.getItem(ORDER_COUNTER_KEY);
    const current = raw ? Number(raw) : 100;
    const next = current + 1;
    localStorage.setItem(ORDER_COUNTER_KEY, String(next));
    return next;
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
