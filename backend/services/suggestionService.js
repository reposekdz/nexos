const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Follow = require('../models/Follow');
const Suggestion = require('../models/Suggestion');
const logger = require('../utils/logger');

class SuggestionService {
  async generateSuggestions(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const suggestions = [];

      // Get mutual friends suggestions
      const mutualSuggestions = await this.getMutualFriendsSuggestions(userId);
      suggestions.push(...mutualSuggestions);

      // Get location-based suggestions
      if (user.location) {
        const locationSuggestions = await this.getLocationSuggestions(userId, user.location);
        suggestions.push(...locationSuggestions);
      }

      // Get interest-based suggestions
      if (user.interests && user.interests.length > 0) {
        const interestSuggestions = await this.getInterestSuggestions(userId, user.interests);
        suggestions.push(...interestSuggestions);
      }

      // Sort by score and remove duplicates
      const uniqueSuggestions = [...new Map(suggestions.map(s => [s.userId.toString(), s])).values()];
      const topSuggestions = uniqueSuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Save to database
      for (const suggestion of topSuggestions) {
        await Suggestion.findOneAndUpdate(
          { user: userId, suggestedUser: suggestion.userId },
          {
            user: userId,
            suggestedUser: suggestion.userId,
            reason: suggestion.reason,
            score: suggestion.score,
            mutualFriendsCount: suggestion.mutualFriendsCount || 0,
            status: 'active'
          },
          { upsert: true, new: true }
        );
      }

      return topSuggestions;
    } catch (error) {
      logger.error('Generate suggestions error:', error);
      return [];
    }
  }

  async getMutualFriendsSuggestions(userId) {
    try {
      const myFriendships = await Friendship.find({
        $or: [{ user1: userId }, { user2: userId }]
      });

      const myFriendIds = myFriendships.map(f =>
        f.user1.toString() === userId.toString() ? f.user2 : f.user1
      );

      const friendsOfFriends = await Friendship.find({
        $or: [
          { user1: { $in: myFriendIds } },
          { user2: { $in: myFriendIds } }
        ]
      });

      const suggestionMap = new Map();

      for (const friendship of friendsOfFriends) {
        const potentialFriend = friendship.user1.toString() === userId.toString() ? 
          friendship.user2 : friendship.user1;

        if (potentialFriend.toString() === userId.toString() || 
            myFriendIds.includes(potentialFriend.toString())) {
          continue;
        }

        const key = potentialFriend.toString();
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            userId: potentialFriend,
            reason: 'mutual_friends',
            score: 0,
            mutualFriendsCount: 0
          });
        }

        const suggestion = suggestionMap.get(key);
        suggestion.mutualFriendsCount += 1;
        suggestion.score += 10;
      }

      return Array.from(suggestionMap.values());
    } catch (error) {
      logger.error('Mutual friends suggestions error:', error);
      return [];
    }
  }

  async getLocationSuggestions(userId, location) {
    try {
      const nearbyUsers = await User.find({
        _id: { $ne: userId },
        'location.city': location.city
      }).limit(20);

      return nearbyUsers.map(user => ({
        userId: user._id,
        reason: 'same_location',
        score: 5
      }));
    } catch (error) {
      logger.error('Location suggestions error:', error);
      return [];
    }
  }

  async getInterestSuggestions(userId, interests) {
    try {
      const usersWithSimilarInterests = await User.find({
        _id: { $ne: userId },
        interests: { $in: interests }
      }).limit(20);

      return usersWithSimilarInterests.map(user => ({
        userId: user._id,
        reason: 'same_interests',
        score: 3
      }));
    } catch (error) {
      logger.error('Interest suggestions error:', error);
      return [];
    }
  }
}

module.exports = new SuggestionService();