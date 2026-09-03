// GENERADO AUTOMÁTICAMENTE por scripts/generate-pages-registry.mjs
// No editar a mano. Regenerar: npx tsx scripts/generate-pages-registry.mjs

import { createElement, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callAction } from '@/lib/api-client';
import { useRouteParams } from '@/lib/route-match';

const _cash_countComponent = lazy(() => import('./app/(app)/cash-count/page'));
const _cash_count_x_reportComponent = lazy(() => import('./app/(app)/cash-count/x-report/page'));
const _cash_count_z_reportComponent = lazy(() => import('./app/(app)/cash-count/z-report/page'));
const _cash_managementComponent = lazy(() => import('./app/(app)/cash-management/client'));
const _cash_register_closeComponent = lazy(() => import('./app/(app)/cash-register/close/page'));
const _cash_register_openComponent = lazy(() => import('./app/(app)/cash-register/open/page'));
const _categoriesComponent = lazy(() => import('./app/(app)/categories/client').then((m) => ({ default: m.CategoriesClient })));
const _collectionsComponent = lazy(() => import('./app/(app)/collections/client'));
const _customersComponent = lazy(() => import('./app/(app)/customers/client'));
const _customers_creditComponent = lazy(() => import('./app/(app)/customers/credit/client'));
const _dashboardComponent = lazy(() => import('./app/(app)/dashboard/page'));
const _delivery_routesComponent = lazy(() => import('./app/(app)/delivery-routes/client'));
const _delivery_routes_newComponent = lazy(() => import('./app/(app)/delivery-routes/new/client'));
const _delivery_routes__id_Component = lazy(() => import('./app/(app)/delivery-routes/[id]/client'));
const _inventory_categoriesComponent = lazy(() => import('./app/(app)/inventory/categories/page'));
const _inventoryComponent = lazy(() => import('./app/(app)/inventory/client'));
const _inventory_historyComponent = lazy(() => import('./app/(app)/inventory/history/client'));
const _inventory_import_historyComponent = lazy(() => import('./app/(app)/inventory/import-history/client').then((m) => ({ default: m.ImportHistoryClient })));
const _inventory_import_history__id_Component = lazy(() => import('./app/(app)/inventory/import-history/[id]/client').then((m) => ({ default: m.ImportHistoryDetailsClient })));
const _jewelry_daily_closingComponent = lazy(() => import('./app/(app)/jewelry/daily-closing/client').then((m) => ({ default: m.JewelryDailyClosingClient })));
const _jewelry_gold_purchaseComponent = lazy(() => import('./app/(app)/jewelry/gold-purchase/client').then((m) => ({ default: m.GoldPurchaseClient })));
const _jewelry_inventoryComponent = lazy(() => import('./app/(app)/jewelry/inventory/client').then((m) => ({ default: m.JewelryInventoryClient })));
const _jewelry_productionComponent = lazy(() => import('./app/(app)/jewelry/production/client').then((m) => ({ default: m.JewelryProductionClient })));
const _jewelry_salesComponent = lazy(() => import('./app/(app)/jewelry/sales/client').then((m) => ({ default: m.JewelrySalesClient })));
const _jewelry_syncComponent = lazy(() => import('./app/(app)/jewelry/sync/client').then((m) => ({ default: m.JewelrySyncClient })));
const _kardexComponent = lazy(() => import('./app/(app)/kardex/client'));
const _ordersComponent = lazy(() => import('./app/(app)/orders/client'));
const _orders_newComponent = lazy(() => import('./app/(app)/orders/new/client'));
const _orders__id_Component = lazy(() => import('./app/(app)/orders/[id]/client'));
const _posComponent = lazy(() => import('./app/(app)/pos/client'));
const _purchasesComponent = lazy(() => import('./app/(app)/purchases/client'));
const _purchases_newComponent = lazy(() => import('./app/(app)/purchases/new/client'));
const _purchases_orders_newComponent = lazy(() => import('./app/(app)/purchases/orders/new/client'));
const _purchases_orders__id_Component = lazy(() => import('./app/(app)/purchases/orders/[id]/client'));
const _quotationsComponent = lazy(() => import('./app/(app)/quotations/client'));
const _reports_cash_closingsComponent = lazy(() => import('./app/(app)/reports/cash-closings/client'));
const _reportsComponent = lazy(() => import('./app/(app)/reports/client'));
const _settings_auditComponent = lazy(() => import('./app/(app)/settings/audit/client'));
const _settingsComponent = lazy(() => import('./app/(app)/settings/page'));
const _suppliersComponent = lazy(() => import('./app/(app)/suppliers/client'));
const _suppliers_newComponent = lazy(() => import('./app/(app)/suppliers/new/page'));
const _usersComponent = lazy(() => import('./app/(app)/users/client'));
const _lockedComponent = lazy(() => import('./app/(auth)/locked/page'));
const _reset_passwordComponent = lazy(() => import('./app/(auth)/reset-password/page'));
const _loginComponent = lazy(() => import('./app/login/page'));
const _offlineComponent = lazy(() => import('./app/offline/page'));
const _Component = lazy(() => import('./app/page'));
const _setupComponent = lazy(() => import('./app/setup/page'));

export interface PageEntry {
  Component: React.ComponentType<any>;
  requiresAuth: boolean;
}

const LoadingFallback = () =>
  createElement('div', { className: 'flex h-screen items-center justify-center bg-muted' },
    createElement('div', { className: 'flex items-center space-x-2' },
      createElement('div', { className: 'h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' }),
      createElement('span', { className: 'text-lg font-medium text-muted-foreground' }, 'Cargando...')
    )
  );

const _cash_countFallback = LoadingFallback;
const _cash_count_x_reportFallback = LoadingFallback;
const _cash_count_z_reportFallback = LoadingFallback;
const _cash_managementFallback = LoadingFallback;
const _cash_register_closeFallback = LoadingFallback;
const _cash_register_openFallback = LoadingFallback;
const _categoriesFallback = LoadingFallback;
const _collectionsFallback = LoadingFallback;
const _customersFallback = LoadingFallback;
const _customers_creditFallback = LoadingFallback;
const _dashboardFallback = LoadingFallback;
const _delivery_routesFallback = LoadingFallback;
const _delivery_routes_newFallback = LoadingFallback;
const _delivery_routes__id_Fallback = LoadingFallback;
const _inventory_categoriesFallback = LoadingFallback;
const _inventoryFallback = LoadingFallback;
const _inventory_historyFallback = LoadingFallback;
const _inventory_import_historyFallback = LoadingFallback;
const _inventory_import_history__id_Fallback = LoadingFallback;
const _jewelry_daily_closingFallback = LoadingFallback;
const _jewelry_gold_purchaseFallback = LoadingFallback;
const _jewelry_inventoryFallback = LoadingFallback;
const _jewelry_productionFallback = LoadingFallback;
const _jewelry_salesFallback = LoadingFallback;
const _jewelry_syncFallback = LoadingFallback;
const _kardexFallback = LoadingFallback;
const _ordersFallback = LoadingFallback;
const _orders_newFallback = LoadingFallback;
const _orders__id_Fallback = LoadingFallback;
const _posFallback = LoadingFallback;
const _purchasesFallback = LoadingFallback;
const _purchases_newFallback = LoadingFallback;
const _purchases_orders_newFallback = LoadingFallback;
const _purchases_orders__id_Fallback = LoadingFallback;
const _quotationsFallback = LoadingFallback;
const _reports_cash_closingsFallback = LoadingFallback;
const _reportsFallback = LoadingFallback;
const _settings_auditFallback = LoadingFallback;
const _settingsFallback = LoadingFallback;
const _suppliersFallback = LoadingFallback;
const _suppliers_newFallback = LoadingFallback;
const _usersFallback = LoadingFallback;
const _lockedFallback = LoadingFallback;
const _reset_passwordFallback = LoadingFallback;
const _loginFallback = LoadingFallback;
const _offlineFallback = LoadingFallback;
const _Fallback = LoadingFallback;
const _setupFallback = LoadingFallback;

const _cash_countWrapper = () => createElement(Suspense, { fallback: _cash_countFallback() }, createElement(_cash_countComponent, {}));

const _cash_count_x_reportWrapper = () => createElement(Suspense, { fallback: _cash_count_x_reportFallback() }, createElement(_cash_count_x_reportComponent, {}));

const _cash_count_z_reportWrapper = () => createElement(Suspense, { fallback: _cash_count_z_reportFallback() }, createElement(_cash_count_z_reportComponent, {}));

const _cash_managementWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_cash_management_initialUsers = useQuery({
    queryKey: ['_cash_management', 'initialUsers', null],
    queryFn: () => callAction('users', 'getUsers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialUsers = q_cash_management_initialUsers.data;
  if ([q_cash_management_initialUsers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _cash_managementFallback() }, createElement(_cash_managementComponent, queries));
};

const _cash_register_closeWrapper = () => createElement(Suspense, { fallback: _cash_register_closeFallback() }, createElement(_cash_register_closeComponent, {}));

const _cash_register_openWrapper = () => createElement(Suspense, { fallback: _cash_register_openFallback() }, createElement(_cash_register_openComponent, {}));

const _categoriesWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_categories_initialCategories = useQuery({
    queryKey: ['_categories', 'initialCategories', null],
    queryFn: () => callAction('categories', 'getCategories', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialCategories = q_categories_initialCategories.data;
  if ([q_categories_initialCategories].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _categoriesFallback() }, createElement(_categoriesComponent, queries));
};

const _collectionsWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_collections_initialCollections = useQuery({
    queryKey: ['_collections', 'initialCollections', null],
    queryFn: () => callAction('collections', 'getCollections', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialCollections = q_collections_initialCollections.data;
  if ([q_collections_initialCollections].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _collectionsFallback() }, createElement(_collectionsComponent, queries));
};

const _customersWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_customers_initialCustomers = useQuery({
    queryKey: ['_customers', 'initialCustomers', null],
    queryFn: () => callAction('customers', 'getAllCustomers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialCustomers = q_customers_initialCustomers.data;
  if ([q_customers_initialCustomers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _customersFallback() }, createElement(_customersComponent, queries));
};

const _customers_creditWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_customers_credit_initialCustomers = useQuery({
    queryKey: ['_customers_credit', 'initialCustomers', null],
    queryFn: () => callAction('customers', 'getAllCustomers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialCustomers = q_customers_credit_initialCustomers.data;
  if ([q_customers_credit_initialCustomers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _customers_creditFallback() }, createElement(_customers_creditComponent, queries));
};

const _dashboardWrapper = () => createElement(Suspense, { fallback: _dashboardFallback() }, createElement(_dashboardComponent, {}));

const _delivery_routesWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_delivery_routes_initialRoutes = useQuery({
    queryKey: ['_delivery_routes', 'initialRoutes', null],
    queryFn: () => callAction('delivery-routes', 'getDeliveryRoutes', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialRoutes = q_delivery_routes_initialRoutes.data;
  if ([q_delivery_routes_initialRoutes].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _delivery_routesFallback() }, createElement(_delivery_routesComponent, queries));
};

const _delivery_routes_newWrapper = () => createElement(Suspense, { fallback: _delivery_routes_newFallback() }, createElement(_delivery_routes_newComponent, {}));

const _delivery_routes__id_Wrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_delivery_routes__id__route = useQuery({
    queryKey: ['_delivery_routes__id_', 'route', params.id],
    queryFn: () => callAction('delivery-routes', 'getDeliveryRouteById', [params.id]).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? r.data : null) : r)),
    staleTime: 30_000,
  });
  queries.route = q_delivery_routes__id__route.data;
  if ([q_delivery_routes__id__route].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _delivery_routes__id_Fallback() }, createElement(_delivery_routes__id_Component, queries));
};

const _inventory_categoriesWrapper = () => createElement(Suspense, { fallback: _inventory_categoriesFallback() }, createElement(_inventory_categoriesComponent, {}));

const _inventoryWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_inventory_initialInventory = useQuery({
    queryKey: ['_inventory', 'initialInventory', null],
    queryFn: () => callAction('inventory', 'getInventory', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialInventory = q_inventory_initialInventory.data;
  const q_inventory_initialProducts = useQuery({
    queryKey: ['_inventory', 'initialProducts', null],
    queryFn: () => callAction('products', 'getProducts', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialProducts = q_inventory_initialProducts.data;
  const q_inventory_initialMovements = useQuery({
    queryKey: ['_inventory', 'initialMovements', null],
    queryFn: () => callAction('inventory', 'getInventoryMovements', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialMovements = q_inventory_initialMovements.data;
  if ([q_inventory_initialInventory, q_inventory_initialProducts, q_inventory_initialMovements].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _inventoryFallback() }, createElement(_inventoryComponent, queries));
};

const _inventory_historyWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_inventory_history_movements = useQuery({
    queryKey: ['_inventory_history', 'movements', null],
    queryFn: () => callAction('inventory', 'getInventoryMovements', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.movements = q_inventory_history_movements.data;
  if ([q_inventory_history_movements].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _inventory_historyFallback() }, createElement(_inventory_historyComponent, queries));
};

const _inventory_import_historyWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_inventory_import_history_history = useQuery({
    queryKey: ['_inventory_import_history', 'history', null],
    queryFn: () => callAction('import-history', 'getImportHistory', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.history = q_inventory_import_history_history.data;
  if ([q_inventory_import_history_history].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _inventory_import_historyFallback() }, createElement(_inventory_import_historyComponent, queries));
};

const _inventory_import_history__id_Wrapper = () => createElement(Suspense, { fallback: _inventory_import_history__id_Fallback() }, createElement(_inventory_import_history__id_Component, {}));

const _jewelry_daily_closingWrapper = () => createElement(Suspense, { fallback: _jewelry_daily_closingFallback() }, createElement(_jewelry_daily_closingComponent, {}));

const _jewelry_gold_purchaseWrapper = () => createElement(Suspense, { fallback: _jewelry_gold_purchaseFallback() }, createElement(_jewelry_gold_purchaseComponent, {}));

const _jewelry_inventoryWrapper = () => createElement(Suspense, { fallback: _jewelry_inventoryFallback() }, createElement(_jewelry_inventoryComponent, {}));

const _jewelry_productionWrapper = () => createElement(Suspense, { fallback: _jewelry_productionFallback() }, createElement(_jewelry_productionComponent, {}));

const _jewelry_salesWrapper = () => createElement(Suspense, { fallback: _jewelry_salesFallback() }, createElement(_jewelry_salesComponent, {}));

const _jewelry_syncWrapper = () => createElement(Suspense, { fallback: _jewelry_syncFallback() }, createElement(_jewelry_syncComponent, {}));

const _kardexWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_kardex_initialMovements = useQuery({
    queryKey: ['_kardex', 'initialMovements', null],
    queryFn: () => callAction('kardex', 'getInventoryMovements', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialMovements = q_kardex_initialMovements.data;
  if ([q_kardex_initialMovements].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _kardexFallback() }, createElement(_kardexComponent, queries));
};

const _ordersWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_orders_initialOrders = useQuery({
    queryKey: ['_orders', 'initialOrders', null],
    queryFn: () => callAction('orders', 'getOrders', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialOrders = q_orders_initialOrders.data;
  if ([q_orders_initialOrders].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _ordersFallback() }, createElement(_ordersComponent, queries));
};

const _orders_newWrapper = () => createElement(Suspense, { fallback: _orders_newFallback() }, createElement(_orders_newComponent, {}));

const _orders__id_Wrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_orders__id__order = useQuery({
    queryKey: ['_orders__id_', 'order', params.id],
    queryFn: () => callAction('orders', 'getOrderById', [params.id]).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? r.data : null) : r)),
    staleTime: 30_000,
  });
  queries.order = q_orders__id__order.data;
  if ([q_orders__id__order].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _orders__id_Fallback() }, createElement(_orders__id_Component, queries));
};

const _posWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_pos_initialProducts = useQuery({
    queryKey: ['_pos', 'initialProducts', null],
    queryFn: () => callAction('products', 'getProducts', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialProducts = q_pos_initialProducts.data;
  const q_pos_initialInventory = useQuery({
    queryKey: ['_pos', 'initialInventory', null],
    queryFn: () => callAction('inventory', 'getInventory', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialInventory = q_pos_initialInventory.data;
  if ([q_pos_initialProducts, q_pos_initialInventory].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _posFallback() }, createElement(_posComponent, queries));
};

const _purchasesWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_purchases_initialInvoices = useQuery({
    queryKey: ['_purchases', 'initialInvoices', null],
    queryFn: () => callAction('purchases', 'getPurchaseInvoices', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialInvoices = q_purchases_initialInvoices.data;
  const q_purchases_initialSuppliers = useQuery({
    queryKey: ['_purchases', 'initialSuppliers', null],
    queryFn: () => callAction('suppliers', 'getSuppliers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialSuppliers = q_purchases_initialSuppliers.data;
  const q_purchases_initialOrders = useQuery({
    queryKey: ['_purchases', 'initialOrders', null],
    queryFn: () => callAction('purchase-orders', 'getPurchaseOrders', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialOrders = q_purchases_initialOrders.data;
  if ([q_purchases_initialInvoices, q_purchases_initialSuppliers, q_purchases_initialOrders].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _purchasesFallback() }, createElement(_purchasesComponent, queries));
};

const _purchases_newWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_purchases_new_initialSuppliers = useQuery({
    queryKey: ['_purchases_new', 'initialSuppliers', null],
    queryFn: () => callAction('suppliers', 'getSuppliers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialSuppliers = q_purchases_new_initialSuppliers.data;
  if ([q_purchases_new_initialSuppliers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _purchases_newFallback() }, createElement(_purchases_newComponent, queries));
};

const _purchases_orders_newWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_purchases_orders_new_suppliers = useQuery({
    queryKey: ['_purchases_orders_new', 'suppliers', null],
    queryFn: () => callAction('suppliers', 'getSuppliers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.suppliers = q_purchases_orders_new_suppliers.data;
  const q_purchases_orders_new_products = useQuery({
    queryKey: ['_purchases_orders_new', 'products', null],
    queryFn: () => callAction('products', 'getProducts', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.products = q_purchases_orders_new_products.data;
  if ([q_purchases_orders_new_suppliers, q_purchases_orders_new_products].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _purchases_orders_newFallback() }, createElement(_purchases_orders_newComponent, queries));
};

const _purchases_orders__id_Wrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_purchases_orders__id__order = useQuery({
    queryKey: ['_purchases_orders__id_', 'order', params.id],
    queryFn: () => callAction('purchase-orders', 'getPurchaseOrderById', [params.id]).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? r.data : null) : r)),
    staleTime: 30_000,
  });
  queries.order = q_purchases_orders__id__order.data;
  if ([q_purchases_orders__id__order].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _purchases_orders__id_Fallback() }, createElement(_purchases_orders__id_Component, queries));
};

const _quotationsWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_quotations_initialQuotes = useQuery({
    queryKey: ['_quotations', 'initialQuotes', null],
    queryFn: () => callAction('quotations', 'getQuotes', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialQuotes = q_quotations_initialQuotes.data;
  if ([q_quotations_initialQuotes].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _quotationsFallback() }, createElement(_quotationsComponent, queries));
};

const _reports_cash_closingsWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_reports_cash_closings_initialData = useQuery({
    queryKey: ['_reports_cash_closings', 'initialData', null],
    queryFn: () => callAction('cash-register', 'getSessions', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialData = q_reports_cash_closings_initialData.data;
  const q_reports_cash_closings_users = useQuery({
    queryKey: ['_reports_cash_closings', 'users', null],
    queryFn: () => callAction('users', 'getUsers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.users = q_reports_cash_closings_users.data;
  if ([q_reports_cash_closings_initialData, q_reports_cash_closings_users].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _reports_cash_closingsFallback() }, createElement(_reports_cash_closingsComponent, queries));
};

const _reportsWrapper = () => createElement(Suspense, { fallback: _reportsFallback() }, createElement(_reportsComponent, {}));

const _settings_auditWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_settings_audit_initialLogs = useQuery({
    queryKey: ['_settings_audit', 'initialLogs', null],
    queryFn: () => callAction('audit', 'getAuditLogs', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialLogs = q_settings_audit_initialLogs.data;
  if ([q_settings_audit_initialLogs].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _settings_auditFallback() }, createElement(_settings_auditComponent, queries));
};

const _settingsWrapper = () => createElement(Suspense, { fallback: _settingsFallback() }, createElement(_settingsComponent, {}));

const _suppliersWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_suppliers_initialSuppliers = useQuery({
    queryKey: ['_suppliers', 'initialSuppliers', null],
    queryFn: () => callAction('suppliers', 'getSuppliers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialSuppliers = q_suppliers_initialSuppliers.data;
  if ([q_suppliers_initialSuppliers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _suppliersFallback() }, createElement(_suppliersComponent, queries));
};

const _suppliers_newWrapper = () => createElement(Suspense, { fallback: _suppliers_newFallback() }, createElement(_suppliers_newComponent, {}));

const _usersWrapper = () => {
  const params = useRouteParams();
  const queries: any = {};
  const q_users_initialUsers = useQuery({
    queryKey: ['_users', 'initialUsers', null],
    queryFn: () => callAction('users', 'getUsers', []).then((r) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)),
    staleTime: 30_000,
  });
  queries.initialUsers = q_users_initialUsers.data;
  if ([q_users_initialUsers].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);
  return createElement(Suspense, { fallback: _usersFallback() }, createElement(_usersComponent, queries));
};

const _lockedWrapper = () => createElement(Suspense, { fallback: _lockedFallback() }, createElement(_lockedComponent, {}));

const _reset_passwordWrapper = () => createElement(Suspense, { fallback: _reset_passwordFallback() }, createElement(_reset_passwordComponent, {}));

const _loginWrapper = () => createElement(Suspense, { fallback: _loginFallback() }, createElement(_loginComponent, {}));

const _offlineWrapper = () => createElement(Suspense, { fallback: _offlineFallback() }, createElement(_offlineComponent, {}));

const _Wrapper = () => createElement(Suspense, { fallback: _Fallback() }, createElement(_Component, {}));

const _setupWrapper = () => createElement(Suspense, { fallback: _setupFallback() }, createElement(_setupComponent, {}));

export const publicPages: Record<string, PageEntry> = {
  '/login': { Component: _loginWrapper, requiresAuth: false },
  '/offline': { Component: _offlineWrapper, requiresAuth: false },
  '/': { Component: _Wrapper, requiresAuth: false },
  '/setup': { Component: _setupWrapper, requiresAuth: false },
};

export const authenticatedPages: Record<string, PageEntry> = {
  '/cash-count': { Component: _cash_countWrapper, requiresAuth: true },
  '/cash-count/x-report': { Component: _cash_count_x_reportWrapper, requiresAuth: true },
  '/cash-count/z-report': { Component: _cash_count_z_reportWrapper, requiresAuth: true },
  '/cash-management': { Component: _cash_managementWrapper, requiresAuth: true },
  '/cash-register/close': { Component: _cash_register_closeWrapper, requiresAuth: true },
  '/cash-register/open': { Component: _cash_register_openWrapper, requiresAuth: true },
  '/categories': { Component: _categoriesWrapper, requiresAuth: true },
  '/collections': { Component: _collectionsWrapper, requiresAuth: true },
  '/customers': { Component: _customersWrapper, requiresAuth: true },
  '/customers/credit': { Component: _customers_creditWrapper, requiresAuth: true },
  '/dashboard': { Component: _dashboardWrapper, requiresAuth: true },
  '/delivery-routes': { Component: _delivery_routesWrapper, requiresAuth: true },
  '/delivery-routes/new': { Component: _delivery_routes_newWrapper, requiresAuth: true },
  '/delivery-routes/[id]': { Component: _delivery_routes__id_Wrapper, requiresAuth: true },
  '/inventory/categories': { Component: _inventory_categoriesWrapper, requiresAuth: true },
  '/inventory': { Component: _inventoryWrapper, requiresAuth: true },
  '/inventory/history': { Component: _inventory_historyWrapper, requiresAuth: true },
  '/inventory/import-history': { Component: _inventory_import_historyWrapper, requiresAuth: true },
  '/inventory/import-history/[id]': { Component: _inventory_import_history__id_Wrapper, requiresAuth: true },
  '/jewelry/daily-closing': { Component: _jewelry_daily_closingWrapper, requiresAuth: true },
  '/jewelry/gold-purchase': { Component: _jewelry_gold_purchaseWrapper, requiresAuth: true },
  '/jewelry/inventory': { Component: _jewelry_inventoryWrapper, requiresAuth: true },
  '/jewelry/production': { Component: _jewelry_productionWrapper, requiresAuth: true },
  '/jewelry/sales': { Component: _jewelry_salesWrapper, requiresAuth: true },
  '/jewelry/sync': { Component: _jewelry_syncWrapper, requiresAuth: true },
  '/kardex': { Component: _kardexWrapper, requiresAuth: true },
  '/orders': { Component: _ordersWrapper, requiresAuth: true },
  '/orders/new': { Component: _orders_newWrapper, requiresAuth: true },
  '/orders/[id]': { Component: _orders__id_Wrapper, requiresAuth: true },
  '/pos': { Component: _posWrapper, requiresAuth: true },
  '/purchases': { Component: _purchasesWrapper, requiresAuth: true },
  '/purchases/new': { Component: _purchases_newWrapper, requiresAuth: true },
  '/purchases/orders/new': { Component: _purchases_orders_newWrapper, requiresAuth: true },
  '/purchases/orders/[id]': { Component: _purchases_orders__id_Wrapper, requiresAuth: true },
  '/quotations': { Component: _quotationsWrapper, requiresAuth: true },
  '/reports/cash-closings': { Component: _reports_cash_closingsWrapper, requiresAuth: true },
  '/reports': { Component: _reportsWrapper, requiresAuth: true },
  '/settings/audit': { Component: _settings_auditWrapper, requiresAuth: true },
  '/settings': { Component: _settingsWrapper, requiresAuth: true },
  '/suppliers': { Component: _suppliersWrapper, requiresAuth: true },
  '/suppliers/new': { Component: _suppliers_newWrapper, requiresAuth: true },
  '/users': { Component: _usersWrapper, requiresAuth: true },
  '/locked': { Component: _lockedWrapper, requiresAuth: true },
  '/reset-password': { Component: _reset_passwordWrapper, requiresAuth: true },
};

export const pageNotFound: PageEntry = { Component: () => createElement("div", null, "Página no encontrada"), requiresAuth: false };
