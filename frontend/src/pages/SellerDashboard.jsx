import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EmailVerification from "../components/EmailVerification";

// Minimal Store/Seller dashboard inspired by provided design
export default function SellerDashboard() {
  const { currentUser, getUserProfile, logout, deleteAccount, listBranchLinkRequests, listNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [products, setProducts] = useState([]);
  
  // Store hours management state
  const [storeHours, setStoreHours] = useState([]);
  const [hoursForm, setHoursForm] = useState({
    day: "",
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: false,
    note: ""
  });
  const [hoursMsg, setHoursMsg] = useState("");
  
  
  // Generate next 7 days starting from today
  const next7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: i === 0
      });
    }
    return days;
  }, []);

  // Store hours form handlers
  const onHoursChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHoursForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addStoreHours = async (e) => {
    e.preventDefault();
    setHoursMsg("");
    
    if (!hoursForm.day) {
      setHoursMsg('Please select a day');
      return;
    }
    
    if (!hoursForm.isClosed && (!hoursForm.openTime || !hoursForm.closeTime)) {
      setHoursMsg('Please set opening and closing times');
      return;
    }
    
    if (!hoursForm.isClosed && hoursForm.openTime >= hoursForm.closeTime) {
      setHoursMsg('Closing time must be after opening time');
      return;
    }

    try {
      const body = {
        day: hoursForm.day,
        openTime: hoursForm.isClosed ? null : hoursForm.openTime,
        closeTime: hoursForm.isClosed ? null : hoursForm.closeTime,
        isClosed: hoursForm.isClosed,
        note: hoursForm.note
      };

      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/store-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save store hours');

      setStoreHours(data.storeHours || []);
      setHoursMsg('Store hours saved successfully');
      setHoursForm({
        day: "",
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
        note: ""
      });
    } catch (error) {
      setHoursMsg(error.message || 'Failed to save store hours');
    }
  };

  const removeStoreHours = async (day) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/store-hours/${encodeURIComponent(day)}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to remove store hours');

      setStoreHours(data.storeHours || []);
      setHoursMsg('Store hours removed successfully');
    } catch (error) {
      setHoursMsg(error.message || 'Failed to remove store hours');
    }
  };

  const getHoursForDay = (day) => {
    return storeHours.find(h => h.day === day);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    const profile = getUserProfile();
    if (!profile || !["store", "seller"].includes(profile.role)) {
      navigate("/");
      return;
    }

    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['overview', 'catalog', 'orders', 'inventory', 'reports', 'hours'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    // Check email verification for sellers
    if (profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified) {
      // Allow access but show verification warning - handled by EmailVerification component
      console.log("Seller needs email verification");
    }

    // Load pending branch link requests count and products
    (async () => {
      try {
        const reqs = await listBranchLinkRequests();
        setPendingCount(Array.isArray(reqs) ? reqs.length : 0);
      } catch {
        setPendingCount(0);
      }
      // Load unread notifications count
      try {
        const notes = await listNotifications();
        const unread = (notes || []).filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch {}
      // Load products
      try {
        const res = await fetch('http://localhost:5000/api/products', {
          headers: { 'x-uid': currentUser.uid }
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch {}
      // Load store hours
      loadStoreHours();
    })();
  }, [currentUser, navigate, location.search]);

  // Load store hours from database
  async function loadStoreHours() {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/store-hours`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStoreHours(data.storeHours || []);
      }
    } catch (error) {
      console.error("Error loading store hours:", error);
    }
  }

  const profile = useMemo(() => getUserProfile() || {}, [getUserProfile]);

  // Calculate stats from products
  const stats = useMemo(() => {
    const lowStockProducts = products.filter(p => p.stock <= (p.lowStockThreshold || 10));
    const outOfStockProducts = products.filter(p => p.stock === 0);
    
    return {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      ordersToday: 0,
      dailyRevenue: 0,
      activeStaff: 0,
    };
  }, [products]);

  function getStockStatus(stock, threshold = 10) {
    if (stock === 0) return { status: 'out', color: 'red', text: 'Out of Stock' };
    if (stock <= threshold) return { status: 'low', color: 'yellow', text: 'Low Stock' };
    return { status: 'good', color: 'green', text: 'In Stock' };
  }

  const activeOrders = [
  
  ];

  const lowStock = [
    
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-16 md:top-20 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-20">
        <div className="px-4 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">FC</div>
            <div>
              <div className="text-lg font-semibold text-green-700">Fresh Cart</div>
              <div className="text-xs text-gray-500">Welcome back, <span className="font-medium">{profile.storeName || profile.displayName || 'Store'}</span></div>
            </div>
            <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Store</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {[
            { key: "overview", label: "Store Overview", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            )},
            { key: "catalog", label: "Product Catalog", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
            )},
            { key: "orders", label: "Order Processing", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M9 7h12M9 11h12M9 15h12M9 19h12M3 7h.01M3 11h.01M3 15h.01M3 19h.01"/></svg>
            )},
            { key: "inventory", label: "Inventory Management", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"/></svg>
            )},
            { key: "reports", label: "Reports", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6m4 6V7m4 10V9M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            )},
            { key: "hours", label: "Store Hours", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )},
            { key: "settings", label: "Store Settings", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37-.46.756-.12 1.742.734 2.164 1.64.82 1.64 3.124 0 3.943a1.724 1.724 0 00-.734 2.165c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.46-.756.12-1.742-.734-2.164-.94-1.543.827-3.31 2.37-2.37.94.573 2.147.02 2.573-1.065z"/></svg>
            )},
            
          ].map(item => (
            <button
              key={item.key}
              onClick={() => item.key === 'settings' ? navigate('/seller/settings') : setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === item.key ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="text-gray-500">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t p-3 space-y-2">
          <button onClick={() => navigate('/seller/bank')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4m4-4c2.21 0 4 1.79 4 4m-4-4v8"/></svg>
            <span>Payouts & Bank</span>
          </button>
          <button onClick={() => navigate('/seller/profile')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Seller Profile</span>
          </button>
          <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4m4-4c2.21 0 4 1.79 4 4m-4-4v8"/></svg>
            <span>Profile & Settings</span>
          </button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1"/></svg>
            <span>Logout</span>
          </button>
          {/* Danger zone for seller/store (not admin) */}
          <button
            onClick={async () => {
              const profile = getUserProfile();
              if (profile?.role === 'admin') return;
              if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
              try {
                await deleteAccount();
                navigate('/');
              } catch (e) {
                alert(e.message || 'Failed to delete account');
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            <span>Delete Account</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <div className="ml-64">
        {/* Email Verification Banner for Sellers */}
        {profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified && (
          <div className="bg-red-50 border-b border-red-200">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <EmailVerification />
            </div>
          </div>
        )}
        
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'settings' ? 'Store Settings' : 
                 activeTab === 'catalog' ? 'Product Catalog' : 
                 activeTab === 'hours' ? 'Store Hours Management' :
                 'Store Overview'}
              </h1>
              <p className="text-sm text-gray-600">{profile.storeName || 'Your Store'} • Category: {profile.sellerCategory || 'not set'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/seller/notifications')} className="relative px-4 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </button>
              {pendingCount > 0 && (
                <button onClick={() => navigate('/BranchLinkRequest')} className="relative px-4 py-2 rounded-lg text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  Requests
                  <span className="absolute -top-2 -right-2 text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.5">{pendingCount}</span>
                </button>
              )}
              <button 
                onClick={() => {
                  if (profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified) {
                    alert("Please verify your email before adding products.");
                    return;
                  }
                  navigate('/seller/products');
                }}
                className={`px-4 py-2 rounded-lg text-sm ${
                  profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Notification bar */}
        {pendingCount > 0 && (
          <div className="max-w-7xl mx-auto px-6 mt-4">
            <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
              <div className="text-sm text-yellow-900">You have {pendingCount} pending branch link {pendingCount === 1 ? 'request' : 'requests'}.</div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/BranchLinkRequest')} className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 text-xs hover:bg-yellow-200">Review</button>
                <button onClick={async () => { try { const reqs = await listBranchLinkRequests(); setPendingCount(Array.isArray(reqs) ? reqs.length : 0); } catch {} }} className="px-3 py-1.5 rounded-lg bg-white border text-xs hover:bg-gray-50">Refresh</button>
              </div>
            </div>
          </div>
        )}

        {/* Top metrics */}
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Products</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalProducts}</div>
            <div className="text-xs text-green-600 mt-2">Active inventory</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Low Stock Items</div>
            <div className="text-2xl font-semibold text-yellow-600 mt-1">{stats.lowStockCount}</div>
            <div className="text-xs text-yellow-600 mt-2">Need restocking</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Out of Stock</div>
            <div className="text-2xl font-semibold text-red-600 mt-1">{stats.outOfStockCount}</div>
            <div className="text-xs text-red-600 mt-2">Urgent attention</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Orders Today</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.ordersToday}</div>
            <div className="text-xs text-green-600 mt-2">+0</div>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'overview' ? (
          /* Overview Content */
          <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Information + Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Store Information</h3>
              <div className="mt-4 text-sm text-gray-700 space-y-1">
                <div className="font-medium">{profile.storeName || 'Fresh Cart - Downtown'}</div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 12l4.243-4.243m-4.243 4.243L6.343 6.343M13.414 12l-7.071 7.071"/></svg>
                  <span>{profile.storeAddress || '123 Main Street, Downtown, City'}</span>
                </div>
                <div className="text-xs text-gray-500">Seller ID: {profile.sellerUniqueNumber || '—'}</div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Operating Hours</div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open Now</span>
                </div>
                <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-gray-900" style={{ width: '000%' }}></div></div>
                <div className="text-xs text-gray-600">Today's Performance • 000%</div>
              </div>
            </div>

            {/* Low stock alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
              <div className="mt-4 space-y-3">
                {products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length === 0 ? (
                  <div className="text-sm text-gray-500">No low stock items</div>
                ) : (
                  products.filter(p => p.stock <= (p.lowStockThreshold || 10)).map((product) => (
                    <div key={product._id} className="flex items-center justify-between border rounded-xl p-4 bg-red-50">
                      <div>
                        <div className="text-sm font-medium text-red-700">{product.name}</div>
                        <div className="text-xs text-red-600">Stock: {product.stock} (Alert: {product.lowStockThreshold || 10})</div>
                      </div>
                      <button 
                        onClick={() => navigate('/seller/products')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"
                      >
                        Restock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Orders</h3>
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{activeOrders.length}</span>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                {activeOrders.length === 0 ? (
                  <div className="text-sm text-gray-500 col-span-3 text-center py-8">No active orders</div>
                ) : (
                  activeOrders.map(o => (
                    <div key={o.id} className="border rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{o.id}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : o.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{o.status}</span>
                      </div>
                      <div className="text-sm text-gray-600">{o.customer} • {o.items} items</div>
                      <div className="text-xs text-gray-400">{o.ago}</div>
                    </div>
                  ))
                )}
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-orange-800">Pending Orders</div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'catalog' ? (
          /* Product Catalog View */
          <div className="max-w-7xl mx-auto px-6 pb-12">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Product Catalog</h2>
                <button 
                  onClick={() => navigate('/seller/products')} 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add New Product
                </button>
              </div>
              
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No products in your catalog yet</div>
                  <button 
                    onClick={() => {
                      if (profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified) {
                        alert("Please verify your email before adding products.");
                        return;
                      }
                      navigate('/seller/products');
                    }}
                    className={`px-6 py-3 rounded-lg ${
                      profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    disabled={profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified}
                  >
                    Add Your First Product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product.stock, product.lowStockThreshold || 10);
                    return (
                      <div 
                        key={product._id} 
                        className={`border rounded-lg p-4 ${
                          stockStatus.status === 'out' ? 'border-red-300 bg-red-50' : 
                          stockStatus.status === 'low' ? 'border-yellow-300 bg-yellow-50' : 
                          'border-gray-200'
                        }`}
                      >
                        {Array.isArray(product.images) && product.images.length > 0 && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded mb-3"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            stockStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                            stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {stockStatus.text}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{product.description || 'No description'}</p>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <div className="font-semibold text-green-600">₹{product.price}</div>
                            {product.mrpPrice && product.mrpPrice > product.price && (
                              <div className="text-xs text-gray-500 line-through">₹{product.mrpPrice}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600">Stock: {product.stock}</div>
                            <div className="text-xs text-gray-500">Alert: {product.lowStockThreshold || 10}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => {
                              if (profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified) {
                                alert("Please verify your email before editing products.");
                                return;
                              }
                              navigate('/seller/products');
                            }}
                            className={`flex-1 px-3 py-1.5 text-xs rounded ${
                              profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            disabled={profile.role === "seller" && profile.provider === "email" && !currentUser.emailVerified}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              const newStock = prompt(`Update stock for ${product.name}:`, product.stock);
                              if (newStock !== null && !isNaN(newStock)) {
                                // Update stock logic would go here
                                window.location.reload();
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Update Stock
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'hours' ? (
          /* Store Hours Management View */
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">7-Day Store Hours Management</h3>
                <button onClick={() => setActiveTab('overview')} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Back to Overview
                </button>
              </div>
              
              {/* Store Hours Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium mb-4">Store Hours Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{storeHours.length}</div>
                    <div className="text-sm text-gray-600">Days Configured</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {storeHours.filter(h => !h.isClosed).length}
                    </div>
                    <div className="text-sm text-gray-600">Open Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {storeHours.filter(h => h.isClosed).length}
                    </div>
                    <div className="text-sm text-gray-600">Closed Days</div>
                  </div>
                </div>
              </div>
              
              {/* Add Store Hours Form */}
              <div className="border rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium mb-4">Set Store Hours</h4>
                <form onSubmit={addStoreHours} className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Day</label>
                    <select 
                      name="day" 
                      value={hoursForm.day} 
                      onChange={onHoursChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                      required
                    >
                      <option value="">Choose a day</option>
                      {next7Days.map(day => (
                        <option key={day.dayName} value={day.dayName}>
                          {day.isToday ? 'Today' : day.dayName} - {day.month} {day.dayNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-4 flex items-center gap-2">
                    <input 
                      id="isClosed" 
                      type="checkbox" 
                      name="isClosed" 
                      checked={hoursForm.isClosed} 
                      onChange={onHoursChange} 
                    />
                    <label htmlFor="isClosed" className="text-sm text-gray-700">Store is closed on this day</label>
                  </div>
                  
                  {!hoursForm.isClosed && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                        <input 
                          type="time" 
                          name="openTime" 
                          value={hoursForm.openTime} 
                          onChange={onHoursChange} 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                          required={!hoursForm.isClosed}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                        <input 
                          type="time" 
                          name="closeTime" 
                          value={hoursForm.closeTime} 
                          onChange={onHoursChange} 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                          required={!hoursForm.isClosed}
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <input 
                      name="note" 
                      value={hoursForm.note} 
                      onChange={onHoursChange} 
                      placeholder="e.g., Holiday hours, Special event" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  
                  <div className="md:col-span-4 flex justify-start">
                    <button 
                      type="submit" 
                      className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Set Hours
                    </button>
                  </div>
                </form>
                
                {hoursMsg && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    {hoursMsg}
                  </div>
                )}
              </div>

              {/* 7-Day Store Hours Grid */}
              <div>
                <h4 className="text-lg font-medium mb-4">7-Day Store Hours View</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {next7Days.map(day => {
                    const dayHours = getHoursForDay(day.dayName);
                    const isToday = day.isToday;
                    
                    return (
                      <div key={day.dayName} className={`border rounded-lg p-4 ${
                        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}>
                        <div className="text-center mb-3">
                          <div className={`text-xs font-medium ${
                            isToday ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {isToday ? 'TODAY' : day.dayShort.toUpperCase()}
                          </div>
                          <div className={`text-lg font-bold ${
                            isToday ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {day.dayNumber}
                          </div>
                          <div className={`text-xs ${
                            isToday ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {day.month}
                          </div>
                          <div className="text-sm font-medium mt-1">{day.dayName}</div>
                          {isToday && (
                            <div className="text-xs text-green-600 font-medium mt-1">Current Day</div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {!dayHours ? (
                            <div className="text-center py-4">
                              <div className="text-sm text-gray-500 mb-2">Hours not set</div>
                              <button
                                onClick={() => setHoursForm(prev => ({ ...prev, day: day.dayName }))}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-600 hover:bg-green-200"
                              >
                                + Set Hours
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white rounded p-2 text-sm border">
                              {dayHours.isClosed ? (
                                <div className="text-center">
                                  <div className="font-medium text-red-600">CLOSED</div>
                                  {dayHours.note && (
                                    <div className="text-gray-600 text-xs mt-1">{dayHours.note}</div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium text-green-600">
                                    {dayHours.openTime} - {dayHours.closeTime}
                                  </div>
                                  {dayHours.note && (
                                    <div className="text-gray-600 text-xs mt-1">{dayHours.note}</div>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => removeStoreHours(day.dayName)}
                                className="text-xs mt-1 text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Default Overview Content */
          <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Information + Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Store Information</h3>
              <div className="mt-4 text-sm text-gray-700 space-y-1">
                <div className="font-medium">{profile.storeName || 'Fresh Cart - Downtown'}</div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 12l4.243-4.243m-4.243 4.243L6.343 6.343M13.414 12l-7.071 7.071"/></svg>
                  <span>{profile.storeAddress || '123 Main Street, Downtown, City'}</span>
                </div>
                <div className="text-xs text-gray-500">Seller ID: {profile.sellerUniqueNumber || '—'}</div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Operating Hours</div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open Now</span>
                </div>
                <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-gray-900" style={{ width: '000%' }}></div></div>
                <div className="text-xs text-gray-600">Today's Performance • 000%</div>
              </div>
            </div>

            {/* Low stock alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
              <div className="mt-4 space-y-3">
                {products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length === 0 ? (
                  <div className="text-sm text-gray-500">No low stock items</div>
                ) : (
                  products.filter(p => p.stock <= (p.lowStockThreshold || 10)).map((product) => (
                    <div key={product._id} className="flex items-center justify-between border rounded-xl p-4 bg-red-50">
                      <div>
                        <div className="text-sm font-medium text-red-700">{product.name}</div>
                        <div className="text-xs text-red-600">Stock: {product.stock} (Alert: {product.lowStockThreshold || 10})</div>
                      </div>
                      <button 
                        onClick={() => navigate('/seller/products')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"
                      >
                        Restock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Orders</h3>
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{activeOrders.length}</span>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                {activeOrders.length === 0 ? (
                  <div className="text-sm text-gray-500 col-span-3 text-center py-8">No active orders</div>
                ) : (
                  activeOrders.map(o => (
                    <div key={o.id} className="border rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{o.id}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : o.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{o.status}</span>
                      </div>
                      <div className="text-sm text-gray-600">{o.customer} • {o.items} items</div>
                      <div className="text-xs text-gray-400">{o.ago}</div>
                      <div className="mt-2 font-semibold text-green-700">₹{o.total}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}