const express = require('express');
const {
  Inventory,
  Reservation,
  Warehouse,
  Order,
  ShippingLabel,
  RMA,
  SKUBundle,
  PriceRule,
  SellerPerformance,
  ChannelMapping,
  AttributeSchema,
  SKULifecycle
} = require('../models/Marketplace');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/inventory', auth, async (req, res) => {
  try {
    const inventory = new Inventory({
      ...req.body,
      available: req.body.quantity
    });
    await inventory.save();
    res.status(201).json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/inventory', auth, async (req, res) => {
  try {
    const { warehouse, sku, lowStock } = req.query;
    const filter = {};
    
    if (warehouse) filter.warehouseId = warehouse;
    if (sku) filter.sku = new RegExp(sku, 'i');
    if (lowStock === 'true') {
      filter.$expr = { $lt: ['$available', '$reorderPoint'] };
    }
    
    const inventory = await Inventory.find(filter)
      .populate('warehouseId', 'name code')
      .populate('productId', 'name');
    
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/inventory/:id/reserve', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    await inventory.reserve(quantity);
    
    const reservation = new Reservation({
      userId: req.userId,
      inventoryId: inventory._id,
      quantity,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    
    await reservation.save();
    
    res.json({ reservation, inventory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/inventory/:id/release', auth, async (req, res) => {
  try {
    const { reservationId } = req.body;
    
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    const inventory = await Inventory.findById(reservation.inventoryId);
    await inventory.release(reservation.quantity);
    
    reservation.status = 'released';
    reservation.releasedAt = new Date();
    await reservation.save();
    
    res.json({ message: 'Reservation released', inventory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/warehouses', auth, async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ enabled: true });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/orders', auth, async (req, res) => {
  try {
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const order = new Order({
      ...req.body,
      orderNumber,
      userId: req.userId,
      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created'
      }]
    });
    
    await order.save();
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const filter = { userId: req.userId };
    
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    const { status, note, location } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    order.timeline.push({
      status,
      timestamp: new Date(),
      location,
      note
    });
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/shipping/labels', auth, async (req, res) => {
  try {
    const label = new ShippingLabel(req.body);
    await label.save();
    res.status(201).json(label);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/shipping/labels/:trackingNumber', async (req, res) => {
  try {
    const label = await ShippingLabel.findOne({
      trackingNumber: req.params.trackingNumber
    }).populate('orderId');
    
    if (!label) {
      return res.status(404).json({ message: 'Label not found' });
    }
    
    res.json(label);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rma', auth, async (req, res) => {
  try {
    const rmaNumber = `RMA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const rma = new RMA({
      ...req.body,
      rmaNumber,
      userId: req.userId,
      slaDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      timeline: [{
        status: 'requested',
        timestamp: new Date(),
        note: 'RMA requested'
      }]
    });
    
    await rma.save();
    res.status(201).json(rma);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/rma', auth, async (req, res) => {
  try {
    const rmas = await RMA.find({ userId: req.userId })
      .populate('orderId')
      .sort({ createdAt: -1 });
    res.json(rmas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/rma/:id/status', auth, async (req, res) => {
  try {
    const { status, note, resolution } = req.body;
    
    const rma = await RMA.findById(req.params.id);
    if (!rma) {
      return res.status(404).json({ message: 'RMA not found' });
    }
    
    rma.status = status;
    if (resolution) rma.resolution = resolution;
    
    rma.timeline.push({
      status,
      timestamp: new Date(),
      note
    });
    
    await rma.save();
    res.json(rma);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/bundles', auth, async (req, res) => {
  try {
    const bundle = new SKUBundle(req.body);
    await bundle.save();
    res.status(201).json(bundle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/bundles', async (req, res) => {
  try {
    const bundles = await SKUBundle.find({ enabled: true });
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/price-rules', auth, async (req, res) => {
  try {
    const rule = new PriceRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/price-rules', async (req, res) => {
  try {
    const now = new Date();
    const rules = await PriceRule.find({
      enabled: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null }
      ]
    }).sort({ priority: -1 });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/price-rules/:id/apply', async (req, res) => {
  try {
    const { cart } = req.body;
    
    const rule = await PriceRule.findById(req.params.id);
    if (!rule || !rule.enabled) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    
    res.json({
      originalTotal: cart.total,
      discount: 0,
      newTotal: cart.total,
      message: 'Price rule applied'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/seller/performance', auth, async (req, res) => {
  try {
    const performance = await SellerPerformance.findOne({
      sellerId: req.userId
    });
    
    if (!performance) {
      return res.status(404).json({ message: 'No performance data found' });
    }
    
    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/channels', auth, async (req, res) => {
  try {
    const mapping = new ChannelMapping({
      ...req.body,
      sellerId: req.userId
    });
    await mapping.save();
    res.status(201).json(mapping);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/channels', auth, async (req, res) => {
  try {
    const mappings = await ChannelMapping.find({
      sellerId: req.userId,
      enabled: true
    });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/channels/:id/sync', auth, async (req, res) => {
  try {
    const mapping = await ChannelMapping.findOne({
      _id: req.params.id,
      sellerId: req.userId
    });
    
    if (!mapping) {
      return res.status(404).json({ message: 'Channel mapping not found' });
    }
    
    mapping.lastSync = new Date();
    await mapping.save();
    
    res.json({ message: 'Sync initiated', mapping });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/attribute-schemas', auth, async (req, res) => {
  try {
    const schema = new AttributeSchema(req.body);
    await schema.save();
    res.status(201).json(schema);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/attribute-schemas/:category', async (req, res) => {
  try {
    const schema = await AttributeSchema.findOne({
      category: req.params.category
    }).sort({ version: -1 });
    
    res.json(schema);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/sku/:sku/deprecate', auth, async (req, res) => {
  try {
    const { reason, replacementSku } = req.body;
    
    const lifecycle = await SKULifecycle.findOneAndUpdate(
      { sku: req.params.sku },
      {
        sku: req.params.sku,
        status: 'deprecated',
        deprecationDate: new Date(),
        reason,
        replacementSku
      },
      { upsert: true, new: true }
    );
    
    res.json(lifecycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/sku/:sku/lifecycle', async (req, res) => {
  try {
    const lifecycle = await SKULifecycle.findOne({ sku: req.params.sku });
    res.json(lifecycle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
