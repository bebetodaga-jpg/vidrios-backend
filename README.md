# Vidrios Galaxi — API (monolito modular)

Esqueleto del Sprint 0 (Tech Lead). Stack: **NestJS + TypeScript strict + Prisma + PostgreSQL 16 + Redis**.
Documentos que gobiernan este código:

- [Estándares de código](../gestion-proyecto/tech-lead/sprint-0/estandares-de-codigo.md) — OOP en dominio, funciones puras en cálculos, SOLID pragmático, naming, Resultado<T>, Git.
- [Arquitectura y modelo de datos](../gestion-proyecto/tech-lead/sprint-0/arquitectura-y-modelo-de-datos.md) — mapa de módulos, reglas de dependencia, ADRs.

## Arranque rápido

```bash
# 1) Infraestructura local (PostgreSQL + Redis)
docker compose up -d postgres redis

# 2) Dependencias y base de datos
npm install
copy .env.example .env        # editar JWT_SECRET
npm run prisma:migrate        # crea las tablas del modelo inicial
npm run prisma:generate

# 3) Desarrollo
npm run start:dev             # API en http://localhost:3000/api
npm test                      # pruebas de dominio (producto.spec.ts)
npm run lint                  # estándares: falla con any, dominio importando framework, etc.
```

## Estructura (módulo `catalogo` = plantilla para todos)

```
src/
├── shared/
│   ├── dominio/            Resultado<T>, Dinero (céntimos), medidas (cm → pie²/m²)
│   └── infraestructura/    PrismaService
└── modules/
    ├── identidad/          login JWT, JwtAuthGuard, @Roles + RolesGuard
    └── catalogo/           ★ REFERENCIA hexagonal
        ├── dominio/        Producto (invariantes), precio.calculos (puras), puerto repositorio
        ├── aplicacion/     crear-producto, buscar-productos (casos de uso)
        ├── infraestructura/ adaptador Prisma, controller HTTP
        └── catalogo.module.ts  (cableado puerto → adaptador)
```

**Regla de oro:** `dominio/` no importa NestJS ni Prisma (lo vigila ESLint). Los módulos no se importan entre sí: eventos de dominio o puertos públicos.

## Endpoints del esqueleto

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/login` | público | `{ usuario, password }` → JWT (8 h) |
| POST | `/api/catalogo/productos` | **GERENTE** | Crea producto; rechaza crudo por m², templado por pie², vidrio sin grosor |
| GET | `/api/catalogo/productos?buscar=` | autenticado | Búsqueda rápida para POS/catálogo |

## Reglas del negocio ya codificadas (no son configurables por accidente)

- Dinero en **céntimos enteros**, siempre inc. IGV; medidas en **cm enteros**.
- Vidrio **crudo/catedral/espejo → pie²** (1 pie = 30.48 cm); **templado → m²**; perfiles por **barrilla 6.00/6.40 m**.
- Solo **GERENTE** crea/edita productos. Remetreo solo GERENTE/MAESTRO (modelo `Medida` versionado, se implementa en S5).
- Kárdex inmutable con índice `(productoId, creadoEn)`; retazos como entidad propia para el optimizador (S8).
