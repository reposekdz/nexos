const FeatureFlag = require('../models/FeatureFlag');
const logger = require('../utils/logger');
const crypto = require('crypto');

class FeatureFlagService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 60000;
  }

  async evaluateFlag(flagKey, userId, context = {}) {
    try {
      const flag = await this.getFlag(flagKey);

      if (!flag) {
        return { enabled: false, variant: null, reason: 'flag_not_found' };
      }

      if (!flag.isEnabled) {
        return { enabled: false, variant: null, reason: 'flag_disabled' };
      }

      if (flag.schedule) {
        const now = new Date();
        if (flag.schedule.enableAt && now < flag.schedule.enableAt) {
          return { enabled: false, variant: null, reason: 'not_yet_active' };
        }
        if (flag.schedule.disableAt && now > flag.schedule.disableAt) {
          return { enabled: false, variant: null, reason: 'expired' };
        }
      }

      if (!this.matchesTargeting(flag, userId, context)) {
        return { enabled: false, variant: null, reason: 'targeting_mismatch' };
      }

      if (!this.checkDependencies(flag)) {
        return { enabled: false, variant: null, reason: 'dependency_not_met' };
      }

      const isInRollout = this.checkRolloutPercentage(flag, userId);
      if (!isInRollout) {
        return { enabled: false, variant: null, reason: 'not_in_rollout' };
      }

      await this.incrementStats(flag._id);

      const variant = this.selectVariant(flag, userId);

      return {
        enabled: true,
        variant,
        reason: 'success'
      };
    } catch (error) {
      logger.error('Feature flag evaluation error:', error);
      return { enabled: false, variant: null, reason: 'error', error: error.message };
    }
  }

  async getFlag(flagKey) {
    const cached = this.cache.get(flagKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.flag;
    }

    const flag = await FeatureFlag.findOne({
      key: flagKey,
      environment: process.env.NODE_ENV || 'development'
    });

    if (flag) {
      this.cache.set(flagKey, { flag, timestamp: Date.now() });
    }

    return flag;
  }

  matchesTargeting(flag, userId, context) {
    const { targeting } = flag;

    if (!targeting) return true;

    if (targeting.userIds && targeting.userIds.length > 0) {
      if (targeting.userIds.includes(userId)) return true;
    }

    if (targeting.excludeUserIds && targeting.excludeUserIds.length > 0) {
      if (targeting.excludeUserIds.includes(userId)) return false;
    }

    if (targeting.platforms && targeting.platforms.length > 0) {
      if (!targeting.platforms.includes(context.platform)) return false;
    }

    if (targeting.countries && targeting.countries.length > 0) {
      if (!targeting.countries.includes(context.country)) return false;
    }

    if (targeting.customRules && targeting.customRules.length > 0) {
      for (const rule of targeting.customRules) {
        if (!this.evaluateCustomRule(rule, context)) return false;
      }
    }

    return true;
  }

  evaluateCustomRule(rule, context) {
    const { attribute, operator, value } = rule;
    const contextValue = context[attribute];

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not_equals':
        return contextValue !== value;
      case 'contains':
        return String(contextValue).includes(value);
      case 'greater_than':
        return Number(contextValue) > Number(value);
      case 'less_than':
        return Number(contextValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(contextValue);
      default:
        return false;
    }
  }

  checkRolloutPercentage(flag, userId) {
    if (flag.rolloutPercentage === 100) return true;
    if (flag.rolloutPercentage === 0) return false;

    const hash = crypto
      .createHash('md5')
      .update(`${flag.key}:${userId}`)
      .digest('hex');

    const hashValue = parseInt(hash.substring(0, 8), 16);
    const percentage = (hashValue % 100) + 1;

    return percentage <= flag.rolloutPercentage;
  }

  checkDependencies(flag) {
    if (!flag.dependencies || flag.dependencies.length === 0) return true;

    for (const dep of flag.dependencies) {
      const depFlag = this.cache.get(dep.flagKey);
      if (!depFlag || depFlag.flag.isEnabled !== dep.requiredValue) {
        return false;
      }
    }

    return true;
  }

  selectVariant(flag, userId) {
    if (!flag.variants || flag.variants.size === 0) {
      return null;
    }

    const variants = Array.from(flag.variants.entries());
    if (variants.length === 1) {
      return variants[0][1];
    }

    const hash = crypto
      .createHash('md5')
      .update(`${flag.key}:variant:${userId}`)
      .digest('hex');

    const index = parseInt(hash.substring(0, 8), 16) % variants.length;
    return variants[index][1];
  }

  async incrementStats(flagId) {
    try {
      await FeatureFlag.findByIdAndUpdate(flagId, {
        $inc: { 'stats.totalEvaluations': 1, 'stats.enabledEvaluations': 1 },
        $set: { 'stats.lastEvaluatedAt': new Date() }
      });
    } catch (error) {
      logger.error('Flag stats update error:', error);
    }
  }

  async updateFlag(flagKey, updates, performedBy) {
    try {
      const flag = await FeatureFlag.findOne({ key: flagKey });
      if (!flag) throw new Error('Flag not found');

      const changes = {};
      Object.keys(updates).forEach(key => {
        if (JSON.stringify(flag[key]) !== JSON.stringify(updates[key])) {
          changes[key] = {
            from: flag[key],
            to: updates[key]
          };
        }
      });

      Object.assign(flag, updates);
      flag.lastModifiedBy = performedBy;

      flag.auditLog.push({
        action: 'updated',
        performedBy,
        timestamp: new Date(),
        changes
      });

      await flag.save();

      this.cache.delete(flagKey);

      logger.info(`Feature flag ${flagKey} updated by ${performedBy}`);
      return flag;
    } catch (error) {
      logger.error('Flag update error:', error);
      throw error;
    }
  }

  async toggleFlag(flagKey, enabled, performedBy, reason) {
    try {
      const flag = await FeatureFlag.findOne({ key: flagKey });
      if (!flag) throw new Error('Flag not found');

      flag.isEnabled = enabled;
      flag.lastModifiedBy = performedBy;

      flag.auditLog.push({
        action: enabled ? 'enabled' : 'disabled',
        performedBy,
        timestamp: new Date(),
        reason
      });

      await flag.save();

      this.cache.delete(flagKey);

      logger.info(`Feature flag ${flagKey} ${enabled ? 'enabled' : 'disabled'} by ${performedBy}`);
      return flag;
    } catch (error) {
      logger.error('Flag toggle error:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new FeatureFlagService();
