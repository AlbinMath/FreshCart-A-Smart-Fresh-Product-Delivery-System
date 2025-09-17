import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { validateProfileData, validatePasswordChange, validateAddress, sanitizeInput, validateBusinessLicense } from '../utils/validation';
import ProfileImageUpload from "../components/ProfileImageUpload";
import BranchStores from "../components/BranchStores";
import { uploadLicense, uploadLicenseLink } from "../services/sellerService";

function Profile() {
  const { currentUser, getUserProfile, updateUserProfile, fetchUserProfile, changePassword, sendVerificationEmail, needsEmailVerification, reloadUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [blockedBanner, setBlockedBanner] = useState("");
  
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    // Removed for sellers: dateOfBirth, gender (still allowed for other roles)
    dateOfBirth: "",
    gender: "",
    profilePicture: "",
    // Role-specific fields
    storeName: "",
    businessLicense: "",
    storeAddress: "",
    sellerCategory: "",
    vehicleType: "",
    licenseNumber: "",
    adminLevel: ""
  });

  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    type: "home",
    street: "",
    city: "",
    state: "",
    house: "",
    zipCode: "",
    country: "India",
    isDefault: false
  });

  const [editingAddress, setEditingAddress] = useState(null);
  
  // Ensure sellers never land on addresses tab
  useEffect(() => {
    try {
      const role = (getUserProfile()?.role) || 'customer';
      if (role === 'seller' && activeTab === 'addresses') setActiveTab('profile');
    } catch {}
  }, [activeTab, getUserProfile]);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [businessLicenseValidation, setBusinessLicenseValidation] = useState({ isValid: true, message: '' });

  // License upload/link UI state
  const [showLicensePanel, setShowLicensePanel] = useState(false);
  const [licenseMode, setLicenseMode] = useState('image'); // 'image' | 'pdf' | 'link'
  const [licenseForm, setLicenseForm] = useState({ licenseNumber: '', file: null, link: '' });
  const [licenseLoading, setLicenseLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // If delivery, always send to delivery panel
    const p = getUserProfile();
    if (p?.role === 'delivery') {
      navigate('/delivery', { replace: true });
      return;
    }

    loadUserProfile();

    // Show temporary blocked banner if redirected
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('blocked') === '1') {
        setBlockedBanner('Your account is temporarily blocked by admin. You can view your profile but cannot access other panels.');
      }
    } catch {}
  }, [currentUser, navigate]);

  const loadUserProfile = async () => {
    try {
      // Load from backend first
      const backendProfile = await fetchUserProfile();
      if (backendProfile) {
        setProfileData({
          name: backendProfile.name || "",
          phone: backendProfile.phone || "",
          dateOfBirth: backendProfile.dateOfBirth ? backendProfile.dateOfBirth.split('T')[0] : "",
          gender: backendProfile.gender || "",
          profilePicture: backendProfile.profilePicture || "",
          storeName: backendProfile.storeName || "",
          businessLicense: backendProfile.businessLicense || "",
          storeAddress: backendProfile.storeAddress || "",
          sellerCategory: backendProfile.sellerCategory || "",
          vehicleType: backendProfile.vehicleType || "",
          licenseNumber: backendProfile.licenseNumber || "",
          adminLevel: backendProfile.adminLevel || "",
          sellerUniqueNumber: backendProfile.sellerUniqueNumber || ""
        });
      } else {
        // Fallback to localStorage
        const profile = getUserProfile();
        if (profile) {
          setProfileData({
            name: profile.name || "",
            phone: profile.phone || "",
            dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : "",
            gender: profile.gender || "",
            profilePicture: profile.profilePicture || "",
            storeName: profile.storeName || "",
            businessLicense: profile.businessLicense || "",
            storeAddress: profile.storeAddress || "",
            sellerCategory: profile.sellerCategory || "",
            vehicleType: profile.vehicleType || "",
            licenseNumber: profile.licenseNumber || "",
            adminLevel: profile.adminLevel || "",
            sellerUniqueNumber: profile.sellerUniqueNumber || ""
          });
        }
      }

      // Load addresses from backend (skip for admin)
      const role = (backendProfile?.role) || (getUserProfile()?.role) || 'customer';
      if (role !== 'admin' && role !== 'seller') {
        const response = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/addresses`);
        if (response.ok) {
          const addressData = await response.json();
          setAddresses(addressData);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Sanitize input data
      const sanitizedData = {};
      Object.keys(profileData).forEach(key => {
        sanitizedData[key] = sanitizeInput(profileData[key]);
      });

      // Validate profile data
      const userRole = getUserRole();
      const validationErrors = validateProfileData(sanitizedData, userRole);
      
      if (validationErrors.length > 0) {
        setMessage({ type: "error", text: validationErrors.join(", ") });
        setLoading(false);
        return;
      }

      await updateUserProfile(sanitizedData);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      // Update local state with sanitized data
      setProfileData(sanitizedData);
    } catch (error) {
      setMessage({ type: "error", text: "Error updating profile: " + error.message });
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setMessage({ type: "", text: "" });

    // Validate password data
    const validationErrors = validatePasswordChange(passwordData);
    
    if (validationErrors.length > 0) {
      setMessage({ type: "error", text: validationErrors.join(", ") });
      setPasswordLoading(false);
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      let errorMessage = "Failed to change password";
      
      // Handle specific Firebase errors
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log back in before changing your password";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: "error", text: errorMessage });
    }
    setPasswordLoading(false);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Sanitize address data
      const sanitizedAddress = {};
      Object.keys(newAddress).forEach(key => {
        sanitizedAddress[key] = typeof newAddress[key] === 'string' ? sanitizeInput(newAddress[key]) : newAddress[key];
      });

      // Validate address data
      const validationErrors = validateAddress(sanitizedAddress);
      
      if (validationErrors.length > 0) {
        setMessage({ type: "error", text: validationErrors.join(", ") });
        setLoading(false);
        return;
      }

      const url = editingAddress 
        ? `http://localhost:5000/api/users/${currentUser.uid}/addresses/${editingAddress._id}`
        : `http://localhost:5000/api/users/${currentUser.uid}/addresses`;
      
      const method = editingAddress ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedAddress),
      });

      if (response.ok) {
        await loadUserProfile();
        setNewAddress({
          type: "home",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "India",
          isDefault: false
        });
        setEditingAddress(null);
        setMessage({ type: "success", text: `Address ${editingAddress ? 'updated' : 'added'} successfully!` });
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.message || `Failed to ${editingAddress ? 'update' : 'add'} address` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error processing address: " + error.message });
    }
    setLoading(false);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/${currentUser.uid}/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadUserProfile();
        setMessage({ type: "success", text: "Address deleted successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to delete address" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error deleting address" });
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setNewAddress({
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      house: address.house || '',
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault
    });
  };

  const handleEmailVerification = async () => {
    try {
      await sendVerificationEmail();
      setMessage({ type: "success", text: "Verification email sent! Check your inbox and spam folder." });
    } catch (error) {
      let errorMessage = "Failed to send verification email";
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please wait before requesting another verification email.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "Your account has been disabled.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: "error", text: errorMessage });
    }
  };

  // Check email verification status
  const handleDeleteAccount = async () => {
    if (getUserRole() === 'admin') return; // safety
    const confirmed = window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
    if (!confirmed) return;
    setLoading(true);
    try {
      await deleteAccount();
      setMessage({ type: 'success', text: 'Your account has been deleted. Redirecting...' });
      setTimeout(() => { navigate('/'); }, 1200);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
  };

  const checkEmailVerification = async () => {
    try {
      await reloadUser();
      if (currentUser.emailVerified) {
        setMessage({ type: "success", text: "Email verified successfully!" });
      } else {
        setMessage({ type: "info", text: "Email not yet verified. Please check your inbox." });
      }
    } catch (error) {
      console.error("Error checking email verification:", error);
    }
  };

  // Handle profile image update
  const handleImageUpdate = async (imageUrl) => {
    try {
      const updatedData = { ...profileData, profilePicture: imageUrl };
      await updateUserProfile(updatedData);
      setProfileData(updatedData);
      setMessage({ type: "success", text: "Profile image updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Error updating profile image: " + error.message });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: sanitizeInput(value)
    }));
    
    if (name === 'businessLicense') {
      setBusinessLicenseValidation(validateBusinessLicense(value));
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getUserRole = () => {
    const profile = getUserProfile();
    return profile?.role || 'customer';
  };

  const renderRoleSpecificFields = () => {
    const userRole = getUserRole();
    
    switch (userRole) {
      case "store":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
              <input
                type="text"
                name="storeName"
                value={profileData.storeName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
              <input
                type="text"
                name="businessLicense"
                placeholder="Format: ss100001 (2 letters + 6 digits)"
                value={profileData.businessLicense}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  profileData.businessLicense && !businessLicenseValidation.isValid 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
              />
              {profileData.businessLicense && (
                <p className={`mt-1 text-xs ${
                  businessLicenseValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {businessLicenseValidation.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Address</label>
              <textarea
                name="storeAddress"
                value={profileData.storeAddress}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Category</label>
              <select
                name="sellerCategory"
                value={profileData.sellerCategory}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select category</option>
                <option value="meat">Meat</option>
                <option value="fish">Fish</option>
                <option value="dairy">Dairy</option>
                <option value="vegetables">Vegetables & Fruits</option>
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Changing the category updates your profile and can be reviewed by admin.</p>
            </div>
          </>
        );
      case "seller":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
              <input
                type="text"
                name="storeName"
                value={profileData.storeName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
                <button
                  type="button"
                  onClick={() => setShowLicensePanel(v => !v)}
                  className="ml-3 px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
                >{showLicensePanel ? 'Close' : 'Upload/Link'}</button>
              </div>
              <input
                type="text"
                name="businessLicense"
                placeholder="Format: ss100001 (2 letters + 6 digits)"
                value={profileData.businessLicense}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  profileData.businessLicense && !businessLicenseValidation.isValid 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
              />
              {profileData.businessLicense && (
                <p className={`mt-1 text-xs ${
                  businessLicenseValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {businessLicenseValidation.message}
                </p>
              )}

              {showLicensePanel && (
                <div className="mt-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setLicenseMode('image')}
                      className={`px-2 py-1 text-xs rounded border ${licenseMode==='image'?'bg-green-600 text-white border-green-600':'bg-white text-gray-700'}`}
                    >Image</button>
                    <button
                      type="button"
                      onClick={() => setLicenseMode('pdf')}
                      className={`px-2 py-1 text-xs rounded border ${licenseMode==='pdf'?'bg-green-600 text-white border-green-600':'bg-white text-gray-700'}`}
                    >PDF</button>
                    <button
                      type="button"
                      onClick={() => setLicenseMode('link')}
                      className={`px-2 py-1 text-xs rounded border ${licenseMode==='link'?'bg-green-600 text-white border-green-600':'bg-white text-gray-700'}`}
                    >Link</button>
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs text-gray-600 mb-1">License Number</label>
                    <input
                      type="text"
                      value={licenseForm.licenseNumber}
                      onChange={(e) => setLicenseForm(f => ({ ...f, licenseNumber: e.target.value }))}
                      placeholder="AB123456"
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  {licenseMode !== 'link' && (
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 mb-1">{licenseMode.toUpperCase()} File</label>
                      <input
                        type="file"
                        accept={licenseMode==='pdf' ? 'application/pdf' : 'image/*'}
                        onChange={(e) => setLicenseForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                        className="w-full text-sm"
                      />
                    </div>
                  )}

                  {licenseMode === 'link' && (
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 mb-1">External URL</label>
                      <input
                        type="url"
                        value={licenseForm.link}
                        onChange={(e) => setLicenseForm(f => ({ ...f, link: e.target.value }))}
                        placeholder="https://..."
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      disabled={licenseLoading}
                      onClick={async () => {
                        try {
                          setLicenseLoading(true);
                          const lic = (licenseForm.licenseNumber || '').trim();
                          if (!/^[A-Za-z]{2}\d{6}$/.test(lic)) {
                            alert('License number must be 2 letters followed by 6 digits (e.g., AB123456)');
                            return;
                          }
                          if (licenseMode === 'link') {
                            if (!/^https?:\/\//i.test(licenseForm.link || '')) {
                              alert('Please enter a valid URL starting with http(s)://');
                              return;
                            }
                            await uploadLicenseLink({ licenseNumber: lic, licenseUrl: licenseForm.link.trim() });
                          } else {
                            if (!licenseForm.file) {
                              alert('Please choose a file.');
                              return;
                            }
                            const fd = new FormData();
                            fd.append('licenseNumber', lic);
                            fd.append('licenseFile', licenseForm.file);
                            await uploadLicense(fd);
                          }
                          alert('Submitted. Status set to pending.');
                        } catch (e) {
                          alert(e.message || 'Failed to submit license');
                        } finally {
                          setLicenseLoading(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded bg-green-600 text-white text-xs disabled:bg-green-400"
                    >{licenseLoading ? 'Submitting…' : 'Submit'}</button>
                    <button
                      type="button"
                      onClick={() => setShowLicensePanel(false)}
                      className="px-3 py-1.5 rounded border text-xs"
                    >Close</button>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Address</label>
              <textarea
                name="storeAddress"
                value={profileData.storeAddress}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Category</label>
              <select
                name="sellerCategory"
                value={profileData.sellerCategory}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select category</option>
                <option value="fruits">Fruits</option>
                <option value="vegetables">Vegetables</option>
                <option value="seafood">Seafood (Fish)</option>
                <option value="meat">Meat</option>
                <option value="dairy">Dairy</option>
                <option value="ready-to-cook">Ready to Cook</option>
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Changing the category updates your profile and can be reviewed by admin.</p>
            </div>

            {/* Seller Unique Number (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seller Unique Number</label>
              <input
                type="text"
                value={profileData.sellerUniqueNumber || '— will generate on upgrade —'}
                disabled
                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">This ID is auto-generated and cannot be edited.</p>
            </div>

            
          </>
        );
      case "delivery":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
              <select
                name="vehicleType"
                value={profileData.vehicleType}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Vehicle Type</option>
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={profileData.licenseNumber}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </>
        );
      case "admin":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Level</label>
            <select
              name="adminLevel"
              value={profileData.adminLevel}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select Admin Level</option>
              <option value="support">Support</option>
              <option value="manager">Manager</option>
              <option value="super">Super Admin</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">User Profile</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                {getUserRole()} Account
              </span>
            </div>
          </div>
          
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Email Verification Banner - hide for admins */}
        {getUserRole() !== 'admin' && needsEmailVerification() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="text-yellow-800 font-medium">Email Verification Required</span>
                  <p className="text-yellow-700 text-sm">Please verify your email address to access all features.</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={checkEmailVerification}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Check Status
                </button>
                <button
                  onClick={handleEmailVerification}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Resend Verification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {["profile", "addresses", "security"].filter(tab => {
                const role = getUserRole();
                if (role === 'admin') return tab !== 'addresses';
                if (role === 'seller') return tab !== 'addresses';
                return true;
              }).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Image Upload Section - hide for admins */}
                {getUserRole() !== 'admin' && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-center">Profile Picture</h3>
                    <ProfileImageUpload 
                      currentImageUrl={profileData.profilePicture}
                      onImageUpdate={handleImageUpdate}
                    />
                  </div>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={currentUser.email}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Hide certain fields for admins and for sellers */}
                  {getUserRole() !== 'admin' && getUserRole() !== 'seller' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={profileData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        <select
                          name="gender"
                          value={profileData.gender}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture URL</label>
                        <input
                          type="url"
                          name="profilePicture"
                          value={profileData.profilePicture}
                          onChange={handleInputChange}
                          placeholder="https://example.com/image.jpg"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Note: Use a direct image URL (jpg, jpeg, png, webp). Non-customer roles may require admin verification. Admin accounts do not require verification. Paste a valid link and click Update to save.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Role-specific fields */}
                  {renderRoleSpecificFields()}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                  >
                    {loading ? "Updating..." : "Update Profile"}
                  </button>
                </div>
              </form>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h3>
                  
                  <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address Type</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">House/Building</label>
                      <input
                        type="text"
                        name="house"
                        value={newAddress.house}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />

                      <label className="block text-sm font-medium text-gray-700 mb-2 mt-3">Street Address</label>
                      <input
                        type="text"
                        name="street"
                        value={newAddress.street}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={newAddress.city}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        name="state"
                        value={newAddress.state}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={newAddress.zipCode}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        name="country"
                        value={newAddress.country}
                        onChange={handleAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isDefault"
                          checked={newAddress.isDefault}
                          onChange={handleAddressChange}
                          className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Set as default address</span>
                      </label>
                    </div>

                    <div className="md:col-span-2 flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                      >
                        {loading ? "Saving..." : (editingAddress ? "Update Address" : "Add Address")}
                      </button>
                      
                      {editingAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(null);
                            setNewAddress({
                              type: "home",
                              street: "",
                              city: "",
                              state: "",
                              zipCode: "",
                              country: "India",
                              isDefault: false
                            });
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Existing Addresses */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Addresses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address, index) => (
                      <div key={address._id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {address.type}
                          </span>
                          {address.isDefault && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <p>{address.house ? `${address.house}, ` : ''}{address.street}</p>
                          <p>{address.city}, {address.state} {address.zipCode}</p>
                          <p>{address.country}</p>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAddress(address)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address._id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Account Security</h3>
                  
                  <div className="space-y-4">
                    {getUserRole() !== 'admin' && (
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <h4 className="font-medium text-gray-900">Email Verification</h4>
                        <p className="text-sm text-gray-600">
                          {!needsEmailVerification() 
                            ? (getUserProfile()?.provider === 'google' 
                                ? "Email verified via Google" 
                                : "Your email is verified"
                              )
                            : "Please verify your email address"
                          }
                        </p>
                        {needsEmailVerification() && (
                          <p className="text-xs text-gray-500 mt-1">
                            Check your inbox and spam folder for the verification email
                          </p>
                        )}
                      </div>
                      {needsEmailVerification() && (
                        <div className="flex space-x-2">
                          <button
                            onClick={checkEmailVerification}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            Check Status
                          </button>
                          <button
                            onClick={handleEmailVerification}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            Resend Email
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                    

                    {/* Password Change Form */}
                    {getUserProfile()?.provider === 'email' && (
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <input
                              type="password"
                              name="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                              type="password"
                              name="newPassword"
                              value={passwordData.newPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              required
                              minLength="6"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              required
                              minLength="6"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                          >
                            {passwordLoading ? "Changing Password..." : "Change Password"}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Google Sign-In Users */}
                    {getUserProfile()?.provider === 'google' && (
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-medium text-gray-900">Password Management</h4>
                        <p className="text-sm text-gray-600">You signed in with Google. Password management is handled by Google.</p>
                        <div className="mt-2 flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-green-600">Secured by Google</span>
                        </div>
                      </div>
                    )}

                    {/* Danger zone: Delete account (except admin) */}
                    {getUserRole() !== 'admin' && (
                      <div className="p-4 bg-white rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-700 mb-1">Danger Zone</h4>
                        <p className="text-sm text-gray-600 mb-3">Delete your account and all your data. This action is irreversible.</p>
                        <button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Delete Account</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;