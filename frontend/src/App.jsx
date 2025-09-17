import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
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
import Wallet from "./pages/Wallet";

// Role-aware landing: send users to appropriate dashboards
function HomeLanding() {
  const { getUserProfile } = useAuth();
  const profile = getUserProfile();
  if (profile && ["store", "seller"].includes(profile.role)) {
    return <Navigate to="/seller" replace />;
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
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
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
                    <ProtectedRoute requiredRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminWallet />} />
                  <Route path="wallet" element={<AdminWallet />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                </Route>
                <Route 
                  path="/delivery" 
                  element={
                    <ProtectedRoute>
                      <DeliveryDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/profile" 
                  element={
                    <ProtectedRoute>
                      <DeliveryProfile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/notifications" 
                  element={
                    <ProtectedRoute>
                      <DeliveryNotifications />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery/schedule" 
                  element={
                    <ProtectedRoute>
                      <DeliverySchedule />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/seller" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/bank" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerBankDetails />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/profile" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerProfile />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/notifications" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/products" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerProducts />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/settings" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerStoreSettings />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/seller/schedule" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <SellerSchedule />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/wallet" 
                  element={
                    <ProtectedRoute>
                      <Wallet />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/BranchLinkRequest" 
                  element={
                    <ProtectedRoute allowedRoles={["store", "seller"]}>
                      <BranchLinkRequest />
                    </ProtectedRoute>
                  }
                />
                <Route path="/test" element={<Test />} />
                {/* Add a catch-all route for 404 pages */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
