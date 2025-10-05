import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DeliveryVerificationPage() {
  const { currentUser, getUserProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    drivingLicense: {
      licenseNumber: '',
      expiryDate: ''
    },
    vehicle: {
      type: 'bike',
      registrationNumber: '',
      make: '',
      model: '',
      year: '',
      color: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phoneNumber: ''
    }
  });

  const vehicleTypes = [
    { value: 'bike', label: 'Motorcycle/Bike' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'car', label: 'Car' },
    { value: 'van', label: 'Van' },
    { value: 'truck', label: 'Truck' },
    { value: 'bicycle', label: 'Bicycle' }
  ];

  const documentTypes = {
    license: {
      front: { label: 'License Front', required: true },
      back: { label: 'License Back', required: true }
    },
    vehicle: {
      front: { label: 'Vehicle Front', required: true },
      back: { label: 'Vehicle Back', required: true },
      rc: { label: 'Registration Certificate', required: true }
    }
  };

  useEffect(() => {
    const profile = getUserProfile();
    if (!currentUser || profile?.role !== 'delivery') {
      navigate('/login');
      return;
    }
    loadVerificationData();
  }, [currentUser]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/delivery-verification/${currentUser.uid}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.data.exists && data.data.verification) {
          setVerification(data.data.verification);
          // Populate form with existing data
          setFormData({
            fullName: data.data.verification.fullName || '',
            phoneNumber: data.data.verification.phoneNumber || '',
            address: data.data.verification.address || '',
            drivingLicense: {
              licenseNumber: data.data.verification.drivingLicense?.licenseNumber || '',
              expiryDate: data.data.verification.drivingLicense?.expiryDate ? 
                new Date(data.data.verification.drivingLicense.expiryDate).toISOString().split('T')[0] : ''
            },
            vehicle: {
              type: data.data.verification.vehicle?.type || 'bike',
              registrationNumber: data.data.verification.vehicle?.registrationNumber || '',
              make: data.data.verification.vehicle?.make || '',
              model: data.data.verification.vehicle?.model || '',
              year: data.data.verification.vehicle?.year || '',
              color: data.data.verification.vehicle?.color || ''
            },
            emergencyContact: {
              name: data.data.verification.emergencyContact?.name || '',
              relationship: data.data.verification.emergencyContact?.relationship || '',
              phoneNumber: data.data.verification.emergencyContact?.phoneNumber || ''
            }
          });
        }
      } else {
        console.warn('No verification data found, starting fresh');
      }
    } catch (error) {
      console.error('Error loading verification data:', error);
      setMessage('Error loading verification data. You can still proceed with new verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    if (keys.length === 1) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (keys.length === 2) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
      }));
    }
  };

  const saveFormData = async () => {
    try {
      setLoading(true);
      
      // Ensure we have minimum required data
      const dataToSave = {
        ...formData,
        fullName: formData.fullName || 'Delivery Partner', // Default name if empty
        phoneNumber: formData.phoneNumber || '', 
        address: formData.address || 'Address to be updated'
      };

      const response = await fetch(`http://localhost:5000/api/delivery-verification/${currentUser.uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        setMessage('Information saved successfully');
        await loadVerificationData();
        return true;
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to save information');
        return false;
      }
    } catch (error) {
      console.error('Error saving form data:', error);
      setMessage('Error saving information');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (documentType, imageType, file) => {
    try {
      const progressKey = `${documentType}-${imageType}`;
      setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

      // First, ensure basic verification data is saved
      if (!verification || !verification.fullName) {
        console.log('💾 Saving basic form data before upload...');
        await saveFormData();
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('imageType', imageType);

      const response = await fetch(`http://localhost:5000/api/delivery-verification/${currentUser.uid}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setMessage(`${documentTypes[documentType][imageType].label} uploaded successfully`);
        await loadVerificationData();
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setMessage('Upload failed');
    } finally {
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[`${documentType}-${imageType}`];
        return updated;
      });
    }
  };

  const deleteDocument = async (documentType, imageType) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/delivery-verification/${currentUser.uid}/document?documentType=${documentType}&imageType=${imageType}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setMessage('Document deleted successfully');
        await loadVerificationData();
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setMessage('Error deleting document');
    }
  };

  const submitForReview = async () => {
    if (!verification?.isComplete) {
      setMessage('Please upload all required documents before submitting');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/delivery-verification/${currentUser.uid}/submit`, {
        method: 'POST'
      });

      if (response.ok) {
        setMessage('Verification submitted for review successfully!');
        await loadVerificationData();
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to submit for review');
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      setMessage('Error submitting for review');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-800 bg-green-100';
      case 'rejected': return 'text-red-800 bg-red-100';
      case 'under_review': return 'text-yellow-800 bg-yellow-100';
      case 'resubmission_required': return 'text-orange-800 bg-orange-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const DocumentUpload = ({ documentType, imageType, document }) => {
    const progressKey = `${documentType}-${imageType}`;
    const isUploading = uploadProgress[progressKey] !== undefined;
    const hasDocument = document && document.filename;

    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">
            {documentTypes[documentType][imageType].label}
            {documentTypes[documentType][imageType].required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </h4>
          {hasDocument && (
            <span className="text-green-600 text-sm">✓ Uploaded</span>
          )}
        </div>

        {hasDocument ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <img 
                src={document.url} 
                alt={documentTypes[documentType][imageType].label}
                className="w-full max-w-xs h-32 object-cover rounded cursor-pointer hover:opacity-80"
                onClick={() => window.open(document.url, '_blank')}
              />
              <p className="text-sm text-gray-600 mt-2">
                {document.filename} ({(document.size / 1024).toFixed(1)} KB)
              </p>
              <p className="text-xs text-gray-500">
                Uploaded: {new Date(document.uploadedAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => deleteDocument(documentType, imageType)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete Document
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Check file size (5MB limit)
                  if (file.size > 5 * 1024 * 1024) {
                    setMessage('File size must be less than 5MB');
                    return;
                  }
                  uploadDocument(documentType, imageType, file);
                }
              }}
              disabled={isUploading}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {isUploading && (
              <div className="mt-2">
                <div className="text-sm text-gray-600">Uploading...</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && !verification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/delivery/profile')}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Verification</h1>
                <p className="text-sm text-gray-600">Upload your documents to get verified as a delivery partner</p>
              </div>
            </div>
            {verification && (
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verification.status)}`}>
                  {verification.readableStatus || verification.status}
                </span>
                {verification.completionPercentage !== undefined && (
                  <p className="text-sm text-gray-600 mt-1">
                    {verification.completionPercentage}% Complete
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Alert */}
        {verification && verification.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Verification Rejected</h3>
                <p className="text-sm text-red-700 mt-1">{verification.rejectionReason || verification.reviewComments}</p>
                <p className="text-sm text-red-600 mt-2">Please reupload the required documents and resubmit.</p>
              </div>
            </div>
          </div>
        )}

        {verification && verification.status === 'resubmission_required' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Resubmission Required</h3>
                <p className="text-sm text-orange-700 mt-1">{verification.rejectionReason || verification.reviewComments}</p>
                <p className="text-sm text-orange-600 mt-2">Please address the issues and resubmit your verification.</p>
              </div>
            </div>
          </div>
        )}

        {verification && verification.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Verification Approved!</h3>
                <p className="text-sm text-green-700 mt-1">Your verification has been approved. You can now access the delivery dashboard and accept orders.</p>
                {verification.reviewComments && (
                  <p className="text-sm text-green-600 mt-2">Admin Comments: {verification.reviewComments}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Driving License Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Driving License Information</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                  <input
                    type="text"
                    name="drivingLicense.licenseNumber"
                    value={formData.drivingLicense.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    name="drivingLicense.expiryDate"
                    value={formData.drivingLicense.expiryDate}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <h3 className="text-lg font-medium mb-4">License Documents</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <DocumentUpload 
                  documentType="license" 
                  imageType="front" 
                  document={verification?.drivingLicense?.frontImage} 
                />
                <DocumentUpload 
                  documentType="license" 
                  imageType="back" 
                  document={verification?.drivingLicense?.backImage} 
                />
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                  <select
                    name="vehicle.type"
                    value={formData.vehicle.type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                  <input
                    type="text"
                    name="vehicle.registrationNumber"
                    value={formData.vehicle.registrationNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    name="vehicle.make"
                    value={formData.vehicle.make}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="vehicle.model"
                    value={formData.vehicle.model}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    name="vehicle.year"
                    value={formData.vehicle.year}
                    onChange={handleInputChange}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="vehicle.color"
                    value={formData.vehicle.color}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <h3 className="text-lg font-medium mb-4">Vehicle Documents</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <DocumentUpload 
                  documentType="vehicle" 
                  imageType="front" 
                  document={verification?.vehicle?.frontImage} 
                />
                <DocumentUpload 
                  documentType="vehicle" 
                  imageType="back" 
                  document={verification?.vehicle?.backImage} 
                />
                <DocumentUpload 
                  documentType="vehicle" 
                  imageType="rc" 
                  document={verification?.vehicle?.rcImage} 
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    name="emergencyContact.relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="emergencyContact.phoneNumber"
                    value={formData.emergencyContact.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Verification Progress</h3>
              {verification && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Overall Progress</span>
                      <span>{verification.completionPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${verification.completionPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${verification.drivingLicense?.frontImage?.filename ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>License Front Image</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${verification.drivingLicense?.backImage?.filename ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>License Back Image</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${verification.vehicle?.frontImage?.filename ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Vehicle Front Image</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${verification.vehicle?.backImage?.filename ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Vehicle Back Image</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${verification.vehicle?.rcImage?.filename ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Registration Certificate</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={saveFormData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Information'}
                </button>
                
                {verification && verification.isComplete && verification.status !== 'under_review' && verification.status !== 'approved' && (
                  <button
                    onClick={submitForReview}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                )}

                {verification && verification.status === 'approved' && (
                  <button
                    onClick={() => navigate('/delivery/dashboard')}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Requirements</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• All images must be clear and readable</p>
                <p>• File size limit: 5MB per image</p>
                <p>• Accepted formats: JPG, PNG, GIF</p>
                <p>• License must be valid and not expired</p>
                <p>• Vehicle registration must be current</p>
                <p>• Upload: License (front & back), Vehicle (front & back), Registration certificate</p>
                <p>• All required fields must be completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="fixed bottom-4 right-4 max-w-sm">
            <div className={`p-4 rounded-lg shadow-lg ${message.includes('Error') || message.includes('failed') || message.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
