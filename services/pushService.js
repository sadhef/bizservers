const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:muhammedsadhef@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  // Subscribe user to push notifications
  static async subscribe(userId, subscription) {
    try {
      // Remove existing subscription for this user and endpoint
      await PushSubscription.deleteMany({
        userId,
        endpoint: subscription.endpoint
      });
      
      // Create new subscription
      const newSubscription = await PushSubscription.create({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
      
      console.log(`User ${userId} subscribed to push notifications`);
      return newSubscription;
    } catch (error) {
      console.error('Subscribe error:', error);
      throw new Error('Failed to subscribe');
    }
  }
  
  // Unsubscribe user
  static async unsubscribe(userId) {
    try {
      const result = await PushSubscription.deleteMany({ userId });
      console.log(`User ${userId} unsubscribed from push notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      throw new Error('Failed to unsubscribe');
    }
  }
  
  // Send notification to specific user
  static async sendToUser(userId, message) {
    try {
      const subscriptions = await PushSubscription.find({
        userId,
        isActive: true
      });
      
      if (subscriptions.length === 0) {
        return { success: false, message: 'No subscriptions found' };
      }
      
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: message.data || {}
      });
      
      let successCount = 0;
      
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: subscription.keys
          }, payload);
          
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to subscription ${subscription._id}:`, error);
          
          // Remove invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndDelete(subscription._id);
          }
        }
      }
      
      return {
        success: successCount > 0,
        sent: successCount,
        total: subscriptions.length
      };
    } catch (error) {
      console.error('Send notification error:', error);
      throw new Error('Failed to send notification');
    }
  }
  
  // Send notification to all users
  static async sendToAllUsers(message) {
    try {
      const subscriptions = await PushSubscription.find({ isActive: true })
        .populate('userId', 'name email');
      
      if (subscriptions.length === 0) {
        return { success: false, message: 'No subscriptions found' };
      }
      
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: message.data || {}
      });
      
      let successCount = 0;
      
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: subscription.keys
          }, payload);
          
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to user ${subscription.userId._id}:`, error);
          
          // Remove invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndDelete(subscription._id);
          }
        }
      }
      
      return {
        success: successCount > 0,
        sent: successCount,
        total: subscriptions.length
      };
    } catch (error) {
      console.error('Send bulk notification error:', error);
      throw new Error('Failed to send bulk notification');
    }
  }
  
  // Check if user is subscribed
  static async isUserSubscribed(userId) {
    try {
      const count = await PushSubscription.countDocuments({
        userId,
        isActive: true
      });
      return count > 0;
    } catch (error) {
      console.error('Check subscription error:', error);
      return false;
    }
  }
}

module.exports = PushService;