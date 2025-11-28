const express = require('express');
const { Story, StoryHighlight } = require('../models/Story');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create advanced story
router.post('/advanced', auth, upload.single('media'), async (req, res) => {
  try {
    const {
      text, textColor, textAlignment, fontSize,
      backgroundColor, filter, stickers, music,
      interactive, duration, privacy, allowReplies, allowSharing
    } = req.body;
    
    if (!req.file && !text && !backgroundColor) {
      return res.status(400).json({ message: 'Story must have media, text, or background color' });
    }

    const story = new Story({
      author: req.userId,
      media: req.file ? {
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        url: req.file.path,
        thumbnail: req.file.thumbnail
      } : undefined,
      text,
      textColor: textColor || '#ffffff',
      textAlignment: textAlignment || 'center',
      fontSize: fontSize || 32,
      backgroundColor,
      filter: filter || 'none',
      stickers: stickers ? JSON.parse(stickers) : [],
      music: music ? JSON.parse(music) : undefined,
      interactive: interactive ? JSON.parse(interactive) : undefined,
      duration: duration || 5,
      privacy: privacy || 'public',
      allowReplies: allowReplies !== false,
      allowSharing: allowSharing !== false
    });

    await story.save();
    await story.populate('author', 'username fullName avatar isVerified');
    
    res.status(201).json(story);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create story (simple)
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { text, backgroundColor } = req.body;
    
    if (!req.file && !text && !backgroundColor) {
      return res.status(400).json({ message: 'Story must have media, text, or background' });
    }

    const story = new Story({
      author: req.userId,
      media: req.file ? {
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        url: req.file.path
      } : undefined,
      text,
      backgroundColor
    });

    await story.save();
    await story.populate('author', 'username fullName avatar isVerified');
    
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stories feed
router.get('/feed', auth, async (req, res) => {
  try {
    const stories = await Story.find({ 
      expiresAt: { $gt: new Date() },
      archived: false
    })
      .populate('author', 'username fullName avatar isVerified')
      .populate('views.user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const groupedByAuthor = stories.reduce((acc, story) => {
      const authorId = story.author._id.toString();
      if (!acc[authorId]) {
        acc[authorId] = {
          author: story.author,
          stories: [],
          hasUnviewed: false
        };
      }
      acc[authorId].stories.push(story);
      if (!story.views.some(v => v.user._id.toString() === req.userId)) {
        acc[authorId].hasUnviewed = true;
      }
      return acc;
    }, {});
    
    res.json(Object.values(groupedByAuthor));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stories
router.get('/', auth, async (req, res) => {
  try {
    const stories = await Story.find({ 
      expiresAt: { $gt: new Date() },
      archived: false
    })
      .populate('author', 'username fullName avatar isVerified')
      .sort({ createdAt: -1 });
    
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user stories
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.params.userId,
      expiresAt: { $gt: new Date() },
      archived: false
    })
      .populate('author', 'username fullName avatar isVerified')
      .populate('views.user', 'username avatar')
      .sort({ createdAt: -1 });
    
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// View story
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const existingView = story.views.find(v => v.user.toString() === req.userId);
    if (!existingView) {
      story.views.push({ user: req.userId, timestamp: new Date() });
      await story.save();
    }

    res.json({ viewsCount: story.views.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like story
router.post('/:id/like', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const likeIndex = story.likes.indexOf(req.userId);
    if (likeIndex > -1) {
      story.likes.splice(likeIndex, 1);
    } else {
      story.likes.push(req.userId);
    }
    await story.save();

    res.json({ likesCount: story.likes.length, liked: likeIndex === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reply to story
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (!story.allowReplies) return res.status(403).json({ message: 'Replies not allowed' });

    story.replies.push({
      user: req.userId,
      message: req.body.message,
      timestamp: new Date()
    });
    await story.save();

    res.json({ repliesCount: story.replies.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share story
router.post('/:id/share', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (!story.allowSharing) return res.status(403).json({ message: 'Sharing not allowed' });

    if (!story.shares.includes(req.userId)) {
      story.shares.push(req.userId);
      await story.save();
    }

    res.json({ sharesCount: story.shares.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Respond to interactive element
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (!story.interactive) return res.status(400).json({ message: 'Story has no interactive element' });

    const existingResponse = story.interactive.responses.find(
      r => r.user.toString() === req.userId
    );
    
    if (existingResponse) {
      existingResponse.response = req.body.response;
      existingResponse.timestamp = new Date();
    } else {
      story.interactive.responses.push({
        user: req.userId,
        response: req.body.response,
        timestamp: new Date()
      });
    }
    
    await story.save();

    res.json({ responsesCount: story.interactive.responses.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Archive story
router.post('/:id/archive', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.userId });
    if (!story) return res.status(404).json({ message: 'Story not found' });

    story.archived = true;
    await story.save();

    res.json({ message: 'Story archived' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete story
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({ _id: req.params.id, author: req.userId });
    if (!story) return res.status(404).json({ message: 'Story not found' });

    res.json({ message: 'Story deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Story Highlights

// Create highlight
router.post('/highlights', auth, async (req, res) => {
  try {
    const { title, coverImage, stories } = req.body;

    const highlight = new StoryHighlight({
      user: req.userId,
      title,
      coverImage,
      stories: stories || []
    });

    await highlight.save();
    res.status(201).json(highlight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user highlights
router.get('/highlights/:userId', async (req, res) => {
  try {
    const highlights = await StoryHighlight.find({ user: req.params.userId })
      .populate({
        path: 'stories',
        populate: { path: 'author', select: 'username fullName avatar' }
      })
      .sort({ order: 1 });

    res.json(highlights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add story to highlight
router.post('/highlights/:highlightId/add/:storyId', auth, async (req, res) => {
  try {
    const highlight = await StoryHighlight.findOne({
      _id: req.params.highlightId,
      user: req.userId
    });
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });

    if (!highlight.stories.includes(req.params.storyId)) {
      highlight.stories.push(req.params.storyId);
      await highlight.save();
    }

    res.json(highlight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove story from highlight
router.delete('/highlights/:highlightId/remove/:storyId', auth, async (req, res) => {
  try {
    const highlight = await StoryHighlight.findOne({
      _id: req.params.highlightId,
      user: req.userId
    });
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });

    highlight.stories = highlight.stories.filter(
      s => s.toString() !== req.params.storyId
    );
    await highlight.save();

    res.json(highlight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete highlight
router.delete('/highlights/:id', auth, async (req, res) => {
  try {
    const highlight = await StoryHighlight.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });

    res.json({ message: 'Highlight deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get story analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.userId })
      .populate('views.user', 'username avatar')
      .populate('likes', 'username avatar')
      .populate('shares', 'username avatar');
    
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const analytics = {
      views: story.views.length,
      likes: story.likes.length,
      replies: story.replies.length,
      shares: story.shares.length,
      interactiveResponses: story.interactive?.responses.length || 0,
      viewsData: story.views,
      engagement: ((story.likes.length + story.replies.length + story.shares.length) / Math.max(story.views.length, 1) * 100).toFixed(2)
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;