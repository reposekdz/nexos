const express = require('express');
const {
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
} = require('../models/Collaboration');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/documents', auth, async (req, res) => {
  try {
    const document = new CollaborativeDocument({
      ...req.body,
      owner: req.userId
    });
    await document.save();
    
    await ActivityFeed.create({
      actor: req.userId,
      action: 'created_document',
      resource: 'document',
      resourceId: document._id
    });
    
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/documents', auth, async (req, res) => {
  try {
    const { folder, tags } = req.query;
    const filter = {
      $or: [
        { owner: req.userId },
        { 'collaborators.user': req.userId }
      ]
    };
    
    if (folder) filter.folder = folder;
    if (tags) filter.tags = { $in: tags.split(',') };
    
    const documents = await CollaborativeDocument.find(filter)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email')
      .sort({ updatedAt: -1 });
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/documents/:id', auth, async (req, res) => {
  try {
    const document = await CollaborativeDocument.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const hasAccess = document.owner.equals(req.userId) || 
      document.collaborators.some(c => c.user.equals(req.userId));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/documents/:id', auth, async (req, res) => {
  try {
    const document = await CollaborativeDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const collaborator = document.collaborators.find(c => c.user.equals(req.userId));
    const canEdit = document.owner.equals(req.userId) || 
      (collaborator && ['editor', 'admin'].includes(collaborator.role));
    
    if (!canEdit) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    if (req.body.content && document.settings.versionControl) {
      await VersionControl.create({
        resource: 'document',
        resourceId: document._id,
        version: document.version,
        snapshot: document.content,
        createdBy: req.userId,
        message: req.body.versionMessage || 'Update'
      });
      
      document.version += 1;
    }
    
    Object.assign(document, req.body);
    await document.save();
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/documents/:id/collaborators', auth, async (req, res) => {
  try {
    const document = await CollaborativeDocument.findById(req.params.id);
    
    if (!document || !document.owner.equals(req.userId)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    document.collaborators.push({
      user: req.body.userId,
      role: req.body.role || 'editor'
    });
    
    await document.save();
    
    await Notification.create({
      recipient: req.body.userId,
      type: 'collaboration_invite',
      message: `You've been invited to collaborate on "${document.title}"`,
      data: { documentId: document._id },
      link: `/documents/${document._id}`
    });
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calendars', auth, async (req, res) => {
  try {
    const calendar = new SharedCalendar({
      ...req.body,
      owner: req.userId
    });
    await calendar.save();
    res.status(201).json(calendar);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/calendars', auth, async (req, res) => {
  try {
    const calendars = await SharedCalendar.find({
      $or: [
        { owner: req.userId },
        { 'sharedWith.user': req.userId }
      ]
    }).populate('owner', 'username email');
    
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calendars/:id/events', auth, async (req, res) => {
  try {
    const calendar = await SharedCalendar.findById(req.params.id);
    
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }
    
    const event = new CalendarEvent({
      ...req.body,
      calendar: calendar._id,
      creator: req.userId
    });
    
    await event.save();
    
    if (event.attendees && event.attendees.length > 0) {
      const notifications = event.attendees.map(attendee => ({
        recipient: attendee.user,
        type: 'calendar_event',
        message: `You've been invited to "${event.title}"`,
        data: { eventId: event._id },
        link: `/calendar/events/${event._id}`
      }));
      
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/calendars/:id/events', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = { calendar: req.params.id };
    
    if (start && end) {
      filter.startDate = { $gte: new Date(start), $lte: new Date(end) };
    }
    
    const events = await CalendarEvent.find(filter)
      .populate('creator', 'username email')
      .populate('attendees.user', 'username email')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/events/:id/rsvp', auth, async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const attendee = event.attendees.find(a => a.user.equals(req.userId));
    
    if (!attendee) {
      return res.status(403).json({ message: 'Not invited to this event' });
    }
    
    attendee.status = req.body.status;
    attendee.responseAt = new Date();
    
    await event.save();
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/tasks', auth, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      creator: req.userId
    });
    
    await task.save();
    
    await ActivityFeed.create({
      actor: req.userId,
      action: 'created_task',
      resource: 'task',
      resourceId: task._id,
      project: task.project
    });
    
    if (task.assignee && !task.assignee.equals(req.userId)) {
      await Notification.create({
        recipient: task.assignee,
        type: 'task_assigned',
        message: `You've been assigned to "${task.title}"`,
        data: { taskId: task._id },
        link: `/tasks/${task._id}`
      });
    }
    
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tasks', auth, async (req, res) => {
  try {
    const { status, priority, project, assignee } = req.query;
    const filter = {
      $or: [
        { creator: req.userId },
        { assignee: req.userId },
        { watchers: req.userId }
      ]
    };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;
    if (assignee) filter.assignee = assignee;
    
    const tasks = await Task.find(filter)
      .populate('creator', 'username email')
      .populate('assignee', 'username email')
      .populate('project', 'name key')
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (req.body.status === 'done' && task.dependencies.length > 0) {
      const canComplete = await task.canComplete();
      if (!canComplete) {
        return res.status(400).json({ message: 'Cannot complete task with incomplete dependencies' });
      }
    }
    
    const oldStatus = task.status;
    Object.assign(task, req.body);
    
    if (req.body.status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date();
      task.completedBy = req.userId;
    }
    
    await task.save();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/whiteboards', auth, async (req, res) => {
  try {
    const whiteboard = new Whiteboard({
      ...req.body,
      owner: req.userId
    });
    await whiteboard.save();
    res.status(201).json(whiteboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/whiteboards', auth, async (req, res) => {
  try {
    const whiteboards = await Whiteboard.find({
      $or: [
        { owner: req.userId },
        { 'collaborators.user': req.userId }
      ]
    }).populate('owner', 'username email');
    
    res.json(whiteboards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/whiteboards/:id/elements', auth, async (req, res) => {
  try {
    const whiteboard = await Whiteboard.findById(req.params.id);
    
    if (!whiteboard) {
      return res.status(404).json({ message: 'Whiteboard not found' });
    }
    
    const { action, element } = req.body;
    
    switch (action) {
      case 'add':
        whiteboard.elements.push({ ...element, createdBy: req.userId });
        break;
      case 'update':
        const idx = whiteboard.elements.findIndex(e => e.id === element.id);
        if (idx !== -1) {
          whiteboard.elements[idx] = { ...whiteboard.elements[idx].toObject(), ...element };
        }
        break;
      case 'delete':
        whiteboard.elements = whiteboard.elements.filter(e => e.id !== element.id);
        break;
    }
    
    await whiteboard.save();
    
    res.json(whiteboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/projects', auth, async (req, res) => {
  try {
    const project = new Project({
      ...req.body,
      owner: req.userId
    });
    
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ]
    }).populate('owner', 'username email')
      .populate('team.user', 'username email');
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:resource/:id/comments', auth, async (req, res) => {
  try {
    const comment = new Comment({
      resource: req.params.resource,
      resourceId: req.params.id,
      content: req.body.content,
      author: req.userId,
      parent: req.body.parent,
      thread: req.body.thread || req.body.parent
    });
    
    await comment.save();
    
    if (req.body.mentions && req.body.mentions.length > 0) {
      const notifications = req.body.mentions.map(userId => ({
        recipient: userId,
        type: 'mention',
        message: `You were mentioned in a comment`,
        data: { commentId: comment._id },
        link: `/${req.params.resource}/${req.params.id}#comment-${comment._id}`
      }));
      
      await Notification.insertMany(notifications);
    }
    
    const populated = await Comment.findById(comment._id)
      .populate('author', 'username email');
    
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:resource/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({
      resource: req.params.resource,
      resourceId: req.params.id,
      parent: null
    })
      .populate('author', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/activity', auth, async (req, res) => {
  try {
    const { project, from, to } = req.query;
    const filter = {};
    
    if (project) filter.project = project;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const activities = await ActivityFeed.find(filter)
      .populate('actor', 'username email')
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/notifications', auth, async (req, res) => {
  try {
    const { read } = req.query;
    const filter = { recipient: req.userId };
    
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
