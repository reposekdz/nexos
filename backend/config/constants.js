// Application constants
module.exports = {
  // User roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    CREATOR: 'creator'
  },

  // Content types
  CONTENT_TYPES: {
    POST: 'post',
    STORY: 'story',
    REEL: 'reel',
    MESSAGE: 'message',
    COMMENT: 'comment'
  },

  // Notification types
  NOTIFICATION_TYPES: {
    FOLLOW: 'follow',
    LIKE: 'like',
    COMMENT: 'comment',
    SHARE: 'share',
    MENTION: 'mention',
    MESSAGE: 'message',
    FRIEND_REQUEST: 'friend_request'
  },

  // Post visibility
  VISIBILITY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    PRIVATE: 'private',
    CUSTOM: 'custom'
  },

  // Media types
  MEDIA_TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document'
  },

  // Ad formats
  AD_FORMATS: {
    IMAGE: 'image',
    VIDEO: 'video',
    CAROUSEL: 'carousel',
    STORIES: 'stories',
    SPONSORED_POST: 'sponsored_post',
    IN_STREAM: 'in_stream',
    COLLECTION: 'collection',
    DYNAMIC: 'dynamic'
  },

  // Bidding strategies
  BIDDING_STRATEGIES: {
    CPC: 'cpc',
    CPM: 'cpm',
    CPA: 'cpa',
    AUTO: 'auto'
  },

  // Monetization types
  MONETIZATION_TYPES: {
    AD_REVENUE: 'ad_revenue',
    SUBSCRIPTION: 'subscription',
    DONATION: 'donation',
    TIP: 'tip',
    SPONSORED_CONTENT: 'sponsored_content',
    MARKETPLACE_SALE: 'marketplace_sale',
    VIRTUAL_GIFT: 'virtual_gift',
    PREMIUM_CONTENT: 'premium_content'
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes
    LONG: 3600,      // 1 hour
    VERY_LONG: 86400 // 24 hours
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // File limits
  FILE_LIMITS: {
    IMAGE_SIZE: 10 * 1024 * 1024,    // 10MB
    VIDEO_SIZE: 100 * 1024 * 1024,   // 100MB
    AUDIO_SIZE: 50 * 1024 * 1024,    // 50MB
    MAX_FILES: 10
  },

  // Status codes
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  }
};
