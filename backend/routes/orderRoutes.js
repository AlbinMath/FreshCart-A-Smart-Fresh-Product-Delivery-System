import express from 'express';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import crypto from 'crypto';
import { calculateTotal } from '../utils/deliveryUtils.js';
import { getSellerProductModel } from '../models/Product.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RL7iTlLIMH8nZY',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rwk1544M3HCWZOAb7E6A2X07'
});

// Create order
router.post('/create', async (req, res) => {
  try {
    const { userId, products, subtotal, deliveryFee, totalAmount, paymentMethod, deliveryAddress, storeDetails, cartItems } = req.body;

    if (!userId || !products || !Array.isArray(products) || products.length === 0 || typeof subtotal !== 'number' || typeof deliveryFee !== 'number' || typeof totalAmount !== 'number' || !paymentMethod || !deliveryAddress || !storeDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate totalAmount
    const calculatedTotal = subtotal + deliveryFee;
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ success: false, message: 'Invalid total amount calculation' });
    }

    // Generate unique order ID
    const orderId = `FC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const orderData = {
      orderId,
      userId,
      products,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      deliveryAddress,
      storeDetails,
      statusTimeline: [{
        status: 'Order Placed',
        timestamp: new Date()
      }]
    };

    if (paymentMethod === 'COD') {
      // Create order directly for COD
      const order = new Order({
        ...orderData,
        status: 'Pending Seller Approval',
        paymentStatus: 'pending' // For COD, payment is pending until delivery
      });

      await order.save();

      // Create payment record for COD
      const payment = new Payment({
        userId,
        orderId,
        paymentId: `COD_${orderId}`,
        amount: totalAmount,
        currency: 'INR',
        paymentStatus: 'pending',
        cartItems: cartItems || products.map(p => ({
          productId: p.id,
          productName: p.name,
          quantity: p.quantity,
          price: p.price
        })),
        deliveryAddress,
        subtotal,
        deliveryFee,
        totalAmount
      });

      await payment.save();

      res.json({
        success: true,
        orderId: order.orderId,
        message: 'Order placed successfully'
      });
    } else if (['Razorpay', 'UPI', 'Wallet'].includes(paymentMethod)) {
      // Create Razorpay order
      const options = {
        amount: totalAmount * 100, // Razorpay expects amount in paisa
        currency: 'INR',
        receipt: orderId,
        payment_capture: 1
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // Save order with razorpay details
      const order = new Order({
        ...orderData,
        status: 'Pending Seller Approval',
        razorpayOrderId: razorpayOrder.id,
        paymentStatus: 'pending'
      });

      await order.save();

      // Create payment record for Razorpay
      const payment = new Payment({
        userId,
        orderId,
        paymentId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        paymentStatus: 'pending',
        cartItems: cartItems || products.map(p => ({
          productId: p.id,
          productName: p.name,
          quantity: p.quantity,
          price: p.price
        })),
        deliveryAddress,
        subtotal,
        deliveryFee,
        totalAmount
      });

      await payment.save();

      res.json({
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          orderId: order.orderId
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Verify Razorpay payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Generate expected signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', razorpay.key_secret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment verified, update order
      const order = await Order.findOneAndUpdate(
        { orderId },
        {
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: 'paid',
          $push: {
            statusTimeline: {
              status: 'Payment Confirmed',
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Update payment record
      await Payment.findOneAndUpdate(
        { orderId },
        {
          paymentStatus: 'paid',
          paymentId: razorpay_payment_id
        }
      );

      res.json({
        success: true,
        orderId: order.orderId,
        message: 'Payment verified and order confirmed'
      });
    } else {
      // Payment failed
      await Order.findOneAndUpdate(
        { orderId },
        {
          paymentStatus: 'failed',
          $push: {
            statusTimeline: {
              status: 'Payment Failed',
              timestamp: new Date()
            }
          }
        }
      );

      // Update payment record
      await Payment.findOneAndUpdate(
        { orderId },
        { paymentStatus: 'failed' }
      );

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

// Get order status
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        timestamp: order.timestamp
      }
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order status' });
  }
});

// Get user orders
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ timestamp: -1 });

    // Group orders by status
    const groupedOrders = {
      processing: orders.filter(order => order.status === 'Pending Seller Approval' || order.status === 'Processing' || order.status === 'delivery_pending' || order.status === 'ready_for_delivery' || order.status === 'out_for_delivery'),
      underDelivery: orders.filter(order => order.status === 'Under Delivery'),
      completed: orders.filter(order => order.status === 'Completed' || order.status === 'delivered'),
      cancelled: orders.filter(order => order.status === 'Cancelled')
    };

    res.json({
      success: true,
      orders: groupedOrders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Update order status (for admin/delivery)
router.put('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        status,
        $push: {
          statusTimeline: {
            status,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Cancel order (for customers - only processing orders within 6 minutes)
router.put('/cancel/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    // Find the order and check if it can be cancelled
    const order = await Order.findOne({ orderId, userId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Processing' && order.status !== 'Pending Seller Approval') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled. Only pending or processing orders can be cancelled.'
      });
    }

    // Check if order is within 6 minutes
    const orderTime = new Date(order.timestamp);
    const now = new Date();
    const sixMinutes = 6 * 60 * 1000; // 6 minutes in milliseconds

    if (now - orderTime > sixMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled. Cancellation window has expired (6 minutes).'
      });
    }

    // Update order status to cancelled and add timeline entry
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId, userId },
      {
        status: 'Cancelled',
        $push: {
          statusTimeline: {
            status: 'Order Cancelled',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Handle refund for online payments
    if (order.paymentMethod === 'Razorpay' && order.paymentStatus === 'paid') {
      // Update payment status to refunded
      await Payment.findOneAndUpdate(
        { orderId },
        { paymentStatus: 'refunded' }
      );

      // Credit wallet
      const refundAmount = order.totalAmount;
      await User.findOneAndUpdate(
        { uid: userId },
        {
          $inc: { balance: refundAmount },
          $push: {
            walletTransactions: {
              type: 'credit',
              amount: refundAmount,
              description: `Refund for order ${orderId}`,
              reference: `REFUND_${orderId}`,
              status: 'completed'
            }
          }
        }
      );
    }

    res.json({
      success: true,
      order: {
        orderId: updatedOrder.orderId,
        status: updatedOrder.status,
        refundProcessed: order.paymentMethod === 'Razorpay' && order.paymentStatus === 'paid'
      },
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

// Get pending orders for seller
router.get('/seller/pending/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({
      'storeDetails.sellerId': sellerId,
      status: 'Pending Seller Approval'
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching seller pending orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Accept order by seller
router.put('/seller/accept/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.body; // For verification

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Pending Seller Approval') {
      return res.status(400).json({ success: false, message: 'Order is not pending approval' });
    }

    // Check if deadline passed
    if (new Date() > order.sellerApprovalDeadline) {
      return res.status(400).json({ success: false, message: 'Approval deadline has passed' });
    }

    // Update order status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'delivery_pending',
        $push: {
          statusTimeline: {
            status: 'Accepted by Seller',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Update seller wallet
    const sellerEarnings = order.subtotal; // Seller gets the subtotal, platform gets delivery fee

    await User.findOneAndUpdate(
      { uid: sellerId },
      {
        $inc: { balance: sellerEarnings },
        $push: {
          walletTransactions: {
            type: 'credit',
            amount: sellerEarnings,
            description: `Earnings from order ${orderId}`,
            reference: `ORDER_${orderId}`,
            status: 'completed'
          }
        }
      }
    );

    // Update product stocks
    const ProductModel = getSellerProductModel(sellerId);
    for (const product of order.products) {
      await ProductModel.findByIdAndUpdate(
        product.id,
        { $inc: { stock: -product.quantity } }
      );
    }

    // Notify customer about acceptance
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Accepted',
      message: `Your order has been accepted by the seller and is now pending delivery.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  }
});

// Reject order by seller
router.put('/seller/reject/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.body; // For verification

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Pending Seller Approval') {
      return res.status(400).json({ success: false, message: 'Order is not pending approval' });
    }

    // Update order status to cancelled
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'Cancelled',
        $push: {
          statusTimeline: {
            status: 'Rejected by Seller',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Notify customer about rejection
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Rejected',
      message: `Your order ${orderId} has been rejected by the seller.`,
      data: {
        orderId,
        reason: 'Rejected by seller'
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ success: false, message: 'Failed to reject order' });
  }
});

// Get accepted (seller approval) orders for seller
router.get('/seller/accepted/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({
      'storeDetails.sellerId': sellerId,
      status: { $in: ['delivery_pending', 'ready_for_delivery'] }
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching seller accepted orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Process order (set to Processing status) by seller
router.put('/seller/process/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.body;

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'delivery_pending') {
      return res.status(400).json({ success: false, message: 'Order is not pending delivery' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'Processing',
        $push: {
          statusTimeline: {
            status: 'Order Processing Started',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Notify customer about processing start
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Processing Started',
      message: `Your order ${orderId} is now being processed by the seller.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order processing started successfully'
    });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ success: false, message: 'Failed to process order' });
  }
});

// Mark order as ready for delivery by seller
router.put('/seller/ready-delivery/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.body;

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'delivery_pending') {
      return res.status(400).json({ success: false, message: 'Order is not pending delivery' });
    }

    // Generate OTP if not exists
    const otp = order.deliveryOTP || Math.floor(100000 + Math.random() * 900000).toString();

    // Generate QR code URL if not exists
    const qrUrl = order.qrCodeUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/track/${order.orderId}`;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'ready_for_delivery',
        deliveryOTP: otp,
        qrCodeUrl: qrUrl,
        $push: {
          statusTimeline: {
            status: 'Ready for Delivery',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Notify customer about order being ready for delivery
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Ready for Delivery',
      message: `Your order ${orderId} is now ready for delivery.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order marked as ready for delivery'
    });
  } catch (error) {
    console.error('Error marking order ready for delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to mark order ready for delivery' });
  }
});

// Get full order details for processing (with OTP/QR generation)
router.get('/seller/full/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.query;

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Generate OTP if not exists
    let otp = order.deliveryOTP;
    if (!otp) {
      otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      order.deliveryOTP = otp;
    }

    // Generate QR code URL if not exists
    let qrUrl = order.qrCodeUrl;
    if (!qrUrl) {
      qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/track/${order.orderId}`;
      order.qrCodeUrl = qrUrl;
    }

    // Save if updated
    if (!order.deliveryOTP || !order.qrCodeUrl) {
      await order.save();
    }

    // Get buyer contact info (assuming User model has phone, email)
    const User = (await import('../models/User.js')).default;
    const buyer = await User.findOne({ uid: order.userId });

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        deliveryOTP: otp,
        qrCodeUrl: qrUrl,
        buyerContact: buyer ? {
          phone: buyer.phone,
          email: buyer.email,
          name: buyer.displayName || buyer.name
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching full order details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

// Get available orders for delivery partners
router.get('/delivery/available', async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['ready_for_delivery', 'out_for_delivery'] }
    })
    .populate('userId', 'displayName phone email')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee,
        products: order.products,
        customerInfo: order.customerInfo,
        deliveryAddress: order.deliveryAddress,
        storeDetails: order.storeDetails,
        createdAt: order.createdAt,
        deliveryOTP: order.status === 'out_for_delivery' ? order.deliveryOTP : null,
        qrCodeUrl: order.status === 'out_for_delivery' ? order.qrCodeUrl : null
      }))
    });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available orders' });
  }
});

// Get store overview orders (active orders for delivery partners)
router.get('/delivery/store-overview', async (req, res) => {
  try {
    const orders = await Order.find({
      status: 'delivery_pending'
    })
    .populate('userId', 'displayName phone email')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee,
        products: order.products,
        customerInfo: order.customerInfo,
        deliveryAddress: order.deliveryAddress,
        storeInfo: order.storeDetails,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching store overview orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch store overview orders' });
  }
});

// Accept order for delivery (delivery partner)
router.put('/delivery/accept/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryPartnerId } = req.body;

    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'ready_for_delivery') {
      return res.status(400).json({ success: false, message: 'Order is not ready for delivery' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'Processing',
        deliveryPartnerId: deliveryPartnerId,
        $push: {
          statusTimeline: {
            status: 'Delivery Partner Assigned',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Notify customer about delivery partner assignment
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Delivery Partner Assigned',
      message: `A delivery partner has been assigned to your order ${orderId}.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order accepted for delivery'
    });
  } catch (error) {
    console.error('Error accepting order for delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order for delivery' });
  }
});

// Update order status to out_for_delivery
router.put('/seller/out-for-delivery/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId } = req.body;

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Processing') {
      return res.status(400).json({ success: false, message: 'Order is not in processing status' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'out_for_delivery',
        $push: {
          statusTimeline: {
            status: 'Out for Delivery',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Out for Delivery',
      message: `Your order ${orderId} is now out for delivery.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order status updated to out for delivery'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Update order status to delivered
router.put('/seller/deliver/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerId, otp } = req.body;

    const order = await Order.findOne({ _id: orderId, 'storeDetails.sellerId': sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ success: false, message: 'Order is not out for delivery' });
    }

    if (order.deliveryOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        status: 'delivered',
        $push: {
          statusTimeline: {
            status: 'Delivered',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Update payment status if COD
    if (order.paymentMethod === 'COD' && order.paymentStatus === 'pending') {
      await Payment.findOneAndUpdate(
        { orderId },
        { paymentStatus: 'paid' }
      );
    }

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: 'order',
      title: 'Order Delivered',
      message: `Your order ${orderId} has been successfully delivered.`,
      data: {
        orderId
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order delivered successfully'
    });
  } catch (error) {
    console.error('Error delivering order:', error);
    res.status(500).json({ success: false, message: 'Failed to deliver order' });
  }
});

export default router;