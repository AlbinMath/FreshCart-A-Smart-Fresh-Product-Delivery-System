import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true }, // recipient user uid
  type: { type: String, required: true, trim: true }, // e.g., 'branch-link-request', 'branch-link-request-update'
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  data: { type: Object, default: {} },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

notificationSchema.index({ uid: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;