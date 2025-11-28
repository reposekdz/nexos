const SystemMetrics = require('../models/SystemMetrics');
const ErrorLog = require('../models/ErrorLog');
const logger = require('../utils/logger');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

class MonitoringService {
  constructor() {
    this.instanceId = uuidv4();
    this.hostname = os.hostname();
    this.metricsBuffer = [];
    this.BUFFER_SIZE = 100;
    this.FLUSH_INTERVAL = 30000;
    
    setInterval(() => this.flushMetrics(), this.FLUSH_INTERVAL);
  }

  recordMetric(name, value, metricType = 'custom', unit = 'count', tags = {}) {
    this.metricsBuffer.push({
      timestamp: new Date(),
      metricType,
      name,
      value,
      unit,
      tags,
      environment: process.env.NODE_ENV || 'development',
      hostname: this.hostname,
      instanceId: this.instanceId
    });

    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      await SystemMetrics.insertMany(metricsToFlush);
      logger.debug(`Flushed ${metricsToFlush.length} metrics`);
    } catch (error) {
      logger.error('Metrics flush error:', error);
    }
  }

  async recordError(error, context = {}) {
    try {
      const errorId = uuidv4();

      const existingError = await ErrorLog.findOne({
        message: error.message,
        resolved: false
      });

      if (existingError) {
        existingError.occurrenceCount += 1;
        existingError.lastOccurrence = new Date();
        await existingError.save();
        return existingError;
      }

      const errorLog = await ErrorLog.create({
        errorId,
        message: error.message,
        stack: error.stack,
        type: context.type || 'application',
        severity: context.severity || 'medium',
        user: context.userId,
        context: {
          method: context.method,
          url: context.url,
          statusCode: context.statusCode,
          requestId: context.requestId,
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          headers: context.headers,
          body: context.body,
          query: context.query,
          params: context.params
        },
        environment: process.env.NODE_ENV || 'development',
        hostname: this.hostname,
        instanceId: this.instanceId,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        tags: context.tags || []
      });

      logger.error(`Error logged: ${errorId}`, error);
      return errorLog;
    } catch (err) {
      logger.error('Error logging failed:', err);
    }
  }

  getSystemMetrics() {
    return {
      cpu: {
        usage: process.cpuUsage(),
        loadAvg: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processUsage: process.memoryUsage()
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      platform: os.platform(),
      hostname: this.hostname,
      instanceId: this.instanceId
    };
  }

  async collectSystemMetrics() {
    const metrics = this.getSystemMetrics();

    this.recordMetric(
      'cpu_load_1min',
      metrics.cpu.loadAvg[0],
      'system',
      'count'
    );

    this.recordMetric(
      'memory_used',
      metrics.memory.used,
      'system',
      'bytes'
    );

    this.recordMetric(
      'memory_usage_percentage',
      (metrics.memory.used / metrics.memory.total) * 100,
      'system',
      'percentage'
    );

    this.recordMetric(
      'process_memory',
      metrics.memory.processUsage.heapUsed,
      'system',
      'bytes'
    );
  }

  startSystemMetricsCollection() {
    this.collectSystemMetrics();

    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    logger.info('System metrics collection started');
  }

  async getHealthStatus() {
    const mongoose = require('mongoose');
    const redis = require('../config/redis');

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {},
      system: this.getSystemMetrics()
    };

    health.services.database = {
      status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
      responseTime: 0
    };

    try {
      const start = Date.now();
      await redis.ping();
      health.services.cache = {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      health.services.cache = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    const memoryUsagePercent = (health.system.memory.used / health.system.memory.total) * 100;
    if (memoryUsagePercent > 90) {
      health.status = 'degraded';
      health.warnings = health.warnings || [];
      health.warnings.push('High memory usage');
    }

    return health;
  }
}

module.exports = new MonitoringService();
