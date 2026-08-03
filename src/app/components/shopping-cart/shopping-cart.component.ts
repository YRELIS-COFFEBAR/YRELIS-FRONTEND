import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-shopping-cart',
  imports: [RouterLink],
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
    const current = img.getAttribute('src') ?? '';
    if (current.includes('.svg')) {
      img.onerror = null;
      img.src = 'assets/images/placeholder.svg';
      return;
    }
    const name = current.split('/').pop()?.replace(/\.(png|jpe?g)$/i, '') ?? 'generic';
    img.src = `assets/images/placeholders/${name}.svg`;
  }
}
