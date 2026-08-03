import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  {
    path: 'menu',
    loadComponent: () => import('./components/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'carrito',
    loadComponent: () => import('./components/shopping-cart/shopping-cart.component').then((m) => m.ShoppingCartComponent),
  },
  {
    path: 'pago',
    loadComponent: () => import('./components/payment/payment.component').then((m) => m.PaymentComponent),
  },
  { path: '**', redirectTo: 'menu' },
];
