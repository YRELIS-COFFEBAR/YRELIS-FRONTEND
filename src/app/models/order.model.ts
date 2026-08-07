export interface OrderItem {
  id?: number;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  tableNumber: number;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  updatedAt?: string;
  nuevo?: boolean; // Para animación
}

export interface OrderResponse {
  content: Order[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PaymentRequest {
  paymentMethod: string;
  amount: number;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
}