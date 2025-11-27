class ContentModerationService {
  constructor() {
    this.profanityWords = ['spam', 'hate', 'abuse', 'harassment', 'violence', 'threat'];
    this.spamPatterns = [
      /(.)\1{4,}/g,
      /https?:\/\/[^\s]+/g,
      /\b\d{10,}\b/g,
      /[A-Z]{5,}/g
    ];
  }

  containsProfanity(text) {
    const words = text.toLowerCase().split(/\s+/);
    return this.profanityWords.some(word => 
      words.some(w => w.includes(word))
    );
  }

  isSpam(text) {
    let spamScore = 0;
    
    this.spamPatterns.forEach(pattern => {
      if (pattern.test(text)) spamScore += 1;
    });
    
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = words.length / uniqueWords.size;
    
    if (repetitionRatio > 3) spamScore += 1;
    
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7) spamScore += 1;
    
    return spamScore >= 2;
  }

  isHateSpeech(text) {
    const hateKeywords = ['hate', 'kill', 'die', 'stupid', 'idiot', 'loser'];
    const words = text.toLowerCase().split(/\s+/);
    const hateWordCount = words.filter(word => 
      hateKeywords.some(hate => word.includes(hate))
    ).length;
    
    return hateWordCount >= 2;
  }

  containsPersonalInfo(text) {
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
    };
    
    return Object.values(patterns).some(pattern => pattern.test(text));
  }

  moderateContent(content, type = 'text') {
    const result = {
      approved: true,
      flags: [],
      confidence: 1.0,
      suggestions: []
    };

    if (type === 'text') {
      if (this.containsProfanity(content)) {
        result.flags.push('profanity');
        result.confidence -= 0.3;
      }

      if (this.isSpam(content)) {
        result.flags.push('spam');
        result.confidence -= 0.4;
      }

      if (this.isHateSpeech(content)) {
        result.flags.push('hate_speech');
        result.confidence -= 0.5;
      }

      if (this.containsPersonalInfo(content)) {
        result.flags.push('personal_info');
        result.confidence -= 0.2;
      }
    }

    result.approved = result.confidence > 0.5 && result.flags.length < 3;

    if (result.flags.includes('profanity')) {
      result.suggestions.push('Consider removing inappropriate language');
    }
    if (result.flags.includes('spam')) {
      result.suggestions.push('Content appears to be spam');
    }
    if (result.flags.includes('hate_speech')) {
      result.suggestions.push('Content may contain hate speech');
    }

    return result;
  }

  cleanText(text) {
    let cleanedText = text;
    
    this.profanityWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
    });
    
    cleanedText = cleanedText.replace(/https?:\/\/[^\s]+/g, '[LINK REMOVED]');
    cleanedText = cleanedText.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REMOVED]');
    
    return cleanedText;
  }
}

module.exports = new ContentModerationService();