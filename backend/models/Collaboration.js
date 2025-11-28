const mongoose = require('mongoose');
const crypto = require('crypto');

const CollaborativeDocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: mongoose.Schema.Types.Mixed,
  contentType: { type: String, enum: ['text', 'markdown', 'richtext', 'code'], default: 'richtext' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'commenter', 'editor', 'admin'], default: 'editor' },
    addedAt: { type: Date, default: Date.now }
  }],
  version: { type: Number, default: 1 },
  operations: [{
    type: String,
    position: Number,
    value: String,
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: Number
  }],
  revisions: [{
    version: Number,
    content: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    comment: String
  }],
  activeCollaborators: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cursorPosition: Number,
    selection: { start: Number, end: Number },
    lastActivity: { type: Date, default: Date.now }
  }],
  settings: {
    allowComments: { type: Boolean, default: true },
    allowSuggestions: { type: Boolean, default: true },
    versionControl: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true }
  },
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: Date,
  tags: [String],
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  privacy: { type: String, enum: ['private', 'shared', 'team', 'public'], default: 'private' }
}, { timestamps: true });

CollaborativeDocumentSchema.index({ owner: 1, createdAt: -1 });
CollaborativeDocumentSchema.index({ 'collaborators.user': 1 });

const SharedCalendarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
    color: String
  }],
  timezone: { type: String, default: 'UTC' },
  color: String,
  visibility: { type: String, enum: ['private', 'shared', 'public'], default: 'private' }
}, { timestamps: true });

const CalendarEventSchema = new mongoose.Schema({
  calendar: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedCalendar', required: true },
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  location: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative'], default: 'pending' },
    responseAt: Date
  }],
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    interval: Number,
    endDate: Date,
    daysOfWeek: [Number]
  },
  reminders: [{
    method: { type: String, enum: ['email', 'push', 'sms'] },
    minutesBefore: Number
  }],
  color: String,
  status: { type: String, enum: ['confirmed', 'tentative', 'cancelled'], default: 'confirmed' }
}, { timestamps: true });

CalendarEventSchema.index({ calendar: 1, startDate: 1 });

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  dueDate: Date,
  estimatedHours: Number,
  actualHours: Number,
  tags: [String],
  checklist: [{
    text: String,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

TaskSchema.index({ assignee: 1, status: 1 });
TaskSchema.index({ project: 1 });

const WhiteboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'editor'], default: 'editor' }
  }],
  elements: [{
    id: String,
    type: { type: String, enum: ['rect', 'circle', 'line', 'arrow', 'text', 'image'], required: true },
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    data: mongoose.Schema.Types.Mixed,
    style: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  dimensions: {
    width: { type: Number, default: 3000 },
    height: { type: Number, default: 2000 }
  }
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  key: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' }
  }],
  status: { type: String, enum: ['planning', 'active', 'on_hold', 'completed', 'archived'], default: 'planning' },
  startDate: Date,
  endDate: Date,
  tags: [String],
  visibility: { type: String, enum: ['private', 'team', 'public'], default: 'private' }
}, { timestamps: true });

const VersionControlSchema = new mongoose.Schema({
  resource: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  version: { type: Number, required: true },
  snapshot: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String,
  branch: { type: String, default: 'main' },
  checksum: String
}, { timestamps: true });

VersionControlSchema.index({ resource: 1, resourceId: 1, version: -1 });

const CommentSchema = new mongoose.Schema({
  resource: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  resolved: { type: Boolean, default: false },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String
  }]
}, { timestamps: true });

CommentSchema.index({ resource: 1, resourceId: 1 });

const ActivityFeedSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

ActivityFeedSchema.index({ project: 1, timestamp: -1 });

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  readAt: Date,
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' }
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const CollaborativeDocument = mongoose.model('CollaborativeDocument', CollaborativeDocumentSchema);
const SharedCalendar = mongoose.model('SharedCalendar', SharedCalendarSchema);
const CalendarEvent = mongoose.model('CalendarEvent', CalendarEventSchema);
const Task = mongoose.model('Task', TaskSchema);
const Whiteboard = mongoose.model('Whiteboard', WhiteboardSchema);
const Project = mongoose.model('Project', ProjectSchema);
const VersionControl = mongoose.model('VersionControl', VersionControlSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const ActivityFeed = mongoose.model('ActivityFeed', ActivityFeedSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = {
  CollaborativeDocument,
  SharedCalendar,
  CalendarEvent,
  Task,
  Whiteboard,
  Project,
  VersionControl,
  Comment,
  ActivityFeed,
  Notification
};
