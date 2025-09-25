import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { FaBell, FaUsers, FaStore, FaUserTie, FaClock } from "react-icons/fa";

function AdminDashboard() {
  const { currentUser, getUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerification: 0,
    totalStores: 0,
    totalSellers: 0,
    pendingProducts: 0,
    walletStats: {
      totalBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingWithdrawals: 0
    }
  });
  const [activity, setActivity] = useState([]);
  const [stores, setStores] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productFilter, setProductFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Only show demo panels/notifications in development
  const showDevUI = import.meta.env.VITE_SHOW_DEMO_UI === 'true' || !import.meta.env.PROD;

  // Recent notifications state
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminProfile, setAdminProfile] = useState(null);
  const location = useLocation();
  const isChildRoute = location.pathname !== '/admin' && location.pathname.startsWith('/admin/');

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const profile = getUserProfile();
    // Only admin role users can access admin dashboard
    if (!profile || profile.role !== "admin") {
      navigate("/");
      return;
    }

    loadAdminData();
    
    // Load admin profile for display
    setAdminProfile(profile);
  }, [currentUser, navigate, getUserProfile]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
      const profile = getUserProfile() || {};
      const token = localStorage.getItem('token');
      const headers = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile.uid) headers['x-actor-uid'] = profile.uid;
      if (profile.email) headers['x-actor-email'] = profile.email.toLowerCase();
      
      // Load users
      const usersResponse = await fetch(`${API_BASE_URL}/admin/users`, { headers });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Load stats
      const statsResponse = await fetch(`${API_BASE_URL}/admin/stats`, { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // Add default wallet stats if not present
        setStats({
          ...statsData,
          walletStats: statsData.walletStats || {
            totalBalance: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            pendingWithdrawals: 0
          }
        });
      }

      // Load activity
      const actRes = await fetch(`${API_BASE_URL}/admin/activity?limit=50`, { headers });
      if (actRes.ok) {
        const logs = await actRes.json();
        setActivity(logs);
      }

      // Load stores (using the stores endpoint)
      const storesResponse = await fetch(`${API_BASE_URL}/admin/stores`, { headers });
      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        setStores(storesData);
      }

      // Load sellers explicitly so Store Management (Sellers) is always populated
      try {
        const sellersResponse = await fetch(`${API_BASE_URL}/admin/sellers`, { headers });
        if (sellersResponse.ok) {
          const sellersData = await sellersResponse.json();
          setSellers(sellersData);
        }
      } catch (e) {
        console.error('Error loading sellers:', e);
      }

      // For products, use the admin endpoint that aggregates across sellers
      try {
        const productsResponse = await fetch(`${API_BASE_URL}/admin/products`, { headers });
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          // Normalize field names to avoid UI mismatches
          const normalized = productsData.map(p => ({ ...p, approvalStatus: p.approvalStatus ?? p.status }));
          setProducts(normalized);
          setFilteredProducts(normalized);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const profile = getUserProfile() || {};
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile.uid) headers['x-actor-uid'] = profile.uid;
      if (profile.email) headers['x-actor-email'] = profile.email.toLowerCase();

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/${action}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          adminEmail: profile.email || currentUser?.email
        })
      });

      if (response.ok) {
        // Refresh data
        loadAdminData();
      } else {
        console.error(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
    }
  };

  const handleProductApproval = async (sellerId, productId, action) => {
    try {
      const rejectionReason = action === 'reject' ? prompt('Please provide a reason for rejection:') : '';
      
      if (action === 'reject' && !rejectionReason) {
        return; // User cancelled
      }

      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const profile = getUserProfile() || {};
      if (profile.uid) headers['x-actor-uid'] = profile.uid;
      if (profile.email) headers['x-actor-email'] = profile.email.toLowerCase();

      const response = await fetch(`${API_BASE_URL}/admin/products/${sellerId}/${productId}/approval`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action,
          rejectionReason
        })
      });

      if (response.ok) {
        // Refresh products data
        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
        const token = localStorage.getItem('token');
        const headers = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const prodRes = await fetch(`${API_BASE_URL}/admin/products`, { headers });
        if (prodRes.ok) {
          const productsData = await prodRes.json();
          // Normalize field names to avoid UI mismatches
          const normalized = productsData.map(p => ({ ...p, approvalStatus: p.approvalStatus ?? p.status }));
          setProducts(normalized);
          // Apply current filter to refreshed data
          applyProductFilter(productFilter, normalized);
        }
      } else {
        console.error(`Failed to ${action} product`);
      }
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
    }
  };

  // Filter function for products
  const applyProductFilter = (status, productsData = products) => {
    const filtered = status === 'all' 
      ? productsData 
      : productsData.filter(p => (p.status || 'pending') === status);
    setFilteredProducts(filtered);
    setProductFilter(status);
  };

  const handleVerifyEmail = async (userId) => {
    try {
      const profile = getUserProfile() || {};
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
      const token = localStorage.getItem('token');
      const headers = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile.uid) headers['x-actor-uid'] = profile.uid;
      if (profile.email) headers['x-actor-email'] = profile.email.toLowerCase();

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/verify-email`, {
        method: "PUT",
        headers
      });

      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error("Error verifying email:", error);
    }
  };

  const handleVerifyRole = async (userId, role, verified) => {
    try {
      const profile = getUserProfile() || {};
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
      const token = localStorage.getItem('token');
      const headers = { "Content-Type": "application/json" };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile.uid) headers['x-actor-uid'] = profile.uid;
      if (profile.email) headers['x-actor-email'] = profile.email.toLowerCase();

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/verify-role`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role, verified })
      });
      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error("Error verifying role:", error);
    }
  };

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
        const token = localStorage.getItem('token');
        const prof = getUserProfile() || {};
        const headers = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (prof.uid) headers['x-actor-uid'] = prof.uid;
        if (prof.email) headers['x-actor-email'] = prof.email.toLowerCase();
        const response = await fetch(`${API_BASE_URL}/admin/notifications?limit=5`, { headers });
        if (response.ok) {
          const data = await response.json();
          setRecentNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const profile = getUserProfile();
  if (profile && profile.role !== "admin") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - left navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Sidebar Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">FC</div>
            <div>
              <div className="text-lg font-semibold text-green-700">FreshCart</div>
              <div className="text-xs text-gray-500">Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {[
            { key: 'overview', label: 'Overview', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            )},
            { key: 'user-management', label: 'User Management', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5V4H2v16h5m10 0V10m0 10H7m10-10H7"/></svg>
            )},
            { key: 'product-approval', label: 'Product Approval' , icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )},
            { key: 'orders', label: 'Order Monitoring', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M9 7h12M9 11h12M9 15h12M9 19h12M3 7h.01M3 11h.01M3 15h.01M3 19h.01"/></svg>
            )},
            { key: 'store-managing', label: 'Store Management', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l1 1h16l1-1m-2 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7m3 10h8"/></svg>
            )},
            { key: 'analytics', label: 'Platform Analytics', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3v18M6 8v13M16 13v8M21 6v15"/></svg>
            )},
            { key: 'activity', label: 'Activity Log', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )},
            { key: 'delivery-analytics', label: 'Delivery Analytics', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h2l2 3h6l2-4 3 5h3"/></svg>
            )},
            { key: 'platform-settings', label: 'Platform Settings', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8 4a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>
            )},
            { key: 'reports', label: 'Reports', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6h13M9 7h12M9 11h12M9 15h12M3 7h.01M3 11h.01M3 15h.01M3 19h.01"/></svg>
            )},
            { key: 'wallet', label: 'My Wallet', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )}
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.key 
                  ? 'bg-green-100 text-green-700 border-r-2 border-green-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-gray-500">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4">
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'user-management' && 'User Management'}
                  {activeTab === 'product-approval' && 'Product Approval'}
                  {activeTab === 'orders' && 'Order Monitoring'}
                  {activeTab === 'store-managing' && 'Store Management'}
                  {activeTab === 'analytics' && 'Platform Analytics'}
                  {activeTab === 'activity' && 'Activity Log'}
                  {activeTab === 'delivery-analytics' && 'Delivery Analytics'}
                  {activeTab === 'platform-settings' && 'Platform Settings'}
                  {activeTab === 'reports' && 'Reports'}
                  {activeTab === 'wallet' && 'My Wallet'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'overview' && 'Welcome back, Admin. Here\'s what\'s happening with your platform.'}
                  {activeTab === 'user-management' && 'Manage user accounts, roles, and permissions.'}
                  {activeTab === 'product-approval' && 'Review and approve product listings.'}
                  {activeTab === 'orders' && 'Monitor and manage platform orders.'}
                  {activeTab === 'store-managing' && 'Manage seller stores and their settings.'}
                  {activeTab === 'analytics' && 'View platform performance and user analytics.'}
                  {activeTab === 'activity' && 'Monitor system activity and user actions.'}
                  {activeTab === 'delivery-analytics' && 'Track delivery performance and metrics.'}
                  {activeTab === 'platform-settings' && 'Configure platform settings and preferences.'}
                  {activeTab === 'reports' && 'Generate and view platform reports.'}
                  {activeTab === 'wallet' && 'Manage your admin wallet and transactions.'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
                  title="Notifications"
                >
                  <FaBell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
                    A
                  </div>
                  <span className="text-sm font-medium text-gray-700">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div role="main" className="flex-1 overflow-y-auto">
          {isChildRoute ? (
            <div className="max-w-7xl mx-auto px-6 py-6">
              <Outlet />
            </div>
          ) : (
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Wallet Balance */}
              <Link to="/admin/wallet" className="block">
                <div className="bg-white rounded-lg shadow-lg p-6 border border-green-100 hover:shadow-xl hover:-translate-y-1 hover:ring-1 hover:ring-green-200 transition-all duration-200 h-full">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Wallet Balance</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">₹{stats.walletStats.totalBalance.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.walletStats.pendingWithdrawals > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          {stats.walletStats.pendingWithdrawals} pending withdrawals
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Total Users */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Verified Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.verifiedUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Verification</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pendingVerification}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Stores</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalStores}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sellers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSellers}</p>
              </div>
            </div>
          </div>
            </div>
            </div>
          
                    )}

            {/* Tab Content */}
            {/* Overview Tab */}
            {(activeTab === "overview" || activeTab === "analytics") && (
              <div className="space-y-6">
                {/* Admin Profile Display */}
                {adminProfile && (
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Admin Profile</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Read Only
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                        <p className="text-gray-900">{adminProfile.name || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                        <p className="text-gray-900">{currentUser?.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                        <p className="text-gray-900 capitalize">{adminProfile.role || 'Admin'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Admin Level</label>
                        <p className="text-gray-900 capitalize">{adminProfile.adminLevel || 'Super Admin'}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Admin profiles are read-only and cannot be edited for security reasons.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                        <span>New user registration: </span>
                        <span className="ml-auto text-xs"> ago</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                        <span>Store verification completed: </span>
                        <span className="ml-auto text-xs"> ago</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                        <span>Email verification pending: </span>
                        <span className="ml-auto text-xs"> ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium">
                        Verify Pending Users
                      </button>
                      <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium">
                        Generate System Report
                      </button>
                      <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium">
                        Manage System Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dev UI Content */}
            {showDevUI && (
              <div className="mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Pending Product Approvals */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Pending Product Approvals</h3>
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full"></span>
                </div>
              </div>

              {/* Right: Recent System Alerts */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recent System Alerts</h3>
                <div className="space-y-3">
                  {[
                    
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className={`w-5 h-5 ${a.color}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      <div>
                        <div className="font-medium text-gray-900">{a.title}</div>
                        <div className="text-xs text-gray-500">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
          

          
          
        

        {/* Notifications Modal */}
        {showNotifications && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="absolute inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowNotifications(false)}
              aria-hidden="true"
            ></div>
            <div className="fixed inset-y-0 right-0 max-w-full flex">
              <div className="relative w-96 max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    <div className="ml-3 flex items-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <span className="sr-only">Close panel</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {recentNotifications.length > 0 ? (
                      <div className="space-y-4">
                        {recentNotifications.map((notification, index) => (
                          <div 
                            key={index}
                            className={`p-4 rounded-lg ${
                              notification.read ? 'bg-white' : 'bg-blue-50'
                            } border border-gray-200`}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 pt-0.5">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FaBell className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title || 'System Notification'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                  {notification.message}
                                </p>
                                {notification.link && (
                                  <a
                                    href={notification.link}
                                    className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                                    onClick={() => setShowNotifications(false)}
                                  >
                                    View details
                                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FaBell className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                        <p className="mt-1 text-sm text-gray-500">We'll notify you when something arrives.</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 p-4">
                    <button
                      type="button"
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => setShowNotifications(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirm Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogoutConfirm(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
              <p className="text-sm text-gray-600 mt-1">Are you sure you want to log out?</p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">Cancel</button>
                <button onClick={async () => { await logout(); navigate('/login'); }} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700">Logout</button>
              </div>
            </div>
          </div>
        )}


            {/* Users Tab */}
            {(activeTab === "users" || activeTab === "user-management") && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Export Users
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 relative">
                                {user.profilePicture ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={user.profilePicture}
                                    alt={user.name || 'User'}
                                  />
                                ) : (
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                                    user.role === 'admin' ? 'bg-red-500' :
                                    user.role === 'seller' ? 'bg-indigo-500' :
                                    user.role === 'store' ? 'bg-purple-500' : 'bg-green-500'
                                  }`}>
                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role === 'store' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'seller' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.emailVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {/* Customers: no admin verification needed; others: allow verify role */}
                              {user.role !== 'customer' && !user.emailVerified && (
                                <button
                                  onClick={() => handleVerifyEmail(user._id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Verify Email
                                </button>
                              )}
                              {/* Hide role verification for admin users */}
                              {user.role !== 'customer' && user.role !== 'admin' && !user.roleVerified && (
                                <button
                                  onClick={() => handleVerifyRole(user._id, user.role, true)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Verify {user.role}
                                </button>
                              )}
                              <button
                                onClick={() => handleUserAction(user._id, user.isActive ? 'deactivate' : 'activate')}
                                className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stores Tab - Now showing sellers */}
            {(activeTab === "stores" || activeTab === "store-managing") && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Store Management (Sellers)</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Export Sellers
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business License</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sellers.map((seller) => (
                        <tr key={seller._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {seller.profilePicture ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={seller.profilePicture}
                                    alt={seller.name || 'Seller'}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                                    {seller.name ? seller.name.charAt(0).toUpperCase() : 'S'}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{seller.name}</div>
                                <div className="text-sm text-gray-500">{seller.email}</div>
                                {seller.sellerUniqueNumber && (
                                  <div className="text-xs text-gray-400">ID: {seller.sellerUniqueNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{seller.businessLicense || '-'}</div>
                            {seller.businessLicense && (
                              <div className="text-xs text-gray-500">
                                {/^[a-zA-Z]{2}\d{6}$/.test(seller.businessLicense) ? 
                                  <span className="text-green-600">✓ Valid Format</span> : 
                                  <span className="text-red-600">✗ Invalid Format</span>
                                }
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {seller.sellerCategory || 'Not Set'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {seller.isActive && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {seller.emailVerified ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {/* Verification status badge */}
                              {(() => {
                                const v = seller.verificationStatus || seller.licenseInfo?.status || 'pending';
                                if (v === 'approved') return (<span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>);
                                if (v === 'rejected') return (<span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Rejected</span>);
                                // pending
                                const hasLicense = Boolean(seller.licenseInfo?.file?.url || seller.licenseInfo?.externalLink);
                                return (<span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">{hasLicense ? 'Verification Pending' : 'Not Updated'}</span>);
                              })()}
                              <button
                                onClick={() => navigate(`/admin/sellers/${seller._id}/verify`)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                Verify Seller
                              </button>
                              {!seller.emailVerified && (
                                <button
                                  onClick={() => handleVerifyEmail(seller._id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Verify Email
                                </button>
                              )}
                              <button
                                onClick={() => handleUserAction(seller._id, seller.isActive ? 'deactivate' : 'activate')}
                                className={`${seller.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              >
                                {seller.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {sellers.length === 0 && (
                        <tr>
                          <td className="px-6 py-12 text-center text-gray-500" colSpan={6}>
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-lg font-medium">No sellers found</p>
                              <p className="text-sm">Sellers will appear here when users register as sellers</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Activity Log</h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  {/* Role filter */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Filter by role:</span>
                    {['all','admin','store','seller','customer','delivery'].map(r => (
                      <button
                        key={r}
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const q = r === 'all' ? '' : `&role=${r}`;
                            const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
                            const token = localStorage.getItem('token');
                            const headers = { Accept: 'application/json' };
                            if (token) headers['Authorization'] = `Bearer ${token}`;
                            const res = await fetch(`${API_BASE_URL}/admin/activity?limit=50${q}` , { headers });
                            if (res.ok) {
                              const logs = await res.json();
                              setActivity(logs);
                            }
                          } catch (error) {
                            console.error('Error fetching activity logs:', error);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          r === 'all' 
                            ? 'bg-green-100 text-green-700 border-green-300' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-xs font-medium uppercase text-gray-500">
                            <th className="px-6 py-3">Timestamp</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Details</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {activity.map((log) => (
                            <tr key={log._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.action.includes('registration') ? 'bg-green-100 text-green-800' :
                                  log.action.includes('verify') ? 'bg-blue-100 text-blue-800' :
                                  log.action.includes('activate') ? 'bg-green-100 text-green-800' :
                                  log.action.includes('deactivate') ? 'bg-red-100 text-red-800' :
                                  log.action.includes('delete') ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.actorEmail || log.actorUid}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.actorRole === 'admin' ? 'bg-red-100 text-red-800' :
                                  log.actorRole === 'seller' ? 'bg-purple-100 text-purple-800' :
                                  log.actorRole === 'store' ? 'bg-indigo-100 text-indigo-800' :
                                  log.actorRole === 'delivery' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {log.actorRole}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {log.details && typeof log.details === 'object' ? (
                                  <div className="max-w-xs truncate">
                                    {Object.entries(log.details).slice(0, 2).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="font-medium">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  log.targetUserId ? `Target: ${log.targetUserId}` : '-'
                                )}
                              </td>
                            </tr>
                          ))}
                          {activity.length === 0 && (
                            <tr>
                              <td className="px-6 py-12 text-center text-gray-500" colSpan={5}>
                                <div className="flex flex-col items-center">
                                  <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-lg font-medium">No activity logs found</p>
                                  <p className="text-sm">Activity will appear here as users interact with the system</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sellers Tab */}
            {activeTab === "sellers" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Seller Management</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Export Sellers
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business License</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sellers.map((seller) => (
                        <tr key={seller._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {seller.profilePicture ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={seller.profilePicture}
                                    alt={seller.name || 'Seller'}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                                    {seller.name ? seller.name.charAt(0).toUpperCase() : 'S'}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{seller.name}</div>
                                <div className="text-sm text-gray-500">{seller.email}</div>
                                {seller.sellerUniqueNumber && (
                                  <div className="text-xs text-gray-400">ID: {seller.sellerUniqueNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{seller.businessLicense || '-'}</div>
                            {seller.businessLicense && (
                              <div className="text-xs text-gray-500">
                                {/^[a-zA-Z]{2}\d{6}$/.test(seller.businessLicense) ? 
                                  <span className="text-green-600">✓ Valid Format</span> : 
                                  <span className="text-red-600">✗ Invalid Format</span>
                                }
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {seller.sellerCategory || 'Not Set'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {seller.isActive && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {seller.emailVerified ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {!seller.emailVerified && (
                                <button
                                  onClick={() => handleVerifyEmail(seller._id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Verify Email
                                </button>
                              )}
                              {seller.accountStatus !== 'active' && (
                                <button
                                  onClick={() => handleVerifyRole(seller._id, seller.role, true)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Verify Seller
                                </button>
                              )}
                              <button
                                onClick={() => handleUserAction(seller._id, seller.isActive ? 'deactivate' : 'activate')}
                                className={`${seller.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              >
                                {seller.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {sellers.length === 0 && (
                        <tr>
                          <td className="px-6 py-12 text-center text-gray-500" colSpan={6}>
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-lg font-medium">No sellers found</p>
                              <p className="text-sm">Sellers will appear here when users register as sellers</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Product Verification</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Export Products
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded object-cover"
                                  src={product.images?.[0] || "https://via.placeholder.com/40"}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.sellerInfo?.name}</div>
                            <div className="text-sm text-gray-500">{product.sellerInfo?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">₹{product.price}</div>
                            {product.mrpPrice && (
                              <div className="text-xs text-gray-500 line-through">₹{product.mrpPrice}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.stock > product.lowStockThreshold ? 'bg-green-100 text-green-800' : 
                              product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock} units
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (product.status || product.approvalStatus) === 'approved' ? 'bg-green-100 text-green-800' : 
                              (product.status || product.approvalStatus) === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.status || product.approvalStatus || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {(product.status || product.approvalStatus) !== 'approved' && (
                                <button 
                                  onClick={() => handleProductApproval(product.sellerInfo.sellerUniqueNumber || product.sellerInfo.uid, product._id, 'approve')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                              )}
                              {(product.status || product.approvalStatus) !== 'rejected' && (
                                <button 
                                  onClick={() => handleProductApproval(product.sellerInfo.sellerUniqueNumber || product.sellerInfo.uid, product._id, 'reject')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              )}
                              <button className="text-blue-600 hover:text-blue-900">
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td className="px-6 py-12 text-center text-gray-500" colSpan={8}>
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="text-lg font-medium">No products found</p>
                              <p className="text-sm">Products will appear here when sellers add them</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Approval Tab */}
            {activeTab === "product-approval" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Product Approval Management</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Total Products: {products.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Pending: {products.filter(p => (p.status || p.approvalStatus || 'pending') === 'pending').length}
                    </div>
                    <button 
                      onClick={loadAdminData}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                      <button
                        key={status}
                        onClick={() => applyProductFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          productFilter === status
                            ? status === 'all' 
                              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                              : status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : status === 'approved'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)} 
                        {status !== 'all' && (
                          <span className="ml-1 text-xs">
                            ({products.filter(p => ((p.status || p.approvalStatus || 'pending') === status)).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    className="h-12 w-12 rounded-lg object-cover"
                                    src={product.images[0]}
                                    alt={product.name}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400"
                                  style={{display: product.images && product.images.length > 0 ? 'none' : 'flex'}}
                                >
                                  📦
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 max-w-xs truncate">{product.name}</div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.sellerInfo?.name}</div>
                            <div className="text-sm text-gray-500">{product.sellerInfo?.email}</div>
                            {product.sellerInfo?.sellerUniqueNumber && (
                              <div className="text-xs text-gray-400">ID: {product.sellerInfo.sellerUniqueNumber}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">₹{product.price}</div>
                            {product.mrpPrice && product.mrpPrice > product.price && (
                              <div className="text-xs text-gray-500 line-through">₹{product.mrpPrice}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.stock > (product.lowStockThreshold || 10) ? 'bg-green-100 text-green-800' : 
                              product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock} units
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (product.status || product.approvalStatus) === 'approved' ? 'bg-green-100 text-green-800' : 
                              (product.status || product.approvalStatus) === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.status || product.approvalStatus || 'pending'}
                            </span>
                            {(product.status || product.approvalStatus) === 'rejected' && product.rejectionReason && (
                              <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={product.rejectionReason}>
                                Reason: {product.rejectionReason}
                              </div>
                            )}
                            {product.approvedBy && (
                              <div className="text-xs text-gray-500 mt-1">
                                By: {product.approvedBy}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col space-y-1">
                              {(product.status || product.approvalStatus) !== 'approved' && (
                                <button 
                                  onClick={() => handleProductApproval(
                                    product.sellerInfo.sellerUniqueNumber || product.sellerInfo.uid, 
                                    product._id, 
                                    'approve'
                                  )}
                                  className="text-green-600 hover:text-green-900 text-xs font-medium"
                                >
                                  ✓ Approve
                                </button>
                              )}
                              {(product.status || product.approvalStatus) !== 'rejected' && (
                                <button 
                                  onClick={() => handleProductApproval(
                                    product.sellerInfo.sellerUniqueNumber || product.sellerInfo.uid, 
                                    product._id, 
                                    'reject'
                                  )}
                                  className="text-red-600 hover:text-red-900 text-xs font-medium"
                                >
                                  ✗ Reject
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  // Show product details modal (can be implemented later)
                                  alert(`Product Details:\n\nName: ${product.name}\nDescription: ${product.description}\nPrice: ₹${product.price}\nStock: ${product.stock}\nCategory: ${product.category}\nSeller: ${product.sellerInfo?.name}\nStatus: ${(product.status || product.approvalStatus || 'pending')}`);
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                              >
                                👁 View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td className="px-6 py-12 text-center text-gray-500" colSpan={8}>
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="text-lg font-medium">No products found</p>
                              <p className="text-sm">Products will appear here when sellers add them</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">Pending Approval</p>
                        <p className="text-2xl font-semibold text-yellow-900">
                          {products.filter(p => ((p.status || p.approvalStatus || 'pending') === 'pending')).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">Approved</p>
                        <p className="text-2xl font-semibold text-green-900">
                          {products.filter(p => ((p.status || p.approvalStatus || 'pending') === 'approved')).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">Rejected</p>
                        <p className="text-2xl font-semibold text-red-900">
                          {products.filter(p => ((p.status || p.approvalStatus || 'pending') === 'rejected')).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-800">Total Products</p>
                        <p className="text-2xl font-semibold text-blue-900">{products.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Analytics Tab */}
            {activeTab === "delivery-analytics" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Delivery Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-sm text-gray-500">On-time Delivery Rate</div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">000%</div>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-sm text-gray-500">Avg. Delivery Time</div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">00m</div>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="text-sm text-gray-500">Active Delivery Partners</div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">000</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600">Graphs and detailed analytics can be added here.</p>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {(activeTab === "settings" || activeTab === "platform-settings") && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">System Settings</h3>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600">System settings features coming soon...</p>
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg border p-6">
                    <h4 className="font-semibold mb-3">User Reports</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <button className="w-full text-left px-3 py-2 rounded border hover:bg-gray-50" onClick={async () => {
                        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
                        const token = localStorage.getItem('token');
                        const headers = { Accept: 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        const res = await fetch(`${API_BASE_URL}/admin/users`, { headers });
                        if (!res.ok) return;
                        const data = await res.json();
                        const csv = ['Name,Email,Role,Active,Email Verified,Created At']
                          .concat(data.map(u => `${u.name},${u.email},${u.role},${u.isActive},${u.emailVerified},${new Date(u.createdAt).toISOString()}`))
                          .join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'user_report.csv'; a.click(); URL.revokeObjectURL(url);
                      }}>Download Users CSV</button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <h4 className="font-semibold mb-3">Admin Activity Reports</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <button className="w-full text-left px-3 py-2 rounded border hover:bg-gray-50" onClick={async () => {
                        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
                        const token = localStorage.getItem('token');
                        const headers = { Accept: 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        const res = await fetch(`${API_BASE_URL}/admin/activity?limit=200`, { headers });
                        if (!res.ok) return;
                        const data = await res.json();
                        const csv = ['When,Action,Actor Role,Actor Email,Target User']
                          .concat(data.map(l => `${new Date(l.createdAt).toISOString()},${l.action},${l.actorRole},${l.actorEmail || l.actorUid},${l.targetUserId || ''}`))
                          .join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'admin_activity.csv'; a.click(); URL.revokeObjectURL(url);
                      }}>Download Activity CSV</button>
                    </div>
                  </div>
                </div>
              </div>
              
            )}
          </div>
          
          
        
        

       </div>
     </div>
   
 );
}

// StatCard component for dashboard statistics
function StatCard({ title, value, icon, trend, trendValue, link }) {
  const content = (
    <div className="p-5 bg-white rounded-lg shadow">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="p-3 bg-opacity-20 rounded-md bg-blue-100">
            {icon}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend && (
                <span className={`ml-2 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trend === 'up' ? '↑' : '↓'} {trendValue}
                </span>
              )}
            </dd>
          </dl>
        </div>
      </div>
      {link && (
        <div className="mt-4">
          <Link to={link} className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View all
          </Link>
        </div>
      )}
    </div>
  );}



export default AdminDashboard; 
