const Experiment = require('../models/Experiment');
const ExperimentAssignment = require('../models/ExperimentAssignment');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ExperimentService {
  async assignVariant(experimentKey, userId, context = {}) {
    try {
      const experiment = await Experiment.findOne({
        key: experimentKey,
        status: 'active'
      });

      if (!experiment) {
        return { variant: null, reason: 'experiment_not_found' };
      }

      const existingAssignment = await ExperimentAssignment.findOne({
        experiment: experiment._id,
        user: userId
      });

      if (existingAssignment) {
        if (!existingAssignment.exposedAt) {
          existingAssignment.exposedAt = new Date();
          await existingAssignment.save();
        }
        return {
          variant: existingAssignment.variantKey,
          reason: 'existing_assignment'
        };
      }

      if (!this.matchesTargetAudience(experiment, userId, context)) {
        return { variant: null, reason: 'not_in_target_audience' };
      }

      const variant = this.selectVariant(experiment, userId);

      const assignment = await ExperimentAssignment.create({
        experiment: experiment._id,
        user: userId,
        variantKey: variant.key,
        assignmentHash: this.generateAssignmentHash(experimentKey, userId),
        exposedAt: new Date(),
        metadata: {
          userAgent: context.userAgent,
          platform: context.platform,
          location: context.location
        }
      });

      await Experiment.findByIdAndUpdate(experiment._id, {
        $inc: {
          'stats.totalExposures': 1,
          [`stats.variantExposures.${variant.key}`]: 1
        }
      });

      logger.info(`User ${userId} assigned to variant ${variant.key} in experiment ${experimentKey}`);

      return {
        variant: variant.key,
        config: variant.config,
        reason: 'new_assignment'
      };
    } catch (error) {
      logger.error('Experiment assignment error:', error);
      return { variant: null, reason: 'error', error: error.message };
    }
  }

  matchesTargetAudience(experiment, userId, context) {
    const { targetAudience } = experiment;

    if (!targetAudience) return true;

    if (targetAudience.includeUserIds && targetAudience.includeUserIds.length > 0) {
      if (targetAudience.includeUserIds.includes(userId)) return true;
    }

    if (targetAudience.excludeUserIds && targetAudience.excludeUserIds.length > 0) {
      if (targetAudience.excludeUserIds.includes(userId)) return false;
    }

    if (targetAudience.percentage < 100) {
      const hash = crypto
        .createHash('md5')
        .update(`${experiment.key}:${userId}`)
        .digest('hex');

      const hashValue = parseInt(hash.substring(0, 8), 16);
      const percentage = (hashValue % 100) + 1;

      if (percentage > targetAudience.percentage) return false;
    }

    if (targetAudience.platforms && targetAudience.platforms.length > 0) {
      if (!targetAudience.platforms.includes(context.platform)) return false;
    }

    if (targetAudience.countries && targetAudience.countries.length > 0) {
      if (!targetAudience.countries.includes(context.country)) return false;
    }

    return true;
  }

  selectVariant(experiment, userId) {
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);

    const hash = crypto
      .createHash('md5')
      .update(`${experiment.key}:variant:${userId}`)
      .digest('hex');

    const hashValue = parseInt(hash.substring(0, 8), 16);
    const targetWeight = (hashValue % totalWeight) + 1;

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (targetWeight <= cumulativeWeight) {
        return variant;
      }
    }

    return experiment.variants[0];
  }

  generateAssignmentHash(experimentKey, userId) {
    return crypto
      .createHash('sha256')
      .update(`${experimentKey}:${userId}:${Date.now()}`)
      .digest('hex');
  }

  async trackConversion(experimentKey, userId, metricKey) {
    try {
      const experiment = await Experiment.findOne({ key: experimentKey });
      if (!experiment) return false;

      const assignment = await ExperimentAssignment.findOne({
        experiment: experiment._id,
        user: userId
      });

      if (!assignment || assignment.convertedAt) return false;

      assignment.convertedAt = new Date();
      await assignment.save();

      await Experiment.findByIdAndUpdate(experiment._id, {
        $inc: {
          [`stats.conversions.${assignment.variantKey}`]: 1
        }
      });

      logger.info(`Conversion tracked for user ${userId} in experiment ${experimentKey}`);
      return true;
    } catch (error) {
      logger.error('Conversion tracking error:', error);
      return false;
    }
  }

  async getExperimentResults(experimentKey) {
    try {
      const experiment = await Experiment.findOne({ key: experimentKey });
      if (!experiment) throw new Error('Experiment not found');

      const assignments = await ExperimentAssignment.aggregate([
        { $match: { experiment: experiment._id } },
        {
          $group: {
            _id: '$variantKey',
            totalAssignments: { $sum: 1 },
            exposures: {
              $sum: { $cond: [{ $ifNull: ['$exposedAt', false] }, 1, 0] }
            },
            conversions: {
              $sum: { $cond: [{ $ifNull: ['$convertedAt', false] }, 1, 0] }
            }
          }
        }
      ]);

      const results = {
        experimentKey,
        status: experiment.status,
        totalExposures: experiment.stats.totalExposures,
        variants: assignments.map(a => ({
          variantKey: a._id,
          assignments: a.totalAssignments,
          exposures: a.exposures,
          conversions: a.conversions,
          conversionRate: a.exposures > 0 ? (a.conversions / a.exposures * 100).toFixed(2) : 0
        }))
      };

      return results;
    } catch (error) {
      logger.error('Experiment results error:', error);
      throw error;
    }
  }

  async startExperiment(experimentKey, performedBy) {
    try {
      const experiment = await Experiment.findOne({ key: experimentKey });
      if (!experiment) throw new Error('Experiment not found');

      experiment.status = 'active';
      experiment.stats.startedAt = new Date();
      experiment.lastModifiedBy = performedBy;
      await experiment.save();

      logger.info(`Experiment ${experimentKey} started by ${performedBy}`);
      return experiment;
    } catch (error) {
      logger.error('Experiment start error:', error);
      throw error;
    }
  }

  async stopExperiment(experimentKey, performedBy) {
    try {
      const experiment = await Experiment.findOne({ key: experimentKey });
      if (!experiment) throw new Error('Experiment not found');

      experiment.status = 'completed';
      experiment.stats.completedAt = new Date();
      experiment.lastModifiedBy = performedBy;
      await experiment.save();

      logger.info(`Experiment ${experimentKey} stopped by ${performedBy}`);
      return experiment;
    } catch (error) {
      logger.error('Experiment stop error:', error);
      throw error;
    }
  }
}

module.exports = new ExperimentService();
