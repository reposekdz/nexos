const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'], 
    default: 'draft' 
  },
  currency: { type: String, required: true, default: 'USD' },
  amountCents: { type: Number, required: true },
  subtotalCents: { type: Number, required: true },
  taxCents: { type: Number, default: 0 },
  discountCents: { type: Number, default: 0 },
  totalCents: { type: Number, required: true },
  items: [{
    description: String,
    quantity: Number,
    unitPriceCents: Number,
    totalCents: Number,
    taxRate: Number,
    metadata: mongoose.Schema.Types.Mixed
  }],
  taxes: [{
    jurisdiction: String,
    rate: Number,
    amountCents: Number,
    taxType: String
  }],
  billingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  dueDate: Date,
  paidAt: Date,
  paymentMethod: String,
  transactionId: String,
  pdfUrl: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ createdAt: -1 });

const RateSnapshotSchema = new mongoose.Schema({
  baseCurrency: { type: String, required: true },
  targetCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  source: String,
  snapshotAt: { type: Date, default: Date.now, index: true },
  validUntil: Date
}, { timestamps: true });

RateSnapshotSchema.index({ baseCurrency: 1, targetCurrency: 1, snapshotAt: -1 });

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['charge', 'refund', 'payout', 'transfer', 'adjustment'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  originalCurrency: { type: String, required: true },
  originalAmountCents: { type: Number, required: true },
  baseCurrency: { type: String, required: true },
  baseAmountCents: { type: Number, required: true },
  rateId: { type: mongoose.Schema.Types.ObjectId, ref: 'RateSnapshot' },
  description: String,
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  paymentMethodId: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

TransactionSchema.index({ userId: 1, createdAt: -1 });

const TaxRuleSchema = new mongoose.Schema({
  jurisdiction: { type: String, required: true },
  country: { type: String, required: true },
  state: String,
  city: String,
  postalCode: String,
  taxType: { type: String, enum: ['vat', 'gst', 'sales', 'service', 'digital'], required: true },
  rate: { type: Number, required: true },
  applicableProducts: [String],
  thresholds: {
    minimumAmount: Number,
    maximumAmount: Number
  },
  effectiveFrom: Date,
  effectiveUntil: Date,
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const DisputeSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { 
    type: String, 
    enum: ['fraudulent', 'duplicate', 'not_received', 'defective', 'not_as_described', 'cancelled', 'other'],
    required: true 
  },
  amountCents: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['submitted', 'under_review', 'requires_evidence', 'won', 'lost', 'closed'],
    default: 'submitted' 
  },
  evidence: [{
    type: { type: String, enum: ['document', 'image', 'description', 'tracking'] },
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  timeline: [{
    event: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  resolution: String,
  resolvedAt: Date
}, { timestamps: true });

const RefundSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amountCents: { type: Number, required: true },
  currency: { type: String, required: true },
  reason: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending' 
  },
  refundType: { type: String, enum: ['full', 'partial'], default: 'full' },
  method: { type: String, enum: ['original', 'credit', 'manual'], default: 'original' },
  processedAt: Date,
  failureReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const PayoutSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amountCents: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending' 
  },
  method: { type: String, enum: ['bank_transfer', 'paypal', 'stripe', 'check'], required: true },
  destination: mongoose.Schema.Types.Mixed,
  periodStart: Date,
  periodEnd: Date,
  transactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  processedAt: Date,
  failureReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const KYCDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentType: { 
    type: String, 
    enum: ['passport', 'drivers_license', 'national_id', 'proof_of_address', 'tax_id', 'business_license'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending' 
  },
  fileUrl: String,
  fileHash: String,
  extractedData: mongoose.Schema.Types.Mixed,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: String,
  expiresAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const PromoRedemptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  promoCode: { type: String, required: true, index: true },
  promoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', required: true },
  discountAmountCents: { type: Number, required: true },
  currency: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  redeemedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['gift', 'discount', 'credit'], required: true },
  valueCents: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  used: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usedAt: Date,
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const AffiliatePayoutSchema = new mongoose.Schema({
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  periodStart: Date,
  periodEnd: Date,
  conversionCount: { type: Number, default: 0 },
  commissionCents: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending' 
  },
  paidAt: Date,
  paymentMethod: String,
  transactionId: String
}, { timestamps: true });

const EntityProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  entityType: { type: String, enum: ['individual', 'sole_proprietor', 'corporation', 'llc', 'partnership'], required: true },
  legalName: { type: String, required: true },
  businessName: String,
  taxId: String,
  vatId: String,
  businessAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  taxExempt: { type: Boolean, default: false },
  exemptionCertificates: [{
    fileUrl: String,
    jurisdiction: String,
    expiresAt: Date
  }],
  bankDetails: mongoose.Schema.Types.Mixed,
  verified: { type: Boolean, default: false }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', InvoiceSchema);
const RateSnapshot = mongoose.model('RateSnapshot', RateSnapshotSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const TaxRule = mongoose.model('TaxRule', TaxRuleSchema);
const Dispute = mongoose.model('Dispute', DisputeSchema);
const Refund = mongoose.model('Refund', RefundSchema);
const Payout = mongoose.model('Payout', PayoutSchema);
const KYCDocument = mongoose.model('KYCDocument', KYCDocumentSchema);
const PromoRedemption = mongoose.model('PromoRedemption', PromoRedemptionSchema);
const Voucher = mongoose.model('Voucher', VoucherSchema);
const AffiliatePayout = mongoose.model('AffiliatePayout', AffiliatePayoutSchema);
const EntityProfile = mongoose.model('EntityProfile', EntityProfileSchema);

module.exports = {
  Invoice,
  RateSnapshot,
  Transaction,
  TaxRule,
  Dispute,
  Refund,
  Payout,
  KYCDocument,
  PromoRedemption,
  Voucher,
  AffiliatePayout,
  EntityProfile
};
