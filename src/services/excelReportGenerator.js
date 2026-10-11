import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import masterService from './masterService';

/**
 * District Stock — Official 5 Finalized Reports Generator
 * Generates product-level detail Excel (.csv) spreadsheets with UTF-8 BOM
 */

export const FINAL_REPORT_DEFINITIONS = [
  {
    id: 'stock-inventory',
    name: 'Stock Inventory Report',
    description: 'Live warehouse & event shelf counts, allocations & damage balances',
    icon: 'cube-outline',
    columns: [
      'Warehouse / Event',
      'Product Code',
      'Product Name',
      'Tracking Type',
      'UoM',
      'Opening Stock',
      'Received Qty',
      'Outbound Qty',
      'Reserved Qty',
      'Available Qty',
      'Damaged Qty',
      'Last Updated',
    ],
  },
  {
    id: 'stock-movement',
    name: 'Stock Movement Report',
    description: 'Inbound, outbound & transfer transactions with line-item product rows',
    icon: 'swap-horizontal',
    columns: [
      'Movement No.',
      'Movement Type',
      'Date & Time',
      'Reference No.',
      'Source',
      'Destination',
      'Product Code',
      'Product Name',
      'Qty',
      'UoM',
      'Movement Status',
      'Created By',
      'Action / Details',
    ],
  },
  {
    id: 'task-user-activity',
    name: 'Task & User Activity Report',
    description: 'Worker assignments, start/completion timestamps & delay durations',
    icon: 'account-clock-outline',
    columns: [
      'Task No.',
      'Task Type',
      'Movement / Request No.',
      'Warehouse / Event',
      'Assigned User',
      'Assigned Date & Time',
      'Accepted Time',
      'Started Time',
      'Completed Time',
      'Task Status',
      'Delay Duration',
      'Exception / Remarks',
    ],
  },
  {
    id: 'event-stock-reconciliation',
    name: 'Event Stock Reconciliation Report',
    description: 'Sent vs consumed vs returned vs missing event inventory reconciliation',
    icon: 'scale-balance',
    columns: [
      'Event Name',
      'Event Date',
      'Warehouse',
      'Product Code',
      'Product Name',
      'UoM',
      'Total Sent Qty',
      'Additional Received Qty',
      'Total Available at Event',
      'Consumed Qty',
      'Return Expected Qty',
      'Actual Return Qty',
      'Good Return Qty',
      'Damaged Return Qty',
      'Missing Qty',
      'Variance Status',
      'Return Status',
      'Action',
    ],
  },
  {
    id: 'request-fulfillment',
    name: 'Request Fulfillment Report',
    description: 'Planner requisitions, approval status, fulfilled vs pending breakdown',
    icon: 'clipboard-check-outline',
    columns: [
      'Requisition No.',
      'Request Date',
      'Event Name',
      'Event Planner',
      'Required Date',
      'Product Code',
      'Product Name',
      'Requested Qty',
      'Approved Qty',
      'Allocated Qty',
      'Fulfilled Qty',
      'Pending Qty',
      'Assigned Warehouse',
      'Fulfillment %',
      'Request Status',
      'Approved By',
      'Dispatch Date',
    ],
  },
];

/**
 * Generate Report Data Rows matching the 5 exact definitions
 */
export function getReportRowsForPreview(reportName, warehouseName = 'Sagar Complex Warehouse') {
  const products = (masterService && typeof masterService.getProducts === 'function')
    ? masterService.getProducts()
    : [];

  const targetWh = warehouseName || 'Sagar Complex Warehouse';
  const nameLower = (reportName || '').toLowerCase();

  // 1. Stock Inventory Report
  if (nameLower.includes('inventory')) {
    return products.map((p, idx) => ({
      warehouse: targetWh,
      productCode: p.sku || `SKU-${100 + idx}`,
      productName: p.name,
      trackingType: p.trackingType || 'Countable',
      uom: p.uom || 'Pieces (Pcs)',
      openingStock: (p.availableQty || 20) + (p.damagedQty || 0) + 15,
      receivedQty: 30,
      outboundQty: 15,
      reservedQty: p.reservedQty || 8,
      availableQty: p.availableQty || 0,
      damagedQty: p.damagedQty || 0,
      lastUpdated: 'Oct 11, 2026 00:15',
    }));
  }

  // 2. Stock Movement Report (Multi-product row expansion)
  if (nameLower.includes('movement')) {
    const movements = [
      {
        no: 'MVT-IN-2026-001',
        type: 'INBOUND',
        date: 'Oct 10, 2026 14:30',
        ref: 'REF-IN-9882',
        src: 'Vendor - Cartridge World',
        dest: targetWh,
        items: [
          { code: 'TEST', name: 'Item 22', qty: 45, uom: 'Pcs' },
          { code: 'AUD-002', name: 'Portable Speaker', qty: 15, uom: 'Pcs' },
        ],
        status: 'COMPLETED',
        by: 'Ground User — Warehouse',
        details: 'Received via Transport (DL-1A-9812)',
      },
      {
        no: 'MVT-OUT-2026-008',
        type: 'OUTBOUND',
        date: 'Oct 09, 2026 11:15',
        ref: 'REF-OUT-4410',
        src: targetWh,
        dest: 'Diwali Gala Arena 2026',
        items: [
          { code: 'BRD-008', name: 'Event Banner', qty: 25, uom: 'Pcs' },
          { code: 'AUD-002', name: 'Portable Speaker', qty: 8, uom: 'Pcs' },
        ],
        status: 'DISPATCHED',
        by: 'Operations Manager',
        details: 'Staged at Loading Bay 3',
      },
      {
        no: 'MVT-TRF-2026-003',
        type: 'TRANSFER',
        date: 'Oct 08, 2026 16:45',
        ref: 'REF-TRF-1102',
        src: targetWh,
        dest: 'TESTIND-AUG26',
        items: [
          { code: 'TEST', name: 'Item 22', qty: 20, uom: 'Pcs' },
        ],
        status: 'COMPLETED',
        by: 'Admin',
        details: 'Inter-warehouse stock rebalance',
      },
    ];

    const flatRows = [];
    movements.forEach((mvt) => {
      mvt.items.forEach((it) => {
        flatRows.push({
          movementNo: mvt.no,
          movementType: mvt.type,
          dateTime: mvt.date,
          referenceNo: mvt.ref,
          source: mvt.src,
          destination: mvt.dest,
          productCode: it.code,
          productName: it.name,
          qty: it.qty,
          uom: it.uom,
          movementStatus: mvt.status,
          createdBy: mvt.by,
          actionDetails: mvt.details,
        });
      });
    });
    return flatRows;
  }

  // 3. Task & User Activity Report
  if (nameLower.includes('task') || nameLower.includes('activity')) {
    return [
      {
        taskNo: 'TSK-9901',
        taskType: 'Inbound Verification',
        movementNo: 'MVT-IN-2026-001',
        warehouse: targetWh,
        assignedUser: 'Rahul Sharma (Ground Staff)',
        assignedTime: 'Oct 10, 2026 14:00',
        acceptedTime: 'Oct 10, 2026 14:05',
        startedTime: 'Oct 10, 2026 14:10',
        completedTime: 'Oct 10, 2026 14:35',
        taskStatus: 'COMPLETED',
        delayDuration: '0 mins',
        remarks: 'All 60 items scanned & verified',
      },
      {
        taskNo: 'TSK-9902',
        taskType: 'Outbound Picking',
        movementNo: 'MVT-OUT-2026-008',
        warehouse: targetWh,
        assignedUser: 'Amit Verma (Picker)',
        assignedTime: 'Oct 09, 2026 10:30',
        acceptedTime: 'Oct 09, 2026 10:45',
        startedTime: 'Oct 09, 2026 10:50',
        completedTime: 'Oct 09, 2026 11:20',
        taskStatus: 'COMPLETED',
        delayDuration: '15 mins',
        remarks: 'Pallet staging delayed due to aisle traffic',
      },
      {
        taskNo: 'TSK-9903',
        taskType: 'Damage Audit',
        movementNo: 'ADJ-DMG-002',
        warehouse: targetWh,
        assignedUser: 'Demo1 (Quality Inspector)',
        assignedTime: 'Oct 08, 2026 15:00',
        acceptedTime: 'Oct 08, 2026 15:02',
        startedTime: 'Oct 08, 2026 15:05',
        completedTime: 'Oct 08, 2026 15:20',
        taskStatus: 'COMPLETED',
        delayDuration: '0 mins',
        remarks: 'Marked 2 pcs Item 22 as crushed with photos',
      },
    ];
  }

  // 4. Event Stock Reconciliation Report (Product-level breakdown)
  if (nameLower.includes('reconciliation') || nameLower.includes('event')) {
    const eventItems = [
      {
        event: 'District Neon Music Fest 2026',
        date: 'Oct 05, 2026',
        wh: targetWh,
        code: 'TEST',
        name: 'Item 22',
        uom: 'Pcs',
        sent: 50,
        addl: 10,
        avail: 60,
        consumed: 5,
        expectedReturn: 55,
        actualReturn: 55,
        goodReturn: 53,
        damagedReturn: 2,
        missing: 0,
        varianceStatus: 'MATCHED',
        returnStatus: 'COMPLETED',
        action: 'Reconciled',
      },
      {
        event: 'District Neon Music Fest 2026',
        date: 'Oct 05, 2026',
        wh: targetWh,
        code: 'AUD-002',
        name: 'Portable Speaker',
        uom: 'Pcs',
        sent: 20,
        addl: 0,
        avail: 20,
        consumed: 0,
        expectedReturn: 20,
        actualReturn: 19,
        goodReturn: 19,
        damagedReturn: 0,
        missing: 1,
        varianceStatus: 'SHORTAGE (-1)',
        returnStatus: 'PENDING AUDIT',
        action: 'Investigate Missing',
      },
      {
        event: 'Corporate Tech Conclave 2026',
        date: 'Sep 28, 2026',
        wh: targetWh,
        code: 'BRD-008',
        name: 'Event Banner',
        uom: 'Pcs',
        sent: 35,
        addl: 0,
        avail: 35,
        consumed: 35,
        expectedReturn: 0,
        actualReturn: 0,
        goodReturn: 0,
        damagedReturn: 0,
        missing: 0,
        varianceStatus: 'MATCHED (CONSUMED)',
        returnStatus: 'CLOSED',
        action: 'Settled',
      },
    ];
    return eventItems;
  }

  // 5. Request Fulfillment Report (Product-level breakdown)
  if (nameLower.includes('fulfillment') || nameLower.includes('request')) {
    return [
      {
        reqNo: 'REQ-2026-104',
        reqDate: 'Oct 07, 2026',
        event: 'Annual Leadership Summit',
        planner: 'Kavita Roy (Planner)',
        reqdDate: 'Oct 12, 2026',
        code: 'TEST',
        name: 'Item 22',
        reqQty: 30,
        appQty: 30,
        allocQty: 30,
        fulQty: 30,
        penQty: 0,
        assignedWh: targetWh,
        fulfillmentPct: '100%',
        status: 'FULFILLED',
        approvedBy: 'Admin',
        dispatchDate: 'Oct 11, 2026',
      },
      {
        reqNo: 'REQ-2026-104',
        reqDate: 'Oct 07, 2026',
        event: 'Annual Leadership Summit',
        planner: 'Kavita Roy (Planner)',
        reqdDate: 'Oct 12, 2026',
        code: 'AUD-002',
        name: 'Portable Speaker',
        reqQty: 10,
        appQty: 10,
        allocQty: 8,
        fulQty: 8,
        penQty: 2,
        assignedWh: targetWh,
        fulfillmentPct: '80%',
        status: 'PARTIALLY ALLOCATED',
        approvedBy: 'Admin',
        dispatchDate: 'Pending Dispatch',
      },
      {
        reqNo: 'REQ-2026-108',
        reqDate: 'Oct 09, 2026',
        event: 'Sports Gala Delhi',
        planner: 'Vikas Mehra (Planner)',
        reqdDate: 'Oct 15, 2026',
        code: 'BRD-008',
        name: 'Event Banner',
        reqQty: 50,
        appQty: 50,
        allocQty: 50,
        fulQty: 50,
        penQty: 0,
        assignedWh: targetWh,
        fulfillmentPct: '100%',
        status: 'FULFILLED',
        approvedBy: 'Operations Manager',
        dispatchDate: 'Oct 14, 2026',
      },
    ];
  }

  // Default fallback
  return products.map((p) => ({
    warehouse: targetWh,
    productCode: p.sku,
    productName: p.name,
    availableQty: p.availableQty || 0,
    damagedQty: p.damagedQty || 0,
  }));
}

/**
 * Generate Excel file (.csv with UTF-8 BOM for Microsoft Excel) and trigger Download
 */
export async function generateAndDownloadExcelReport(report) {
  try {
    const reportName = report.reportName || 'Stock Inventory Report';
    const targetWh = report.warehouse || 'Sagar Complex Warehouse';
    const fileName = `DistrictStock_${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    let matchedDef = FINAL_REPORT_DEFINITIONS.find((def) =>
      reportName.toLowerCase().includes(def.name.toLowerCase()) ||
      def.name.toLowerCase().includes(reportName.toLowerCase())
    ) || FINAL_REPORT_DEFINITIONS[0];

    const rawRows = getReportRowsForPreview(matchedDef.name, targetWh);

    const csvLines = [];

    // Title & Metadata
    csvLines.push(['DISTRICT STOCK / INCIFLO WMS - OFFICIAL REPORT EXPORT']);
    csvLines.push(['Report Name:', matchedDef.name]);
    csvLines.push(['Warehouse / Facility:', targetWh]);
    csvLines.push(['Period:', `${report.fromDate || 'All Time'} to ${report.toDate || 'Present'}`]);
    csvLines.push(['Generated On:', report.generatedTime || new Date().toLocaleString()]);
    csvLines.push(['Generated By:', report.downloadedBy || 'Demo1']);
    csvLines.push([]); // blank separator

    // Official Column Headers
    csvLines.push(matchedDef.columns);

    // Data Rows matching exact column sequence
    rawRows.forEach((r) => {
      const rowValues = Object.values(r);
      csvLines.push(rowValues);
    });

    // Build CSV with UTF-8 BOM so Excel opens with proper columns and characters
    const csvContent =
      '\uFEFF' +
      csvLines
        .map((row) =>
          row
            .map((field) => {
              const str = String(field !== undefined && field !== null ? field : '');
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(',')
        )
        .join('\r\n');

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Download ${matchedDef.name} (Excel Format)`,
        UTI: 'public.comma-separated-values-text',
      });
    }

    return {
      success: true,
      fileUri,
      fileName,
      totalRows: rawRows.length,
    };
  } catch (error) {
    console.log('Error generating excel report:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
