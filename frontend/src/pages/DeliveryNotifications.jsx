<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DeliveryVerificationGuard from "../components/DeliveryVerificationGuard";

// Mock: replace with backend or Firebase RTDB/Firestore later
export default function DeliveryNotifications() {
  const { currentUser, getUserProfile } = useAuth();
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const p = getUserProfile();
    if (p?.role !== 'delivery') return;

    // Simulate polling new notifications (replace with WebSocket/Firestore onSnapshot)
    const seed = [
    ];
    setItems(seed);
    return () => clearInterval(timer);
  }, [currentUser]);

  return (
    <DeliveryVerificationGuard>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Delivery Notifications</h1>
          <div className="flex gap-2">
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
        <div className="bg-white rounded-lg shadow divide-y">
          {items.length === 0 && <div className="p-4 text-sm text-gray-500">No notifications</div>}
          {items.map(n => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${n.type==='assignment' ? 'bg-blue-600' : n.type==='payout' ? 'bg-green-600' : 'bg-gray-400'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-gray-600">{n.body}</div>
              </div>
              <div className="text-xs text-gray-500">{new Date(n.ts).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
      </div>
      
    </DeliveryVerificationGuard>
  );
}
=======
import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const DeliveryNotifications = () => {
  const { notifications, removeNotification, clearNotifications } = useNotifications();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Delivery Notifications</h1>
        <button 
          onClick={clearNotifications}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications</p>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
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
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => removeNotification(notification.id)}
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
  );
};

export default DeliveryNotifications;
>>>>>>> 087215b (last commit)
