const mongoose = require('mongoose');

const SearchIndexSchema = new mongoose.Schema({
  resourceType: { 
    type: String, 
    enum: ['post', 'user', 'group', 'event', 'product', 'video', 'article'],
    required: true,
    index: true
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: String,
  content: String,
  tags: [String],
  category: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  visibility: { type: String, enum: ['public', 'private', 'followers'], default: 'public' },
  metadata: {
    likes: Number,
    views: Number,
    comments: Number,
    shares: Number,
    rating: Number,
    createdAt: Date,
    updatedAt: Date
  },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number],
    city: String,
    country: String
  },
  searchableText: String,
  language: String,
  indexedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'deleted', 'archived'], default: 'active', index: true }
}, { timestamps: true });

SearchIndexSchema.index({ searchableText: 'text', title: 'text', tags: 'text' });
SearchIndexSchema.index({ resourceType: 1, status: 1 });
SearchIndexSchema.index({ resourceType: 1, resourceId: 1 }, { unique: true });
SearchIndexSchema.index({ 'location.coordinates': '2dsphere' });

const SearchQuerySchema = new mongoose.Schema({
  query: { type: String, required: true, index: true },
  normalizedQuery: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: String,
  filters: {
    type: [String],
    category: [String],
    dateRange: {
      start: Date,
      end: Date
    },
    location: {
      coordinates: [Number],
      radius: Number
    },
    tags: [String],
    minRating: Number,
    sortBy: String
  },
  results: {
    count: Number,
    clicked: [{ 
      resourceType: String,
      resourceId: mongoose.Schema.Types.ObjectId,
      position: Number,
      clickedAt: Date
    }],
    timeToFirstClick: Number
  },
  metadata: {
    source: String,
    device: String,
    language: String,
    location: {
      city: String,
      country: String
    }
  },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

SearchQuerySchema.index({ user: 1, timestamp: -1 });
SearchQuerySchema.index({ query: 1, timestamp: -1 });
SearchQuerySchema.index({ normalizedQuery: 1 });

const SearchSuggestionSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true, index: true },
  normalizedQuery: String,
  category: String,
  frequency: { type: Number, default: 1 },
  resultCount: Number,
  clickRate: Number,
  language: String,
  trending: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  lastQueried: { type: Date, default: Date.now }
}, { timestamps: true });

SearchSuggestionSchema.index({ score: -1, frequency: -1 });
SearchSuggestionSchema.index({ trending: 1, score: -1 });

const SavedSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: String,
  query: { type: String, required: true },
  filters: mongoose.Schema.Types.Mixed,
  notifications: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['realtime', 'daily', 'weekly'], default: 'daily' },
    lastNotified: Date
  },
  resultCount: Number,
  lastRun: Date,
  pinned: { type: Boolean, default: false }
}, { timestamps: true });

SavedSearchSchema.index({ user: 1, createdAt: -1 });

const SearchFilterPresetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  resourceType: String,
  filters: mongoose.Schema.Types.Mixed,
  isDefault: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  useCount: { type: Number, default: 0 }
}, { timestamps: true });

const SearchAnalyticsSchema = new mongoose.Schema({
  period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  metrics: {
    totalSearches: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    avgResultsPerSearch: Number,
    avgTimeToClick: Number,
    clickThroughRate: Number,
    zeroResultsRate: Number,
    refinementRate: Number
  },
  topQueries: [{
    query: String,
    count: Number,
    clickRate: Number
  }],
  topCategories: [{
    category: String,
    count: Number
  }],
  topFilters: [{
    filter: String,
    count: Number
  }],
  failedQueries: [{
    query: String,
    count: Number,
    reason: String
  }]
}, { timestamps: true });

SearchAnalyticsSchema.index({ period: 1, periodStart: -1 });

const FacetedSearchSchema = new mongoose.Schema({
  query: String,
  facets: [{
    field: { type: String, required: true },
    values: [{
      value: mongoose.Schema.Types.Mixed,
      count: Number,
      selected: { type: Boolean, default: false }
    }]
  }],
  totalResults: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const TrendingSearchSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true, index: true },
  category: String,
  searchVolume: { type: Number, default: 0 },
  growthRate: Number,
  rank: Number,
  previousRank: Number,
  period: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
  demographics: {
    topCountries: [String],
    topAgeGroups: [String]
  },
  relatedQueries: [String],
  startedTrendingAt: Date,
  lastUpdated: { type: Date, default: Date.now },
  status: { type: String, enum: ['rising', 'trending', 'declining'], default: 'rising' }
}, { timestamps: true });

TrendingSearchSchema.index({ rank: 1, period: 1 });
TrendingSearchSchema.index({ growthRate: -1 });

module.exports = {
  SearchIndex: mongoose.model('SearchIndex', SearchIndexSchema),
  SearchQuery: mongoose.model('SearchQuery', SearchQuerySchema),
  SearchSuggestion: mongoose.model('SearchSuggestion', SearchSuggestionSchema),
  SavedSearch: mongoose.model('SavedSearch', SavedSearchSchema),
  SearchFilterPreset: mongoose.model('SearchFilterPreset', SearchFilterPresetSchema),
  SearchAnalytics: mongoose.model('SearchAnalytics', SearchAnalyticsSchema),
  FacetedSearch: mongoose.model('FacetedSearch', FacetedSearchSchema),
  TrendingSearch: mongoose.model('TrendingSearch', TrendingSearchSchema)
};
