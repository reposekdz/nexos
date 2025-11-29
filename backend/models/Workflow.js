const mongoose = require('mongoose');
const crypto = require('crypto');

const WorkflowTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['approval', 'automation', 'notification', 'task', 'custom'], required: true },
  icon: String,
  color: String,
  steps: [{
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['task', 'approval', 'notification', 'condition', 'delay', 'webhook', 'script'], required: true },
    config: mongoose.Schema.Types.Mixed,
    position: { x: Number, y: Number },
    nextSteps: [{
      stepId: String,
      condition: mongoose.Schema.Types.Mixed
    }],
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    timeout: Number,
    escalationRules: [{
      afterMinutes: Number,
      escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['notify', 'reassign', 'auto_approve', 'auto_reject'] }
    }]
  }],
  variables: [{
    name: String,
    type: { type: String, enum: ['string', 'number', 'boolean', 'date', 'object'] },
    defaultValue: mongoose.Schema.Types.Mixed,
    required: Boolean
  }],
  triggers: [{
    type: { type: String, enum: ['manual', 'scheduled', 'event', 'webhook', 'condition'] },
    config: mongoose.Schema.Types.Mixed
  }],
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  tags: [String],
  version: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  executionCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 }
}, { timestamps: true });

WorkflowTemplateSchema.index({ tenantId: 1, category: 1 });
WorkflowTemplateSchema.index({ createdBy: 1 });
WorkflowTemplateSchema.index({ isPublic: 1 });

const WorkflowSchema = new mongoose.Schema({
  workflowId: { type: String, required: true, unique: true, index: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate', required: true },
  name: String,
  status: { 
    type: String, 
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'rolled_back'], 
    default: 'pending',
    index: true
  },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  variables: mongoose.Schema.Types.Mixed,
  context: mongoose.Schema.Types.Mixed,
  currentStep: String,
  completedSteps: [String],
  failedSteps: [{
    stepId: String,
    error: String,
    timestamp: Date,
    retryCount: Number
  }],
  startedAt: Date,
  completedAt: Date,
  pausedAt: Date,
  cancelledAt: Date,
  durationMs: Number,
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String]
}, { timestamps: true });

WorkflowSchema.index({ template: 1, status: 1 });
WorkflowSchema.index({ initiator: 1, createdAt: -1 });
WorkflowSchema.index({ tenantId: 1, status: 1 });
WorkflowSchema.index({ workflowId: 1 });

WorkflowSchema.methods.calculateDuration = function() {
  if (this.startedAt && this.completedAt) {
    this.durationMs = this.completedAt - this.startedAt;
  }
};

WorkflowSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    pending: ['running', 'cancelled'],
    running: ['paused', 'completed', 'failed', 'cancelled'],
    paused: ['running', 'cancelled'],
    completed: [],
    failed: ['rolled_back', 'running'],
    cancelled: [],
    rolled_back: ['running']
  };
  return validTransitions[this.status]?.includes(newStatus) || false;
};

const WorkflowStepExecutionSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  stepId: { type: String, required: true },
  stepName: String,
  stepType: String,
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting_approval'], 
    default: 'pending' 
  },
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  error: {
    message: String,
    stack: String,
    code: String
  },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startedAt: Date,
  completedAt: Date,
  durationMs: Number,
  logs: [{
    level: { type: String, enum: ['info', 'warning', 'error', 'debug'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

WorkflowStepExecutionSchema.index({ workflow: 1, stepId: 1 });
WorkflowStepExecutionSchema.index({ status: 1 });

const ApprovalChainSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  stepId: { type: String, required: true },
  approvers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Number, required: true },
    role: String,
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'skipped'], 
      default: 'pending' 
    },
    decision: {
      approved: Boolean,
      reason: String,
      timestamp: Date
    },
    notifiedAt: Date,
    deadline: Date
  }],
  requireAll: { type: Boolean, default: false },
  currentApprover: Number,
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'approved', 'rejected', 'expired'], 
    default: 'pending' 
  },
  completedAt: Date,
  autoApproveAfter: Number,
  escalationHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

ApprovalChainSchema.index({ workflow: 1 });
ApprovalChainSchema.index({ 'approvers.user': 1, 'approvers.status': 1 });

ApprovalChainSchema.methods.getCurrentApprover = function() {
  return this.approvers.find(a => a.order === this.currentApprover);
};

ApprovalChainSchema.methods.advance = function() {
  if (this.requireAll) {
    const pending = this.approvers.find(a => a.status === 'pending');
    return pending ? pending.user : null;
  } else {
    this.currentApprover++;
    return this.getCurrentApprover()?.user;
  }
};

ApprovalChainSchema.methods.isApproved = function() {
  if (this.requireAll) {
    return this.approvers.every(a => a.status === 'approved');
  } else {
    return this.approvers.some(a => a.status === 'approved');
  }
};

ApprovalChainSchema.methods.isRejected = function() {
  return this.approvers.some(a => a.status === 'rejected');
};

const WorkflowTriggerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate', required: true },
  type: { 
    type: String, 
    enum: ['event', 'condition', 'webhook', 'manual'], 
    required: true 
  },
  config: {
    eventType: String,
    conditions: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'] },
      value: mongoose.Schema.Types.Mixed
    }],
    webhookUrl: String,
    webhookSecret: String
  },
  enabled: { type: Boolean, default: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  lastTriggered: Date,
  triggerCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 }
}, { timestamps: true });

WorkflowTriggerSchema.index({ template: 1, enabled: 1 });
WorkflowTriggerSchema.index({ type: 1, enabled: 1 });

WorkflowTriggerSchema.methods.evaluateConditions = function(data) {
  if (!this.config.conditions || this.config.conditions.length === 0) return true;
  
  return this.config.conditions.every(condition => {
    const fieldValue = data[condition.field];
    const conditionValue = condition.value;
    
    switch (condition.operator) {
      case 'eq': return fieldValue == conditionValue;
      case 'ne': return fieldValue != conditionValue;
      case 'gt': return fieldValue > conditionValue;
      case 'gte': return fieldValue >= conditionValue;
      case 'lt': return fieldValue < conditionValue;
      case 'lte': return fieldValue <= conditionValue;
      case 'in': return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'nin': return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(conditionValue));
      default: return false;
    }
  });
};

const WorkflowScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate', required: true },
  cronExpression: { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  enabled: { type: Boolean, default: true },
  variables: mongoose.Schema.Types.Mixed,
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  lastRun: Date,
  nextRun: Date,
  runCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  retryDelay: { type: Number, default: 300000 }
}, { timestamps: true });

WorkflowScheduleSchema.index({ template: 1, enabled: 1 });
WorkflowScheduleSchema.index({ nextRun: 1, enabled: 1 });

const WorkflowSimulationSchema = new mongoose.Schema({
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate', required: true },
  name: String,
  variables: mongoose.Schema.Types.Mixed,
  mockData: mongoose.Schema.Types.Mixed,
  steps: [{
    stepId: String,
    stepName: String,
    status: String,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    duration: Number,
    logs: [String]
  }],
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  result: mongoose.Schema.Types.Mixed,
  totalDuration: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: Date
}, { timestamps: true });

WorkflowSimulationSchema.index({ template: 1, createdBy: 1 });

const WorkflowAnalyticsSchema = new mongoose.Schema({
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowTemplate' },
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  metrics: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    cancelledExecutions: { type: Number, default: 0 },
    avgDurationMs: Number,
    minDurationMs: Number,
    maxDurationMs: Number,
    successRate: Number
  },
  stepMetrics: [{
    stepId: String,
    stepName: String,
    executionCount: Number,
    avgDurationMs: Number,
    failureCount: Number,
    failureRate: Number
  }],
  bottlenecks: [{
    stepId: String,
    avgWaitTimeMs: Number,
    reason: String
  }],
  approvalMetrics: {
    totalApprovals: Number,
    avgApprovalTimeMs: Number,
    autoApprovedCount: Number,
    rejectedCount: Number,
    escalatedCount: Number
  }
}, { timestamps: true });

WorkflowAnalyticsSchema.index({ template: 1, period: 1, periodStart: -1 });
WorkflowAnalyticsSchema.index({ tenantId: 1, periodStart: -1 });

const WorkflowRollbackSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  failedStep: String,
  rollbackSteps: [{
    stepId: String,
    action: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    result: mongoose.Schema.Types.Mixed,
    error: String,
    executedAt: Date
  }],
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'failed'], 
    default: 'pending' 
  },
  snapshotData: mongoose.Schema.Types.Mixed,
  completedAt: Date
}, { timestamps: true });

WorkflowRollbackSchema.index({ workflow: 1 });
WorkflowRollbackSchema.index({ status: 1 });

const WorkflowEventLogSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  eventType: { 
    type: String, 
    enum: ['started', 'step_completed', 'step_failed', 'paused', 'resumed', 'completed', 'failed', 'cancelled', 'rolled_back', 'escalated'],
    required: true 
  },
  stepId: String,
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

WorkflowEventLogSchema.index({ workflow: 1, timestamp: -1 });
WorkflowEventLogSchema.index({ eventType: 1, timestamp: -1 });

module.exports = {
  WorkflowTemplate: mongoose.model('WorkflowTemplate', WorkflowTemplateSchema),
  Workflow: mongoose.model('Workflow', WorkflowSchema),
  WorkflowStepExecution: mongoose.model('WorkflowStepExecution', WorkflowStepExecutionSchema),
  ApprovalChain: mongoose.model('ApprovalChain', ApprovalChainSchema),
  WorkflowTrigger: mongoose.model('WorkflowTrigger', WorkflowTriggerSchema),
  WorkflowSchedule: mongoose.model('WorkflowSchedule', WorkflowScheduleSchema),
  WorkflowSimulation: mongoose.model('WorkflowSimulation', WorkflowSimulationSchema),
  WorkflowAnalytics: mongoose.model('WorkflowAnalytics', WorkflowAnalyticsSchema),
  WorkflowRollback: mongoose.model('WorkflowRollback', WorkflowRollbackSchema),
  WorkflowEventLog: mongoose.model('WorkflowEventLog', WorkflowEventLogSchema)
};
