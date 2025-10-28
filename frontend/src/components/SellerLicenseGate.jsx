import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
<<<<<<< HEAD
import { getLicenseStatus } from '../../../backend/services/sellerService';
=======
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
>>>>>>> 087215b (last commit)

// Gate that allows access only if seller license is approved.
// Use it inside ProtectedRoute(allowedRoles=["store","seller"]).
// Excludes the upload page itself from redirect loops.
function SellerLicenseGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const location = useLocation();
  const { getUserProfile } = useAuth();
  const userProfile = getUserProfile();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
<<<<<<< HEAD
        const info = await getLicenseStatus();
=======
        // First check if user has seller/store role
        const profile = getUserProfile();
        if (!profile || !['seller', 'store'].includes(profile.role)) {
          if (!active) return;
          setApproved(false);
          return;
        }

        // Call the API to check license status (public endpoint with query param)
        // This is a public endpoint, so we pass false for requireAuth
        const response = await apiService.get(`/license/status?userId=${profile.uid}`, {}, false);
        console.log('License status response:', response);
>>>>>>> 087215b (last commit)
        if (!active) return;
        
        // The response structure is { success: true, licenseInfo: { status: 'approved' } }
        const isApproved = response?.licenseInfo?.status === 'approved';
        console.log('License approved:', isApproved);
        setApproved(isApproved);
      } catch (error) {
        console.error('Error checking license status:', error);
        if (!active) return;
        setApproved(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking license verification...</p>
        </div>
      </div>
    );
  }

  // Allow the upload page even if not approved to avoid redirect loop
  const isUploadPage = location.pathname.startsWith('/seller/license-upload');
  if (!approved && !isUploadPage) {
    return <Navigate to="/seller/license-upload" replace />;
  }

  return children;
}

export default SellerLicenseGate;