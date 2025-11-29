const express = require('express');
const {
  IoTDevice,
  DeviceCommand,
  FirmwareVersion,
  FirmwareUpdate,
  DeviceMetric,
  DeviceAlert,
  DeviceGroup,
  EdgeCache
} = require('../models/IoTDevice');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/devices', auth, async (req, res) => {
  try {
    const device = new IoTDevice({
      deviceId: req.body.deviceId || `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      owner: req.userId,
      tenantId: req.tenantId,
      registeredAt: new Date()
    });
    await device.save();
    
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/devices', auth, async (req, res) => {
  try {
    const { type, status, group, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      $or: [
        { owner: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (group) filter.groups = group;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { deviceId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const devices = await IoTDevice.find(filter)
      .sort({ 'connectivity.lastSeen': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('groups', 'name');
    
    const total = await IoTDevice.countDocuments(filter);
    
    res.json({
      devices,
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

router.get('/devices/:id', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.params.id)
      .populate('groups', 'name description')
      .populate('owner', 'name email');
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    if (device.owner._id.toString() !== req.userId && device.tenantId?.toString() !== req.tenantId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const recentMetrics = await DeviceMetric.find({ device: device._id })
      .sort({ timestamp: -1 })
      .limit(100);
    
    const activeAlerts = await DeviceAlert.find({ 
      device: device._id,
      status: { $in: ['active', 'acknowledged'] }
    }).sort({ createdAt: -1 });
    
    res.json({
      device,
      recentMetrics,
      activeAlerts,
      isHealthy: device.isHealthy()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/devices/:id', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    if (device.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(device, req.body);
    await device.save();
    
    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/devices/:id', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    if (device.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await device.remove();
    
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/devices/:id/health', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    device.updateHealth(req.body);
    await device.save();
    
    if (!device.isHealthy() && device.alertsEnabled) {
      const alert = new DeviceAlert({
        alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        device: device._id,
        type: 'health',
        severity: 'warning',
        message: 'Device health check failed',
        data: device.health
      });
      await alert.save();
    }
    
    res.json({ 
      health: device.health,
      isHealthy: device.isHealthy()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/devices/:id/status', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    device.status = req.body.status;
    device.connectivity.lastSeen = new Date();
    await device.save();
    
    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/commands', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findById(req.body.deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    const command = new DeviceCommand({
      commandId: `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device: req.body.deviceId,
      type: req.body.type,
      payload: req.body.payload,
      priority: req.body.priority || 'normal',
      timeout: req.body.timeout || 30000,
      issuedBy: req.userId
    });
    
    await command.save();
    
    device.lastCommand = {
      commandId: command.commandId,
      type: command.type,
      status: command.status,
      timestamp: new Date()
    };
    await device.save();
    
    res.status(201).json(command);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/commands', auth, async (req, res) => {
  try {
    const { device, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      issuedBy: req.userId
    };
    
    if (device) filter.device = device;
    if (status) filter.status = status;
    
    const commands = await DeviceCommand.find(filter)
      .sort({ issuedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('device', 'name deviceId type');
    
    const total = await DeviceCommand.countDocuments(filter);
    
    res.json({
      commands,
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

router.get('/commands/:id', auth, async (req, res) => {
  try {
    const command = await DeviceCommand.findById(req.params.id)
      .populate('device', 'name deviceId type');
    
    if (!command) {
      return res.status(404).json({ message: 'Command not found' });
    }
    
    res.json(command);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/commands/:id/status', auth, async (req, res) => {
  try {
    const command = await DeviceCommand.findById(req.params.id);
    
    if (!command) {
      return res.status(404).json({ message: 'Command not found' });
    }
    
    command.status = req.body.status;
    
    if (req.body.status === 'executing') {
      command.executedAt = new Date();
    } else if (req.body.status === 'completed') {
      command.completedAt = new Date();
      command.response = req.body.response;
      command.calculateExecutionTime();
    } else if (req.body.status === 'failed') {
      command.error = req.body.error;
      command.retryCount += 1;
      
      if (command.retryCount < command.maxRetries) {
        command.status = 'pending';
      }
    }
    
    await command.save();
    
    res.json(command);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/firmware', auth, async (req, res) => {
  try {
    const firmware = new FirmwareVersion({
      ...req.body,
      versionId: req.body.versionId || `FW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uploadedBy: req.userId
    });
    await firmware.save();
    
    res.status(201).json(firmware);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/firmware', auth, async (req, res) => {
  try {
    const { deviceModel, status, channel } = req.query;
    
    const filter = {};
    
    if (deviceModel) filter.deviceModel = deviceModel;
    if (status) filter.status = status;
    if (channel) filter.releaseChannel = channel;
    
    const firmwares = await FirmwareVersion.find(filter)
      .sort({ releaseDate: -1 })
      .populate('uploadedBy', 'name email');
    
    res.json(firmwares);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/firmware/updates', auth, async (req, res) => {
  try {
    const { deviceIds, firmwareId } = req.body;
    
    const firmware = await FirmwareVersion.findById(firmwareId);
    if (!firmware) {
      return res.status(404).json({ message: 'Firmware version not found' });
    }
    
    const updates = [];
    
    for (const deviceId of deviceIds) {
      const update = new FirmwareUpdate({
        updateId: `UPD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        device: deviceId,
        targetVersion: firmware.version,
        initiatedBy: req.userId
      });
      await update.save();
      updates.push(update);
      
      const device = await IoTDevice.findById(deviceId);
      if (device) {
        device.status = 'updating';
        await device.save();
      }
    }
    
    res.status(201).json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/firmware/updates', auth, async (req, res) => {
  try {
    const { device, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (device) filter.device = device;
    if (status) filter.status = status;
    
    const updates = await FirmwareUpdate.find(filter)
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('device', 'name deviceId')
      .populate('initiatedBy', 'name');
    
    const total = await FirmwareUpdate.countDocuments(filter);
    
    res.json({
      updates,
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

router.put('/firmware/updates/:id/progress', auth, async (req, res) => {
  try {
    const update = await FirmwareUpdate.findById(req.params.id);
    
    if (!update) {
      return res.status(404).json({ message: 'Firmware update not found' });
    }
    
    update.progress = req.body.progress;
    update.status = req.body.status;
    
    if (req.body.status === 'in_progress' && !update.startedAt) {
      update.startedAt = new Date();
    } else if (req.body.status === 'completed') {
      update.completedAt = new Date();
      update.progress = 100;
      update.calculateDuration();
      
      const device = await IoTDevice.findById(update.device);
      if (device) {
        device.firmwareVersion = update.targetVersion;
        device.status = 'online';
        await device.save();
      }
    } else if (req.body.status === 'failed') {
      update.error = req.body.error;
      update.retryCount += 1;
      
      const device = await IoTDevice.findById(update.device);
      if (device) {
        device.status = 'error';
        await device.save();
      }
    }
    
    await update.save();
    
    res.json(update);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/metrics', auth, async (req, res) => {
  try {
    const metrics = Array.isArray(req.body) ? req.body : [req.body];
    const savedMetrics = [];
    
    for (const metricData of metrics) {
      const metric = new DeviceMetric({
        metricId: `MET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...metricData
      });
      await metric.save();
      savedMetrics.push(metric);
    }
    
    res.status(201).json(savedMetrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/metrics', auth, async (req, res) => {
  try {
    const { device, metric, startTime, endTime } = req.query;
    const limit = parseInt(req.query.limit) || 1000;
    
    const filter = {};
    
    if (device) filter.device = device;
    if (metric) filter.metric = metric;
    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = new Date(startTime);
      if (endTime) filter.timestamp.$lte = new Date(endTime);
    }
    
    const metrics = await DeviceMetric.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/metrics/aggregate', auth, async (req, res) => {
  try {
    const { device, metric, aggregation, interval } = req.query;
    
    const matchStage = {};
    if (device) matchStage.device = device;
    if (metric) matchStage.metric = metric;
    
    const groupId = {};
    if (interval === 'hour') {
      groupId.year = { $year: '$timestamp' };
      groupId.month = { $month: '$timestamp' };
      groupId.day = { $dayOfMonth: '$timestamp' };
      groupId.hour = { $hour: '$timestamp' };
    } else if (interval === 'day') {
      groupId.year = { $year: '$timestamp' };
      groupId.month = { $month: '$timestamp' };
      groupId.day = { $dayOfMonth: '$timestamp' };
    }
    
    const aggregationOp = aggregation === 'avg' ? { $avg: '$value' } :
                         aggregation === 'min' ? { $min: '$value' } :
                         aggregation === 'max' ? { $max: '$value' } :
                         { $sum: '$value' };
    
    const result = await DeviceMetric.aggregate([
      { $match: matchStage },
      { $group: {
        _id: groupId,
        value: aggregationOp,
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.hour': -1 } }
    ]);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/alerts', auth, async (req, res) => {
  try {
    const alert = new DeviceAlert({
      alertId: req.body.alertId || `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body
    });
    await alert.save();
    
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts', auth, async (req, res) => {
  try {
    const { device, status, severity, type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (device) filter.device = device;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    
    const alerts = await DeviceAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('device', 'name deviceId type')
      .populate('acknowledgedBy', 'name')
      .populate('resolvedBy', 'name');
    
    const total = await DeviceAlert.countDocuments(filter);
    
    res.json({
      alerts,
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

router.put('/alerts/:id/acknowledge', auth, async (req, res) => {
  try {
    const alert = await DeviceAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.userId;
    alert.notes = req.body.notes;
    await alert.save();
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/alerts/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await DeviceAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.userId;
    alert.resolution = req.body.resolution;
    await alert.save();
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups', auth, async (req, res) => {
  try {
    const group = new DeviceGroup({
      groupId: req.body.groupId || `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      owner: req.userId,
      tenantId: req.tenantId
    });
    await group.save();
    
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups', auth, async (req, res) => {
  try {
    const filter = {
      $or: [
        { owner: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    const groups = await DeviceGroup.find(filter)
      .sort({ name: 1 })
      .populate('owner', 'name email');
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/groups/:id', auth, async (req, res) => {
  try {
    const group = await DeviceGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (group.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(group, req.body);
    await group.save();
    
    if (group.type === 'dynamic') {
      await group.evaluateMembership();
    }
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/devices', auth, async (req, res) => {
  try {
    const group = await DeviceGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (group.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (group.type === 'dynamic') {
      return res.status(400).json({ message: 'Cannot manually add devices to dynamic group' });
    }
    
    const { deviceIds } = req.body;
    
    for (const deviceId of deviceIds) {
      if (!group.devices.includes(deviceId)) {
        group.devices.push(deviceId);
        
        const device = await IoTDevice.findById(deviceId);
        if (device && !device.groups.includes(group._id)) {
          device.groups.push(group._id);
          await device.save();
        }
      }
    }
    
    group.deviceCount = group.devices.length;
    await group.save();
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/groups/:id/devices/:deviceId', auth, async (req, res) => {
  try {
    const group = await DeviceGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (group.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    group.devices = group.devices.filter(d => d.toString() !== req.params.deviceId);
    group.deviceCount = group.devices.length;
    await group.save();
    
    const device = await IoTDevice.findById(req.params.deviceId);
    if (device) {
      device.groups = device.groups.filter(g => g.toString() !== group._id.toString());
      await device.save();
    }
    
    res.json({ message: 'Device removed from group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cache', auth, async (req, res) => {
  try {
    const { device, synced } = req.query;
    
    const filter = {};
    
    if (device) filter.device = device;
    if (synced !== undefined) filter.synced = synced === 'true';
    
    const cache = await EdgeCache.find(filter)
      .sort({ lastModified: -1 })
      .populate('device', 'name deviceId');
    
    res.json(cache);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/cache/sync', auth, async (req, res) => {
  try {
    const { deviceId, cacheData } = req.body;
    
    const device = await IoTDevice.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    const cache = new EdgeCache({
      cacheId: `CACHE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device: deviceId,
      dataType: cacheData.type,
      data: cacheData.data,
      priority: cacheData.priority || 'normal'
    });
    
    await cache.save();
    
    res.status(201).json(cache);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/cache/:id/sync', auth, async (req, res) => {
  try {
    const cache = await EdgeCache.findById(req.params.id);
    
    if (!cache) {
      return res.status(404).json({ message: 'Cache entry not found' });
    }
    
    cache.synced = true;
    cache.lastSyncedAt = new Date();
    await cache.save();
    
    res.json(cache);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const totalDevices = await IoTDevice.countDocuments({
      $or: [{ owner: req.userId }, { tenantId: req.tenantId }]
    });
    
    const onlineDevices = await IoTDevice.countDocuments({
      $or: [{ owner: req.userId }, { tenantId: req.tenantId }],
      status: 'online'
    });
    
    const offlineDevices = await IoTDevice.countDocuments({
      $or: [{ owner: req.userId }, { tenantId: req.tenantId }],
      status: 'offline'
    });
    
    const errorDevices = await IoTDevice.countDocuments({
      $or: [{ owner: req.userId }, { tenantId: req.tenantId }],
      status: 'error'
    });
    
    const activeAlerts = await DeviceAlert.countDocuments({
      status: { $in: ['active', 'acknowledged'] }
    });
    
    const criticalAlerts = await DeviceAlert.countDocuments({
      status: { $in: ['active', 'acknowledged'] },
      severity: 'critical'
    });
    
    const pendingCommands = await DeviceCommand.countDocuments({
      status: 'pending'
    });
    
    res.json({
      totalDevices,
      onlineDevices,
      offlineDevices,
      errorDevices,
      activeAlerts,
      criticalAlerts,
      pendingCommands,
      uptimePercentage: totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
