/**
 * District Stock - Core TypeScript Definitions
 */

export type UserRole =
  | 'ADMIN'
  | 'OPERATION_MANAGER'
  | 'WAREHOUSE_USER'
  | 'EVENT_USER'
  | 'EVENT_PLANNER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  assignedWarehouseId?: string;
  assignedWarehouseName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  managerName?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

export interface EventEntity {
  id: string;
  name: string;
  code?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'Upcoming';
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category?: string;
  uom: string;
  trackingType: 'Serial' | 'Countable' | 'Consumable';
  unitPrice?: number;
  availableStock?: number;
  reorderLevel?: number;
}

export interface InboundLineItem {
  id: string;
  srNo?: number;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  trackingType?: string;
  receivedQty: number;
  putawayQty?: number;
  expectedQty?: number;
  remainingQty?: number;
  serialNumbers?: string[];
  price?: string | number;
  amount?: number;
  remarks?: string;
}

export interface InboundRecord {
  id: string;
  no: string;
  vendorName: string;
  warehouseId: string;
  warehouseName: string;
  status: 'Draft' | 'Generated' | 'In Progress' | 'Completed' | 'Cancelled';
  productLines: InboundLineItem[];
  invoiceNo?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MovementItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  serialNumbers?: string[];
}

export interface MovementRecord {
  id: string;
  no: string;
  type: 'OUTBOUND' | 'TRANSFER' | 'RETURN';
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  destinationWarehouseId?: string;
  destinationWarehouseName?: string;
  destinationEventId?: string;
  destinationEventName?: string;
  carrierId?: string;
  carrierName?: string;
  trackingNo?: string;
  status: 'Draft' | 'Generated' | 'In Transit' | 'Completed' | 'Cancelled';
  items: MovementItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RequisitionItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  requestedQty: number;
  approvedQty?: number;
}

export interface RequisitionRecord {
  id: string;
  no: string;
  eventId: string;
  eventName: string;
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
  items: RequisitionItem[];
  requiredDate?: string;
  createdAt?: string;
}

export interface MasterDataState {
  warehouses: Warehouse[];
  products: ProductItem[];
  events: EventEntity[];
  requisitions: RequisitionRecord[];
}

export interface MovementsState {
  outbounds: MovementRecord[];
  transfers: MovementRecord[];
  returns: MovementRecord[];
}
