const express = require('express');
const {
  CommunityGroup,
  GroupMember,
  GroupPost,
  GroupEvent,
  GroupInvitation,
  GroupJoinRequest,
  GroupAnnouncement
} = require('../models/GroupsCommunities');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/groups', auth, async (req, res) => {
  try {
    const group = new CommunityGroup({
      groupId: `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      creator: req.userId
    });
    
    await group.save();
    
    const member = new GroupMember({
      group: group._id,
      user: req.userId,
      role: 'owner',
      permissions: {
        canPost: true,
        canComment: true,
        canInvite: true,
        canRemoveMembers: true,
        canEditInfo: true,
        canManageRoles: true
      }
    });
    
    await member.save();
    
    group.memberCount = 1;
    await group.save();
    
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups', auth, async (req, res) => {
  try {
    const { category, type, search, featured } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = { status: 'active' };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (featured !== undefined) filter.featured = featured === 'true';
    if (search) {
      filter.$text = { $search: search };
    }
    
    const groups = await CommunityGroup.find(filter)
      .sort({ memberCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creator', 'name avatar');
    
    const total = await CommunityGroup.countDocuments(filter);
    
    const groupsWithMembership = await Promise.all(
      groups.map(async (group) => {
        const member = await GroupMember.findOne({
          group: group._id,
          user: req.userId,
          status: 'active'
        });
        return {
          ...group.toObject(),
          isMember: !!member,
          memberRole: member?.role || null
        };
      })
    );
    
    res.json({
      groups: groupsWithMembership,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id', auth, async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id)
      .populate('creator', 'name avatar');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const member = await GroupMember.findOne({
      group: group._id,
      user: req.userId,
      status: 'active'
    });
    
    if (group.type === 'secret' && !member) {
      return res.status(403).json({ message: 'Group not found' });
    }
    
    res.json({
      ...group.toObject(),
      isMember: !!member,
      memberRole: member?.role || null,
      permissions: member?.permissions || {}
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/groups/:id', auth, async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const member = await GroupMember.findOne({
      group: group._id,
      user: req.userId,
      status: 'active',
      permissions: { canEditInfo: true }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    Object.assign(group, req.body);
    await group.save();
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/join', auth, async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (group.type === 'secret') {
      return res.status(403).json({ message: 'Cannot join secret group' });
    }
    
    const existingMember = await GroupMember.findOne({
      group: group._id,
      user: req.userId
    });
    
    if (existingMember && existingMember.status === 'active') {
      return res.status(400).json({ message: 'Already a member' });
    }
    
    if (group.settings.requireApproval && group.type === 'private') {
      const joinRequest = new GroupJoinRequest({
        group: group._id,
        user: req.userId,
        message: req.body.message
      });
      await joinRequest.save();
      
      return res.json({ status: 'pending', message: 'Join request sent' });
    }
    
    const member = new GroupMember({
      group: group._id,
      user: req.userId,
      role: 'member'
    });
    
    await member.save();
    
    group.memberCount += 1;
    await group.save();
    
    res.json({ status: 'joined', member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/leave', auth, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active'
    });
    
    if (!member) {
      return res.status(404).json({ message: 'Not a member' });
    }
    
    if (member.role === 'owner') {
      return res.status(400).json({ message: 'Owner cannot leave group. Transfer ownership first.' });
    }
    
    member.status = 'left';
    await member.save();
    
    const group = await CommunityGroup.findById(req.params.id);
    if (group) {
      group.memberCount = Math.max(0, group.memberCount - 1);
      await group.save();
    }
    
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id/members', auth, async (req, res) => {
  try {
    const { role, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const group = await CommunityGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const userMember = await GroupMember.findOne({
      group: group._id,
      user: req.userId,
      status: 'active'
    });
    
    if (group.settings.hideMembers && (!userMember || userMember.role === 'member')) {
      return res.status(403).json({ message: 'Members list is hidden' });
    }
    
    const filter = { group: req.params.id, status: 'active' };
    
    if (role) filter.role = role;
    
    const members = await GroupMember.find(filter)
      .sort({ joinedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name avatar online')
      .populate('invitedBy', 'name');
    
    const total = await GroupMember.countDocuments(filter);
    
    res.json({
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const adminMember = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active',
      permissions: { canManageRoles: true }
    });
    
    if (!adminMember) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const targetMember = await GroupMember.findOne({
      group: req.params.id,
      user: req.params.userId,
      status: 'active'
    });
    
    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    targetMember.role = req.body.role;
    
    if (req.body.role === 'admin' || req.body.role === 'moderator') {
      targetMember.permissions = {
        canPost: true,
        canComment: true,
        canInvite: true,
        canRemoveMembers: true,
        canEditInfo: req.body.role === 'admin',
        canManageRoles: req.body.role === 'admin'
      };
    }
    
    await targetMember.save();
    
    res.json(targetMember);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/groups/:id/members/:userId', auth, async (req, res) => {
  try {
    const adminMember = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active',
      permissions: { canRemoveMembers: true }
    });
    
    if (!adminMember) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const targetMember = await GroupMember.findOne({
      group: req.params.id,
      user: req.params.userId,
      status: 'active'
    });
    
    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    if (targetMember.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove owner' });
    }
    
    targetMember.status = 'removed';
    await targetMember.save();
    
    const group = await CommunityGroup.findById(req.params.id);
    if (group) {
      group.memberCount = Math.max(0, group.memberCount - 1);
      await group.save();
    }
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/posts', auth, async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const member = await GroupMember.findOne({
      group: group._id,
      user: req.userId,
      status: 'active',
      permissions: { canPost: true }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const post = new GroupPost({
      postId: `POST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      group: group._id,
      author: req.userId,
      ...req.body,
      status: group.settings.postApproval ? 'pending' : 'published'
    });
    
    await post.save();
    
    if (post.status === 'published') {
      group.postCount += 1;
      await group.save();
    }
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id/posts', auth, async (req, res) => {
  try {
    const { type, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = { group: req.params.id, status: 'published' };
    
    if (type) filter.type = type;
    
    const posts = await GroupPost.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name avatar')
      .populate('approvedBy', 'name');
    
    const total = await GroupPost.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/events', auth, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active'
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Must be a member to create events' });
    }
    
    const event = new GroupEvent({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      group: req.params.id,
      creator: req.userId,
      ...req.body
    });
    
    await event.save();
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id/events', auth, async (req, res) => {
  try {
    const { upcoming, past } = req.query;
    const now = new Date();
    
    const filter = { group: req.params.id };
    
    if (upcoming === 'true') {
      filter.startTime = { $gte: now };
    } else if (past === 'true') {
      filter.endTime = { $lt: now };
    }
    
    const events = await GroupEvent.find(filter)
      .sort({ startTime: 1 })
      .populate('creator', 'name avatar');
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/events/:id/rsvp', auth, async (req, res) => {
  try {
    const event = await GroupEvent.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const { status } = req.body;
    
    const existingRsvp = event.attendees.find(a => a.user.toString() === req.userId);
    
    if (existingRsvp) {
      existingRsvp.status = status;
    } else {
      event.attendees.push({
        user: req.userId,
        status,
        rsvpAt: new Date()
      });
    }
    
    event.attendeeCount = event.attendees.filter(a => a.status === 'going').length;
    await event.save();
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/invitations', auth, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active',
      permissions: { canInvite: true }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { userIds, message } = req.body;
    const invitations = [];
    
    for (const userId of userIds) {
      const invitation = new GroupInvitation({
        group: req.params.id,
        inviter: req.userId,
        invitee: userId,
        message
      });
      await invitation.save();
      invitations.push(invitation);
    }
    
    res.status(201).json(invitations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/invitations/:id/accept', auth, async (req, res) => {
  try {
    const invitation = await GroupInvitation.findById(req.params.id);
    
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    if (invitation.invitee.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation already processed' });
    }
    
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();
    
    const member = new GroupMember({
      group: invitation.group,
      user: req.userId,
      role: 'member',
      invitedBy: invitation.inviter
    });
    
    await member.save();
    
    const group = await CommunityGroup.findById(invitation.group);
    if (group) {
      group.memberCount += 1;
      await group.save();
    }
    
    res.json({ member, invitation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id/join-requests', auth, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active',
      role: { $in: ['owner', 'admin', 'moderator'] }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const requests = await GroupJoinRequest.find({
      group: req.params.id,
      status: 'pending'
    }).populate('user', 'name avatar');
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/join-requests/:id/approve', auth, async (req, res) => {
  try {
    const joinRequest = await GroupJoinRequest.findById(req.params.id);
    
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }
    
    const member = await GroupMember.findOne({
      group: joinRequest.group,
      user: req.userId,
      status: 'active',
      role: { $in: ['owner', 'admin', 'moderator'] }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    joinRequest.status = 'approved';
    joinRequest.reviewedBy = req.userId;
    joinRequest.reviewedAt = new Date();
    await joinRequest.save();
    
    const newMember = new GroupMember({
      group: joinRequest.group,
      user: joinRequest.user,
      role: 'member'
    });
    
    await newMember.save();
    
    const group = await CommunityGroup.findById(joinRequest.group);
    if (group) {
      group.memberCount += 1;
      await group.save();
    }
    
    res.json({ member: newMember, joinRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/groups/:id/announcements', auth, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      group: req.params.id,
      user: req.userId,
      status: 'active',
      role: { $in: ['owner', 'admin'] }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const announcement = new GroupAnnouncement({
      group: req.params.id,
      author: req.userId,
      ...req.body
    });
    
    await announcement.save();
    
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/groups/:id/announcements', auth, async (req, res) => {
  try {
    const announcements = await GroupAnnouncement.find({
      group: req.params.id,
      active: true
    })
      .sort({ priority: 1, createdAt: -1 })
      .populate('author', 'name avatar');
    
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
