import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'email_verification_required',
      'license_verification_pending',
      'license_approved',
      'license_rejected',
      'admin_license_request',
      'product_approved',
      'product_rejected',
      'general'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For admin notifications
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Auto-expire notifications after certain time
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create email verification notification
notificationSchema.statics.createEmailVerificationNotification = async function(userId, userEmail) {
  return this.create({
    userId,
    type: 'email_verification_required',
    title: 'Email Verification Required',
    message: `Please verify your email address (${userEmail}) to access all features.`,
    priority: 'high',
    metadata: { email: userEmail }
  });
};

// Static method to create license verification notification for admin
notificationSchema.statics.createLicenseVerificationNotification = async function(sellerId, sellerName, storeName) {
  // Find all admin users
  const User = mongoose.model('User');
  const admins = await User.find({ role: 'admin' }).select('_id');
  
  const notifications = admins.map(admin => ({
    userId: admin._id,
    type: 'admin_license_request',
    title: 'New License Verification Request',
    message: `${sellerName} (${storeName}) has submitted a business license for verification.`,
    priority: 'high',
    metadata: { 
      sellerId, 
      sellerName, 
      storeName,
      actionRequired: true
    }
  }));
  
  return this.insertMany(notifications);
};

// Static method to create license status notification for seller
notificationSchema.statics.createLicenseStatusNotification = async function(sellerId, status, rejectionReason = null) {
  const title = status === 'approved' ? 'License Approved' : 'License Rejected';
  const message = status === 'approved' 
    ? 'Your business license has been approved! You can now access all seller features.'
    : `Your business license was rejected. Reason: ${rejectionReason || 'Please contact support for details.'}`;
  
  return this.create({
    userId: sellerId,
    type: status === 'approved' ? 'license_approved' : 'license_rejected',
    title,
    message,
    priority: status === 'approved' ? 'medium' : 'high',
    metadata: { 
      status, 
      rejectionReason,
      actionRequired: status === 'rejected'
    }
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  return this.save();
};

export default mongoose.model('Notification', notificationSchema);