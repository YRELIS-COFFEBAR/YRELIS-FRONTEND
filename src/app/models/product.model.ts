export interface ProductAddon {
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  badge?: string;
  unit?: string;
  addon?: ProductAddon;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export type PaymentMethod = 'yape' | 'plin' | 'visa';

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
}
