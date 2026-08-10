import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductService, Product, Category } from '../../services/product.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  readonly order = inject(OrderService);

  categories = signal<Category[]>([]);
  allProducts = signal<Product[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  selectedCategory = signal<string>('all');
  searchTerm = signal<string>('');

  readonly visibleProducts = computed<Product[]>(() => {
    const category = this.selectedCategory();
    const query = this.searchTerm().trim().toLowerCase();
    const products = this.allProducts();
    
    return products.filter((product) => {
      const matchesCategory = category === 'all' || product.category_id === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  });

  readonly sectionTitle = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') {
      return 'Nuestro Menú';
    }
    const cat = this.categories().find((c) => c.id === category);
    return cat?.name ?? 'Menú';
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.loadCategories(),
      this.loadProducts()
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.productService.getCategories().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.categories.set(response.data);
          }
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar categorías:', error);
          this.error.set('Error al cargar categorías');
          resolve();
        }
      });
    });
  }

  loadProducts(): Promise<void> {
    return new Promise((resolve) => {
      this.productService.getProducts().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.allProducts.set(response.data);
          }
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.error.set('Error al cargar productos');
          resolve();
        }
      });
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  quantityOf(productId: string): number {
    return this.order.getQuantity(productId);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
  }

  formatPrice(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }

  retry(): void {
    this.loadData();
  }
}