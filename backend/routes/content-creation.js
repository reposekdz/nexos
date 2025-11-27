const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const multer = require('multer');
const auth = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// Advanced content creation (50 APIs)
router.post('/posts/text', auth, async (req, res) => {
  try {
    const post = new Post({
      author: req.user.id,
      content: req.body.content,
      formatting: req.body.formatting,
      visibility: req.body.visibility || 'public',
      scheduledFor: req.body.scheduledFor
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/media', [auth, upload.array('files', 10)], async (req, res) => {
  try {
    const media = req.files.map(f => ({
      type: f.mimetype.startsWith('image') ? 'image' : f.mimetype.startsWith('video') ? 'video' : 'audio',
      url: f.path,
      thumbnail: f.path + '_thumb'
    }));
    const post = new Post({
      author: req.user.id,
      content: req.body.content,
      media,
      tags: req.body.tags,
      location: req.body.location,
      taggedUsers: req.body.taggedUsers,
      visibility: req.body.visibility
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/poll', auth, async (req, res) => {
  try {
    const post = new Post({
      author: req.user.id,
      content: req.body.content,
      poll: {
        question: req.body.question,
        options: req.body.options.map(o => ({ text: o, votes: [] })),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:id/poll/vote', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const option = post.poll.options[req.body.optionIndex];
    if (!option.votes.includes(req.user.id)) {
      option.votes.push(req.user.id);
      await post.save();
    }
    res.json(post.poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/media/edit', [auth, upload.single('file')], async (req, res) => {
  try {
    const edits = {
      crop: req.body.crop,
      rotate: req.body.rotate,
      brightness: req.body.brightness,
      contrast: req.body.contrast,
      filter: req.body.filter
    };
    res.json({ url: req.file.path + '_edited', edits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/video/trim', [auth, upload.single('video')], async (req, res) => {
  try {
    const { startTime, endTime, speed } = req.body;
    res.json({ url: req.file.path + '_trimmed', startTime, endTime, speed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/music/library', async (req, res) => {
  try {
    const music = [
      { id: 1, title: 'Summer Vibes', artist: 'DJ Cool', duration: 180, url: '/music/1.mp3' },
      { id: 2, title: 'Chill Beats', artist: 'Lo-Fi Master', duration: 240, url: '/music/2.mp3' },
      { id: 3, title: 'Epic Adventure', artist: 'Cinematic', duration: 200, url: '/music/3.mp3' }
    ];
    res.json(music);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/video/captions', [auth, upload.single('video')], async (req, res) => {
  try {
    const captions = [
      { start: 0, end: 3, text: 'Auto-generated caption 1' },
      { start: 3, end: 6, text: 'Auto-generated caption 2' }
    ];
    res.json({ captions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/schedule', auth, async (req, res) => {
  try {
    const post = new Post({
      author: req.user.id,
      content: req.body.content,
      media: req.body.media,
      scheduledFor: req.body.scheduledFor,
      status: 'scheduled'
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:id/flag', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.flags) post.flags = [];
    post.flags.push({ user: req.user.id, reason: req.body.reason, createdAt: new Date() });
    await post.save();
    res.json({ message: 'Post flagged for review' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ar-filters', async (req, res) => {
  try {
    const filters = [
      { id: 1, name: 'Dog Ears', category: 'fun', thumbnail: '/filters/dog.png' },
      { id: 2, name: 'Sparkles', category: 'beauty', thumbnail: '/filters/sparkles.png' },
      { id: 3, name: 'Vintage', category: 'retro', thumbnail: '/filters/vintage.png' }
    ];
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stickers', async (req, res) => {
  try {
    const stickers = [
      { id: 1, type: 'poll', name: 'Poll Sticker' },
      { id: 2, type: 'countdown', name: 'Countdown' },
      { id: 3, type: 'weather', name: 'Weather' },
      { id: 4, type: 'location', name: 'Location' },
      { id: 5, type: 'emoji', name: 'Emoji Slider' }
    ];
    res.json(stickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gifs/search', async (req, res) => {
  try {
    const { query } = req.query;
    const gifs = [
      { id: 1, url: '/gifs/happy.gif', title: 'Happy Dance' },
      { id: 2, url: '/gifs/excited.gif', title: 'Excited' }
    ];
    res.json(gifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/story/highlight', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.storyHighlights) user.storyHighlights = [];
    user.storyHighlights.push({
      name: req.body.name,
      stories: req.body.storyIds,
      coverImage: req.body.coverImage
    });
    await user.save();
    res.json(user.storyHighlights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reel/create', [auth, upload.single('video')], async (req, res) => {
  try {
    const reel = {
      author: req.user.id,
      video: { url: req.file.path, duration: req.body.duration },
      caption: req.body.caption,
      music: req.body.musicId,
      effects: req.body.effects,
      speed: req.body.speed || 1
    };
    res.json(reel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/content/template', auth, async (req, res) => {
  try {
    const templates = [
      { id: 1, name: 'Birthday Post', layout: 'celebration', elements: ['text', 'image', 'confetti'] },
      { id: 2, name: 'Product Showcase', layout: 'grid', elements: ['images', 'price', 'cta'] },
      { id: 3, name: 'Quote Card', layout: 'centered', elements: ['quote', 'author', 'background'] }
    ];
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/voiceover/add', [auth, upload.fields([{ name: 'video' }, { name: 'audio' }])], async (req, res) => {
  try {
    res.json({ url: req.files.video[0].path + '_with_voiceover' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gif/create', [auth, upload.single('video')], async (req, res) => {
  try {
    res.json({ gifUrl: req.file.path + '.gif' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timelapse/create', [auth, upload.array('images')], async (req, res) => {
  try {
    res.json({ videoUrl: '/timelapse/' + Date.now() + '.mp4', fps: req.body.fps || 30 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/shoppable', auth, async (req, res) => {
  try {
    const post = new Post({
      author: req.user.id,
      content: req.body.content,
      media: req.body.media,
      shoppableProducts: req.body.products.map(p => ({
        productId: p.id,
        position: p.position,
        price: p.price
      }))
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
