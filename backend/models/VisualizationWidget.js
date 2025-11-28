const mongoose = require('mongoose');
const visualizationWidgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  widgetType: { type: String, enum: ['line_chart', 'bar_chart', 'pie_chart', 'funnel', 'table', 'number', 'heatmap'], required: true },
  dashboard: String,
  position: { x: Number, y: Number, width: Number, height: Number },
  dataSource: { type: { type: String, enum: ['events', 'metrics', 'cohorts', 'custom_query'] }, query: mongoose.Schema.Types.Mixed, aggregation: String, groupBy: [String], filters: mongoose.Schema.Types.Mixed },
  visualization: { xAxis: String, yAxis: [String], colorScheme: String, legend: Boolean, customOptions: mongoose.Schema.Types.Mixed },
  refreshInterval: { type: Number, default: 300000 },
  lastRefreshed: Date,
  cachedData: mongoose.Schema.Types.Mixed,
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, permission: { type: String, enum: ['view', 'edit'] } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
visualizationWidgetSchema.index({ createdBy: 1, dashboard: 1 });
module.exports = mongoose.model('VisualizationWidget', visualizationWidgetSchema);