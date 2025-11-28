const express = require('express');
const PromoCode = require('../models/PromoCode');
const PromoRedemption = require('../models/PromoRedemption');
const TaxRule = require('../models/TaxRule');
const CurrencyRate = require('../models/CurrencyRate');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const router = express.Router();

// Validate Promo Code
router.get('/promo/validate/:code', auth, async (req, res) => {
  try {
    const promo = await PromoCode.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (!promo) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ error: 'Promo code usage limit reached' });
    }

    const userRedemptions = await PromoRedemption.countDocuments({
      promo: promo._id,
      user: req.user.id
    });

    if (userRedemptions >= promo.perUserLimit) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    res.json({
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      description: promo.description
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redeem Promo Code
router.post('/promo/redeem', auth, async (req, res) => {
  try {
    const { code, orderId, orderAmount } = req.body;

    const promo = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!promo) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    if (promo.minPurchaseAmount && orderAmount < promo.minPurchaseAmount) {
      return res.status(400).json({ 
        error: `Minimum purchase amount of ${promo.minPurchaseAmount} required` 
      });
    }

    const idempotencyKey = `${req.user.id}-${code}-${orderId}`;
    const existing = await PromoRedemption.findOne({ idempotencyKey });
    
    if (existing) {
      return res.json(existing);
    }

    let discountAmount = 0;
    if (promo.type === 'percentage') {
      discountAmount = (orderAmount * promo.value) / 100;
    } else if (promo.type === 'fixed_amount') {
      discountAmount = Math.min(promo.value, orderAmount);
    }

    const redemption = await PromoRedemption.create({
      promo: promo._id,
      user: req.user.id,
      order: orderId,
      discountAmount,
      currency: promo.currency,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      idempotencyKey
    });

    await PromoCode.findByIdAndUpdate(promo._id, {
      $inc: { usedCount: 1 }
    });

    res.json(redemption);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Tax
router.post('/tax/calculate', auth, async (req, res) => {
  try {
    const { country, state, region, postalCode, amount, productCategories = [] } = req.body;

    const taxRules = await TaxRule.find({
      country,
      $or: [
        { state: state || null },
        { state: null }
      ],
      isActive: true,
      $or: [
        { effectiveFrom: { $lte: new Date() } },
        { effectiveFrom: null }
      ],
      $or: [
        { effectiveUntil: { $gte: new Date() } },
        { effectiveUntil: null }
      ]
    }).sort({ priority: -1 });

    let totalTaxRate = 0;
    const appliedRules = [];

    for (const rule of taxRules) {
      if (!rule.applicableProducts.length || 
          productCategories.some(cat => rule.applicableProducts.includes(cat))) {
        totalTaxRate += rule.taxRate;
        appliedRules.push({
          type: rule.taxType,
          rate: rule.taxRate
        });
      }
    }

    const taxAmount = (amount * totalTaxRate) / 100;
    const totalAmount = amount + taxAmount;

    res.json({
      subtotal: amount,
      taxRate: totalTaxRate,
      taxAmount,
      total: totalAmount,
      appliedRules
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Currency Rates
router.get('/currency/rates', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;

    const rates = await CurrencyRate.find({
      baseCurrency: base,
      expiresAt: { $gt: new Date() }
    }).sort({ retrievedAt: -1 });

    if (rates.length === 0) {
      return res.status(404).json({ error: 'No rates available' });
    }

    const ratesMap = {};
    rates.forEach(rate => {
      if (!ratesMap[rate.targetCurrency]) {
        ratesMap[rate.targetCurrency] = rate.rate;
      }
    });

    res.json({
      base,
      rates: ratesMap,
      timestamp: rates[0].retrievedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert Currency
router.get('/currency/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const rate = await CurrencyRate.findOne({
      baseCurrency: from,
      targetCurrency: to,
      expiresAt: { $gt: new Date() }
    }).sort({ retrievedAt: -1 });

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not available' });
    }

    const convertedAmount = parseFloat(amount) * rate.rate;

    res.json({
      amount: parseFloat(amount),
      from,
      to,
      rate: rate.rate,
      convertedAmount: Math.round(convertedAmount * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Transaction
router.post('/transaction', auth, async (req, res) => {
  try {
    const { type, amount, currency, description, metadata } = req.body;

    const baseCurrency = 'USD';
    let exchangeRate = 1;
    let amountBase = amount;

    if (currency !== baseCurrency) {
      const rate = await CurrencyRate.findOne({
        baseCurrency,
        targetCurrency: currency
      }).sort({ retrievedAt: -1 });

      if (rate) {
        exchangeRate = rate.rate;
        amountBase = amount / exchangeRate;
      }
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      amount,
      amountBase,
      currency,
      baseCurrency,
      exchangeRate,
      description,
      metadata,
      status: 'pending'
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;

    const query = { user: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;