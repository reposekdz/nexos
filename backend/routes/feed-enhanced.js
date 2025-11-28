const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { etagMiddleware } = require('../middleware/etag');
const feedAlgorithmService = require('../services/feedAlgorithmService');
const SavedFeedFilter = require('../models/SavedFeedFilter');
const Topic = require('../models/Topic');
const TopicFollower = require('../models/TopicFollower');
const EmbedCache = require('../models/EmbedCache');
const Post = require('../models/Post');
const RSS = require('rss');

router.get('/', auth, etagMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      filterId
    } = req.query;

    res.locals.lastModified = new Date();

    const feed = await feedAlgorithmService.generateFeed(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      filterId
    });

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/filters', auth, validate(schemas.feedFilter), async (req, res) => {
  try {
    const filter = await SavedFeedFilter.create({
      user: req.user.id,
      ...req.validatedData
    });

    res.status(201).json(filter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/filters', auth, async (req, res) => {
  try {
    const filters = await SavedFeedFilter.find({ user: req.user.id });
    res.json(filters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/filters/:id', auth, async (req, res) => {
  try {
    const filter = await SavedFeedFilter.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    res.json(filter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/filters/:id', auth, async (req, res) => {
  try {
    await SavedFeedFilter.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    res.json({ message: 'Filter deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    const { category, trending, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (trending === 'true') query.isTrending = true;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const topics = await Topic.find(query)
      .sort({ followerCount: -1 })
      .limit(50);

    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/topics/:slug', async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/topics/:id/follow', auth, async (req, res) => {
  try {
    const existing = await TopicFollower.findOne({
      user: req.user.id,
      topic: req.params.id
    });

    if (existing) {
      return res.status(400).json({ error: 'Already following this topic' });
    }

    const follower = await TopicFollower.create({
      user: req.user.id,
      topic: req.params.id
    });

    await Topic.findByIdAndUpdate(req.params.id, {
      $inc: { followerCount: 1 }
    });

    res.status(201).json(follower);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/topics/:id/follow', auth, async (req, res) => {
  try {
    await TopicFollower.findOneAndDelete({
      user: req.user.id,
      topic: req.params.id
    });

    await Topic.findByIdAndUpdate(req.params.id, {
      $inc: { followerCount: -1 }
    });

    res.json({ message: 'Unfollowed topic' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/topics/:id/posts', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find({
      tags: req.params.id
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('author', 'username fullName avatar isVerified');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/embed', async (req, res) => {
  try {
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }

    let embed = await EmbedCache.findOne({
      targetId: postId,
      targetType: 'post'
    });

    if (!embed || Date.now() - embed.lastFetched > 3600000) {
      const post = await Post.findById(postId)
        .populate('author', 'username fullName avatar');

      if (!post || post.visibility !== 'public') {
        return res.status(404).json({ error: 'Post not found or not public' });
      }

      const html = `
        <blockquote class="nexos-embed">
          <div class="nexos-embed-author">
            <img src="${post.author.avatar}" alt="${post.author.fullName}">
            <strong>${post.author.fullName}</strong> @${post.author.username}
          </div>
          <p>${post.content}</p>
          <a href="${process.env.CLIENT_URL}/posts/${post._id}">View on Nexos</a>
        </blockquote>
      `;

      if (embed) {
        embed.html = html;
        embed.lastFetched = new Date();
        embed.embedViews += 1;
        await embed.save();
      } else {
        embed = await EmbedCache.create({
          targetId: postId,
          targetType: 'post',
          html,
          metadata: {
            title: `Post by ${post.author.fullName}`,
            description: post.content.substring(0, 200),
            imageUrl: post.media[0]?.url,
            author: post.author.fullName,
            publishedAt: post.createdAt
          },
          isPublic: true
        });
      }
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(embed.html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rss/:userId', async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await Post.find({
      author: req.params.userId,
      visibility: 'public'
    })
    .sort({ createdAt: -1 })
    .limit(20);

    const feed = new RSS({
      title: `${user.fullName}'s Posts on Nexos`,
      description: user.bio || '',
      feed_url: `${process.env.API_URL}/feed/rss/${req.params.userId}`,
      site_url: `${process.env.CLIENT_URL}/profile/${user.username}`,
      image_url: user.avatar,
      language: 'en'
    });

    posts.forEach(post => {
      feed.item({
        title: post.content.substring(0, 100),
        description: post.content,
        url: `${process.env.CLIENT_URL}/posts/${post._id}`,
        date: post.createdAt,
        author: user.fullName
      });
    });

    res.setHeader('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invalidate-cache', auth, async (req, res) => {
  try {
    await feedAlgorithmService.invalidateFeedCache(req.user.id);
    res.json({ message: 'Feed cache invalidated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
