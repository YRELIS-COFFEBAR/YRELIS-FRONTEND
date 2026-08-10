import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { OrderService, Order } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';

// Extender la interfaz Order para incluir 'nuevo'
interface OrderConEstado extends Order {
  nuevo?: boolean;
}

@Component({
  selector: 'app-mesero-layout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mesero-layout.component.html',
  styleUrl: './mesero-layout.component.css'
})
export class MeseroLayoutComponent implements OnInit, OnDestroy {

  private orderService = inject(OrderService);
  private wsService = inject(WebSocketService);

  // Usar OrderConEstado en lugar de Order
  pedidosActivos: OrderConEstado[] = [];
  pedidosHistorial: OrderConEstado[] = [];
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  filtroEstado = signal<string>('all');
  
  stats = signal<any>({
    totalPedidos: 0,
    totalVentas: 0,
    pedidosPendientes: 0,
    pedidosCompletados: 0,
    mesasActivas: 0
  });

  pedidosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'all') return this.pedidosActivos;
    return this.pedidosActivos.filter(p => p.status === filtro);
  });

  totalPedidos = computed(() => this.pedidosActivos.length);
  
  pendientesCount = computed(() => 
    this.pedidosActivos.filter(p => p.status === 'PENDING' || p.status === 'PAID').length
  );
  
  preparandoCount = computed(() => 
    this.pedidosActivos.filter(p => p.status === 'PREPARING').length
  );
  
  listosCount = computed(() => 
    this.pedidosActivos.filter(p => p.status === 'READY').length
  );

  constructor() {
    this.wsService.onNewOrder().subscribe((pedido: Order) => {
      console.log('📦 Nuevo pedido recibido vía WebSocket:', pedido);
      // Convertir a OrderConEstado
      const pedidoConEstado: OrderConEstado = { ...pedido, nuevo: true };
      this.agregarNuevoPedido(pedidoConEstado);
      this.reproducirSonido();
      this.actualizarEstadisticas();
    });

    this.wsService.onOrderUpdate().subscribe((data: { orderId: number, status: string }) => {
      console.log('🔄 Pedido actualizado vía WebSocket:', data);
      this.actualizarEstadoPedido(data.orderId, data.status);
    });
  }

  ngOnInit() {
    this.cargarPedidos();
    this.cargarEstadisticas();
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  private cargarPedidos() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.getActiveOrders().subscribe({
      next: (pedidos) => {
        // Convertir a OrderConEstado
        this.pedidosActivos = pedidos.map(p => ({ ...p, nuevo: false }));
        this.isLoading.set(false);
        this.actualizarEstadisticas();
      },
      error: (error) => {
        console.error('❌ Error cargando pedidos:', error);
        this.errorMessage.set('Error al cargar los pedidos. Por favor, recarga la página.');
        this.isLoading.set(false);
        this.cargarDatosEjemplo();
      }
    });
  }

  private cargarEstadisticas() {
    this.orderService.getDailyStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('❌ Error cargando estadísticas:', error);
      }
    });
  }

  private cargarDatosEjemplo() {
    const ahora = new Date();
    const hace5Min = new Date(Date.now() - 300000);
    
    this.pedidosActivos = [
      {
        id: 1,
        orderNumber: 'ORD-2026-001',
        customerName: 'María',
        tableNumber: 5,
        paymentMethod: 'YAPE',
        items: [],
        subtotal: 64.00,
        total: 64.00,
        status: 'PAID',
        paymentStatus: 'PAID',
        createdAt: ahora,
        updatedAt: ahora,
        nuevo: false
      },
      {
        id: 2,
        orderNumber: 'ORD-2026-002',
        customerName: 'Carlos',
        tableNumber: 3,
        paymentMethod: 'PLIN',
        items: [],
        subtotal: 45.00,
        total: 45.00,
        status: 'PENDING',
        paymentStatus: 'PAID',
        createdAt: hace5Min,
        updatedAt: hace5Min,
        nuevo: false
      },
      {
        id: 3,
        orderNumber: 'ORD-2026-003',
        customerName: 'Ana',
        tableNumber: 7,
        paymentMethod: 'VISA',
        items: [],
        subtotal: 47.00,
        total: 47.00,
        status: 'PREPARING',
        paymentStatus: 'PAID',
        createdAt: new Date(Date.now() - 600000),
        updatedAt: new Date(Date.now() - 600000),
        nuevo: false
      }
    ];
    this.isLoading.set(false);
  }

  private agregarNuevoPedido(pedido: OrderConEstado) {
    pedido.nuevo = true;
    this.pedidosActivos.unshift(pedido);
    this.actualizarEstadisticas();

    setTimeout(() => {
      const idx = this.pedidosActivos.findIndex(p => p.id === pedido.id);
      if (idx !== -1) {
        this.pedidosActivos[idx].nuevo = false;
      }
    }, 3000);
  }

  private actualizarEstadoPedido(orderId: number, nuevoStatus: string) {
    const pedido = this.pedidosActivos.find(p => p.id === orderId);
    if (pedido) {
      pedido.status = nuevoStatus;
    }
    this.actualizarEstadisticas();
  }

  private actualizarEstadisticas() {
    const activos = this.pedidosActivos;
    this.stats.update(stats => ({
      ...stats,
      totalPedidos: activos.length,
      totalVentas: activos.reduce((sum, p) => sum + p.total, 0),
      pedidosPendientes: activos.filter(p => p.status === 'PENDING' || p.status === 'PAID').length,
      mesasActivas: new Set(activos.map(p => p.tableNumber).filter(Boolean)).size
    }));
  }

  aceptarPedido(orderId: number) {
    this.orderService.updateOrderStatus(orderId, 'PREPARING').subscribe({
      next: () => {
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          this.pedidosActivos[index].status = 'PREPARING';
        }
      },
      error: (error) => console.error('Error al aceptar pedido:', error)
    });
  }

  marcarListo(orderId: number) {
    this.orderService.markOrderReady(orderId).subscribe({
      next: () => {
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          this.pedidosActivos[index].status = 'READY';
        }
      },
      error: (error) => console.error('Error al marcar listo:', error)
    });
  }

  completarPedido(orderId: number) {
    this.orderService.completeOrder(orderId).subscribe({
      next: () => {
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          const pedidoCompletado = this.pedidosActivos.splice(index, 1)[0];
          this.pedidosHistorial.unshift(pedidoCompletado);
        }
        this.actualizarEstadisticas();
      },
      error: (error) => console.error('Error al completar pedido:', error)
    });
  }

  private reproducirSonido() {
    try {
      const audio = new Audio('/assets/sounds/new-order.mp3');
      audio.play().catch(() => {
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      });
    } catch {
      // Silencioso fallback
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': '⏳ Pendiente',
      'PAID': '✅ Pagado',
      'PREPARING': '👨‍🍳 Preparando',
      'READY': '🍽️ Listo',
      'COMPLETED': '✔️ Completado',
      'CANCELLED': '❌ Cancelado'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'PAID': 'status-paid',
      'PREPARING': 'status-preparing',
      'READY': 'status-ready',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || '';
  }

  getPaymentIcon(method: string): string {
    const icons: Record<string, string> = {
      'YAPE': 'assets/images/payments/logo-yape.png',
      'PLIN': 'assets/images/payments/logo-plin.png',
      'VISA': 'assets/images/payments/logo-visa.png',
      'MASTERCARD': 'assets/images/payments/logo-mastercard.png'
    };
    return icons[method] || 'assets/images/payments/logo-default.png';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = 'assets/images/payments/logo-default.png';
  }

  formatPrice(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }

  getTimeAgo(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const diff = Date.now() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  cambiarFiltro(filtro: string) {
    this.filtroEstado.set(filtro);
  }

  refrescar() {
    this.cargarPedidos();
    this.cargarEstadisticas();
  }
}