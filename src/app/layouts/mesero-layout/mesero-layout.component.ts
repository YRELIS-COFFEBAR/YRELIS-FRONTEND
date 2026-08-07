import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common'; // ← Solo CommonModule
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-mesero-layout',
  standalone: true,
  imports: [CommonModule, FormsModule], // ← DatePipe ya está en CommonModule
  templateUrl: './mesero-layout.component.html',
  styleUrl: './mesero-layout.component.css'
})
export class MeseroLayoutComponent implements OnInit, OnDestroy {

  private orderService = inject(OrderService);
  private wsService = inject(WebSocketService);

  // Estados
  pedidosActivos: Order[] = [];
  pedidosHistorial: Order[] = [];
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  filtroEstado = signal<string>('all');
  
  // Estadísticas
  stats = signal<any>({
    totalPedidos: 0,
    totalVentas: 0,
    pedidosPendientes: 0,
    pedidosCompletados: 0,
    mesasActivas: 0
  });

  // Computed para filtrar pedidos
  pedidosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'all') return this.pedidosActivos;
    return this.pedidosActivos.filter(p => p.status === filtro);
  });

  // 🆕 NUEVOS COMPUTED PARA CONTADORES
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
    // Escuchar nuevos pedidos en tiempo real
    this.wsService.onNewOrder().subscribe((pedido: Order) => {
      console.log('📦 Nuevo pedido recibido vía WebSocket:', pedido);
      this.agregarNuevoPedido(pedido);
      this.reproducirSonido();
      this.actualizarEstadisticas();
    });

    // Escuchar actualizaciones de pedidos
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

  // ===== CARGAR DATOS =====

  private cargarPedidos() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.getActiveOrders().subscribe({
      next: (pedidos) => {
        this.pedidosActivos = pedidos;
        this.isLoading.set(false);
        this.actualizarEstadisticas();
      },
      error: (error) => {
        console.error('❌ Error cargando pedidos:', error);
        this.errorMessage.set('Error al cargar los pedidos. Por favor, recarga la página.');
        this.isLoading.set(false);
        // Datos de ejemplo si falla la conexión
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
        // Estadísticas de ejemplo
        this.stats.set({
          totalPedidos: this.pedidosActivos.length,
          totalVentas: this.pedidosActivos.reduce((sum, p) => sum + p.total, 0),
          pedidosPendientes: this.pedidosActivos.filter(p => p.status === 'PENDING' || p.status === 'PAID').length,
          pedidosCompletados: 0,
          mesasActivas: new Set(this.pedidosActivos.map(p => p.tableNumber)).size
        });
      }
    });
  }

  // ===== DATOS DE EJEMPLO (SI NO HAY BACKEND) =====

  private cargarDatosEjemplo() {
    this.pedidosActivos = [
      {
        id: 1,
        orderNumber: 'ORD-2026-001',
        customerName: 'María',
        tableNumber: 5,
        paymentMethod: 'YAPE',
        items: [
          { productId: '1', productName: 'Lomo Saltado', quantity: 2, price: 28.00, subtotal: 56.00 },
          { productId: '2', productName: 'Chicha Morada', quantity: 1, price: 8.00, subtotal: 8.00 }
        ],
        subtotal: 64.00,
        total: 64.00,
        status: 'PAID',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        orderNumber: 'ORD-2026-002',
        customerName: 'Carlos',
        tableNumber: 3,
        paymentMethod: 'PLIN',
        items: [
          { productId: '3', productName: 'Ceviche', quantity: 1, price: 35.00, subtotal: 35.00 },
          { productId: '4', productName: 'Inca Kola', quantity: 2, price: 5.00, subtotal: 10.00 }
        ],
        subtotal: 45.00,
        total: 45.00,
        status: 'PENDING',
        paymentStatus: 'PAID',
        createdAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 3,
        orderNumber: 'ORD-2026-003',
        customerName: 'Ana',
        tableNumber: 7,
        paymentMethod: 'VISA',
        items: [
          { productId: '5', productName: 'Pizza Margherita', quantity: 1, price: 32.00, subtotal: 32.00 },
          { productId: '6', productName: 'Ensalada', quantity: 1, price: 15.00, subtotal: 15.00 }
        ],
        subtotal: 47.00,
        total: 47.00,
        status: 'PREPARING',
        paymentStatus: 'PAID',
        createdAt: new Date(Date.now() - 600000).toISOString()
      }
    ];
    this.isLoading.set(false);
  }

  // ===== FUNCIONES DEL MESERO =====

  private agregarNuevoPedido(pedido: Order) {
    // Agregar al inicio de la lista con animación
    this.pedidosActivos.unshift({
      ...pedido,
      status: 'PENDING',
      nuevo: true
    });
    
    // Actualizar estadísticas
    this.actualizarEstadisticas();

    // Quitar animación después de 3 segundos
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
      pedido.status = nuevoStatus as any;
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
      mesasActivas: new Set(activos.map(p => p.tableNumber)).size
    }));
  }

  // ===== ACCIONES =====

  aceptarPedido(orderId: number) {
    this.orderService.updateOrderStatus(orderId, 'PREPARING').subscribe({
      next: (pedido) => {
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          this.pedidosActivos[index].status = 'PREPARING';
        }
        this.wsService.notifyOrderReady(orderId);
      },
      error: (error) => console.error('Error al aceptar pedido:', error)
    });
  }

  marcarListo(orderId: number) {
    this.orderService.markOrderReady(orderId).subscribe({
      next: (pedido) => {
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          this.pedidosActivos[index].status = 'READY';
        }
        this.wsService.notifyOrderReady(orderId);
      },
      error: (error) => console.error('Error al marcar listo:', error)
    });
  }

  completarPedido(orderId: number) {
    this.orderService.completeOrder(orderId).subscribe({
      next: (pedido) => {
        // Mover al historial
        const index = this.pedidosActivos.findIndex(p => p.id === orderId);
        if (index !== -1) {
          const pedidoCompletado = this.pedidosActivos.splice(index, 1)[0];
          this.pedidosHistorial.unshift(pedidoCompletado);
        }
        this.actualizarEstadisticas();
        this.wsService.notifyOrderCompleted(orderId);
      },
      error: (error) => console.error('Error al completar pedido:', error)
    });
  }

  // ===== UTILIDADES =====

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

  getTimeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  // Filtros
  cambiarFiltro(filtro: string) {
    this.filtroEstado.set(filtro);
  }

  // Refrescar
  refrescar() {
    this.cargarPedidos();
    this.cargarEstadisticas();
  }
}