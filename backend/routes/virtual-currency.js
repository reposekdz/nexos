const express = require('express');
const router = express.Router();
const { VirtualCurrency } = require('../models/Monetization');
const auth = require('../middleware/auth');

// Virtual Currency & Gifts (15 APIs)
router.get('/balance', auth, async (req, res) => {
  try {
    let currency = await VirtualCurrency.findOne({ user: req.user.id });
    if (!currency) {
      currency = new VirtualCurrency({ user: req.user.id, balance: 0 });
      await currency.save();
    }
    res.json({ balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase', auth, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    currency.balance += amount;
    currency.transactions.push({ type: 'purchase', amount, description: `Purchased ${amount} coins` });
    await currency.save();
    res.json({ balance: currency.balance, message: `${amount} coins added` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send-gift/:userId', auth, async (req, res) => {
  try {
    const { giftType, cost } = req.body;
    const senderCurrency = await VirtualCurrency.findOne({ user: req.user.id });
    if (senderCurrency.balance < cost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    senderCurrency.balance -= cost;
    senderCurrency.transactions.push({ type: 'spend', amount: -cost, description: `Sent ${giftType} gift` });
    await senderCurrency.save();
    
    let recipientCurrency = await VirtualCurrency.findOne({ user: req.params.userId });
    if (!recipientCurrency) {
      recipientCurrency = new VirtualCurrency({ user: req.params.userId, balance: 0 });
    }
    recipientCurrency.balance += Math.floor(cost * 0.7);
    recipientCurrency.transactions.push({ type: 'earn', amount: Math.floor(cost * 0.7), description: `Received ${giftType} gift` });
    await recipientCurrency.save();
    
    res.json({ message: 'Gift sent', balance: senderCurrency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gifts/catalog', auth, async (req, res) => {
  try {
    const gifts = [
      { id: 1, name: 'Heart', cost: 10, icon: '❤️' },
      { id: 2, name: 'Star', cost: 25, icon: '⭐' },
      { id: 3, name: 'Diamond', cost: 100, icon: '💎' },
      { id: 4, name: 'Crown', cost: 500, icon: '👑' },
      { id: 5, name: 'Rocket', cost: 1000, icon: '🚀' }
    ];
    res.json(gifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    res.json(currency?.transactions || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/redeem', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    if (currency.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    const cashValue = amount * 0.01;
    currency.balance -= amount;
    currency.transactions.push({ type: 'spend', amount: -amount, description: `Redeemed for $${cashValue}` });
    await currency.save();
    res.json({ message: `Redeemed ${amount} coins for $${cashValue}`, balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/earn/watch-ad', auth, async (req, res) => {
  try {
    const reward = 5;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    currency.balance += reward;
    currency.transactions.push({ type: 'earn', amount: reward, description: 'Watched advertisement' });
    await currency.save();
    res.json({ message: `Earned ${reward} coins`, balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/earn/daily-bonus', auth, async (req, res) => {
  try {
    const bonus = 50;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    currency.balance += bonus;
    currency.transactions.push({ type: 'earn', amount: bonus, description: 'Daily login bonus' });
    await currency.save();
    res.json({ message: `Earned ${bonus} coins`, balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/earn/referral', auth, async (req, res) => {
  try {
    const reward = 100;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    currency.balance += reward;
    currency.transactions.push({ type: 'earn', amount: reward, description: 'Referral bonus' });
    await currency.save();
    res.json({ message: `Earned ${reward} coins`, balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const topUsers = await VirtualCurrency.find().sort('-balance').limit(10).populate('user', 'username avatar');
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfer/:userId', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const senderCurrency = await VirtualCurrency.findOne({ user: req.user.id });
    if (senderCurrency.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    senderCurrency.balance -= amount;
    senderCurrency.transactions.push({ type: 'spend', amount: -amount, description: 'Transferred coins' });
    await senderCurrency.save();
    
    let recipientCurrency = await VirtualCurrency.findOne({ user: req.params.userId });
    if (!recipientCurrency) {
      recipientCurrency = new VirtualCurrency({ user: req.params.userId, balance: 0 });
    }
    recipientCurrency.balance += amount;
    recipientCurrency.transactions.push({ type: 'earn', amount, description: 'Received coins' });
    await recipientCurrency.save();
    
    res.json({ message: 'Transfer successful', balance: senderCurrency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/packages', auth, async (req, res) => {
  try {
    const packages = [
      { coins: 100, price: 0.99, bonus: 0 },
      { coins: 500, price: 4.99, bonus: 50 },
      { coins: 1000, price: 9.99, bonus: 150 },
      { coins: 5000, price: 49.99, bonus: 1000 },
      { coins: 10000, price: 99.99, bonus: 2500 }
    ];
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/boost-post/:postId', auth, async (req, res) => {
  try {
    const cost = 50;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    if (currency.balance < cost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    currency.balance -= cost;
    currency.transactions.push({ type: 'spend', amount: -cost, description: 'Boosted post' });
    await currency.save();
    res.json({ message: 'Post boosted', balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rewards/available', auth, async (req, res) => {
  try {
    const rewards = [
      { id: 1, name: 'Premium Badge', cost: 500, type: 'badge' },
      { id: 2, name: 'Custom Theme', cost: 1000, type: 'theme' },
      { id: 3, name: 'Profile Frame', cost: 750, type: 'frame' },
      { id: 4, name: 'Ad-Free Week', cost: 2000, type: 'feature' }
    ];
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rewards/:rewardId/claim', auth, async (req, res) => {
  try {
    const { cost } = req.body;
    const currency = await VirtualCurrency.findOne({ user: req.user.id });
    if (currency.balance < cost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    currency.balance -= cost;
    currency.transactions.push({ type: 'spend', amount: -cost, description: 'Claimed reward' });
    await currency.save();
    res.json({ message: 'Reward claimed', balance: currency.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
