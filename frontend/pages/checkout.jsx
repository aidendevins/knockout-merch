import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
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
import apiClient from '@/api/apiClient';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  const { cartItems, cartTotal, clearCart } = useCart();
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // Debug logs
  console.log('Checkout mounted');
  console.log('Cart items:', cartItems);
  console.log('Total price:', cartTotal);
  console.log('Stripe key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Missing');

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      console.log('Cart is empty, redirecting...');
      toast.error('Your cart is empty');
      navigate(createPageUrl('Home'));
    }
  }, [cartItems, navigate]);

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
        ? cartTotal * appliedDiscount.value 
        : appliedDiscount.value)
    : 0;
  
  const total = cartTotal + shipping - discountAmount;

  // Apply discount code
  const applyDiscount = () => {
    setIsApplyingDiscount(true);
    const code = discountCode.toUpperCase();
    
    // Valid discount codes
    const validCodes = {
      'KNOCKOUT10': {
        code: 'KNOCKOUT10',
        type: 'percentage',
        value: 0.10,
        description: '10% off your order'
      },
      'TEST99': {
        code: 'TEST99',
        type: 'fixed',
        value: cartTotal + shipping - 1.00, // Makes total = $1
        description: 'Test discount - $1 total'
      }
    };
    
    if (validCodes[code]) {
      setAppliedDiscount(validCodes[code]);
      toast.success('Discount code applied!');
    } else {
      toast.error('Invalid discount code');
      setAppliedDiscount(null);
    }
    setIsApplyingDiscount(false);
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    toast.info('Discount removed');
  };

  // Handle checkout with Stripe
  const handleCheckout = async () => {
    // Validate shipping info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.line1 || 
        !customerInfo.city || !customerInfo.state || !customerInfo.postal_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      // Create checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems,
          shippingInfo: customerInfo,
          discountCode: appliedDiscount?.code || null,
        }),
      });

      const session = await response.json();

      if (session.error) {
        toast.error(session.error);
        setIsProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout (modern approach)
      if (session.url) {
        window.location.href = session.url;
      } else {
        toast.error('Failed to create checkout session');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process checkout');
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to shop
          </Button>
        </Link>

        <h1 className="text-4xl font-black text-white mb-8">
          <ShoppingBag className="w-8 h-8 inline mr-3" />
          Checkout
        </h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {step > 1 ? <Check className="w-5 h-5" /> : '1'}
                  </div>
              <span className="hidden sm:inline font-semibold">Shipping</span>
                  </div>
            <ChevronRight className="text-gray-600" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                2
              </div>
              <span className="hidden sm:inline font-semibold">Payment</span>
                </div>
          </div>
            </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Shipping Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-gray-400">Full Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={customerInfo.name}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-gray-400">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={customerInfo.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-gray-400">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={customerInfo.phone}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="line1" className="text-gray-400">Street Address *</Label>
                      <Input
                        id="line1"
                        name="line1"
                        value={customerInfo.line1}
                        onChange={handleInputChange}
                        placeholder="123 Main St"
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="line2" className="text-gray-400">Apartment, suite, etc.</Label>
                      <Input
                        id="line2"
                        name="line2"
                        value={customerInfo.line2}
                        onChange={handleInputChange}
                        placeholder="Apt 4B"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-gray-400">City *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={customerInfo.city}
                          onChange={handleInputChange}
                          placeholder="New York"
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-gray-400">State *</Label>
                        <select
                          id="state"
                          name="state"
                          value={customerInfo.state}
                          onChange={handleInputChange}
                          className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                          required
                        >
                          <option value="">Select...</option>
                          {US_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="postal_code" className="text-gray-400">ZIP Code *</Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          value={customerInfo.postal_code}
                          onChange={handleInputChange}
                          placeholder="10001"
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                    </div>

                      <Button
                      onClick={() => setStep(2)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
                      >
                        Continue to Payment
                      <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Review & Pay */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Review & Pay
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Shipping Address Review */}
                        <div>
                      <h3 className="text-white font-semibold mb-2">Shipping Address</h3>
                      <div className="text-gray-400 text-sm space-y-1">
                        <p>{customerInfo.name}</p>
                        <p>{customerInfo.line1}</p>
                        {customerInfo.line2 && <p>{customerInfo.line2}</p>}
                        <p>{customerInfo.city}, {customerInfo.state} {customerInfo.postal_code}</p>
                        <p>{customerInfo.email}</p>
                      </div>
                      <Button
                        variant="link"
                        onClick={() => setStep(1)}
                        className="text-red-500 p-0 h-auto mt-2"
                      >
                        Edit
                      </Button>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Cart Items */}
                    <div>
                      <h3 className="text-white font-semibold mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            <img
                              src={item.design.mockup_urls?.[0] || item.design.design_image_url}
                              alt={item.design.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-white font-medium">{item.design.title}</p>
                              <p className="text-gray-400 text-xs capitalize">
                                {item.productType} • {item.color} • {item.size} • Qty: {item.quantity}
                              </p>
                      </div>
                            <p className="text-white font-bold">
                              ${(parseFloat(item.design.price) * item.quantity).toFixed(2)}
                            </p>
                      </div>
                        ))}
                      </div>
                    </div>

                      <Button
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay ${total.toFixed(2)}
                          </>
                        )}
                      </Button>

                    <p className="text-gray-500 text-xs text-center">
                      Secure payment powered by Stripe
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div>
            <Card className="bg-gray-900 border-gray-800 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-800" />

                <div className="flex justify-between text-white text-xl font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                {/* Discount Code */}
                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                  <Label htmlFor="discount" className="text-gray-400 mb-2 block">Discount Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="discount"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code"
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                      disabled={isApplyingDiscount || appliedDiscount}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          applyDiscount();
                        }
                      }}
                    />
                    {!appliedDiscount ? (
                      <Button
                        onClick={applyDiscount}
                        disabled={isApplyingDiscount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isApplyingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                      </Button>
                    ) : (
                      <Button
                        onClick={removeDiscount}
                        variant="outline"
                        className="border-gray-700 text-white hover:bg-gray-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {appliedDiscount && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 text-green-400 text-sm flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>{appliedDiscount.description}</span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
