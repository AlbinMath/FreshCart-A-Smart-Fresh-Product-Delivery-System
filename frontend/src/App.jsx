import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SellerLicenseGate from "./components/SellerLicenseGate";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleRegister from "./pages/RoleRegister";
import StoreRegister from "./pages/SellerRegister";
import DeliveryRegister from "./pages/DeliveryRegister";
import AdminRegister from "./pages/AdminRegister";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import EmailVerificationSuccess from "./pages/EmailVerificationSuccess";
import TestEmailVerification from "./pages/TestEmailVerification";
import NavigationTest from "./pages/NavigationTest";
import ImageGallery from "./pages/ImageGallery";
import AuthTest from "./pages/AuthTest";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWallet from "./pages/admin/AdminWallet";
import AdminNotifications from "./pages/AdminNotifications";
import Test from "./pages/Test";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import DeliveryProfile from "./pages/DeliveryProfile";
import DeliveryNotifications from "./pages/DeliveryNotifications";
import DeliverySchedule from "./pages/DeliverySchedule";
import ProfileSettings from "./pages/ProfileSettings";
import ChangePassword from "./pages/ChangePassword";
import SellerDashboard from "./pages/SellerDashboard";
import SellerBankDetails from "./pages/SellerBankDetails";
import SellerProfile from "./pages/SellerProfile";
import BranchLinkRequest from "./pages/BranchLinkRequest";
import SellerNotifications from "./pages/SellerNotifications";
import SellerProducts from "./pages/SellerProducts";
import SellerStoreSettings from "./pages/SellerStoreSettings";
import SellerSchedule from "./pages/SellerSchedule";
import SellerLicenseUpload from "./pages/SellerLicenseUpload";
import LicenseVerification from "./pages/admin/LicenseVerification";
import Wallet from "./pages/Wallet";
import AdminSellerLicense from "./pages/admin/AdminSellerLicense";

// Role-aware landing: send users to appropriate dashboards
function HomeLanding() {
  const { getUserProfile } = useAuth();
  const profile = getUserProfile();
  if (profile && ["store", "seller"].includes(profile.role)) {
    return <Navigate to="/seller" replace />;
  }
  if (profile && profile.role === "delivery") {
    return <Navigate to="/delivery" replace />;
  }
  if (profile && profile.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  return <Home />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const { getUserProfile } = useAuth();
  const profile = getUserProfile();
  const isAdmin = profile?.role === 'admin';
  
  return (
    <div className="min-h-screen bg-gray-50">
      {!isAdmin && <Navbar />}
      <main className={isAdmin ? "" : "container mx-auto px-4 py-8"}>
              <Routes>
                <Route path="/" element={<HomeLanding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/register/customer" element={<Register />} />
                <Route path="/register/choose" element={<RoleRegister />} />
                <Route path="/register/store" element={<StoreRegister />} />
                <Route path="/register/delivery" element={<DeliveryRegister />} />
                <Route path="/register/admin" element={<AdminRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/email-verification-success" element={<EmailVerificationSuccess />} />
                <Route path="/test-email-verification" element={<TestEmailVerification />} />
                <Route path="/test" element={<Test />} />
                <Route path="/test-auth" element={<AuthTest />} />
                <Route path="/navigation-test" element={<NavigationTest />} />
                <Route path="/images" element={<ImageGallery />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/change-password" 
                  element={
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminWallet />} />
                  <Route path="wallet" element={<AdminWallet />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="license-verification" element={<LicenseVerification />} />
                  <Route path="sellers/:sellerId/license" element={<AdminSellerLicense />} />
                  <Route path="sellers/:sellerId/verify" element={<AdminSellerLicense />} />
                </Route>
                <Route 
                  path="/delivery" 
                  element={
                    <ProtectedRoute allowedRoles={["delivery"]}>
                      <DeliveryDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/profile" 
                  element={
                    <ProtectedRoute allowedRoles={["delivery"]}>
                      <DeliveryProfile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/notifications" 
                  element={
                    <ProtectedRoute allowedRoles={["delivery"]}>
                      <DeliveryNotifications />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/schedule" 
                  element={
                    <ProtectedRoute allowedRoles={["delivery"]}>
                      <DeliverySchedule />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/seller" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerDashboard />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/bank" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerBankDetails />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/profile" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerProfile />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/notifications" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerNotifications />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/products" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerProducts />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/settings" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerStoreSettings />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/schedule" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <SellerSchedule />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/license-upload" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseUpload />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/wallet" 
                  element={
                    <ProtectedRoute allowedRoles={["customer", "store", "seller", "delivery", "admin"]}>
                      <Wallet />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/BranchLinkRequest" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerLicenseGate>
                        <BranchLinkRequest />
                      </SellerLicenseGate>
                    </ProtectedRoute>
                  }
                />
                <Route path="/test" element={<Test />} />
                {/* Add a catch-all route for 404 pages */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
      </main>
    </div>
  );
}

export default App;
