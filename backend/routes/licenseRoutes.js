import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Require authenticated seller
const requireSeller = [
  authenticateToken,
  async (req, res, next) => {
    try {
      // Basic role check from token
      if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ success: false, message: 'Seller access required' });
      }
      // Ensure user exists and is a seller
      const user = req.user.id
        ? await User.findById(req.user.id).select('_id role')
        : await User.findOne({ uid: req.user.uid }).select('_id role');
      if (!user || user.role !== 'seller') {
        return res.status(403).json({ success: false, message: 'Seller not found or not authorized' });
      }
      req.sellerId = user._id.toString();
      next();
    } catch (e) {
      console.error('requireSeller error:', e);
      res.status(500).json({ success: false, message: 'Authentication error' });
    }
  }
];


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/licenses/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image and PDF files
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to validate license info
const validateLicenseInfo = (licenseNumber, file, isUpdate = false) => {
  const errors = [];
  
  // Validate license number format (2 letters + 6 digits)
  const licenseRegex = /^[A-Za-z]{2}\d{6}$/;
  if (!licenseNumber || !licenseRegex.test(licenseNumber)) {
    errors.push('License number must be in the format: 2 letters followed by 6 digits (e.g., AB123456)');
  }
  
  // For new uploads, file is required
  if (!isUpdate && !file) {
    errors.push('License file is required');
  }
  
  return errors;
};

// @route   POST /api/license/upload
// @desc    Upload seller's business license (new sellers)
// @access  Private (Seller)
router.post('/upload', requireSeller, upload.single('licenseFile'), async (req, res) => {
  try {
    const { licenseNumber } = req.body;
    const sellerId = req.sellerId;

    // Validate input
    const validationErrors = validateLicenseInfo(licenseNumber, req.file);
    if (validationErrors.length > 0) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Find the seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Delete old file if it exists
    if (seller.licenseInfo?.file?.path && fs.existsSync(seller.licenseInfo.file.path)) {
      fs.unlinkSync(seller.licenseInfo.file.path);
    }

    // Prepare license info
    const licenseInfo = {
      licenseNumber,
      status: 'pending',
      rejectionReason: '',
      verifiedAt: null,
      verifiedBy: null,
      file: {
        url: `/uploads/licenses/${req.file.filename}`,
        path: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    };

    // Update seller's license info
    seller.licenseInfo = licenseInfo;
    await seller.save();

    res.json({ 
      success: true, 
      message: 'License uploaded successfully',
      licenseInfo: seller.licenseInfo
    });

  } catch (error) {
    console.error('Error uploading license:', error);
    // Clean up uploaded file if an error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/license/update
// @desc    Update seller's business license (existing sellers)
// @access  Private (Seller)
router.put('/update', requireSeller, upload.single('licenseFile'), async (req, res) => {
  try {
    const { licenseNumber } = req.body;
    const sellerId = req.sellerId;
    const isFileUploaded = !!req.file;

    // For updates, file is optional
    const validationErrors = validateLicenseInfo(licenseNumber, req.file, true);
    if (validationErrors.length > 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Find the seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Prepare license info update
    const updateData = {
      'licenseInfo.licenseNumber': licenseNumber,
      'licenseInfo.status': 'pending', // Reset status to pending for review
      'licenseInfo.rejectionReason': '', // Clear any previous rejection reason
      'licenseInfo.verifiedAt': null,
      'licenseInfo.verifiedBy': null
    };

    // If file was uploaded, update file info
    if (isFileUploaded) {
      // Delete old file if it exists
      if (seller.licenseInfo?.file?.path && fs.existsSync(seller.licenseInfo.file.path)) {
        fs.unlinkSync(seller.licenseInfo.file.path);
      }

      updateData['licenseInfo.file'] = {
        url: `/uploads/licenses/${req.file.filename}`,
        path: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    // Update seller's license info
    const updatedSeller = await User.findByIdAndUpdate(
      sellerId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      message: 'License updated successfully',
      licenseInfo: updatedSeller.licenseInfo
    });

  } catch (error) {
    console.error('Error updating license:', error);
    // Clean up uploaded file if an error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/license/status
// @desc    Get seller's license status
// @access  Private (Seller)
router.get('/status', requireSeller, async (req, res) => {
  try {
    const seller = await User.findById(req.sellerId)
      .select('licenseInfo')
      .lean();

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    res.json({ 
      success: true, 
      licenseInfo: seller.licenseInfo || null 
    });

  } catch (error) {
    console.error('Error getting license status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/license/link
// @desc    Submit a URL to an external license document (no file upload)
// @access  Private (Seller)
router.post('/link', requireSeller, async (req, res) => {
  try {
    const { licenseNumber, licenseUrl } = req.body;

    const errors = [];
    // Enforce lowercase two letters followed by six digits (e.g., ss100001)
    const licenseRegex = /^[a-z]{2}\d{6}$/;
    if (!licenseNumber || !licenseRegex.test(licenseNumber)) {
      errors.push('License number must be in the format: ss followed by 6 digits (e.g., ss100001)');
    }
    if (!licenseUrl || typeof licenseUrl !== 'string' || !/^https?:\/\//i.test(licenseUrl)) {
      errors.push('A valid URL starting with http(s):// is required');
    }
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const seller = await User.findById(req.sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Clear any previous file and save external link
    seller.licenseInfo = {
      licenseNumber,
      status: 'pending',
      rejectionReason: '',
      verifiedAt: null,
      verifiedBy: null,
      file: { url: '', path: '', filename: '', mimetype: '', size: 0 },
      externalLink: licenseUrl
    };
    await seller.save();

    res.json({ success: true, message: 'License link submitted', licenseInfo: seller.licenseInfo });
  } catch (error) {
    console.error('Error submitting license link:', error);
    res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// @route   GET /api/license/requirements
// @desc    Get license verification requirements
// @access  Public
router.get('/requirements', (req, res) => {
  res.json({
    success: true,
    requirements: {
      licenseNumber: {
        format: '2 letters followed by 6 digits (e.g., AB123456)',
        pattern: '^[A-Za-z]{2}\\d{6}$',
        required: true
      },
      file: {
        types: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSize: '5MB',
        required: true
      }
    }
  });
});

export default router;
