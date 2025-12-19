import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Package, Truck, CreditCard, Check, 
  ArrowLeft, ChevronRight, Loader2, AlertCircle,
  MapPin, Mail, User as UserIcon, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cartItems, cartTotal, clearCart } = useCart();
  
  const [step, setStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && !orderComplete) {
      toast.error('Your cart is empty');
      navigate(createPageUrl('Home'));
    }
  }, [cartItems, navigate, orderComplete]);

  // Load user data if available
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setCustomerInfo(prev => ({
            ...prev,
            name: user.full_name || '',
            email: user.email || '',
          }));
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Calculate shipping: $4.75 for first item, $2.50 for each additional
  const calculateShipping = () => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems === 0) return 0;
    return 4.75 + (totalItems - 1) * 2.50;
  };

  const shipping = calculateShipping();
  
  // Calculate discount
  const discountAmount = appliedDiscount 
    ? (appliedDiscount.type === 'percentage' 
        ? (cartTotal * appliedDiscount.value / 100) 
        : appliedDiscount.value)
    : 0;
  
  const total = cartTotal + shipping - discountAmount;

  // Create orders mutation
  const createOrdersMutation = useMutation({
    mutationFn: async () => {
      const orders = [];
      
      // Create an order for each cart item
      for (const item of cartItems) {
        const price = typeof item.design.price === 'number' 
          ? item.design.price 
          : parseFloat(item.design.price || 0);
          
        const order = await base44.entities.Order.create({
          design_id: item.design.id,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          shipping_address: {
            line1: customerInfo.line1,
            line2: customerInfo.line2,
            city: customerInfo.city,
            state: customerInfo.state,
            postal_code: customerInfo.postal_code,
            country: customerInfo.country,
          },
          product_type: item.design.product_type || 'tshirt',
          size: item.size,
          quantity: item.quantity,
          total_amount: price * item.quantity,
          status: 'pending', // Will be 'paid' after Stripe integration
        });

        // Update design sales count and publish it
        await base44.entities.Design.update(item.design.id, {
          sales_count: (item.design.sales_count || 0) + item.quantity,
          is_published: true,
        });

        orders.push(order);
      }

      return orders;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['designs']);
      clearCart(); // Clear the cart
      setOrderComplete(true);
    },
    onError: (err) => {
      toast.error('Failed to process order. Please try again.');
      console.error(err);
    },
  });

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const canProceedStep2 = customerInfo.name && customerInfo.email && 
    customerInfo.phone && customerInfo.line1 && customerInfo.city && 
    customerInfo.state && customerInfo.postal_code;

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setIsCheckingDiscount(true);
    
    // Valid discount codes
    const validCodes = {
      'KNOCKOUT10': { type: 'percentage', value: 10, description: '10% off' },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const code = validCodes[discountCode.toUpperCase()];
    
    if (code) {
      setAppliedDiscount({ ...code, code: discountCode.toUpperCase() });
      toast.success(`Discount applied: ${code.description}`, {
        duration: 3000,
      });
    } else {
      toast.error('Invalid discount code');
    }
    
    setIsCheckingDiscount(false);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    toast.info('Discount removed');
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Order Confirmed!</h2>
          <p className="text-gray-400 mb-8">
            Thanks for your purchase! You'll receive a confirmation email shortly. 
            Your knockout merch is on its way!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('Home')}>
              <Button className="bg-red-600 hover:bg-red-700">
                Browse More Designs
              </Button>
            </Link>
            <Link to={createPageUrl('DesignStudio')}>
              <Button variant="outline" className="border-gray-700 text-white">
                Create Your Own
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Order Summary (Sticky) */}
          <div className="lg:order-2">
            <Card className="bg-gray-900 border-gray-800 overflow-hidden sticky top-24">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-red-500" />
                  Order Summary ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Cart Items */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {cartItems.map((item, index) => {
                    const price = typeof item.design.price === 'number' 
                      ? item.design.price 
                      : parseFloat(item.design.price || 0);
                    
                    return (
                      <div key={`${item.design.id}-${item.size}`} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                          {item.design.mockup_urls?.[0] ? (
                            <img 
                              src={item.design.mockup_urls[0]} 
                              alt={item.design.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm truncate">{item.design.title}</h4>
                          <p className="text-gray-400 text-xs capitalize">
                            {item.design.product_type} • {item.design.selectedColor || 'Black'} • Size {item.size}
                          </p>
                          <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-sm">${(price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="bg-gray-800 mb-4" />

                {/* Discount Code Section */}
                <div className="mb-4">
                  <Label className="text-gray-400 mb-2 block">Discount Code</Label>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between p-3 bg-green-600/10 border border-green-600/30 rounded-lg">
                      <div>
                        <p className="text-green-400 font-semibold">{appliedDiscount.code}</p>
                        <p className="text-green-400/70 text-xs">{appliedDiscount.description}</p>
                      </div>
                      <button
                        onClick={handleRemoveDiscount}
                        className="text-gray-400 hover:text-white text-sm underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyDiscount()}
                        placeholder="Enter code"
                        className="bg-gray-800 border-gray-700 text-white uppercase"
                        disabled={isCheckingDiscount}
                      />
                      <Button
                        onClick={handleApplyDiscount}
                        disabled={isCheckingDiscount || !discountCode.trim()}
                        variant="outline"
                        className="border-gray-700 text-white hover:bg-gray-800 whitespace-nowrap"
                      >
                        {isCheckingDiscount ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-800 mb-4" />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <div>
                      <p>Shipping</p>
                      <p className="text-xs text-gray-500">
                        ($4.75 first + $2.50 each additional)
                      </p>
                    </div>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="bg-gray-800" />
                  <div className="flex justify-between text-white text-2xl font-black pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* US Shipping Notice */}
                <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                  <p className="text-blue-400 text-xs flex items-start gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>We currently ship within the United States only.</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right - Checkout Flow */}
          <div className="lg:order-1 space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2].map((s) => (
                <React.Fragment key={s}>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      step >= s 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 2 && (
                    <div className={`flex-1 h-0.5 ${step > s ? 'bg-red-600' : 'bg-gray-800'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Shipping Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-red-500" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Full Name *</Label>
                        <Input
                          value={customerInfo.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="John Doe"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Email *</Label>
                        <Input
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="john@example.com"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400">Phone Number *</Label>
                      <Input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    
                    <Separator className="bg-gray-800" />

                    {/* Address */}
                    <div>
                      <Label className="text-gray-400">Street Address *</Label>
                      <Input
                        value={customerInfo.line1}
                        onChange={(e) => handleInputChange('line1', e.target.value)}
                        placeholder="123 Main Street"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-400">Apartment, suite, etc. (Optional)</Label>
                      <Input
                        value={customerInfo.line2}
                        onChange={(e) => handleInputChange('line2', e.target.value)}
                        placeholder="Apt 4B"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-400">City *</Label>
                        <Input
                          value={customerInfo.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="New York"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">State *</Label>
                        <select
                          value={customerInfo.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white mt-1"
                        >
                          <option value="">Select...</option>
                          {US_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-gray-400">ZIP Code *</Label>
                        <Input
                          value={customerInfo.postal_code}
                          onChange={(e) => handleInputChange('postal_code', e.target.value)}
                          placeholder="10001"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-400">Country</Label>
                      <Input
                        value="United States"
                        disabled
                        className="bg-gray-800 border-gray-700 text-gray-500 mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceedStep2}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 mt-4"
                    >
                      Continue to Review
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Review & Complete */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-red-500" />
                      Review Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Shipping Details Review */}
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-semibold">Shipping To</span>
                      </div>
                      <p className="text-white font-medium">{customerInfo.name}</p>
                      <p className="text-gray-400 text-sm">{customerInfo.email}</p>
                      <p className="text-gray-400 text-sm">{customerInfo.phone}</p>
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-gray-300 text-sm">
                          {customerInfo.line1}{customerInfo.line2 && `, ${customerInfo.line2}`}
                        </p>
                        <p className="text-gray-300 text-sm">
                          {customerInfo.city}, {customerInfo.state} {customerInfo.postal_code}
                        </p>
                        <p className="text-gray-300 text-sm">United States</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 border-gray-700 text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={() => createOrdersMutation.mutate()}
                        disabled={createOrdersMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6"
                      >
                        {createOrdersMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Complete Order • ${total.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Demo mode - Stripe payment will be added next
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
