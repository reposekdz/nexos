const express = require('express');
const Event = require('../models/Event');
const auth = require('../middleware/auth');
const router = express.Router();

// Create event
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, startDate, endDate, location, isPrivate, invitedUsers } = req.body;
    
    const event = new Event({
      organizer: req.userId,
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
      isPrivate,
      invitedUsers: isPrivate ? invitedUsers : []
    });

    await event.save();
    await event.populate('organizer', 'username fullName avatar');
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// RSVP to event
router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'going', 'interested', 'not_going'
    const event = await Event.findById(req.params.id);
    
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Remove user from all RSVP lists first
    event.attendees.going.pull(req.userId);
    event.attendees.interested.pull(req.userId);
    event.attendees.notGoing.pull(req.userId);
    
    // Add to appropriate list
    if (status === 'going') event.attendees.going.push(req.userId);
    else if (status === 'interested') event.attendees.interested.push(req.userId);
    else if (status === 'not_going') event.attendees.notGoing.push(req.userId);
    
    await event.save();
    
    res.json({
      status,
      attendees: {
        going: event.attendees.going.length,
        interested: event.attendees.interested.length,
        notGoing: event.attendees.notGoing.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get events
router.get('/', auth, async (req, res) => {
  try {
    const { upcoming, category } = req.query;
    let query = {};
    
    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }
    if (category) query.category = category;
    
    const events = await Event.find(query)
      .populate('organizer', 'username fullName avatar')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;