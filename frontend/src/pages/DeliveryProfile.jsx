import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function DeliveryProfile() {
  const { currentUser, getUserProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    email: "",
    photo: "",
    licenseNumber: "",
    address: ""
  });

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    phone: "",
    countryCode: "+91"
  });

  // Common country codes
  const countryCodes = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+82", country: "South Korea", flag: "🇰🇷" }
  ];

  // Password data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Addresses (max 2)
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    type: "home",
    house: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    isDefault: false
  });

  // Delivery Area & Availability
  const [deliveryArea, setDeliveryArea] = useState({
    pincode: "",
    radius: 5
  });
  
  const [availability, setAvailability] = useState([
    { day: 'Monday', start: '09:00', end: '18:00', enabled: true },
    { day: 'Tuesday', start: '09:00', end: '18:00', enabled: true },
    { day: 'Wednesday', start: '09:00', end: '18:00', enabled: true },
    { day: 'Thursday', start: '09:00', end: '18:00', enabled: true },
    { day: 'Friday', start: '09:00', end: '18:00', enabled: true },
    { day: 'Saturday', start: '10:00', end: '16:00', enabled: false },
    { day: 'Sunday', start: '10:00', end: '16:00', enabled: false }
  ]);

  useEffect(() => {
    if (!currentUser) return;
    const profile = getUserProfile();
    if (profile?.role !== 'delivery') return;
    loadProfileData();
    loadAddresses();
  }, [currentUser]);

  async function loadProfileData() {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        const user = data.user || data;
        setProfileData({
          name: user.name || "",
          phone: user.phone || "",
          email: user.email || currentUser.email || "",
          photo: user.photo || "",
          licenseNumber: user.licenseNumber || "",
          address: user.address || ""
        });
        // Parse existing phone number to separate country code and number
        const existingPhone = user.phone || "";
        let countryCode = "+91";
        let phoneNumber = existingPhone;
        
        // Try to extract country code from existing phone
        const foundCode = countryCodes.find(cc => existingPhone.startsWith(cc.code));
        if (foundCode) {
          countryCode = foundCode.code;
          phoneNumber = existingPhone.substring(foundCode.code.length).trim();
        }
        
        setEditProfileData({
          phone: phoneNumber,
          countryCode: countryCode
        });
        if (user.deliveryArea) {
          setDeliveryArea(user.deliveryArea);
        }
        if (user.availability) {
          setAvailability(user.availability);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  async function loadAddresses() {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/addresses`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data || []);
      }
    } catch {}
  }

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage('All password fields are required');
      setLoading(false);
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage('Password changed successfully');
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Save delivery area and availability
  const saveDeliverySettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/delivery-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryArea, availability })
      });
      if (res.ok) {
        setMessage('Delivery settings saved successfully');
      } else {
        setMessage('Failed to save delivery settings');
      }
    } catch (error) {
      setMessage('Error saving delivery settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((p) => ({ ...p, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAddress((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const submitAddress = async (e) => {
    e.preventDefault();
    setMessage("");
    
    // Check if already have 2 addresses and trying to add new one
    if (!editingAddress && addresses.length >= 2) {
      setMessage('Maximum 2 addresses allowed for delivery role');
      return;
    }
    
    const url = editingAddress
      ? `http://localhost:5000/api/users/${currentUser.uid}/addresses/${editingAddress._id}`
      : `http://localhost:5000/api/users/${currentUser.uid}/addresses`;
    const method = editingAddress ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newAddress) 
      });
      if (!res.ok) throw new Error('Failed to save address');
      await loadAddresses();
      setNewAddress({ type: "home", house: "", street: "", city: "", state: "", zipCode: "", country: "India", isDefault: false });
      setEditingAddress(null);
      setMessage(`Address ${editingAddress ? 'updated' : 'added'} successfully`);
    } catch (error) {
      setMessage(error.message || 'Failed to save address');
    }
  };

  const startEdit = (addr) => {
    setEditingAddress(addr);
    setNewAddress({
      type: addr.type,
      house: addr.house || '',
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      isDefault: !!addr.isDefault
    });
  };

  // Handle profile editing
  const handleProfileEdit = () => {
    setIsEditingProfile(true);
    const existingPhone = profileData.phone || "";
    let countryCode = "+91";
    let phoneNumber = existingPhone;
    
    // Try to extract country code from existing phone
    const foundCode = countryCodes.find(cc => existingPhone.startsWith(cc.code));
    if (foundCode) {
      countryCode = foundCode.code;
      phoneNumber = existingPhone.substring(foundCode.code.length).trim();
    }
    
    setEditProfileData({
      phone: phoneNumber,
      countryCode: countryCode
    });
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    const existingPhone = profileData.phone || "";
    let countryCode = "+91";
    let phoneNumber = existingPhone;
    
    const foundCode = countryCodes.find(cc => existingPhone.startsWith(cc.code));
    if (foundCode) {
      countryCode = foundCode.code;
      phoneNumber = existingPhone.substring(foundCode.code.length).trim();
    }
    
    setEditProfileData({
      phone: phoneNumber,
      countryCode: countryCode
    });
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const fullPhoneNumber = editProfileData.countryCode + editProfileData.phone;
      const res = await fetch(`http://localhost:5000/api/users/${currentUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhoneNumber })
      });
      
      if (res.ok) {
        setProfileData(prev => ({ ...prev, phone: fullPhoneNumber }));
        setIsEditingProfile(false);
        setMessage('Profile updated successfully');
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const profile = getUserProfile();
    if (profile?.role === 'admin') return;
    const ok = window.confirm('Delete your account permanently? This cannot be undone.');
    if (!ok) return;
    try {
      await deleteAccount();
      setMessage('Account deleted. Goodbye!');
      setTimeout(() => window.location.assign('/'), 1000);
    } catch (e) {
      setMessage(e.message || 'Failed to delete account');
    }
  };

  // Render Profile View Component
  const renderProfile = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
        {!isEditingProfile ? (
          <button
            onClick={handleProfileEdit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleProfileCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProfileSave}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            {profileData.photo ? (
              <img src={profileData.photo} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-800">{profileData.name || "Not provided"}</h3>
            <p className="text-gray-600">Delivery Agent</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
            <div className="p-3 bg-gray-50 border rounded-lg text-gray-800">{profileData.email || "Not provided"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            {isEditingProfile ? (
              <div className="flex gap-2">
                <select
                  value={editProfileData.countryCode}
                  onChange={(e) => setEditProfileData(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="w-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={editProfileData.phone}
                  onChange={(e) => setEditProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter phone number"
                />
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border rounded-lg text-gray-800">
                {profileData.phone ? (
                  (() => {
                    const phone = profileData.phone;
                    const foundCode = countryCodes.find(cc => phone.startsWith(cc.code));
                    if (foundCode) {
                      const phoneNumber = phone.substring(foundCode.code.length).trim();
                      return (
                        <span>
                          <span className="text-sm text-gray-600">{foundCode.flag} {foundCode.code}</span>
                          <span className="ml-2">{phoneNumber}</span>
                        </span>
                      );
                    }
                    return phone;
                  })()
                ) : (
                  "Not provided"
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
            <div className="p-3 bg-gray-50 border rounded-lg text-gray-800">{profileData.licenseNumber || "Not provided"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <div className="p-3 bg-gray-50 border rounded-lg text-gray-800">{profileData.address || "Not provided"}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChangePassword = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Change Password</h2>
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input 
            type="password" 
            name="currentPassword" 
            value={passwordData.currentPassword} 
            onChange={handlePasswordInput} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input 
            type="password" 
            name="newPassword" 
            value={passwordData.newPassword} 
            onChange={handlePasswordInput} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input 
            type="password" 
            name="confirmPassword" 
            value={passwordData.confirmPassword} 
            onChange={handlePasswordInput} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
            required
          />
        </div>
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading} 
            className="px-6 py-2 rounded-lg bg-green-600 text-white disabled:bg-green-400 hover:bg-green-700"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderAddresses = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Addresses</h2>
      <div className="space-y-4 mb-6">
        {addresses.length === 0 && <p className="text-gray-500">No addresses added yet.</p>}
        {addresses.map((addr) => (
          <div key={addr._id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <div className="font-medium">{addr.type?.toUpperCase()} {addr.isDefault ? '(Default)' : ''}</div>
              <div>{addr.house ? `${addr.house}, ` : ''}{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</div>
              <div>{addr.country}</div>
            </div>
            <button 
              onClick={() => startEdit(addr)} 
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {addresses.length < 2 && (
        <>
          <h3 className="font-semibold mb-4">{editingAddress ? 'Update Address' : 'Add New Address'}</h3>
          <form onSubmit={submitAddress} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                name="type" 
                value={newAddress.type} 
                onChange={handleAddressChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House/Building</label>
              <input 
                name="house" 
                value={newAddress.house} 
                onChange={handleAddressChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input 
                name="street" 
                value={newAddress.street} 
                onChange={handleAddressChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input 
                name="city" 
                value={newAddress.city} 
                onChange={handleAddressChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input 
                name="state" 
                value={newAddress.state} 
                onChange={handleAddressChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input name="zipCode" value={newAddress.zipCode} onChange={handleAddressChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input name="country" value={newAddress.country} onChange={handleAddressChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input id="isDefault" type="checkbox" name="isDefault" checked={newAddress.isDefault} onChange={handleAddressChange} />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              {editingAddress && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingAddress(null); 
                    setNewAddress({ type: "home", house: "", street: "", city: "", state: "", zipCode: "", country: "India", isDefault: false }); 
                  }} 
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 text-white">
                {editingAddress ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </form>
        </>
      )}
      {addresses.length >= 2 && !editingAddress && (
        <p className="text-sm text-gray-500 mt-4">Maximum 2 addresses allowed for delivery role.</p>
      )}
    </div>
  );

  // Render Delivery Area & Availability Component
  const renderDeliveryArea = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Delivery Area & Availability</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Pincode</label>
          <input
            type="text"
            value={deliveryArea.pincode}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
              setDeliveryArea(prev => ({ ...prev, pincode: value }));
            }}
            placeholder="Enter 6-digit pincode"
            className="w-full max-w-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
          <input
            type="number"
            value={deliveryArea.radius}
            onChange={(e) => setDeliveryArea(prev => ({ ...prev, radius: parseInt(e.target.value) || 5 }))}
            min="1"
            max="20"
            className="w-full max-w-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Weekly Availability</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availability.map((slot, idx) => (
              <div key={slot.day} className="border rounded-lg p-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <input 
                    type="checkbox" 
                    checked={slot.enabled} 
                    onChange={(e) => setAvailability(arr => arr.map((s,i) => i===idx ? { ...s, enabled: e.target.checked } : s))} 
                  />
                  <span>{slot.day}</span>
                </label>
                {slot.enabled && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start</label>
                      <input 
                        type="time" 
                        value={slot.start} 
                        onChange={(e) => setAvailability(arr => arr.map((s,i) => i===idx ? { ...s, start: e.target.value } : s))} 
                        className="w-full p-2 border rounded" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End</label>
                      <input 
                        type="time" 
                        value={slot.end} 
                        onChange={(e) => setAvailability(arr => arr.map((s,i) => i===idx ? { ...s, end: e.target.value } : s))} 
                        className="w-full p-2 border rounded" 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={saveDeliverySettings} 
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-green-600 text-white disabled:bg-green-400 hover:bg-green-700"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FreshCart</h1>
              <p className="text-sm text-gray-600">Welcome, {profileData.name || 'Delivery Agent'}</p>
            </div>
            <div className="text-sm text-gray-600">
              Delivery Panel
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "profile" ? "bg-green-100 text-green-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Profile
            </button>

            <button
              onClick={() => setActiveTab("password")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "password" ? "bg-green-100 text-green-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Change Password
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "addresses" ? "bg-green-100 text-green-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Addresses
            </button>

            <button
              onClick={() => setActiveTab("delivery")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === "delivery" ? "bg-green-100 text-green-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Delivery Area & Availability
            </button>
          </nav>

          <div className="mt-auto border-t p-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1"/>
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "profile" && renderProfile()}
          {activeTab === "password" && renderChangePassword()}
          {activeTab === "addresses" && renderAddresses()}
          {activeTab === "delivery" && renderDeliveryArea()}
          
          {message && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}