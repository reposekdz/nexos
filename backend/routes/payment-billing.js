const express = require('express');
const crypto = require('crypto');
const {
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
} = require('../models/PaymentBilling');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/invoices', auth, async (req, res) => {
  try {
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    let taxTotal = 0;
    const items = req.body.items.map(item => {
      const itemTotal = item.quantity * item.unitPriceCents;
      const itemTax = Math.round(itemTotal * (item.taxRate || 0));
      taxTotal += itemTax;
      return {
        ...item,
        totalCents: itemTotal + itemTax
      };
    });
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0);
    const discount = req.body.discountCents || 0;
    const total = subtotal - discount + taxTotal;
    
    const invoice = new Invoice({
      invoiceNumber,
      userId: req.userId,
      tenantId: req.body.tenantId,
      currency: req.body.currency || 'USD',
      items,
      subtotalCents: subtotal,
      taxCents: taxTotal,
      discountCents: discount,
      totalCents: total,
      amountCents: total,
      taxes: req.body.taxes || [],
      billingAddress: req.body.billingAddress,
      dueDate: req.body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: req.body.metadata
    });
    
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices', auth, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const filter = { userId: req.userId };
    
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/invoices/:id/pay', auth, async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paymentMethod = paymentMethod;
    invoice.transactionId = transactionId;
    
    await invoice.save();
    
    const transaction = new Transaction({
      userId: invoice.userId,
      type: 'charge',
      status: 'completed',
      originalCurrency: invoice.currency,
      originalAmountCents: invoice.totalCents,
      baseCurrency: invoice.currency,
      baseAmountCents: invoice.totalCents,
      invoiceId: invoice._id,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      paymentMethodId: paymentMethod
    });
    
    await transaction.save();
    
    res.json({ invoice, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rates/snapshot', async (req, res) => {
  try {
    const { baseCurrency, targetCurrency, rate, source } = req.body;
    
    const snapshot = new RateSnapshot({
      baseCurrency,
      targetCurrency,
      rate,
      source,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    await snapshot.save();
    res.status(201).json(snapshot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/rates/:base/:target', async (req, res) => {
  try {
    const snapshot = await RateSnapshot.findOne({
      baseCurrency: req.params.base,
      targetCurrency: req.params.target,
      snapshotAt: { $lte: new Date() },
      $or: [
        { validUntil: { $gte: new Date() } },
        { validUntil: null }
      ]
    }).sort({ snapshotAt: -1 });
    
    if (!snapshot) {
      return res.status(404).json({ message: 'Exchange rate not found' });
    }
    
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/transactions', auth, async (req, res) => {
  try {
    const transaction = new Transaction({
      userId: req.userId,
      ...req.body
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, status, from, to } = req.query;
    const filter = { userId: req.userId };
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    
    const transactions = await Transaction.find(filter)
      .populate('invoiceId')
      .sort({ createdAt: -1 });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/tax-rules', auth, async (req, res) => {
  try {
    const rule = new TaxRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tax-rules/calculate', async (req, res) => {
  try {
    const { country, state, city, postalCode, amount, productType } = req.query;
    
    const filter = {
      country,
      enabled: true,
      $or: [
        { effectiveFrom: { $lte: new Date() }, effectiveUntil: { $gte: new Date() } },
        { effectiveFrom: null, effectiveUntil: null }
      ]
    };
    
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (postalCode) filter.postalCode = postalCode;
    
    const rules = await TaxRule.find(filter);
    
    let totalTax = 0;
    const appliedRules = [];
    
    for (const rule of rules) {
      if (!rule.applicableProducts || rule.applicableProducts.includes(productType)) {
        const taxAmount = Math.round((parseFloat(amount) * rule.rate) / 100);
        totalTax += taxAmount;
        appliedRules.push({
          jurisdiction: rule.jurisdiction,
          taxType: rule.taxType,
          rate: rule.rate,
          amount: taxAmount
        });
      }
    }
    
    res.json({
      amount: parseFloat(amount),
      totalTax,
      appliedRules,
      total: parseFloat(amount) + totalTax
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/disputes', auth, async (req, res) => {
  try {
    const dispute = new Dispute({
      userId: req.userId,
      ...req.body,
      timeline: [{
        event: 'dispute_created',
        description: 'Dispute submitted',
        timestamp: new Date()
      }]
    });
    
    await dispute.save();
    res.status(201).json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/disputes', auth, async (req, res) => {
  try {
    const disputes = await Dispute.find({ userId: req.userId })
      .populate('transactionId')
      .sort({ createdAt: -1 });
    
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/disputes/:id/evidence', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    dispute.evidence.push(req.body);
    dispute.timeline.push({
      event: 'evidence_submitted',
      description: 'New evidence submitted',
      timestamp: new Date()
    });
    
    await dispute.save();
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/disputes/:id/resolve', auth, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    dispute.status = status;
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();
    dispute.timeline.push({
      event: 'dispute_resolved',
      description: resolution,
      timestamp: new Date()
    });
    
    await dispute.save();
    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/refunds', auth, async (req, res) => {
  try {
    const refund = new Refund({
      userId: req.userId,
      ...req.body
    });
    
    await refund.save();
    res.status(201).json(refund);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/refunds', auth, async (req, res) => {
  try {
    const refunds = await Refund.find({ userId: req.userId })
      .populate('transactionId')
      .sort({ createdAt: -1 });
    
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/refunds/:id/process', auth, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }
    
    refund.status = 'completed';
    refund.processedAt = new Date();
    await refund.save();
    
    const transaction = new Transaction({
      userId: refund.userId,
      type: 'refund',
      status: 'completed',
      originalCurrency: refund.currency,
      originalAmountCents: refund.amountCents,
      baseCurrency: refund.currency,
      baseAmountCents: refund.amountCents,
      description: `Refund for transaction`,
      metadata: { refundId: refund._id }
    });
    
    await transaction.save();
    
    res.json({ refund, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payouts', auth, async (req, res) => {
  try {
    const payout = new Payout({
      sellerId: req.userId,
      ...req.body
    });
    
    await payout.save();
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/payouts', auth, async (req, res) => {
  try {
    const payouts = await Payout.find({ sellerId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/payouts/:id/approve', auth, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    
    payout.status = 'approved';
    payout.approvedBy = req.userId;
    payout.approvedAt = new Date();
    await payout.save();
    
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/payouts/:id/process', auth, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    
    payout.status = 'completed';
    payout.processedAt = new Date();
    await payout.save();
    
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/kyc/documents', auth, async (req, res) => {
  try {
    const document = new KYCDocument({
      userId: req.userId,
      ...req.body
    });
    
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/kyc/documents', auth, async (req, res) => {
  try {
    const documents = await KYCDocument.find({ userId: req.userId });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/kyc/documents/:id/verify', auth, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    const document = await KYCDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.status = status;
    document.verifiedBy = req.userId;
    document.verifiedAt = new Date();
    if (rejectionReason) document.rejectionReason = rejectionReason;
    
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/promo/redeem', auth, async (req, res) => {
  try {
    const { promoCode, orderId, discountAmountCents } = req.body;
    
    const redemption = new PromoRedemption({
      userId: req.userId,
      promoCode,
      promoId: req.body.promoId,
      discountAmountCents,
      currency: req.body.currency || 'USD',
      orderId
    });
    
    await redemption.save();
    res.status(201).json(redemption);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/vouchers/generate', auth, async (req, res) => {
  try {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    const voucher = new Voucher({
      code,
      type: req.body.type,
      valueCents: req.body.valueCents,
      currency: req.body.currency || 'USD',
      expiresAt: req.body.expiresAt,
      createdBy: req.userId,
      metadata: req.body.metadata
    });
    
    await voucher.save();
    res.status(201).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/vouchers/redeem', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    const voucher = await Voucher.findOne({ code, used: false });
    if (!voucher) {
      return res.status(404).json({ message: 'Invalid or already used voucher' });
    }
    
    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Voucher expired' });
    }
    
    voucher.used = true;
    voucher.usedBy = req.userId;
    voucher.usedAt = new Date();
    await voucher.save();
    
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/affiliate/payouts', auth, async (req, res) => {
  try {
    const payouts = await AffiliatePayout.find({ affiliateId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/entity-profile', auth, async (req, res) => {
  try {
    const profile = await EntityProfile.findOneAndUpdate(
      { userId: req.userId },
      req.body,
      { upsert: true, new: true }
    );
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/entity-profile', auth, async (req, res) => {
  try {
    const profile = await EntityProfile.findOne({ userId: req.userId });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
