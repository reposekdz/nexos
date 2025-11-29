const express = require('express');
const {
  Plugin,
  PluginInstallation,
  PluginHook,
  PluginEventLog,
  PluginReview,
  PluginMarketplace,
  PluginAPIKey
} = require('../models/PluginSystem');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/plugins', auth, async (req, res) => {
  try {
    const plugin = new Plugin({
      pluginId: `PLG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      developer: req.userId
    });
    
    await plugin.save();
    
    await PluginEventLog.create({
      plugin: plugin._id,
      event: 'plugin_created',
      actor: req.userId,
      details: { name: plugin.name, version: plugin.version }
    });
    
    res.status(201).json(plugin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/plugins', auth, async (req, res) => {
  try {
    const { category, type, status, search, featured } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (featured !== undefined) filter['marketplace.featured' ] = featured === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const plugins = await Plugin.find(filter)
      .sort({ 'marketplace.downloads': -1, 'marketplace.rating': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('developer', 'name avatar');
    
    const total = await Plugin.countDocuments(filter);
    
    res.json({
      plugins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/plugins/:id', auth, async (req, res) => {
  try {
    const plugin = await Plugin.findById(req.params.id)
      .populate('developer', 'name avatar email');
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const isInstalled = await PluginInstallation.findOne({
      plugin: plugin._id,
      installedBy: req.userId,
      status: 'active'
    });
    
    res.json({
      ...plugin.toObject(),
      isInstalled: !!isInstalled
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/plugins/:id', auth, async (req, res) => {
  try {
    const plugin = await Plugin.findOne({
      _id: req.params.id,
      developer: req.userId
    });
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const oldVersion = plugin.version;
    Object.assign(plugin, req.body);
    
    if (req.body.version && req.body.version !== oldVersion) {
      plugin.versionHistory.push({
        version: oldVersion,
        releaseDate: plugin.releaseDate,
        changes: plugin.changelog
      });
    }
    
    await plugin.save();
    
    await PluginEventLog.create({
      plugin: plugin._id,
      event: 'plugin_updated',
      actor: req.userId,
      details: { version: plugin.version, changes: req.body.changelog }
    });
    
    res.json(plugin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/plugins/:id/install', auth, async (req, res) => {
  try {
    const plugin = await Plugin.findById(req.params.id);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    if (plugin.status !== 'approved') {
      return res.status(400).json({ message: 'Plugin is not approved for installation' });
    }
    
    const existingInstallation = await PluginInstallation.findOne({
      plugin: plugin._id,
      installedBy: req.userId
    });
    
    if (existingInstallation && existingInstallation.status === 'active') {
      return res.status(400).json({ message: 'Plugin already installed' });
    }
    
    const installation = new PluginInstallation({
      installationId: `INST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      plugin: plugin._id,
      installedBy: req.userId,
      version: plugin.version,
      configuration: req.body.configuration || plugin.config.defaults
    });
    
    await installation.save();
    
    plugin.marketplace.downloads += 1;
    plugin.marketplace.activeInstalls += 1;
    await plugin.save();
    
    await PluginEventLog.create({
      plugin: plugin._id,
      installation: installation._id,
      event: 'plugin_installed',
      actor: req.userId,
      details: { version: plugin.version }
    });
    
    res.status(201).json(installation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/installations', auth, async (req, res) => {
  try {
    const installations = await PluginInstallation.find({
      installedBy: req.userId,
      status: 'active'
    })
      .sort({ installedAt: -1 })
      .populate('plugin', 'name displayName version icon category');
    
    res.json(installations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/installations/:id', auth, async (req, res) => {
  try {
    const installation = await PluginInstallation.findOne({
      _id: req.params.id,
      installedBy: req.userId
    }).populate('plugin');
    
    if (!installation) {
      return res.status(404).json({ message: 'Installation not found' });
    }
    
    res.json(installation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/installations/:id/configure', auth, async (req, res) => {
  try {
    const installation = await PluginInstallation.findOne({
      _id: req.params.id,
      installedBy: req.userId
    });
    
    if (!installation) {
      return res.status(404).json({ message: 'Installation not found' });
    }
    
    installation.configuration = req.body.configuration;
    await installation.save();
    
    await PluginEventLog.create({
      plugin: installation.plugin,
      installation: installation._id,
      event: 'plugin_configured',
      actor: req.userId,
      details: { configuration: req.body.configuration }
    });
    
    res.json(installation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/installations/:id/uninstall', auth, async (req, res) => {
  try {
    const installation = await PluginInstallation.findOne({
      _id: req.params.id,
      installedBy: req.userId
    });
    
    if (!installation) {
      return res.status(404).json({ message: 'Installation not found' });
    }
    
    installation.status = 'uninstalled';
    installation.uninstalledAt = new Date();
    await installation.save();
    
    const plugin = await Plugin.findById(installation.plugin);
    if (plugin) {
      plugin.marketplace.activeInstalls = Math.max(0, plugin.marketplace.activeInstalls - 1);
      await plugin.save();
    }
    
    await PluginEventLog.create({
      plugin: installation.plugin,
      installation: installation._id,
      event: 'plugin_uninstalled',
      actor: req.userId,
      details: { reason: req.body.reason }
    });
    
    res.json({ message: 'Plugin uninstalled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/hooks', auth, async (req, res) => {
  try {
    const hook = new PluginHook({
      plugin: req.body.pluginId,
      ...req.body
    });
    
    await hook.save();
    
    res.status(201).json(hook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/hooks', auth, async (req, res) => {
  try {
    const { event, plugin } = req.query;
    
    const filter = { enabled: true };
    
    if (event) filter.event = event;
    if (plugin) filter.plugin = plugin;
    
    const hooks = await PluginHook.find(filter)
      .sort({ priority: 1 })
      .populate('plugin', 'name version');
    
    res.json(hooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/hooks/:id/execute', auth, async (req, res) => {
  try {
    const hook = await PluginHook.findById(req.params.id);
    
    if (!hook) {
      return res.status(404).json({ message: 'Hook not found' });
    }
    
    const startTime = Date.now();
    
    hook.executionCount += 1;
    hook.lastExecutedAt = new Date();
    
    const executionTime = Date.now() - startTime;
    hook.performance.avgExecutionTime = 
      (hook.performance.avgExecutionTime * (hook.executionCount - 1) + executionTime) / hook.executionCount;
    
    await hook.save();
    
    await PluginEventLog.create({
      plugin: hook.plugin,
      event: 'hook_executed',
      actor: req.userId,
      details: { 
        hookEvent: hook.event,
        executionTime,
        payload: req.body.payload
      }
    });
    
    res.json({ executionTime, result: req.body.result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reviews', auth, async (req, res) => {
  try {
    const installation = await PluginInstallation.findOne({
      plugin: req.body.pluginId,
      installedBy: req.userId
    });
    
    if (!installation) {
      return res.status(400).json({ message: 'Must install plugin before reviewing' });
    }
    
    const existingReview = await PluginReview.findOne({
      plugin: req.body.pluginId,
      reviewer: req.userId
    });
    
    if (existingReview) {
      return res.status(400).json({ message: 'Already reviewed this plugin' });
    }
    
    const review = new PluginReview({
      plugin: req.body.pluginId,
      reviewer: req.userId,
      rating: req.body.rating,
      title: req.body.title,
      content: req.body.content
    });
    
    await review.save();
    
    const plugin = await Plugin.findById(req.body.pluginId);
    if (plugin) {
      const allReviews = await PluginReview.find({ plugin: plugin._id });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      
      plugin.marketplace.rating = avgRating;
      plugin.marketplace.reviewCount = allReviews.length;
      await plugin.save();
    }
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reviews', auth, async (req, res) => {
  try {
    const { plugin, rating } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (plugin) filter.plugin = plugin;
    if (rating) filter.rating = parseInt(rating);
    
    const reviews = await PluginReview.find(filter)
      .sort({ helpful: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reviewer', 'name avatar')
      .populate('developerResponse.respondedBy', 'name');
    
    const total = await PluginReview.countDocuments(filter);
    
    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reviews/:id/helpful', auth, async (req, res) => {
  try {
    const review = await PluginReview.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    review.helpful += 1;
    await review.save();
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reviews/:id/respond', auth, async (req, res) => {
  try {
    const review = await PluginReview.findById(req.params.id).populate('plugin');
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    const plugin = await Plugin.findOne({
      _id: review.plugin._id,
      developer: req.userId
    });
    
    if (!plugin) {
      return res.status(403).json({ message: 'Only plugin developer can respond' });
    }
    
    review.developerResponse = {
      response: req.body.response,
      respondedAt: new Date(),
      respondedBy: req.userId
    };
    
    await review.save();
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/marketplace', auth, async (req, res) => {
  try {
    const marketplace = await PluginMarketplace.findOne()
      .populate('featured', 'name displayName icon description marketplace');
    
    const categories = await Plugin.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const trending = await Plugin.find({ status: 'approved' })
      .sort({ 'marketplace.downloads': -1 })
      .limit(10)
      .select('name displayName icon description marketplace');
    
    const topRated = await Plugin.find({ status: 'approved' })
      .sort({ 'marketplace.rating': -1 })
      .limit(10)
      .select('name displayName icon description marketplace');
    
    res.json({
      marketplace,
      categories,
      trending,
      topRated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/api-keys', auth, async (req, res) => {
  try {
    const apiKey = new PluginAPIKey({
      keyId: `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      plugin: req.body.pluginId,
      owner: req.userId,
      name: req.body.name,
      key: `pk_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`,
      scopes: req.body.scopes || []
    });
    
    await apiKey.save();
    
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/api-keys', auth, async (req, res) => {
  try {
    const apiKeys = await PluginAPIKey.find({
      owner: req.userId,
      active: true
    })
      .sort({ createdAt: -1 })
      .populate('plugin', 'name displayName');
    
    res.json(apiKeys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/api-keys/:id', auth, async (req, res) => {
  try {
    const apiKey = await PluginAPIKey.findOne({
      _id: req.params.id,
      owner: req.userId
    });
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    apiKey.active = false;
    apiKey.revokedAt = new Date();
    await apiKey.save();
    
    res.json({ message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/logs', auth, async (req, res) => {
  try {
    const { plugin, event, installation } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = {};
    
    if (plugin) filter.plugin = plugin;
    if (event) filter.event = event;
    if (installation) filter.installation = installation;
    
    const logs = await PluginEventLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name avatar')
      .populate('plugin', 'name version');
    
    const total = await PluginEventLog.countDocuments(filter);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
