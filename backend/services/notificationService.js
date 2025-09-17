import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

class NotificationService {
  static async createNotification({ uid, type, title, message, data = {} }) {
    const notification = new Notification({
      uid,
      type,
      title,
      message,
      data,
      read: false
    });

    await notification.save();

    // Emit real-time notification
    const io = getIO();
    if (io) {
      io.to(`user_${uid}`).emit('notification', notification);
    }

    return notification;
  }

  static async getUnreadCount(uid) {
    return Notification.countDocuments({ uid, read: false });
  }

  static async markAsRead(notificationId, uid) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, uid },
      { $set: { read: true } },
      { new: true }
    );
  }

  static async markAllAsRead(uid) {
    return Notification.updateMany(
      { uid, read: false },
      { $set: { read: true } }
    );
  }

  static async getNotifications(uid, { limit = 10, page = 1 } = {}) {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      Notification.find({ uid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ uid })
    ]);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export default NotificationService;
