// GENERADO AUTOMÁTICAMENTE por scripts/generate-action-modules.mjs
// No editar a mano. Regenerar con: npx tsx scripts/generate-action-modules.mjs
//
import * as admin_auth from '../src/lib/actions/admin-auth';
import * as app_settings from '../src/lib/actions/app-settings';
import * as audit from '../src/lib/actions/audit';
import * as auth from '../src/lib/actions/auth';
import * as backup from '../src/lib/actions/backup';
import * as cash_register from '../src/lib/actions/cash-register';
import * as categories from '../src/lib/actions/categories';
import * as check_expirations from '../src/lib/actions/check-expirations';
import * as collections from '../src/lib/actions/collections';
import * as credit_notes from '../src/lib/actions/credit-notes';
import * as csv_sync from '../src/lib/actions/csv-sync';
import * as customers from '../src/lib/actions/customers';
import * as dashboard from '../src/lib/actions/dashboard';
import * as delivery_routes from '../src/lib/actions/delivery-routes';
import * as export_module from '../src/lib/actions/export';
import * as gold_purchase from '../src/lib/actions/gold-purchase';
import * as gold from '../src/lib/actions/gold';
import * as held_sales from '../src/lib/actions/held-sales';
import * as import_history from '../src/lib/actions/import-history';
import * as init_data from '../src/lib/actions/init-data';
import * as installments from '../src/lib/actions/installments';
import * as inventory from '../src/lib/actions/inventory';
import * as jewelry_materials from '../src/lib/actions/jewelry-materials';
import * as jewelry_production from '../src/lib/actions/jewelry-production';
import * as jewelry_reports from '../src/lib/actions/jewelry-reports';
import * as jewelry_sales from '../src/lib/actions/jewelry-sales';
import * as jewelry_services from '../src/lib/actions/jewelry-services';
import * as jewelry from '../src/lib/actions/jewelry';
import * as kardex from '../src/lib/actions/kardex';
import * as license from '../src/lib/actions/license';
import * as notifications from '../src/lib/actions/notifications';
import * as orders from '../src/lib/actions/orders';
import * as products from '../src/lib/actions/products';
import * as purchase_orders from '../src/lib/actions/purchase-orders';
import * as purchases from '../src/lib/actions/purchases';
import * as quotations from '../src/lib/actions/quotations';
import * as reports from '../src/lib/actions/reports';
import * as sales from '../src/lib/actions/sales';
import * as settings from '../src/lib/actions/settings';
import * as suppliers from '../src/lib/actions/suppliers';
import * as upload_image from '../src/lib/actions/upload-image';
import * as upload_logo from '../src/lib/actions/upload-logo';
import * as users from '../src/lib/actions/users';
import * as variants from '../src/lib/actions/variants';
import * as activation from '../src/actions/activation';

export const actionModules = {
  'admin-auth': admin_auth,
  'app-settings': app_settings,
  'audit': audit,
  'auth': auth,
  'backup': backup,
  'cash-register': cash_register,
  'categories': categories,
  'check-expirations': check_expirations,
  'collections': collections,
  'credit-notes': credit_notes,
  'csv-sync': csv_sync,
  'customers': customers,
  'dashboard': dashboard,
  'delivery-routes': delivery_routes,
  'export': export_module,
  'gold-purchase': gold_purchase,
  'gold': gold,
  'held-sales': held_sales,
  'import-history': import_history,
  'init-data': init_data,
  'installments': installments,
  'inventory': inventory,
  'jewelry-materials': jewelry_materials,
  'jewelry-production': jewelry_production,
  'jewelry-reports': jewelry_reports,
  'jewelry-sales': jewelry_sales,
  'jewelry-services': jewelry_services,
  'jewelry': jewelry,
  'kardex': kardex,
  'license': license,
  'notifications': notifications,
  'orders': orders,
  'products': products,
  'purchase-orders': purchase_orders,
  'purchases': purchases,
  'quotations': quotations,
  'reports': reports,
  'sales': sales,
  'settings': settings,
  'suppliers': suppliers,
  'upload-image': upload_image,
  'upload-logo': upload_logo,
  'users': users,
  'variants': variants,
  'activation': activation,
} as const;

export type ActionModuleName = keyof typeof actionModules;
