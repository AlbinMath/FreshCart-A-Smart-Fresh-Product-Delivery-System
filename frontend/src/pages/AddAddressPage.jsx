import { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Building, Navigation } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MapPicker } from "../components/MapPicker";
import { addressService } from '../../../backend/services/addressService';
import { useAuth } from '../contexts/AuthContext';

export function AddAddressPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!location.state?.address;
  const [newAddress, setNewAddress] = useState({
    type: "home",
    name: "",
    phone: "",
    address: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    coordinates: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && location.state.address) {
      setNewAddress(location.state.address);
    }
  }, [isEdit, location.state]);

  const handleSubmitAddress = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      if (isEdit) {
        await addressService.updateAddress(currentUser.uid, newAddress._id, newAddress);
      } else {
        await addressService.addAddress(currentUser.uid, {
          ...newAddress,
          isDefault: false // You can modify this logic as needed
        });
      }
      navigate('/address-confirmation');
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'adding'} address:`, err);
      setError(`Failed to ${isEdit ? 'update' : 'add'} address`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = newAddress.name && newAddress.phone && newAddress.address && newAddress.city && newAddress.state && newAddress.pincode;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">{isEdit ? 'Edit Address' : 'Add New Address'}</h1>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
              <div>
                <Label>Address Type</Label>
                <Select value={newAddress.type} onValueChange={(value) => setNewAddress({...newAddress, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Home
                      </div>
                    </SelectItem>
                    <SelectItem value="work">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Work
                      </div>
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                  placeholder="Enter complete address"
                />
              </div>
              <div>
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  value={newAddress.landmark}
                  onChange={(e) => setNewAddress({...newAddress, landmark: e.target.value})}
                  placeholder="Near xyz building"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                  placeholder="110001"
                />
              </div>

              {/* Coordinates Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <Label className="text-base font-medium">Location Coordinates</Label>
                </div>
                <MapPicker
                  onLocationSelect={(coordinates) => setNewAddress({...newAddress, coordinates})}
                  initialLocation={newAddress.coordinates}
                  className="border rounded-lg p-4"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <Button
                onClick={handleSubmitAddress}
                className="w-full"
                disabled={!isFormValid || loading}
              >
                {loading ? (isEdit ? 'Updating Address...' : 'Adding Address...') : (isEdit ? 'Update Address' : 'Add Address')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddAddressPage;