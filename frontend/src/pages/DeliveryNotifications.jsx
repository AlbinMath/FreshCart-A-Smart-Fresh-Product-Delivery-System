import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DeliveryVerificationGuard from "../components/DeliveryVerificationGuard";
import { useNotifications } from '../contexts/NotificationContext';

const DeliveryNotifications = () => {
  const { notifications, clearAllNotificationsData, deleteNotificationById } = useNotifications();
  
  const clearNotifications = async () => {
    try {
      await clearAllNotificationsData();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };
  
  const removeNotification = async (id) => {
    try {
      await deleteNotificationById(id);
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  return (
    <DeliveryVerificationGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Delivery Notifications</h1>
            <div className="flex gap-2">
              <button
                onClick={clearNotifications}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear All
              </button>
              <button
                onClick={() => navigate('/delivery')}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Go to Delivery Panel
              </button>
              <button
                onClick={() => navigate('/delivery/profile')}
                className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800"
              >
                Profile
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className={`p-4 rounded-lg border ${
                    notification.type === 'error' ? 'bg-red-50 border-red-200' :
                    notification.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{notification.title || 'Notification'}</h3>
                      <p className="text-gray-700">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeNotification(notification._id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DeliveryVerificationGuard>
  );
};

export default DeliveryNotifications;