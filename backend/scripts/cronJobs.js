// Daily stock reset job
// - Resets all products' stock to 0 for every seller collection
// - Runs at a configured time (default: 00:00 server time)
// - Skips if DB not connected

import cron from 'node-cron';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getSellerProductModel } from '../models/Product.js';

// time format: "0 0 * * *" -> at 00:00 every day
// allow override via env CRON_RESET_STOCK (e.g., "0 3 * * *" for 03:00)
const CRON_SCHEDULE = process.env.CRON_RESET_STOCK || '0 0 * * *';

export function initCronJobs() {
  try {
    console.log(`[CRON] Scheduling daily stock reset with expression: ${CRON_SCHEDULE}`);
    cron.schedule(CRON_SCHEDULE, async () => {
      if (mongoose.connection.readyState !== 1) {
        console.warn('[CRON] MongoDB not connected. Skipping stock reset.');
        return;
      }
      const start = Date.now();
      try {
        const sellers = await User.find({ role: 'seller', isActive: true }).select('uid sellerUniqueNumber');
        let updatedCollections = 0;
        for (const seller of sellers) {
          try {
            const ProductModel = getSellerProductModel(seller.sellerUniqueNumber || seller.uid);
            const res = await ProductModel.updateMany({}, { $set: { stock: 0 } });
            updatedCollections += 1;
            console.log(`[CRON] Reset stock for seller=${seller.uid} matched=${res.matchedCount} modified=${res.modifiedCount}`);
          } catch (e) {
            console.error(`[CRON] Error resetting stock for seller=${seller.uid}:`, e.message);
          }
        }
        console.log(`[CRON] Daily stock reset completed in ${Date.now() - start}ms across ${updatedCollections} seller collections`);
      } catch (e) {
        console.error('[CRON] Daily stock reset failed:', e);
      }
    });
  } catch (e) {
    console.error('[CRON] Failed to schedule jobs:', e);
  }
}