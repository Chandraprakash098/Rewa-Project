const MarketingActivity = require('../models/MarketingActivity');

const marketingController = {
  // Add new marketing activity
  addActivity: async (req, res) => {
    try {
      const { customerName, discussion, location } = req.body;
      
      const activity = new MarketingActivity({
        marketingUser: req.user._id,
        customerName,
        discussion,
        location
      });

      await activity.save();
      res.status(201).json({ 
        message: 'Marketing activity logged successfully',
        activity 
      });
    } catch (error) {
      console.error('Error logging marketing activity:', error);
      res.status(500).json({ error: 'Error logging marketing activity' });
    }
  },

  // Get all activities for the logged-in marketing user
  getMyActivities: async (req, res) => {
    try {
      const activities = await MarketingActivity.find({ 
        marketingUser: req.user._id 
      })
      .sort({ createdAt: -1 });

      res.json({ activities });
    } catch (error) {
      console.error('Error fetching marketing activities:', error);
      res.status(500).json({ error: 'Error fetching marketing activities' });
    }
  },

  // Get activity details
  getActivityById: async (req, res) => {
    try {
      const activity = await MarketingActivity.findById(req.params.activityId)
        .populate('marketingUser', 'name email')
        .populate('reviewedBy', 'name role');

      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json({ activity });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching activity details' });
    }
  }
};

module.exports = marketingController;
