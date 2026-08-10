import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.css',
})
export class ShoppingCartComponent {
  constructor(readonly order: OrderService) {}

  formatPrice(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
  }
}