const axios = require('axios');
const cheerio = require('cheerio');
const LinkPreview = require('../models/LinkPreview');
const logger = require('../utils/logger');

class LinkPreviewService {
  async fetchPreview(url) {
    try {
      const existing = await LinkPreview.findOne({ url });
      if (existing && (Date.now() - existing.lastFetched < 7 * 24 * 60 * 60 * 1000)) {
        existing.fetchCount += 1;
        await existing.save();
        return existing;
      }

      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NexosBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);

      const title = $('meta[property="og:title"]').attr('content') || 
                   $('title').text() || 
                   '';

      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || 
                         '';

      const images = [];
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) images.push(ogImage);

      const siteName = $('meta[property="og:site_name"]').attr('content') || '';
      const favicon = $('link[rel="icon"]').attr('href') || 
                     $('link[rel="shortcut icon"]').attr('href') || 
                     '';

      const previewData = {
        url,
        canonicalUrl: $('link[rel="canonical"]').attr('href') || url,
        title: title.substring(0, 200),
        description: description.substring(0, 500),
        images,
        siteName,
        favicon,
        type: $('meta[property="og:type"]').attr('content') || 'website',
        lastFetched: new Date(),
        fetchCount: existing ? existing.fetchCount + 1 : 1
      };

      if (existing) {
        Object.assign(existing, previewData);
        await existing.save();
        return existing;
      }

      return await LinkPreview.create(previewData);
    } catch (error) {
      logger.error('Link preview fetch error:', error);
      return null;
    }
  }

  async cleanupExpired() {
    try {
      const result = await LinkPreview.deleteMany({
        lastFetched: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      logger.info(`Cleaned up ${result.deletedCount} expired link previews`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Link preview cleanup error:', error);
      return 0;
    }
  }
}

module.exports = new LinkPreviewService();