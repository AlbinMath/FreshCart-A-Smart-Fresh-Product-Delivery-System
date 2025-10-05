import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDeliveryVerification() {
  const { currentUser, getUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [message, setMessage] = useState('');

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'resubmission_required', label: 'Resubmission Required' }
  ];

  useEffect(() => {
    const profile = getUserProfile();
    if (!currentUser || profile?.role !== 'admin') {
      return;
    }
    loadVerifications();
    loadStats();
  }, [currentUser, filters]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const res = await fetch(`http://localhost:5000/api/delivery-verification/admin/all?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.data.verifications || []);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error loading verifications:', error);
      setMessage('Error loading verifications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/delivery-verification/admin/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleReview = async (verificationId, action, comments) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/delivery-verification/admin/review/${verificationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comments,
          rejectionReason: action === 'reject' || action === 'request_resubmission' ? comments : ''
        })
      });

      if (res.ok) {
        setMessage(`Verification ${action}d successfully`);
        setSelectedVerification(null);
        setReviewAction('');
        setReviewComments('');
        await loadVerifications();
        await loadStats();
      } else {
        const errorData = await res.json();
        setMessage(errorData.message || 'Failed to review verification');
      }
    } catch (error) {
      console.error('Error reviewing verification:', error);
      setMessage('Error reviewing verification');
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
      case 'pending': return 'text-blue-800 bg-blue-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const DocumentViewer = ({ document, title }) => {
    if (!document || !document.filename) {
      return (
        <div className="border rounded-lg p-4 text-center text-gray-500">
          <p>{title}</p>
          <p className="text-sm">Not uploaded</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
        <img 
          src={document.url} 
          alt={title}
          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
          onClick={() => window.open(document.url, '_blank')}
        />
        <p className="text-sm text-gray-600 mt-2">
          {document.filename} ({(document.size / 1024).toFixed(1)} KB)
        </p>
        <p className="text-xs text-gray-500">
          Uploaded: {new Date(document.uploadedAt).toLocaleString()}
        </p>
      </div>
    );
  };

  const VerificationDetailModal = ({ verification, onClose }) => {
    if (!verification) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto m-4">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Verification Details</h2>
                <p className="text-gray-600">{verification.fullName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verification.status)}`}>
                  {verification.readableStatus || verification.status}
                </span>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {verification.fullName}</div>
                    <div><strong>Phone:</strong> {verification.phoneNumber}</div>
                    <div><strong>Address:</strong> {verification.address}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Driving License</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>License Number:</strong> {verification.drivingLicense?.licenseNumber}</div>
                    <div><strong>Expiry Date:</strong> {verification.drivingLicense?.expiryDate ? new Date(verification.drivingLicense.expiryDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Vehicle Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Type:</strong> {verification.vehicle?.type}</div>
                    <div><strong>Registration:</strong> {verification.vehicle?.registrationNumber}</div>
                    <div><strong>Make:</strong> {verification.vehicle?.make || 'N/A'}</div>
                    <div><strong>Model:</strong> {verification.vehicle?.model || 'N/A'}</div>
                    <div><strong>Year:</strong> {verification.vehicle?.year || 'N/A'}</div>
                    <div><strong>Color:</strong> {verification.vehicle?.color || 'N/A'}</div>
                  </div>
                </div>

                {verification.emergencyContact?.name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Emergency Contact</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {verification.emergencyContact.name}</div>
                      <div><strong>Relationship:</strong> {verification.emergencyContact.relationship}</div>
                      <div><strong>Phone:</strong> {verification.emergencyContact.phoneNumber}</div>
                    </div>
                  </div>
                )}

                {/* Review Section */}
                {verification.status !== 'approved' && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Review Action</h3>
                    <div className="space-y-3">
                      <select
                        value={reviewAction}
                        onChange={(e) => setReviewAction(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">Select Action</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                        <option value="request_resubmission">Request Resubmission</option>
                      </select>
                      
                      <textarea
                        placeholder="Comments (required for rejection/resubmission)"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        rows="3"
                      />
                      
                      <button
                        onClick={() => handleReview(verification._id, reviewAction, reviewComments)}
                        disabled={!reviewAction || (reviewAction !== 'approve' && !reviewComments) || loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                      >
                        {loading ? 'Processing...' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold mb-4">Uploaded Documents</h3>
                
                {/* License Documents */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Driving License</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <DocumentViewer 
                      document={verification.drivingLicense?.frontImage} 
                      title="License Front" 
                    />
                    <DocumentViewer 
                      document={verification.drivingLicense?.backImage} 
                      title="License Back" 
                    />
                  </div>
                </div>

                {/* Vehicle Documents */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Vehicle Documents</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <DocumentViewer 
                      document={verification.vehicle?.frontImage} 
                      title="Vehicle Front" 
                    />
                    <DocumentViewer 
                      document={verification.vehicle?.backImage} 
                      title="Vehicle Back" 
                    />
                    <DocumentViewer 
                      document={verification.vehicle?.rcImage} 
                      title="Registration Certificate" 
                    />
                  </div>
                </div>

                {/* Review History */}
                {verification.verificationHistory && verification.verificationHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Review History</h4>
                    <div className="space-y-2">
                      {verification.verificationHistory.map((history, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(history.status)}`}>
                              {history.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(history.changedAt).toLocaleString()}
                            </span>
                          </div>
                          {history.comments && (
                            <p className="text-sm text-gray-700 mt-2">{history.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Partner Verification</h1>
          <p className="text-gray-600">Review and approve delivery partner verifications</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.statusCounts.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.statusCounts.under_review}</div>
              <div className="text-sm text-gray-600">Under Review</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{stats.statusCounts.approved}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-red-600">{stats.statusCounts.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.statusCounts.resubmission_required}</div>
              <div className="text-sm text-gray-600">Resubmission Required</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, phone, license number..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', search: '', page: 1, limit: 10 })}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Verifications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading verifications...</p>
                    </td>
                  </tr>
                ) : verifications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No verifications found
                    </td>
                  </tr>
                ) : (
                  verifications.map((verification) => (
                    <tr key={verification._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{verification.fullName}</div>
                          <div className="text-sm text-gray-500">{verification.phoneNumber}</div>
                          <div className="text-sm text-gray-500">{verification.userId?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            License: {verification.drivingLicense?.licenseNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            Vehicle: {verification.vehicle?.type} ({verification.vehicle?.registrationNumber})
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(verification.status)}`}>
                          {verification.readableStatus || verification.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(verification.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedVerification(verification)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{pagination.totalItems}</span>
                    {' '}results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + Math.max(1, pagination.currentPage - 2);
                      if (pageNum > pagination.totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === pagination.currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className="fixed bottom-4 right-4 max-w-sm">
            <div className={`p-4 rounded-lg shadow-lg ${message.includes('Error') || message.includes('failed') || message.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
              <button 
                onClick={() => setMessage('')}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verification Detail Modal */}
      {selectedVerification && (
        <VerificationDetailModal 
          verification={selectedVerification} 
          onClose={() => {
            setSelectedVerification(null);
            setReviewAction('');
            setReviewComments('');
          }} 
        />
      )}
    </div>
  );
}