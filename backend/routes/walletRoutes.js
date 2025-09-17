import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

const router = express.Router();

// Get wallet details
router.get('/:userId/wallet', authenticateToken, async (req, res) => {
  try {
    // Verify the requesting user has access to this wallet
    if (req.user.uid !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findOne(
      { uid: req.params.userId },
      { balance: 1, walletTransactions: 1 }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.balance || 0,
      transactions: user.walletTransactions || []
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch wallet details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add money to wallet
router.post('/:userId/wallet/add', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    const userId = req.params.userId;

    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid amount' 
      });
    }

    // Verify the requesting user has access to this wallet
    if (req.user.uid !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Find user and update balance atomically
    const user = await User.findOneAndUpdate(
      { uid: userId },
      {
        $inc: { balance: amountValue },
        $push: {
          walletTransactions: {
            type: 'credit',
            amount: amountValue,
            description: 'Wallet top-up',
            reference: `WALLET_TOPUP_${Date.now()}`,
            status: 'completed'
          }
        }
      },
      { new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the wallet top-up activity
    await logActivity({
      actorUid: req.user.uid,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'wallet_topup',
      targetUserId: userId,
      details: {
        amount: amountValue,
        newBalance: user.balance + amountValue
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Money added to wallet successfully',
      newBalance: user.balance + amountValue,
      transaction: {
        _id: new mongoose.Types.ObjectId(),
        type: 'credit',
        amount: amountValue,
        description: 'Wallet top-up',
        reference: `WALLET_TOPUP_${Date.now()}`,
        status: 'completed',
        createdAt: new Date()
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error adding money to wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add money to wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deduct money from wallet (for payments)
router.post('/:userId/wallet/deduct', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, reference, description = 'Payment' } = req.body;
    const userId = req.params.userId;
    
    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid amount' 
      });
    }

    // Verify the requesting user has access to this wallet
    if (req.user.uid !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user has sufficient balance
    const user = await User.findOne({ uid: userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.balance < amountValue) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance' 
      });
    }

    // Update balance and add transaction
    const updatedUser = await User.findOneAndUpdate(
      { 
        uid: userId,
        balance: { $gte: amountValue } // Ensure balance hasn't changed
      },
      {
        $inc: { balance: -amountValue },
        $push: {
          walletTransactions: {
            type: 'debit',
            amount: amountValue,
            description,
            reference: reference || `PAYMENT_${Date.now()}`,
            status: 'completed'
          }
        }
      },
      { new: true, session }
    );

    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance or user not found' 
      });
    }

    // Log the wallet deduction activity
    await logActivity({
      actorUid: req.user.uid,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'wallet_deduction',
      targetUserId: userId,
      details: {
        amount: amountValue,
        reference,
        description,
        newBalance: updatedUser.balance - amountValue
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Payment successful',
      newBalance: updatedUser.balance - amountValue,
      transaction: {
        _id: new mongoose.Types.ObjectId(),
        type: 'debit',
        amount: amountValue,
        description,
        reference: reference || `PAYMENT_${Date.now()}`,
        status: 'completed',
        createdAt: new Date()
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error processing payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Payment failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
