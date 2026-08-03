# Yrelis CoffeeBar - Frontend (Tablet)

Sistema de pedidos para **Yrelis CoffeeBar** pensado para tablet y cualquier dispositivo
(celular, computadora). Angular 20 (standalone) + tema marrón oscuro / azul profundo.

El cliente arma su pedido, elige método de pago (**Yape**, **Plin** o **tarjeta Visa**)
y al confirmar se muestra el QR de Yape/Plin o la pantalla de "acerca la tarjeta" al
terminal Izipay.

> El flujo de pago actual es de **frontend**: el pedido se confirma de forma local.
> En el backend (Spring Boot + MySQL) se conectará el cobro real con **Izipay**
> (ver `src/app/services/order.service.ts` → `placeOrder`).

---

## Requisitos

- **Node.js** >= 20.19.1 (se probó con Node 22)
- **npm** >= 10

## Instalación y ejecución

```bash
npm install
npm start          # ng serve --host 0.0.0.0 --port 4200
```

Abrir en la tablet/celular/PC de la red: `http://<IP-de-la-computadora>:4200`

Compilar para producción:

```bash
npm run build          # dist/yrelis-coffeebar-frontend
npm run build:prod
```

---

## Imágenes

Las imágenes "de referencia" que ves (degradado + nombre del producto) son
**placeholders SVG** en `src/assets/images/placeholders/`.

Para poner las fotos reales, coloca tus imágenes en:

```
src/assets/images/products/        → ej. lomo-saltado.jpg, cafes.jpg ...
src/assets/images/logo/            → yrelis-logo.png  (el logo real)
src/assets/images/payments/        → qr-yape.png, qr-plin.png  (los QR reales)
```

El sistema **usa automáticamente tu foto** cuando el archivo existe. Si no existe,
muestra el placeholder con el nombre del producto. Los nombres de archivo deben
coincidir con los que usa la app (revisa `src/app/data/products.ts`).

## Estructura

```
yrelis-coffeebar-frontend/
├── src/
│   ├── app/
│   │   ├── models/product.model.ts        # Producto, categoría, carrito, pedido
│   │   ├── data/products.ts               # Menú completo (categorías + productos)
│   │   ├── services/order.service.ts      # Carrito + pedido (punto de conexión Izipay)
│   │   ├── components/
│   │   │   ├── header/                    # Logo + acceso al pedido
│   │   │   ├── product-list/              # Menú con categorías y búsqueda
│   │   │   ├── shopping-cart/             # Carrito con cantidades
│   │   │   └── payment/                   # Yape / Plin / Visa + confirmación
│   │   ├── app.component.*                # Raíz de la app
│   │   ├── app.config.ts                  # Configuración (standalone)
│   │   └── app.routes.ts                  # /menu, /carrito, /pago
│   ├── assets/images/                     # Productos, logo, QR, placeholders
│   └── styles.css                         # Tema global (marrón + azul)
├── angular.json
├── package.json
├── tsconfig.json
├── Jenkinsfile
└── README.md
```

## Próximos pasos (backend)

1. **Spring Boot** expondrá `POST /api/pedidos` (guardar pedido en MySQL).
2. **Izipay**: tarjeta → el backend crea una transacción; Yape/Plin → QR dinámico.
3. El `order.service.ts` ya tiene el punto marcado (`placeOrder`) para conectar.
