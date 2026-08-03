import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  constructor(readonly order: OrderService) {}

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = 'assets/images/logo/yrelis-logo.svg';
  }
}
