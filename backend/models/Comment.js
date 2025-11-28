const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  content: { type: String, required: true, maxlength: 10000 },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  media: [{
    type: { type: String, enum: ['image', 'video', 'gif'] },
    url: String,
    thumbnail: String
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'] }
  }],
  reactionCounts: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    haha: { type: Number, default: 0 },
    wow: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    angry: { type: Number, default: 0 }
  },
  repliesCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  threadPath: String,
  depth: { type: Number, default: 0 }
}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ threadPath: 1 });

module.exports = mongoose.model('Comment', commentSchema);