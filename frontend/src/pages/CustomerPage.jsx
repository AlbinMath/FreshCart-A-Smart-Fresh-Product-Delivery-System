import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, ArrowLeft, X, MapPin, Eye } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { orderService } from '../../../backend/services/orderService';
import { useAuth } from '../contexts/AuthContext';

export default function CustomerPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const result = await orderService.getUserOrders(currentUser.uid);
        setOrders(result.orders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, navigate]);

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    try {
      setCancellingOrder(orderId);
      const result = await orderService.cancelOrder(orderId, currentUser.uid);

      if (result.success) {
        // Update the local state to reflect the cancelled order
        setOrders(prevOrders => {
          const updatedOrders = { ...prevOrders };
          // Move the cancelled order from processing to cancelled status
          const cancelledOrder = updatedOrders.processing.find(order => order.orderId === orderId);
          if (cancelledOrder) {
            updatedOrders.processing = updatedOrders.processing.filter(order => order.orderId !== orderId);
            cancelledOrder.status = 'Cancelled';
            // Note: We don't add to cancelled array since cancelled orders might not be shown in the same way
          }
          return updatedOrders;
        });
        alert('Order cancelled successfully');
      } else {
        alert(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrder(null);
    }
  };

  const handleTrackOrder = (order) => {
    setTrackingOrder(order);
  };

  const handleCloseTracking = () => {
    setTrackingOrder(null);
  };

  const TrackingModal = ({ order, isOpen, onClose }) => {
    if (!order) return null;

    const formatTimeAgo = (timestamp) => {
      const now = new Date();
      const time = new Date(timestamp);
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    };

    const getStatusSteps = (order) => {
      const timeline = order.statusTimeline || [];
      const steps = [
        { label: 'Order Placed', completed: true },
        { label: 'Order Confirmed', completed: false },
        { label: 'Preparing Order', completed: false },
        { label: 'Out for Delivery', completed: false },
        { label: 'Delivered', completed: false }
      ];

      // Map timeline entries to steps
      timeline.forEach(entry => {
        const stepIndex = steps.findIndex(step => 
          step.label.toLowerCase().includes(entry.status.toLowerCase()) ||
          (entry.status === 'Order Placed' && step.label === 'Order Placed') ||
          (entry.status === 'Order Confirmed' && step.label === 'Order Confirmed') ||
          (entry.status === 'Processing' && step.label === 'Preparing Order') ||
          (entry.status === 'Under Delivery' && step.label === 'Out for Delivery') ||
          (entry.status === 'Completed' && step.label === 'Delivered')
        );
        
        if (stepIndex !== -1) {
          steps[stepIndex].completed = true;
          steps[stepIndex].time = formatTimeAgo(entry.timestamp);
        }
      });

      // Set completion based on current status
      if (order.status === 'Under Delivery') {
        steps[0].completed = true; // Order Placed
        steps[1].completed = true; // Order Confirmed
        steps[2].completed = true; // Preparing Order
      } else if (order.status === 'Completed') {
        steps.forEach(step => step.completed = true);
      }

      return steps;
    };

    const steps = getStatusSteps(order);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Track Order #{order.orderId}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Status Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Order Status</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.completed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${step.completed ? 'text-green-600' : 'text-gray-600'}`}>
                        {step.label}
                      </p>
                      {step.completed && (
                        <p className="text-sm text-gray-500">{step.time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            {(order.status === 'Under Delivery' || order.status === 'Completed') && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Delivery Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Estimated Delivery:</strong> Today, {new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString()}</p>
                  <p><strong>Delivery Partner:</strong> FreshCart Express</p>
                  <p><strong>Current Location:</strong> Near your location</p>
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-3">Order Details</h3>
              <div className="space-y-3">
                {order.products.map((product, index) => (
                  <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                    {/* Product Image */}
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {product.productImage ? (
                        <img
                          src={product.productImage}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-gray-400 text-lg">📦</span>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={product.isVeg ? "secondary" : "destructive"} className="text-xs">
                          {product.isVeg ? 'V' : 'N'}
                        </Badge>
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">₹{product.price} × {product.quantity}</span>
                        <span className="font-medium text-green-600">₹{product.price * product.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-semibold text-lg">₹{order.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{order.deliveryAddress?.name || 'Customer'}</p>
                  <p className="text-gray-600 text-sm">{order.deliveryAddress?.address}</p>
                  {order.deliveryAddress?.landmark && (
                    <p className="text-gray-600 text-sm">Landmark: {order.deliveryAddress.landmark}</p>
                  )}
                  <p className="text-gray-600 text-sm">{order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}</p>
                  <p className="text-gray-600 text-sm">{order.deliveryAddress?.phone}</p>
                </div>
              </div>
            </div>

            {/* Store Details */}
            {order.storeDetails && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Store Information</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Store ID: {order.storeDetails.sellerUid}</p>
                  <p className="text-sm text-gray-600">Collection: {order.storeDetails.sellerCollection}</p>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-3">Payment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>₹{order.totalAmount}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Method:</span>
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Status:</span>
                  <span className={`capitalize ${
                    order.paymentStatus === 'paid' ? 'text-green-600' :
                    order.paymentStatus === 'failed' ? 'text-red-600' :
                    order.paymentStatus === 'refunded' ? 'text-blue-600' :
                    'text-orange-600'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const OrderCard = ({ order, onCancelOrder, onTrackOrder }) => {
    // Check if order can be cancelled (within 6 minutes)
    const canCancel = () => {
      if (order.status !== 'Processing') return false;
      const orderTime = new Date(order.timestamp);
      const now = new Date();
      const sixMinutes = 6 * 60 * 1000; // 6 minutes in milliseconds
      return (now - orderTime) <= sixMinutes;
    };

    const getTimeRemaining = () => {
      if (order.status !== 'Processing') return null;
      const orderTime = new Date(order.timestamp);
      const now = new Date();
      const sixMinutes = 6 * 60 * 1000;
      const timeRemaining = sixMinutes - (now - orderTime);
      
      if (timeRemaining <= 0) return null;
      
      const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
      const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      return `${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')}`;
    };

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-medium">Order #{order.orderId}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.timestamp).toLocaleDateString()} at {new Date(order.timestamp).toLocaleTimeString()}
              </p>
              {order.status === 'Processing' && getTimeRemaining() && (
                <p className="text-xs text-orange-600 mt-1">
                  Cancel within: {getTimeRemaining()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                order.status === 'Completed' ? 'default' :
                order.status === 'Under Delivery' ? 'secondary' :
                order.status === 'Cancelled' ? 'destructive' : 'outline'
              }>
                {order.status}
              </Badge>
              {(order.status === 'Processing' || order.status === 'Under Delivery') && onTrackOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTrackOrder(order)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Track
                </Button>
              )}
              {canCancel() && onCancelOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelOrder(order.orderId)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

        <div className="space-y-3 mb-4">
          {order.products.slice(0, 2).map((product, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* Product Image */}
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                {product.productImage ? (
                  <img
                    src={product.productImage}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">📦</span>
                )}
              </div>
              
              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={product.isVeg ? "secondary" : "destructive"} className="text-xs">
                    {product.isVeg ? 'V' : 'N'}
                  </Badge>
                  <span className="font-medium text-sm truncate">{product.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{product.category}</span>
                  <span className="text-xs text-gray-600">₹{product.price} × {product.quantity}</span>
                </div>
              </div>
            </div>
          ))}
          {order.products.length > 2 && (
            <p className="text-sm text-gray-500">+{order.products.length - 2} more items</p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              {order.paymentMethod === 'COD' ? (
                <>
                  <Truck className="h-4 w-4" />
                  Cash on Delivery
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Paid Online
                </>
              )}
            </span>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-600">
              Subtotal: ₹{order.subtotal} + Delivery: {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
            </div>
            <div className="font-semibold text-green-600">Total: ₹{order.totalAmount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );}


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const allOrders = [
    ...(orders?.processing || []),
    ...(orders?.underDelivery || []),
    ...(orders?.completed || []),
    ...(orders?.cancelled || [])
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                All Orders ({allOrders.length})
              </TabsTrigger>
              <TabsTrigger value="processing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Processing ({orders?.processing?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="underDelivery" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Under Delivery ({orders?.underDelivery?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed ({orders?.completed?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancelled ({orders?.cancelled?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {allOrders.length > 0 ? (
                allOrders.map(order => (
                  <OrderCard key={order._id} order={order} onCancelOrder={handleCancelOrder} onTrackOrder={handleTrackOrder} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-500 mb-4">Start shopping to see your orders here</p>
                    <Button onClick={() => navigate('/')}>Start Shopping</Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="processing" className="mt-6">
              {orders?.processing?.length > 0 ? (
                orders.processing.map(order => (
                  <OrderCard key={order._id} order={order} onCancelOrder={handleCancelOrder} onTrackOrder={handleTrackOrder} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No processing orders</h3>
                    <p className="text-gray-500">Your orders being prepared will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="underDelivery" className="mt-6">
              {orders?.underDelivery?.length > 0 ? (
                orders.underDelivery.map(order => (
                  <OrderCard key={order._id} order={order} onCancelOrder={null} onTrackOrder={handleTrackOrder} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders under delivery</h3>
                    <p className="text-gray-500">Orders on the way will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {orders?.completed?.length > 0 ? (
                orders.completed.map(order => (
                  <OrderCard key={order._id} order={order} onCancelOrder={null} onTrackOrder={null} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No completed orders</h3>
                    <p className="text-gray-500">Your delivered orders will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-6">
              {orders?.cancelled?.length > 0 ? (
                orders.cancelled.map(order => (
                  <OrderCard key={order._id} order={order} onCancelOrder={null} onTrackOrder={null} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cancelled orders</h3>
                    <p className="text-gray-500">Your cancelled orders will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Tracking Modal */}
          <TrackingModal
            order={trackingOrder}
            isOpen={!!trackingOrder}
            onClose={handleCloseTracking}
          />
        </div>
      </div>
    </div>
  );}
