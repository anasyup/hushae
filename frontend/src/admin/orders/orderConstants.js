import {
  AlertTriangle, Ban, Box, CheckCircle2, ClipboardList, Clock, CreditCard, FileText,
  Layers, Package, PackageCheck, PackageSearch, Printer, RotateCcw, Send, Truck, XCircle,
} from 'lucide-react';

/* ============================================================================
 * Shared vocabulary for the order desk.
 * Mirrors backend/src/utils/orderFlow.js — keep the two in step.
 * ========================================================================== */

export const STAGES = [
  { key: 'New',              label: 'New',                 group: 'new',      icon: Clock,         tone: 'red' },
  { key: 'To Pack',          label: 'To Pack',             group: 'processing', icon: Box,           tone: 'purple' },
  { key: 'To Arrange',       label: 'To Arrange Shipment', group: 'processing', icon: Send,          tone: 'purple' },
  { key: 'Picked',           label: 'Picked',              group: 'processing', icon: PackageSearch, tone: 'purple' },
  { key: 'Packed',           label: 'Packed',              group: 'to-ship',    icon: Package,       tone: 'amber' },
  { key: 'Manifested',       label: 'Manifested',          group: 'to-ship',    icon: ClipboardList, tone: 'amber' },
  { key: 'To Handover',      label: 'To Handover',         group: 'to-ship',    icon: PackageCheck,  tone: 'amber' },
  { key: 'Shipped',          label: 'Shipped',             group: 'shipped',    icon: Truck,         tone: 'blue' },
  { key: 'In Transit',       label: 'In Transit',          group: 'shipped',    icon: Truck,         tone: 'blue' },
  { key: 'Out for Delivery', label: 'Out for Delivery',    group: 'shipped',    icon: Truck,         tone: 'blue' },
  { key: 'Delivered',        label: 'Delivered',           group: 'delivered',  icon: CheckCircle2,  tone: 'green' },
  { key: 'Completed',        label: 'Completed',           group: 'delivered',  icon: CheckCircle2,  tone: 'green' },
  { key: 'Cancelled',        label: 'Cancelled',           group: 'issues',   icon: Ban,           tone: 'red' },
  { key: 'Refunded',         label: 'Refunded',            group: 'issues',   icon: RotateCcw,     tone: 'orange' },
  { key: 'Returned',         label: 'Returned',            group: 'issues',   icon: RotateCcw,     tone: 'orange' },
  { key: 'Failed Delivery',  label: 'Failed Delivery',     group: 'issues',   icon: XCircle,       tone: 'red' },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export const GROUPS = [
  { key: 'all',        label: 'All Orders', icon: Layers,        hint: 'Every order, whatever its stage' },
  { key: 'new',        label: 'New',        icon: Clock,         hint: 'Just received — awaiting admin check' },
  { key: 'processing', label: 'Processing', icon: PackageSearch, hint: 'Checked by admin — ready for the warehouse' },
  { key: 'to-ship',    label: 'To Ship',    icon: Box,           hint: 'Packed and waiting for the courier' },
  { key: 'shipped',    label: 'Shipped',    icon: Truck,         hint: 'Handed to the courier, in transit' },
  { key: 'delivered',  label: 'Delivered',  icon: CheckCircle2,  hint: 'Reached the customer' },
  { key: 'issues',     label: 'Issues',     icon: AlertTriangle, hint: 'Failed delivery, cancellations, refunds, returns' },
];

/** Silk Eclipse tones — muted surfaces, confident text. */
export const TONE = {
  neutral: { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200', dot: 'bg-neutral-400', solid: 'bg-neutral-900 text-white' },
  red:     { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',              dot: 'bg-neutral-400',     solid: 'bg-neutral-900 text-white' },
  amber:   { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',        dot: 'bg-neutral-400',   solid: 'bg-neutral-900 text-white' },
  blue:    { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',           dot: 'bg-neutral-400',    solid: 'bg-neutral-900 text-white' },
  green:   { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',  dot: 'bg-neutral-400', solid: 'bg-neutral-900 text-white' },
  orange:  { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',     dot: 'bg-neutral-400',  solid: 'bg-neutral-900 text-white' },
  purple:  { pill: 'bg-neutral-100 text-neutral-700 ring-neutral-200',     dot: 'bg-neutral-400',  solid: 'bg-neutral-900 text-white' },
};

export const stageTone = (stage) => TONE[STAGE_MAP[stage]?.tone || 'neutral'];


/**
 * The eight choices offered in the Set-stage dropdown.
 *
 * The pipeline still has its finer steps (Picked, Packed, Manifested…) and the
 * timeline keeps recording them, but a merchant only ever needs to *choose*
 * between these. Each entry names the pipeline stage it maps onto.
 */
export const SET_STAGE_CHOICES = [
  { key: 'New',       label: 'New',       hint: 'Back to the top of the queue' },
  { key: 'To Pack',   label: 'To Pack',   hint: 'Checked, ready for the warehouse' },
  { key: 'Packed',    label: 'To Ship',   hint: 'Packed and waiting for the courier' },
  { key: 'Shipped',   label: 'Shipped',   hint: 'Handed to the courier' },
  { key: 'Delivered', label: 'Delivered', hint: 'Reached the customer' },
  { key: 'Cancelled', label: 'Cancelled', hint: 'Order will not be fulfilled' },
  { key: 'Returned',  label: 'Return',    hint: 'Customer sent it back' },
  { key: 'Refunded',  label: 'Refund',    hint: 'Money returned' },
];

export const PAYMENT_METHODS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'];

export const PAYMENT_STATES = [
  /* 'Pending' here is PAYMENT verification state, not fulfilment status —
     the two share nothing but a word. Labelled "Payment Unverified" so it can
     never be mistaken for the order-status "Pending" bucket on the donut. */
  { key: 'Pending',   label: 'Payment Unverified',   tone: 'amber' },
  { key: 'Verified',  label: 'Verified',  tone: 'blue' },
  { key: 'Confirmed', label: 'Confirmed', tone: 'green' },
  { key: 'Failed',    label: 'Failed',    tone: 'red' },
  { key: 'Expired',   label: 'Expired',   tone: 'red' },
  { key: 'Refunded',  label: 'Refunded',  tone: 'orange' },
];

export const paymentTone = (state) =>
  TONE[PAYMENT_STATES.find((p) => p.key === state)?.tone || 'amber'];

export const SORT_OPTIONS = [
  { key: 'oldest',          label: 'Oldest first (default)' },
  { key: 'newest',          label: 'Newest first' },
  { key: 'amount-desc',     label: 'Amount: high to low' },
  { key: 'amount-asc',      label: 'Amount: low to high' },
  { key: 'customer-asc',    label: 'Customer A–Z' },
  { key: 'customer-desc',   label: 'Customer Z–A' },
  { key: 'payment-unpaid',  label: 'Unpaid first' },
];

export const ISSUE_TYPES = ['Wrong Item', 'Damaged', 'Missing', 'Quality Issue', 'Late Delivery', 'Other'];
/* Required dropdown when staff cancel an order — feeds the Cancellation
   Reasons analytics widget. */
export const CANCEL_REASONS = [
  'Customer changed mind',
  'Out of stock',
  'Fake/spam order',
  'Customer unreachable',
  'Duplicate order',
  'Other',
];
export const REFUND_STATES = ['No Issue', 'Refund Requested', 'Refund Approved', 'Refund Sent', 'Completed', 'Rejected'];
export const RETURN_STATES = ['Not Required', 'Requested', 'Approved', 'Returned', 'Completed', 'Rejected'];
export const CANCEL_STATES = ['No Cancellation', 'Requested', 'Approved', 'Cancelled', 'Rejected'];

export const PRINT_DOCS = [
  { key: 'invoice',      label: 'Invoice',      icon: FileText,      hint: 'A4 · customer copy' },
  { key: 'packing_slip', label: 'Packing slip', icon: Package,       hint: 'Goes in the parcel' },
  { key: 'pick_list',    label: 'Pick list',    icon: ClipboardList, hint: 'Warehouse picking' },
];

export { Printer, CreditCard };
