import express from 'express';
import User from '../models/User.js';
import { getSellerProductModel, PRODUCT_CATEGORIES } from '../models/Product.js';

const router = express.Router();

// Middleware: require authenticated seller by uid in header or body
// This is a lightweight check; replace with proper JWT auth if available
async function requireSeller(req, res, next) {
  try {
    const uid = req.headers['x-uid'] || req.body.uid || req.query.uid;
    if (!uid) return res.status(401).json({ success: false, message: 'UID required' });

    const user = await User.findOne({ uid });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Only sellers can access this endpoint' });
    }
    if (!user.sellerCategory) {
      return res.status(400).json({ success: false, message: 'Seller category not set' });
    }
    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Seller account not active' });
    }
    
    // Check email verification for email providers (not Google users)
    if (user.provider === 'email' && !user.emailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Email verification required. Please verify your email before managing products.',
        requiresEmailVerification: true
      });
    }

    req.seller = user; // attach
    next();
  } catch (err) {
    console.error('Seller auth error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Create product (restricted to seller's category) in a seller-specific collection
router.post('/products', requireSeller, async (req, res) => {
  try {
    const { name, description, price, mrpPrice, stock = 0, images = [], category, lowStockThreshold = 10 } = req.body;

    // Validate category matches seller's category
    if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
    if (!PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    if (category !== req.seller.sellerCategory) {
      return res.status(403).json({ success: false, message: 'You can only add products in your seller category' });
    }

    // Basic field validations
    if (!name || typeof price !== 'number') {
      return res.status(400).json({ success: false, message: 'Name and numeric price are required' });
    }
    // Additional constraints
    if (typeof stock === 'number' && stock < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot be negative' });
    }
    if (typeof mrpPrice === 'number' && mrpPrice < price) {
      return res.status(400).json({ success: false, message: 'MRP must be greater than or equal to Selling Price' });
    }

    const SellerProduct = getSellerProductModel(req.seller.sellerUniqueNumber || req.seller.uid);

    const created = await SellerProduct.create({
      name,
      description,
      category,
      price,
      mrpPrice,
      stock,
      lowStockThreshold,
      images,
      sellerRef: { uid: req.seller.uid, sellerUniqueNumber: req.seller.sellerUniqueNumber || '' }
    });

    res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// List products for current seller (from their collection only)
router.get('/products', requireSeller, async (req, res) => {
  try {
    const SellerProduct = getSellerProductModel(req.seller.sellerUniqueNumber || req.seller.uid);
    const items = await SellerProduct.find({}).sort({ createdAt: -1 });
    res.json({ success: true, products: items });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update product (still enforce category lock)
router.put('/products/:id', requireSeller, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, mrpPrice, stock, images, category, lowStockThreshold } = req.body;

    if (category && category !== req.seller.sellerCategory) {
      return res.status(403).json({ success: false, message: 'Cannot change product to a different category than your seller category' });
    }

    const SellerProduct = getSellerProductModel(req.seller.sellerUniqueNumber || req.seller.uid);
    const prod = await SellerProduct.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    // Block modifications to rejected products by sellers
    if (prod.approvalStatus === 'rejected') {
      return res.status(403).json({ success: false, message: 'Rejected products cannot be modified. Please create a new product or contact admin.' });
    }

    // Apply updates with constraints
    if (name !== undefined) prod.name = name;
    if (description !== undefined) prod.description = description;
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ success: false, message: 'Selling Price must be a non-negative number' });
      }
      // If MRP already present, ensure MRP >= price
      if (typeof prod.mrpPrice === 'number' && prod.mrpPrice < price) {
        return res.status(400).json({ success: false, message: 'MRP must be greater than or equal to Selling Price' });
      }
      prod.price = price;
    }
    if (mrpPrice !== undefined) {
      if (mrpPrice !== undefined && mrpPrice !== null) {
        if (typeof mrpPrice !== 'number' || mrpPrice < 0) {
          return res.status(400).json({ success: false, message: 'MRP must be a non-negative number' });
        }
        if (typeof prod.price === 'number' && mrpPrice < prod.price) {
          return res.status(400).json({ success: false, message: 'MRP must be greater than or equal to Selling Price' });
        }
      }
      prod.mrpPrice = mrpPrice;
    }
    if (stock !== undefined) {
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ success: false, message: 'Stock cannot be negative' });
      }
      prod.stock = stock;
    }
    if (lowStockThreshold !== undefined) {
      if (typeof lowStockThreshold !== 'number' || lowStockThreshold < 0) {
        return res.status(400).json({ success: false, message: 'Low Stock Threshold cannot be negative' });
      }
      prod.lowStockThreshold = lowStockThreshold;
    }
    if (images !== undefined) prod.images = images;
    if (category !== undefined) prod.category = category; // validated above

    await prod.save();
    res.json({ success: true, product: prod });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete product
router.delete('/products/:id', requireSeller, async (req, res) => {
  try {
    const { id } = req.params;
    const SellerProduct = getSellerProductModel(req.seller.sellerUniqueNumber || req.seller.uid);
    const deleted = await SellerProduct.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all approved products for customers (public endpoint)
router.get('/public/products', async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller', isActive: true }).select('uid sellerUniqueNumber name email');
    
    let allProducts = [];
    
    for (const seller of sellers) {
      try {
        const ProductModel = getSellerProductModel(seller.sellerUniqueNumber || seller.uid);
        // Only fetch admin-approved products
        const products = await ProductModel.find({ approvalStatus: 'approved' }).lean();
        
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
    
    res.json({ success: true, products: allProducts });

  } catch (error) {
    console.error('Public products fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;