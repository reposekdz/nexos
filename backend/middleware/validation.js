const Joi = require('joi');
const logger = require('../utils/logger');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation error:', errors);

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};

const schemas = {
  appeal: Joi.object({
    moderationActionId: Joi.string(),
    contentId: Joi.string().required(),
    contentType: Joi.string().valid('post', 'comment', 'message', 'user', 'group').required(),
    reason: Joi.string().min(10).max(2000).required(),
    evidenceUrls: Joi.array().items(Joi.string().uri())
  }),

  takedownRequest: Joi.object({
    requester: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      organization: Joi.string(),
      contactInfo: Joi.string()
    }).required(),
    requestType: Joi.string().valid('dmca', 'copyright', 'trademark', 'privacy', 'legal_order').required(),
    targetContent: Joi.object({
      contentId: Joi.string().required(),
      contentType: Joi.string().valid('post', 'reel', 'story', 'comment', 'profile').required(),
      contentUrl: Joi.string().uri(),
      description: Joi.string()
    }).required(),
    reason: Joi.string().min(20).max(5000).required(),
    evidenceUrls: Joi.array().items(Joi.string().uri())
  }),

  cookieConsent: Joi.object({
    consents: Joi.object({
      essential: Joi.boolean().default(true),
      analytics: Joi.boolean(),
      marketing: Joi.boolean(),
      functional: Joi.boolean(),
      advertising: Joi.boolean()
    }).required(),
    consentMethod: Joi.string().valid('banner_accept', 'banner_reject', 'settings_page').required()
  }),

  dataExport: Joi.object({
    exportType: Joi.string().valid('gdpr_full', 'portability', 'activity_log', 'personal_data').required(),
    format: Joi.string().valid('json', 'csv', 'zip').default('zip'),
    includeData: Joi.object({
      profile: Joi.boolean(),
      posts: Joi.boolean(),
      comments: Joi.boolean(),
      messages: Joi.boolean(),
      media: Joi.boolean(),
      connections: Joi.boolean(),
      activity: Joi.boolean(),
      settings: Joi.boolean()
    }),
    dateRange: Joi.object({
      from: Joi.date(),
      to: Joi.date()
    })
  }),

  feedFilter: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    criteria: Joi.object({
      contentTypes: Joi.array().items(Joi.string().valid('post', 'reel', 'story', 'ad')),
      mediaTypes: Joi.array().items(Joi.string().valid('text', 'image', 'video', 'link')),
      sources: Joi.array().items(Joi.string().valid('friends', 'following', 'groups', 'pages', 'suggested')),
      timeRange: Joi.string().valid('today', 'week', 'month', 'all'),
      sortBy: Joi.string().valid('chronological', 'relevance', 'popularity'),
      verifiedOnly: Joi.boolean(),
      minLikes: Joi.number().integer().min(0),
      includeHashtags: Joi.array().items(Joi.string()),
      excludeHashtags: Joi.array().items(Joi.string())
    }).required()
  }),

  webhookSubscription: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    url: Joi.string().uri().required(),
    events: Joi.array().items(Joi.string()).min(1).required(),
    deliveryConfig: Joi.object({
      retryAttempts: Joi.number().integer().min(0).max(5).default(3),
      retryDelay: Joi.number().integer().min(1000).default(60000),
      timeout: Joi.number().integer().min(5000).max(60000).default(30000)
    }),
    rateLimit: Joi.object({
      maxPerMinute: Joi.number().integer().min(1).max(1000).default(60),
      maxPerHour: Joi.number().integer().min(1).max(10000).default(1000)
    })
  }),

  featureFlag: Joi.object({
    key: Joi.string().pattern(/^[a-z0-9_-]+$/).required(),
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500),
    isEnabled: Joi.boolean().default(false),
    rolloutPercentage: Joi.number().integer().min(0).max(100).default(0),
    targeting: Joi.object({
      userIds: Joi.array().items(Joi.string()),
      userSegments: Joi.array().items(Joi.string()),
      excludeUserIds: Joi.array().items(Joi.string()),
      countries: Joi.array().items(Joi.string()),
      platforms: Joi.array().items(Joi.string().valid('web', 'mobile_ios', 'mobile_android', 'desktop'))
    }),
    tags: Joi.array().items(Joi.string())
  }),

  experiment: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    key: Joi.string().pattern(/^[a-z0-9_-]+$/).required(),
    description: Joi.string().max(500),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        key: Joi.string().required(),
        description: Joi.string(),
        weight: Joi.number().integer().min(0).max(100).required(),
        config: Joi.object()
      })
    ).min(2).required(),
    targetAudience: Joi.object({
      percentage: Joi.number().integer().min(0).max(100).default(100),
      userSegments: Joi.array().items(Joi.string()),
      countries: Joi.array().items(Joi.string()),
      platforms: Joi.array().items(Joi.string().valid('web', 'mobile', 'desktop'))
    }),
    metrics: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        key: Joi.string().required(),
        type: Joi.string().valid('conversion', 'engagement', 'retention', 'revenue').required(),
        isPrimary: Joi.boolean().default(false)
      })
    )
  }),

  parentalControl: Joi.object({
    childAccountId: Joi.string().required(),
    settings: Joi.object({
      allowMessaging: Joi.string().valid('none', 'friends_only', 'all'),
      allowGroupCreation: Joi.boolean(),
      allowPublicPosts: Joi.boolean(),
      allowDiscovery: Joi.boolean(),
      screenTimeLimit: Joi.object({
        daily: Joi.number().integer().min(0).max(1440),
        enabled: Joi.boolean()
      }),
      contentFiltering: Joi.object({
        level: Joi.string().valid('strict', 'moderate', 'minimal')
      })
    })
  })
};

module.exports = {
  validate,
  schemas
};
