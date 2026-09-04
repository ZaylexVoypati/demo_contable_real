# Demo Contable Real — Todo el Ecosistema VoyPati

Demo que **muestra la realidad contable del sistema tal como funciona hoy**:
simula un día completo donde una orden **viaja por todos los servicios reales**
(mercado → proveedores → express → core → accounting) y se contabiliza en
**cada entidad** (VoyPati, negocios, conductores y caja del mercado) con
**liquidación entre entidades** y **conciliación cruzada**.

Usa **toda la estructura real**: 21 modelos extraídos de los 5 backends + el
panel frontend (con su `archivo:línea`), los **22 repositorios reales** de
`voypati-tech` en GitHub, y las **reglas de negocio exactas** (comisión 10%,
profit conductor 90%, fórmula del consolidado).

> Node.js 18+ · Cero dependencias · Reproducible (semilla fija).

---

## 1. Qué simula (tal como funciona hoy)

```
   CLIENTE paga en la CAJA DEL MERCADO (vpt_mercado · CashRegister)
        │
        ├──► NEGOCIO recibe el 90% neto de sus productos (vpt_proveedores · Account)
        │        comisión 10% → VoyPati · factura FAC-2026-XXXXX (Invoice)
        │        retiros (Withdrawal)
        │
        ├──► CONDUCTOR recibe el 90% de la tarifa (vpt_express · DriverWallet)
        │        comisión 10% de la tarifa → VoyPati (commission_voypati)
        │
        ├──► VOYPATI registra ingresos por comisiones (CompanyWallet/CompanyTransaction)
        │        y gastos: cupones, promotores, nómina, operativos, impuestos
        │
        └──► CORE emite eventos de dominio (outbox) y procesa referidos
               (comisión de promotor sobre el referido)
```

Las reglas reales aplicadas:
| Regla | Valor | Fuente real |
|---|---|---|
| Comisión de negocio | **10%** de los productos | `finance/models.py:197` |
| Profit conductor | **90%** de la tarifa | `logistics/models.py:927` |
| Comisión express | **10%** de la tarifa | `wallets/utils.py:56` |
| Consolidado mercado | `win = ingreso − inversión + mensajería − profit_mensajeros − comisión` | `getMetricsAll.ts:220` |
| Eventos de dominio | `orders.order.completed`, `express.shipment.delivered`, `market.expense.created`, `finance.invoice.issued`, `core.referral.claimed` | `vpt-core/config/settings/base.py` |

---

## 2. Entidades y contabilidad por servicio

Cada entidad tiene **su propio libro mayor de partida doble** (Debe = Haber):

| Entidad | Servicio real | Qué registra |
|---|---|---|
| `voypati` | `vpt_express/accounting` | CompanyWallet: ingresos por comisiones y gastos corporativos |
| `business:HUE1` … | `vpt_proveedores/finance` | Account: ventas netas (90%), COGS, inventario, retiros |
| `driver:D1` … | `vpt_express/wallets` | DriverWallet: 90% de las tarifas de sus entregas |
| `caja:M1` | `vpt_mercado/expense_manager` | CashRegister: cobra al cliente y liquida a todas las entidades |

---

## 3. Resultado del día (semilla 20260904)

- 30 órdenes, 22 repos reales de GitHub, 21 modelos del core
- **Mercado:** GMV 7,434.50 CUP · ganancia (win) **2,286.05 CUP** · 3 gastos con leyenda (430 CUP)
- **Proveedores:** resultado neto de negocios **1,147.55 CUP** · 3 facturas FAC-2026 · 2 retiros
- **Express:** billeteras de conductores **931.50 CUP** (90% de tarifas)
- **VoyPati:** ingresos por comisiones 743.45 CUP · neto **126.77 CUP** · **ROI 17.05%**
- **Conciliación cruzada: las 4 verificaciones cuadran ✔**
  1. Negocios = 90% de productos ✔
  2. Conductores = 90% de tarifas ✔
  3. VoyPati = 10% productos + 10% tarifas ✔
  4. Caja del mercado cuadra (liquidación ± gastos operativos) ✔

---

## 4. Cómo ejecutarlo (VS Code)

### A) Demo visual en el navegador (recomendado)

Abre el **Panel de Operaciones** interactivo con el diseño real de tu panel
(sidebar, KPIs, tablas, badges naranja `#FF7500`):

```bash
npm run visual          # o doble clic en public/demo.html
```

Todo corre en el navegador (sin servidor). Botones funcionales para **simular el
flujo completo**:

| Botón | Qué hace |
|---|---|
| **▶ Iniciar día** | Apertura de entidades (VoyPati, negocios, conductores, caja) + genera 20 órdenes |
| **Procesar 1 orden** | Liquida la siguiente orden: la recorre por mercado → proveedores → express → core |
| **Procesar todas** | Liquida todas las órdenes de una vez |
| **Registrar gastos** | Gastos del mercado (leyendas) + cupones, opex e impuestos de VoyPati |
| **Facturas** | Emite `FAC-2026-XXXXX` de comisiones por negocio |
| **Retiros** | Retiros de capital de los negocios |
| **Liquidar** (por fila) | Procesa una orden concreta desde la tabla |
| Sidebar | 12 vistas: Dashboard, Órdenes, Caja, Ingresos, Gastos, Billetera, Facturas, Consolidado, Negocios, Conductores, Conciliación, Eventos, Resumen |

Al terminar el flujo, la vista **Conciliación** muestra las 4 verificaciones
cruzadas con ✔ (todo cuadra) y el **Resumen final** las métricas del día.

### B) Demo en consola (CLI)

```bash
node scripts/extract-core-real.js    # esquema real del core (opcional)
node scripts/github-org-snapshot.js  # todos los repos de GitHub (opcional)
node src/simulate.js                 # día completo del ecosistema
```

O abre `run.ps1` en la terminal de VS Code para el menú.

Salidas:
- `data/core-schema-real.json` — 21 modelos reales con procedencia.
- `data/github-org-snapshot.json` — 22 repos reales.
- `output/dia-ecosistema.json` — reporte completo (órdenes, eventos, asientos por entidad).

---

## 5. Estructura

```
demo_contable_real/
├─ package.json / README.md / run.ps1
├─ public/
│  └─ demo.html                  # Panel de Operaciones interactivo (navegador)
├─ data/
│  ├─ core-schema-real.json       # esquema real (generado)
│  └─ github-org-snapshot.json    # todos los repos (generado)
├─ scripts/
│  ├─ extract-core-real.js        # 18 archivos de los 5 backends + panel
│  └─ github-org-snapshot.js      # org-wide voypati-tech
├─ src/
│  ├─ main.js / simulate.js       # CLI y orquestador del día
│  ├─ core/
│  │  └─ engine.js                # World multi-entidad (ledger por entidad)
│  ├─ services/
│  │  ├─ mercado.js               # órdenes, caja, gastos, nómina, consolidado
│  │  ├─ proveedores.js           # negocios, facturas, retiros
│  │  ├─ express.js               # envíos, billeteras de conductores (90/10)
│  │  └─ core.js                  # outbox + referidos
│  ├─ flow/
│  │  └─ orderJourney.js          # viaje end-to-end de una orden
│  ├─ modules/
│  │  ├─ voypati.js               # contabilidad corporativa + outbox
│  │  ├─ negocios.js              # cuentas por negocio + facturas
│  │  ├─ conductores.js           # billeteras de conductores
│  │  ├─ caja.js                  # caja del mercado + consolidado
│  │  ├─ reconciliacion.js        # conciliación cruzada entre servicios
│  │  └─ resumen.js               # resumen final del ecosistema
│  └─ lib/
│     ├─ github.js                # GitHub org-wide
│     └─ coreData.js              # carga del esquema real
└─ output/
   └─ dia-ecosistema.json
```