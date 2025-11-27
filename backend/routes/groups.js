const express = require('express');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create group
router.post('/', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, description, category, isPrivate, rules } = req.body;
    
    const group = new Group({
      name,
      description,
      avatar: req.file?.path,
      admin: req.userId,
      members: [req.userId],
      category,
      isPrivate: isPrivate === 'true',
      rules: rules ? rules.split(',') : []
    });

    await group.save();
    await group.populate('admin', 'username fullName avatar');
    
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get groups
router.get('/', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isPrivate: false };
    
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    
    const groups = await Group.find(query)
      .populate('admin', 'username fullName avatar')
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId })
      .populate('admin', 'username fullName avatar')
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(req.userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    if (group.isPrivate) {
      if (!group.joinRequests.includes(req.userId)) {
        group.joinRequests.push(req.userId);
        await group.save();
      }
      return res.json({ message: 'Join request sent' });
    }

    group.members.push(req.userId);
    await group.save();
    
    res.json({ message: 'Joined group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() === req.userId.toString()) {
      return res.status(400).json({ message: 'Admin cannot leave group' });
    }

    group.members.pull(req.userId);
    await group.save();
    
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve join request
router.post('/:id/approve/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only admin can approve requests' });
    }

    const { userId } = req.params;
    group.joinRequests.pull(userId);
    group.members.push(userId);
    await group.save();
    
    res.json({ message: 'Request approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;