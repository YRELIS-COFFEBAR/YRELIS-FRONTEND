import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  
  // Rutas para clientes (Tablet)
  {
    path: 'menu',
    loadComponent: () => import('./components/product-list/product-list.component')
      .then((m) => m.ProductListComponent),
  },
  {
    path: 'carrito',
    loadComponent: () => import('./components/shopping-cart/shopping-cart.component')
      .then((m) => m.ShoppingCartComponent),
  },
  {
    path: 'pago',
    loadComponent: () => import('./components/payment/payment.component')
      .then((m) => m.PaymentComponent),
  },
  
  // 🆕 RUTA PARA MESEROS (PC)
  {
    path: 'panel',
    loadComponent: () => import('./layouts/mesero-layout/mesero-layout.component')
      .then((m) => m.MeseroLayoutComponent),
  },
  
  { path: '**', redirectTo: 'menu' },
];