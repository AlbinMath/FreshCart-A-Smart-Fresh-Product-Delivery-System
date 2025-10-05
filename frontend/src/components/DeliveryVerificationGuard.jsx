import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DeliveryVerificationGuard({ children }) {
  const { currentUser, getUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (!currentUser || profile?.role !== 'delivery') {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [currentUser, getUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For now, always allow access - verification check is optional
  return children;
}