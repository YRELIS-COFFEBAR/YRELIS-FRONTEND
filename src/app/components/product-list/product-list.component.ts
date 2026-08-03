import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CATEGORIES, PRODUCTS } from '../../data/products';
import { Product } from '../../models/product.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent {
  readonly categories = CATEGORIES;
  readonly allProducts = PRODUCTS;

  readonly selectedCategory = signal<string>('all');
  readonly searchTerm = signal<string>('');

  readonly visibleProducts = computed<Product[]>(() => {
    const category = this.selectedCategory();
    const query = this.searchTerm().trim().toLowerCase();
    return this.allProducts.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  readonly sectionTitle = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') {
      return 'Nuestro Menú';
    }
    return this.categories.find((cat) => cat.id === category)?.name ?? 'Menú';
  });

  constructor(readonly order: OrderService) {}

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  quantityOf(productId: string): number {
    return this.order.getQuantity(productId);
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

  formatPrice(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }
}
