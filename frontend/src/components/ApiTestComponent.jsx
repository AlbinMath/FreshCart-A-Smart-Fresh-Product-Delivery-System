import React, { useState, useEffect } from 'react';
import { testApiConnection } from '../utils/apiTest';

const ApiTestComponent = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    // Run test on component mount
    runTest();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">API Connection Test</h2>
      <button 
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-4 rounded bg-white shadow">
          <h3 className="font-bold mb-2">Test Result:</h3>
          <p className={`font-bold ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
            Status: {testResult.success ? 'Success' : 'Failed'}
          </p>
          <p>Base URL: {testResult.baseURL}</p>
          {testResult.response && (
            <div className="mt-2">
              <p>Response:</p>
              <pre className="text-sm bg-gray-200 p-2 rounded overflow-auto">
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </div>
          )}
          {testResult.error && (
            <p className="text-red-600">Error: {testResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiTestComponent;