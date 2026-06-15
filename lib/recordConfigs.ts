/**
 * Field configurations for all standalone record types.
 * Used by RecordForm and RecordList across the app.
 */
import type { FieldConfig } from '@/types/app'

// ── Shared options ──────────────────────────────────────────────────────────────

export const WORKSPACE_OPTIONS = ['my-business']
export const PAYMENT_METHODS = ['Bank transfer', 'Cash', 'Card', 'Cheque', 'Other']
export const EXPENSE_CATEGORIES = [
  'Tools & Equipment', 'Materials', 'Vehicle & Fuel', 'Phone & Internet',
  'Office & Admin', 'Insurance', 'Licensing & Registration', 'Training & Education',
  'Marketing & Advertising', 'Subcontractors', 'Uniforms & PPE', 'Other',
]
export const TOOL_CATEGORIES = [
  'Power Tools', 'Hand Tools', 'Measuring & Layout', 'Safety & PPE',
  'Ladders & Access', 'Cleaning Equipment', 'Garden & Outdoor',
  'Electrical', 'Plumbing', 'Other',
]
export const VEHICLE_NAMES = ['Ute', 'Van', 'Car', 'Trailer', 'Other']

// ── Labour / Hours ──────────────────────────────────────────────────────────────

export const LABOUR_FIELDS: FieldConfig[] = [
  { name: 'date',         label: 'Date',           type: 'date',     required: true, group: 'Time' },
  { name: 'startTime',    label: 'Start time',      type: 'time',     group: 'Time' },
  { name: 'finishTime',   label: 'Finish time',     type: 'time',     group: 'Time' },
  { name: 'breakMinutes', label: 'Break (minutes)', type: 'number',   group: 'Time', placeholder: '30' },
  { name: 'totalHours',   label: 'Total hours',     type: 'number',   required: true, group: 'Time', placeholder: '8' },
  { name: 'description',  label: 'Work description', type: 'textarea', required: true, group: 'Details' },
  { name: 'worker',       label: 'Worker name',      group: 'Details', placeholder: 'Your name' },
  { name: 'linkedJobNumber', label: 'Job number', group: 'Details', placeholder: 'J-1001' },
  { name: 'jobTitle',     label: 'Job / task',       group: 'Details', placeholder: 'Auto-fills from job number' },
  { name: 'hourlyRate',   label: 'Hourly rate ($)',  type: 'number',   group: 'Billing', placeholder: '65' },
  { name: 'totalCost',    label: 'Total cost ($)',   type: 'number',   group: 'Billing' },
  { name: 'billable',     label: 'Billable to client', type: 'checkbox', group: 'Billing', defaultValue: true },
  { name: 'travelTime',   label: 'Travel time (min)', type: 'number',  group: 'Billing' },
  { name: 'workspaceId',  label: 'Workspace',        type: 'select',  options: WORKSPACE_OPTIONS, required: true, group: 'Details', defaultValue: 'my-business' },
  { name: 'notes',        label: 'Notes',            type: 'textarea', group: 'Details' },
]

export const LABOUR_DISPLAY_FIELDS: FieldConfig[] = [
  { name: 'date',        label: 'Date'        },
  { name: 'description', label: 'Description' },
  { name: 'worker',      label: 'Worker'      },
  { name: 'totalHours',  label: 'Hours'       },
  { name: 'totalCost',   label: 'Cost'        },
  { name: 'billable',    label: 'Billable'    },
  { name: 'linkedJobNumber', label: 'Job #' },
  { name: 'workspaceId', label: 'Workspace'   },
]

// ── Materials (standalone) ──────────────────────────────────────────────────────

export const MATERIAL_FIELDS: FieldConfig[] = [
  { name: 'date',            label: 'Date purchased',    type: 'date',     required: true, group: 'Purchase' },
  { name: 'supplier',        label: 'Supplier',           group: 'Purchase', placeholder: 'Bunnings, supplier name' },
  { name: 'description',     label: 'Description',        type: 'textarea', required: true, group: 'Purchase' },
  { name: 'cost',            label: 'Cost ($)',            type: 'number',   required: true, group: 'Purchase' },
  { name: 'markup',          label: 'Markup (%)',          type: 'number',   group: 'Billing', placeholder: '20' },
  { name: 'billableAmount',  label: 'Billable amount ($)', type: 'number',   group: 'Billing' },
  { name: 'billable',        label: 'Billable to client',  type: 'checkbox', group: 'Billing', defaultValue: true },
  { name: 'receiptAttached', label: 'Receipt attached',    type: 'checkbox', group: 'Billing', defaultValue: false },
  { name: 'linkedJobNumber', label: 'Job number', group: 'Details', placeholder: 'J-1001' },
  { name: 'jobTitle',        label: 'Job linked',          group: 'Details', placeholder: 'Auto-fills from job number' },
  { name: 'workspaceId',     label: 'Workspace',           type: 'select',   options: WORKSPACE_OPTIONS, required: true, group: 'Details', defaultValue: 'my-business' },
  { name: 'notes',           label: 'Notes',               type: 'textarea', group: 'Details' },
]

export const MATERIAL_DISPLAY_FIELDS: FieldConfig[] = [
  { name: 'date',        label: 'Date'        },
  { name: 'supplier',    label: 'Supplier'    },
  { name: 'description', label: 'Description' },
  { name: 'cost',        label: 'Cost'        },
  { name: 'billable',    label: 'Billable'    },
  { name: 'receiptAttached', label: 'Receipt' },
  { name: 'linkedJobNumber', label: 'Job #' },
  { name: 'workspaceId', label: 'Workspace'   },
]

// ── Tools / Equipment ───────────────────────────────────────────────────────────

export const TOOL_FIELDS: FieldConfig[] = [
  { name: 'name',           label: 'Tool / equipment name', required: true,  group: 'Tool Details' },
  { name: 'category',       label: 'Category',               type: 'select',  options: TOOL_CATEGORIES, group: 'Tool Details' },
  { name: 'datePurchased',  label: 'Date purchased',         type: 'date',    group: 'Tool Details' },
  { name: 'supplier',       label: 'Supplier',               group: 'Tool Details' },
  { name: 'cost',           label: 'Cost ($)',                type: 'number',  group: 'Tool Details' },
  { name: 'serialNumber',   label: 'Serial number',          group: 'Tool Details' },
  { name: 'warrantyExpiry', label: 'Warranty expiry',        type: 'date',    group: 'Tool Details' },
  { name: 'taxDeductible',  label: 'Tax deductible',         type: 'checkbox', defaultValue: true, group: 'Tax & Records' },
  { name: 'receiptAttached',label: 'Receipt attached',       type: 'checkbox', defaultValue: false, group: 'Tax & Records' },
  { name: 'workspaceId',    label: 'Workspace',              type: 'select',  options: WORKSPACE_OPTIONS, required: true, group: 'Tax & Records', defaultValue: 'my-business' },
  { name: 'notes',          label: 'Notes',                  type: 'textarea', group: 'Tax & Records' },
]

export const TOOL_DISPLAY_FIELDS: FieldConfig[] = [
  { name: 'name',           label: 'Tool'           },
  { name: 'category',       label: 'Category'       },
  { name: 'datePurchased',  label: 'Purchased'      },
  { name: 'cost',           label: 'Cost'           },
  { name: 'warrantyExpiry', label: 'Warranty'       },
  { name: 'taxDeductible',  label: 'Tax deduct.'    },
  { name: 'receiptAttached',label: 'Receipt'        },
]

// ── Vehicle / Car Log ───────────────────────────────────────────────────────────

export const VEHICLE_FIELDS: FieldConfig[] = [
  { name: 'date',           label: 'Date',                type: 'date',   required: true, group: 'Trip' },
  { name: 'vehicleName',    label: 'Vehicle',              type: 'select', options: VEHICLE_NAMES, group: 'Trip', defaultValue: 'Ute' },
  { name: 'tripPurpose',    label: 'Trip purpose',         required: true, group: 'Trip', placeholder: 'e.g. Travel to job site' },
  { name: 'odometerStart',  label: 'Odometer start (km)',  type: 'number', group: 'Trip' },
  { name: 'odometerEnd',    label: 'Odometer end (km)',    type: 'number', group: 'Trip' },
  { name: 'kilometres',     label: 'Kilometres',           type: 'number', group: 'Trip' },
  { name: 'linkedJobNumber', label: 'Job number',           group: 'Trip',  placeholder: 'J-1001' },
  { name: 'jobTitle',       label: 'Job linked',           group: 'Trip',  placeholder: 'Auto-fills from job number' },
  { name: 'fuelLitres',     label: 'Fuel (litres)',        type: 'number', group: 'Vehicle Costs' },
  { name: 'fuelCost',       label: 'Fuel cost ($)',        type: 'number', group: 'Vehicle Costs' },
  { name: 'parking',        label: 'Parking ($)',          type: 'number', group: 'Vehicle Costs' },
  { name: 'tolls',          label: 'Tolls ($)',            type: 'number', group: 'Vehicle Costs' },
  { name: 'repairs',        label: 'Repairs ($)',          type: 'number', group: 'Maintenance Costs' },
  { name: 'tyres',          label: 'Tyres ($)',            type: 'number', group: 'Maintenance Costs' },
  { name: 'servicing',      label: 'Servicing ($)',        type: 'number', group: 'Maintenance Costs' },
  { name: 'rego',           label: 'Rego ($)',             type: 'number', group: 'Fixed Costs' },
  { name: 'insurance',      label: 'Insurance ($)',        type: 'number', group: 'Fixed Costs' },
  { name: 'cleaning',       label: 'Cleaning ($)',         type: 'number', group: 'Other Costs' },
  { name: 'accessories',    label: 'Accessories ($)',      type: 'number', group: 'Other Costs' },
  { name: 'receiptAttached',label: 'Receipt attached',     type: 'checkbox', defaultValue: false, group: 'Other Costs' },
  { name: 'workspaceId',    label: 'Workspace',            type: 'select', options: WORKSPACE_OPTIONS, required: true, group: 'Other Costs', defaultValue: 'my-business' },
  { name: 'notes',          label: 'Notes',                type: 'textarea', group: 'Other Costs' },
]

export const VEHICLE_DISPLAY_FIELDS: FieldConfig[] = [
  { name: 'date',        label: 'Date'        },
  { name: 'vehicleName', label: 'Vehicle'     },
  { name: 'tripPurpose', label: 'Purpose'     },
  { name: 'kilometres',  label: 'KM'          },
  { name: 'fuelCost',    label: 'Fuel'        },
  { name: 'parking',     label: 'Parking'     },
  { name: 'linkedJobNumber', label: 'Job #' },
  { name: 'workspaceId', label: 'Workspace'   },
]

// ── Expenses ────────────────────────────────────────────────────────────────────

export const EXPENSE_FIELDS: FieldConfig[] = [
  { name: 'date',           label: 'Date',              type: 'date',    required: true, group: 'Expense Details' },
  { name: 'category',       label: 'Category',           type: 'select',  options: EXPENSE_CATEGORIES, required: true, group: 'Expense Details' },
  { name: 'supplier',       label: 'Supplier',            group: 'Expense Details' },
  { name: 'description',    label: 'Description',         type: 'textarea', required: true, group: 'Expense Details' },
  { name: 'amount',         label: 'Amount ($)',           type: 'number',  required: true, group: 'Expense Details' },
  { name: 'paymentMethod',  label: 'Payment method',      type: 'select',  options: PAYMENT_METHODS, group: 'Expense Details' },
  { name: 'taxDeductible',  label: 'Tax deductible',      type: 'checkbox', defaultValue: true, group: 'Records' },
  { name: 'receiptAttached',label: 'Receipt attached',    type: 'checkbox', defaultValue: false, group: 'Records' },
  { name: 'linkedJobNumber', label: 'Job number',          group: 'Records', placeholder: 'J-1001' },
  { name: 'jobTitle',       label: 'Job linked',          group: 'Records', placeholder: 'Auto-fills from job number' },
  { name: 'workspaceId',    label: 'Workspace',           type: 'select',  options: WORKSPACE_OPTIONS, required: true, group: 'Records', defaultValue: 'my-business' },
  { name: 'notes',          label: 'Notes',               type: 'textarea', group: 'Records' },
]

export const EXPENSE_DISPLAY_FIELDS: FieldConfig[] = [
  { name: 'date',        label: 'Date'        },
  { name: 'category',    label: 'Category'    },
  { name: 'supplier',    label: 'Supplier'    },
  { name: 'description', label: 'Description' },
  { name: 'amount',      label: 'Amount'      },
  { name: 'taxDeductible', label: 'Tax ded.'  },
  { name: 'linkedJobNumber', label: 'Job #' },
  { name: 'workspaceId', label: 'Workspace'   },
]
