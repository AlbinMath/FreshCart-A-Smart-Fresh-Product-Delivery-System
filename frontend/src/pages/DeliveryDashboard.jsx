import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import DeliveryVerificationGuard from "../components/DeliveryVerificationGuard";

// Minimal delivery partner dashboard inspired by provided design
export default function DeliveryDashboard() {
  const { currentUser, getUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Orders state
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [storeOverviewOrders, setStoreOverviewOrders] = useState([]);
  const [loadingStoreOrders, setLoadingStoreOrders] = useState(false);

  // Schedule management state
  const [scheduleItems, setScheduleItems] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    start: "",
    end: "",
    note: ""
  });
  const [scheduleMsg, setScheduleMsg] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    const profile = getUserProfile();
    if (!profile || profile.role !== "delivery") {
      navigate("/");
      return;
    }
    loadSchedule();
    loadAvailableOrders();
    loadStoreOverviewOrders();
  }, [currentUser, navigate]);

  // Load available orders
  async function loadAvailableOrders() {
    setLoadingOrders(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/delivery/available`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAvailableOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading available orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  }

  // Load store overview orders (active orders)
  async function loadStoreOverviewOrders() {
    setLoadingStoreOrders(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/delivery/store-overview`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStoreOverviewOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading store overview orders:", error);
    } finally {
      setLoadingStoreOrders(false);
    }
  }

  // Load schedule data
  async function loadSchedule() {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/schedules`);
      const data = await res.json();
      if (res.ok && data.success) setScheduleItems(data.schedules || []);
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  }

  // Schedule form handlers
  const onScheduleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScheduleForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    setScheduleMsg("");
    if (!scheduleForm.date || !scheduleForm.start || !scheduleForm.end) { 
      setScheduleMsg('Date, Start time, and End time are required'); 
      return; 
    }
    
    // Validate that end time is after start time
    if (scheduleForm.start >= scheduleForm.end) {
      setScheduleMsg('End time must be after start time');
      return;
    }
    
    try {
      const body = { 
        date: scheduleForm.date, 
        start: scheduleForm.start, 
        end: scheduleForm.end, 
        note: scheduleForm.note 
      };
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/schedules`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add');
      setScheduleItems(data.schedules || []);
      setScheduleForm({ date: "", start: "", end: "", note: "" });
      setScheduleMsg('Schedule added successfully');
    } catch (error) { 
      setScheduleMsg(error.message || 'Failed to add schedule'); 
    }
  };

  const removeSchedule = async (idx) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/schedules/${idx}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to remove');
      setScheduleItems(data.schedules || []);
      setScheduleMsg('Schedule removed successfully');
    } catch (error) { 
      setScheduleMsg(error.message || 'Failed to remove schedule'); 
    }
  };

  const profile = getUserProfile();

  // Demo data placeholders
  const stats = {
    deliveriesToday: 0,
    earningsToday: 0,
    avgRating: 0.0,
    timeOnline: "0.0 h",
    availableOrders: availableOrders.length
  };

  return (
    <DeliveryVerificationGuard>
      <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-16 md:top-20 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-20">
        <div className="px-4 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">FC</div>
            <div>
              <div className="text-lg font-semibold text-green-700">Fresh Cart</div>
              <div className="text-xs text-gray-500">Welcome back, <span className="font-medium">Delivery Agent</span></div>
            </div>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Online</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {[
            { key: "dashboard", label: "Dashboard", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            )},
            { key: "deliveries", label: "My Deliveries", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M9 7h12M9 11h12M9 15h12M9 19h12M3 7h.01M3 11h.01M3 15h.01M3 19h.01"/></svg>
            )},
            { key: "route", label: "Route Planning", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h2l2 3h6l2-4 3 5h3"/></svg>
            )},
            { key: "earnings", label: "Earnings", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8 4a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>
            )},
            { key: "tracking", label: "Location Tracking", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3zm0 0c-4 0-7 3-7 7h14c0-4-3-7-7-7z"/></svg>
            )},
            { key: "schedule", label: "Schedule", icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            )},
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === item.key ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="text-gray-500">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t p-3 space-y-2">
          <button onClick={() => navigate('/delivery/notifications')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span>Notifications</span>
            <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">3</span>
          </button>
          <button onClick={() => navigate('/delivery/profile')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1118.879 4.196 9 9 0 015.12 17.804z"/></svg>
            <span>My Profile</span>
          </button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <div className="ml-64">
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivery Status</h1>
              <p className="text-sm text-gray-600">Online & Available</p>
            </div>
            <button className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700">Go Offline</button>
          </div>
        </div>

        {/* Top metrics */}
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Today's Deliveries</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.deliveriesToday}</div>
            <div className="text-xs text-gray-500 mt-2">Target: 00 <span className="ml-2">100%</span></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Earnings Today</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">₹{stats.earningsToday}</div>
            <div className="text-xs text-green-600 mt-2">+₹00</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Average Rating</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.avgRating}</div>
            <div className="text-xs text-green-600 mt-2">+0.0
              <span className="text-gray-500"> (↑)</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Time Online</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.timeOnline}</div>
            <div className="text-xs text-gray-500 mt-2">Target: 0h <span className="ml-2">100%</span></div>
          </div>
        </div>

        {/* Body - Conditional Content Based on Active Tab */}
        {activeTab === "dashboard" && (
          <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Store Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Store Overview</h3>
                <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full">{storeOverviewOrders.length}</span>
              </div>
              <div className="mt-4 space-y-4">
                {loadingStoreOrders ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p>Loading active orders...</p>
                  </div>
                ) : storeOverviewOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <p>No active orders</p>
                    <p className="text-sm">Orders will appear here when stores mark them ready</p>
                  </div>
                ) : (
                  storeOverviewOrders.slice(0, 3).map((order) => {
                    const totalItems = order.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                    return (
                      <div key={order._id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">#{order.orderNumber || order._id.slice(-6)}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                Active Order
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.customerInfo?.name || 'Customer'} • {totalItems} items
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-green-600">
                            ₹{order.totalAmount || 0}
                          </div>
                          <span className="text-xs text-gray-500">Store: {order.storeInfo?.name || 'Store'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                {storeOverviewOrders.length > 3 && (
                  <div className="text-center">
                    <button className="text-sm text-orange-600 hover:text-orange-800">
                      View all {storeOverviewOrders.length} orders
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Available Orders */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Available Orders</h3>
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{availableOrders.length}</span>
              </div>
              <div className="mt-4 space-y-4">
                {loadingOrders ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Loading available orders...</p>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p>No available orders</p>
                    <p className="text-sm">Check back later for new delivery requests</p>
                  </div>
                ) : (
                  availableOrders.slice(0, 3).map((order) => {
                    const totalItems = order.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                    return (
                      <div key={order._id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">#{order.orderNumber || order._id.slice(-6)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                order.status === 'ready_for_delivery' ? 'bg-green-100 text-green-700' :
                                order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {order.status === 'ready_for_delivery' ? 'Ready for Delivery' :
                                 order.status === 'out_for_delivery' ? 'Out for Delivery' : order.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.customerInfo?.name || 'Customer'} • {totalItems} items
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-green-600">
                            ₹{order.totalAmount || 0}
                          </div>
                          <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                            Accept Delivery
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                {availableOrders.length > 3 && (
                  <div className="text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      View all {availableOrders.length} orders
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Today's Performance</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Deliveries Completed</span><span>0/0</span></div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-green-600 w-0"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-gray-600"><span>On-Time Delivery Rate</span><span>100%</span></div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-green-600 w-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Customer Rating</span><span>0.0/5.0</span></div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-green-600 w-0"></div></div>
                </div>
                <button className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium">Request New Orders</button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Management */}
        {activeTab === "schedule" && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">7-Day Schedule Management</h3>
                <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Back to Dashboard
                </button>
              </div>
              
              {/* Schedule Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium mb-4">Schedule Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{scheduleItems.length}</div>
                    <div className="text-sm text-gray-600">Total Schedules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {scheduleItems.filter(s => s.date === new Date().toISOString().split('T')[0]).length}
                    </div>
                    <div className="text-sm text-gray-600">Today's Schedules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(scheduleItems.map(s => s.date)).size}
                    </div>
                    <div className="text-sm text-gray-600">Active Days</div>
                  </div>
                </div>
              </div>
              
              {/* Add Schedule Form */}
              <div className="border rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium mb-4">Add New Schedule</h4>
                <form onSubmit={addSchedule} className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                    <select 
                      name="date" 
                      value={scheduleForm.date} 
                      onChange={onScheduleChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                      required
                    >
                      <option value="">Choose a date</option>
                      {Array.from({length: 7}, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
                        const dateStr = date.toISOString().split('T')[0];
                        const displayDate = `${dayName} - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        return (
                          <option key={dateStr} value={dateStr}>{displayDate}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      name="start" 
                      value={scheduleForm.start} 
                      onChange={onScheduleChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input 
                      type="time" 
                      name="end" 
                      value={scheduleForm.end} 
                      onChange={onScheduleChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <input 
                      name="note" 
                      value={scheduleForm.note} 
                      onChange={onScheduleChange} 
                      placeholder="Optional note" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-start">
                    <button 
                      type="submit" 
                      className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Add Schedule
                    </button>
                  </div>
                </form>
                
                {scheduleMsg && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                    {scheduleMsg}
                  </div>
                )}
              </div>

              {/* 7-Day Schedule Grid */}
              <div>
                <h4 className="text-lg font-medium mb-4">7-Day Schedule View</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({length: 7}, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateStr = date.toISOString().split('T')[0];
                    const daySchedules = scheduleItems.filter(s => s.date === dateStr);
                    const isToday = i === 0;
                    
                    return (
                      <div key={dateStr} className={`border rounded-lg p-4 ${
                        isToday ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}>
                        <div className="text-center mb-3">
                          <div className={`text-xs font-medium ${
                            isToday ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {isToday ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                          </div>
                          <div className={`text-lg font-bold ${
                            isToday ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className={`text-xs ${
                            isToday ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          {isToday && (
                            <div className="text-xs text-green-600 font-medium mt-1">Current Day</div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {daySchedules.length === 0 ? (
                            <div className="text-center py-4">
                              <div className="text-sm text-gray-500 mb-2">No schedules</div>
                              <button
                                onClick={() => setScheduleForm(prev => ({ ...prev, date: dateStr }))}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-600 hover:bg-green-200"
                              >
                                + Add Schedule
                              </button>
                            </div>
                          ) : (
                            daySchedules.map((schedule, idx) => (
                              <div key={idx} className="bg-white rounded p-2 text-sm border">
                                <div className="font-medium">
                                  {schedule.start} - {schedule.end}
                                </div>
                                {schedule.note && (
                                  <div className="text-gray-600 text-xs mt-1">{schedule.note}</div>
                                )}
                                <button
                                  onClick={() => removeSchedule(scheduleItems.indexOf(schedule))}
                                  className="text-xs mt-1 text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content can be added here */}
        {activeTab !== "dashboard" && activeTab !== "schedule" && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-xl font-semibold mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <p className="text-gray-600">This section is under development.</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </DeliveryVerificationGuard>
  );
}