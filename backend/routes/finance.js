const express = require('express');
const SettlementBatch = require('../models/SettlementBatch');
const ReconciliationRecord = require('../models/ReconciliationRecord');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/settlement-batches', [auth, adminOnly], async (req, res) => {
  try {
    const { provider, batchId, startDate, endDate, totalAmount, currency, transactionCount, fileUrl, fileHash } = req.body;

    const existingBatch = await SettlementBatch.findOne({ batchId });
    if (existingBatch) {
      return res.status(400).json({ error: 'Settlement batch already exists' });
    }

    const batch = await SettlementBatch.create({
      provider,
      batchId,
      startDate,
      endDate,
      totalAmount,
      currency,
      transactionCount,
      fileUrl,
      fileHash,
      status: 'pending'
    });

    logger.info(`Settlement batch created: ${batchId}`, { batch: batch._id });
    res.status(201).json(batch);
  } catch (error) {
    logger.error('Create settlement batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/settlement-batches', [auth, adminOnly], async (req, res) => {
  try {
    const { provider, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (provider) query.provider = provider;
    if (status) query.status = status;

    const batches = await SettlementBatch.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('reconciledBy', 'fullName email');

    const total = await SettlementBatch.countDocuments(query);

    res.json({
      batches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get settlement batches error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/settlement-batches/:id', [auth, adminOnly], async (req, res) => {
  try {
    const batch = await SettlementBatch.findById(req.params.id)
      .populate('reconciledBy', 'fullName email');

    if (!batch) {
      return res.status(404).json({ error: 'Settlement batch not found' });
    }

    res.json(batch);
  } catch (error) {
    logger.error('Get settlement batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/settlement-batches/:id/reconcile', [auth, adminOnly], async (req, res) => {
  try {
    const batch = await SettlementBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Settlement batch not found' });
    }

    batch.status = 'processing';
    batch.processedAt = new Date();
    await batch.save();

    const platformTransactions = await Transaction.find({
      createdAt: {
        $gte: batch.startDate,
        $lte: batch.endDate
      },
      status: 'completed'
    });

    let matchedCount = 0;
    let unmatchedCount = 0;
    let discrepancyCount = 0;

    for (const transaction of platformTransactions) {
      const record = await ReconciliationRecord.create({
        settlementBatch: batch._id,
        transaction: transaction._id,
        providerTransactionId: transaction.providerTransactionId,
        platformAmount: transaction.amountBase,
        status: 'matched',
        matchScore: 1.0
      });

      matchedCount++;
    }

    batch.status = 'reconciled';
    batch.reconciledAt = new Date();
    batch.reconciledBy = req.user.id;
    await batch.save();

    logger.info(`Settlement batch reconciled: ${batch.batchId}`, {
      matched: matchedCount,
      unmatched: unmatchedCount,
      discrepancies: discrepancyCount
    });

    res.json({
      message: 'Reconciliation completed',
      batch,
      summary: {
        matched: matchedCount,
        unmatched: unmatchedCount,
        discrepancies: discrepancyCount
      }
    });
  } catch (error) {
    logger.error('Reconcile settlement batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/settlement-batches/:id/records', [auth, adminOnly], async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const query = { settlementBatch: req.params.id };
    if (status) query.status = status;

    const records = await ReconciliationRecord.find(query)
      .populate('transaction')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ReconciliationRecord.countDocuments(query);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get reconciliation records error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/reconciliation-records/:id/resolve', [auth, adminOnly], async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const record = await ReconciliationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Reconciliation record not found' });
    }

    record.status = 'resolved';
    record.resolvedAt = new Date();
    record.resolvedBy = req.user.id;
    record.resolutionNotes = resolutionNotes;
    await record.save();

    logger.info(`Reconciliation record resolved: ${record._id}`);

    res.json(record);
  } catch (error) {
    logger.error('Resolve reconciliation record error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/reconciliation-dashboard', [auth, adminOnly], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalBatches = await SettlementBatch.countDocuments(query);
    const reconciledBatches = await SettlementBatch.countDocuments({ ...query, status: 'reconciled' });
    const pendingBatches = await SettlementBatch.countDocuments({ ...query, status: 'pending' });
    const discrepancyBatches = await SettlementBatch.countDocuments({ ...query, status: 'discrepancy' });

    const totalRecords = await ReconciliationRecord.countDocuments({});
    const matchedRecords = await ReconciliationRecord.countDocuments({ status: 'matched' });
    const unmatchedRecords = await ReconciliationRecord.countDocuments({ status: 'unmatched' });
    const discrepancyRecords = await ReconciliationRecord.countDocuments({ status: 'discrepancy' });

    const recentBatches = await SettlementBatch.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('reconciledBy', 'fullName email');

    res.json({
      summary: {
        batches: {
          total: totalBatches,
          reconciled: reconciledBatches,
          pending: pendingBatches,
          discrepancies: discrepancyBatches
        },
        records: {
          total: totalRecords,
          matched: matchedRecords,
          unmatched: unmatchedRecords,
          discrepancies: discrepancyRecords
        }
      },
      recentBatches
    });
  } catch (error) {
    logger.error('Get reconciliation dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;