import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { logActivity } from '../middleware/activityLogger.js';
import ProductApprovalService from '../services/productApprovalService.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Try authenticate if Authorization header is present; otherwise continue
const tryAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authenticateToken(req, res, next);
    }
    return next();
  } catch (e) {
    return next();
  }
};

// Require admin (token optional). If no token, identify by headers: x-actor-email or x-actor-uid
const requireAdmin = [
  tryAuth,
  async (req, res, next) => {
    try {
      let userDoc = null;

      if (req.user) {
        userDoc = req.user.id
          ? await User.findById(req.user.id).select('_id role email uid')
          : await User.findOne({ uid: req.user.uid }).select('_id role email uid');
      } else {
        const actorUid = req.headers['x-actor-uid'];
        const actorEmail = (req.headers['x-actor-email'] || '').toString().toLowerCase();
        if (actorUid) {
          userDoc = await User.findOne({ uid: actorUid }).select('_id role email uid');
        } else if (actorEmail) {
          userDoc = await User.findOne({ email: actorEmail }).select('_id role email uid');
        }
      }

      if (!userDoc || userDoc.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
      }

      // Normalize req.user for downstream handlers
      req.user = req.user || {};
      req.user.id = userDoc._id.toString();
      req.user.role = 'admin';
      req.user.email = req.user.email || userDoc.email;
      req.user.uid = req.user.uid || userDoc.uid;

      return next();
    } catch (e) {
      console.error('requireAdmin error:', e);
      return res.status(500).json({ success: false, message: 'Authentication error' });
    }
  }
];

// Apply admin guard to all routes below
router.use(requireAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json(users);

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get system statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const pendingVerification = await User.countDocuments({ emailVerified: false });
    const totalStores = await User.countDocuments({ role: 'store' });
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    res.json({
      totalUsers,
      verifiedUsers,
      pendingVerification,
      totalStores,
      totalSellers,
      totalCustomers,
      totalAdmins
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all stores (admin only)
router.get('/stores', async (req, res) => {
  try {
    const stores = await User.find({ role: 'store' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(stores);

  } catch (error) {
    console.error('Stores fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all sellers (admin only)
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(sellers);

  } catch (error) {
    console.error('Sellers fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single seller by id (admin only)
router.get('/sellers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller id' });
    }
    const seller = await User.findById(id).select('-password');
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    res.json({ success: true, seller });
  } catch (error) {
    console.error('Seller fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Approve seller verification
router.patch('/sellers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller id' });
    }
    const seller = await User.findById(id);
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    seller.isVerified = true;
    seller.verificationStatus = 'approved';
    // Also reflect in licenseInfo when present
    if (seller.licenseInfo) {
      seller.licenseInfo.status = 'approved';
      seller.licenseInfo.verifiedAt = new Date();
      seller.licenseInfo.verifiedBy = req.user?.id || seller.licenseInfo.verifiedBy;
      seller.licenseInfo.rejectionReason = '';
    }
    await seller.save();
    const sanitized = seller.toObject();
    delete sanitized.password;
    res.json({ success: true, message: 'Seller verification approved', seller: sanitized });
  } catch (error) {
    console.error('Approve seller error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Reject seller verification
router.patch('/sellers/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller id' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    const seller = await User.findById(id);
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    seller.isVerified = false;
    seller.verificationStatus = 'rejected';
    if (seller.licenseInfo) {
      seller.licenseInfo.status = 'rejected';
      seller.licenseInfo.verifiedAt = new Date();
      seller.licenseInfo.verifiedBy = req.user?.id || seller.licenseInfo.verifiedBy;
      seller.licenseInfo.rejectionReason = String(reason).trim();
    }
    await seller.save();
    const sanitized = seller.toObject();
    delete sanitized.password;
    res.json({ success: true, message: 'Seller verification rejected', seller: sanitized });
  } catch (error) {
    console.error('Reject seller error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// [Removed] Seller license approval endpoint has been disabled intentionally to remove the feature.
// router.put('/sellers/:userId/license-approval', async (req, res) => {
//   return res.status(410).json({ success: false, message: 'License approval feature removed' });
// });

// Get all products for admin verification
router.get('/products', async (req, res) => {
  try {
    const { getSellerProductModel } = await import('../models/Product.js');
    const sellers = await User.find({ role: 'seller' }).select('uid sellerUniqueNumber name email');
    
    let allProducts = [];
    
    for (const seller of sellers) {
      try {
        const ProductModel = getSellerProductModel(seller.sellerUniqueNumber || seller.uid);
        const products = await ProductModel.find({}).lean();
        
        // Add seller info to each product
        const productsWithSeller = products.map(product => ({
          ...product,
          sellerInfo: {
            uid: seller.uid,
            name: seller.name,
            email: seller.email,
            sellerUniqueNumber: seller.sellerUniqueNumber
          }
        }));
        
        allProducts = allProducts.concat(productsWithSeller);
      } catch (err) {
        console.log(`No products found for seller ${seller.uid}:`, err.message);
      }
    }
    
    // Sort by creation date (newest first)
    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allProducts);

  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Approve/Reject product (admin only)
router.put('/products/:sellerId/:productId/approval', async (req, res) => {
  try {
    const { sellerId, productId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'
    
    const { getSellerProductModel } = await import('../models/Product.js');
    const ProductModel = getSellerProductModel(sellerId);
    
    const updateData = {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: req.user?.email || 'admin',
      approvalDate: new Date()
    };
    
    if (action === 'reject' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    const product = await ProductModel.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: `Product ${action}d successfully`,
      product
    });

  } catch (error) {
    console.error('Product approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Activate/Deactivate user (admin only)
router.put('/users/:userId/activate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: true } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log activity
    try { await Activity.create({ actorUid: req.headers['x-actor-uid'] || 'unknown', actorEmail: req.headers['x-actor-email'] || '', actorRole: 'admin', targetUserId: user._id, action: 'activate', details: {} }); } catch(e) {}

    res.json({
      success: true,
      message: 'User activated successfully',
      user
    });

  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Deactivate user (admin only)
router.put('/users/:userId/deactivate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log activity
    try { await Activity.create({ actorUid: req.headers['x-actor-uid'] || 'unknown', actorEmail: req.headers['x-actor-email'] || '', actorRole: 'admin', targetUserId: user._id, action: 'deactivate', details: {} }); } catch(e) {}

    res.json({
      success: true,
      message: 'User deactivated successfully',
      user
    });

  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Verify user email (admin only)
router.put('/users/:userId/verify-email', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { emailVerified: true } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    try { await Activity.create({ actorUid: req.headers['x-actor-uid'] || 'unknown', actorEmail: req.headers['x-actor-email'] || '', actorRole: 'admin', targetUserId: user._id, action: 'verify-email', details: {} }); } catch(e) {}

    res.json({ success: true, message: 'User email verified successfully', user });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Verify role (e.g., seller approval)
router.put('/users/:userId/verify-role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, verified } = req.body || {};

    // Basic check: only allow toggling for store/seller roles
    if (!['store','seller'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Only store/seller roles are verifiable' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== role) return res.status(400).json({ success: false, message: 'Role mismatch' });

    // Simple flag on accountStatus to reflect verification (pending -> active)
    if (typeof verified === 'boolean') {
      user.accountStatus = verified ? 'active' : 'pending';
    }
    await user.save();
    const sanitized = user.toObject();
    delete sanitized.password;

    try { await Activity.create({ actorUid: req.headers['x-actor-uid'] || 'unknown', actorEmail: req.headers['x-actor-email'] || '', actorRole: 'admin', targetUserId: user._id, action: 'verify-role', details: { role, verified } }); } catch(e) {}

    return res.json({ success: true, message: 'Role verification updated', user: sanitized });
  } catch (error) {
    console.error('Verify role error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Change user role (admin only)
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['customer', 'store', 'seller', 'admin', 'delivery'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    try { await Activity.create({ actorUid: req.headers['x-actor-uid'] || 'unknown', actorEmail: req.headers['x-actor-email'] || '', actorRole: 'admin', targetUserId: user._id, action: 'update-role', details: { role } }); } catch(e) {}

    res.json({ success: true, message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get activity logs (admin only)
router.get('/activity', async (req, res) => {
  try {
    const { limit = 50, role, actorEmail } = req.query;
    const filter = {};
    if (role) filter.actorRole = role;
    if (actorEmail) filter.actorEmail = actorEmail.toLowerCase();
    const logs = await Activity.find(filter).sort({ createdAt: -1 }).limit(Math.min(parseInt(limit, 10) || 50, 200));
    res.json(logs);
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Get user analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '1y':
        dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const newUsers = await User.countDocuments(dateFilter);
    const newStores = await User.countDocuments({ ...dateFilter, role: 'store' });
    const newSellers = await User.countDocuments({ ...dateFilter, role: 'seller' });

    res.json({
      period,
      newUsers,
      newStores,
      newSellers
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get activity statistics
router.get('/activities/stats', async (req, res) => {
  try {
    const [byRole, byAction, byStatus, recentActivities] = await Promise.all([
      // Group by role
      Activity.aggregate([
        { $group: { _id: '$actorRole', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Group by action type
      Activity.aggregate([
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Group by status
      Activity.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activities
      Activity.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        byRole,
        byAction,
        byStatus,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
});

// Get activity details
router.get('/activities/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const activity = await Activity.findById(req.params.id).lean();
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity details',
      error: error.message
    });
  }
});

// Delete activity
router.delete('/activities/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const activity = await Activity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message
    });
  }
});

// Clean up old activities
router.delete('/activities', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} activities older than ${days} days`
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up activities',
      error: error.message
    });
  }
});

// Product Approval Routes
router.get('/products/pending', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await ProductApprovalService.getPendingProducts(parseInt(page), parseInt(limit));
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending products',
      error: error.message
    });
  }
});

// Update product approval status
router.put('/products/:sellerUid/:productId/status', async (req, res) => {
  try {
    const { sellerUid, productId } = req.params;
    const { status, reason = '' } = req.body;
    const adminUid = req.user?.uid; // Assuming you have user info in req.user from auth middleware

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "approved" or "rejected"'
      });
    }

    const product = await ProductApprovalService.updateProductStatus(
      sellerUid,
      productId,
      { status, adminUid, reason }
    );

    res.json({
      success: true,
      message: `Product ${status} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product status',
      error: error.message
    });
  }
});

// Get seller's products with optional status filter
router.get('/sellers/:sellerUid/products', async (req, res) => {
  try {
    const { sellerUid } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const result = await ProductApprovalService.getSellerProducts(sellerUid, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller products',
      error: error.message
    });
  }
});

// Get notifications for admin
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const adminUid = req.user?.uid;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ uid: adminUid })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Notification.countDocuments({ uid: adminUid, read: false })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        page: parseInt(page),
        totalPages: Math.ceil(notifications.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const adminUid = req.user?.uid;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, uid: adminUid },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

export default router;
