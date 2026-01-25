import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Package, Truck, CreditCard, Check,
  ArrowLeft, ChevronRight, Loader2, AlertCircle,
  MapPin, Mail, User as UserIcon, Phone, Lock
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import analytics from '@/services/analytics';
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

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
  const [fieldErrors, setFieldErrors] = useState({});

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
        value: cartTotal + shipping - 0.50, // Makes total = $0.50
        description: 'Test discount - $0.50 total'
      },
      'FREE': {
        code: 'FREE',
        type: 'fixed',
        value: cartTotal + shipping, // Makes total = $0.00 (completely free)
        description: 'Free order - no payment required'
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

  // Email validation regex
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle checkout with Stripe
  const handleCheckout = async () => {
    // Validate shipping info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.line1 ||
      !customerInfo.city || !customerInfo.state || !customerInfo.postal_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(customerInfo.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);

    try {
      // If FREE discount code, bypass Stripe and create order directly
      if (appliedDiscount?.code === 'FREE') {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartItems,
            shippingInfo: customerInfo,
          }),
        });

        const result = await response.json();

        if (result.error) {
          toast.error(result.error);
          setIsProcessing(false);
          return;
        }

        // Clear cart and redirect to success page
        clearCart();
        navigate('/checkout/success?session_id=free-order');
        return;
      }

      // Create Stripe Checkout Session
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

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        setIsProcessing(false);
        return;
      }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
      // Set client secret for Stripe Elements
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
      setStep(2);
      setIsProcessing(false);
      
      // Track checkout started
      analytics.checkoutStarted(total, cartItems.reduce((sum, item) => sum + item.quantity, 0));
=======
      // Redirect to Stripe Checkout
      window.location.href = result.url;
>>>>>>> Stashed changes
=======
      // Redirect to Stripe Checkout
      window.location.href = result.url;
>>>>>>> Stashed changes
=======
      // Redirect to Stripe Checkout
      window.location.href = result.url;
>>>>>>> Stashed changes

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process checkout');
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
    
    // Validate email on change
    if (name === 'email') {
      if (value && !isValidEmail(value)) {
        setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: null }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-black pt-16 sm:pt-20 pb-8 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-4 sm:mb-6 text-gray-400 hover:text-white text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            Back to shop
          </Button>
        </Link>

        <h1 className="text-2xl sm:text-4xl font-black text-white mb-6 sm:mb-8 flex items-center">
          <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
          Checkout
        </h1>

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`flex items-center gap-1.5 sm:gap-2 ${step >= 1 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${step >= 1 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {step > 1 ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '1'}
              </div>
              <span className="hidden xs:inline text-sm sm:text-base font-semibold">Shipping</span>
            </div>
            <ChevronRight className="text-gray-600 w-4 h-4 sm:w-5 sm:h-5" />
            <div className={`flex items-center gap-1.5 sm:gap-2 ${step >= 2 ? 'text-red-500' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${step >= 2 ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                2
              </div>
              <span className="hidden xs:inline text-sm sm:text-base font-semibold">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Forms */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Step 1: Shipping Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
=======

=======

>>>>>>> Stashed changes
=======

>>>>>>> Stashed changes
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Shipping Form */}
          <div className="lg:col-span-2 space-y-6">
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
>>>>>>> Stashed changes
                      <div>
                        <Label htmlFor="name" className="text-gray-400 text-sm">Full Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={customerInfo.name}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-gray-400 text-sm">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={customerInfo.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className={`bg-gray-800 border-gray-700 text-white mt-1 ${fieldErrors.email ? 'border-red-500' : ''}`}
                          required
                        />
                        {fieldErrors.email && (
                          <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-gray-400 text-sm">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={customerInfo.phone}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="line1" className="text-gray-400 text-sm">Street Address *</Label>
                      <Input
                        id="line1"
                        name="line1"
                        value={customerInfo.line1}
                        onChange={handleInputChange}
                        placeholder="123 Main St"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="line2" className="text-gray-400 text-sm">Apartment, suite, etc.</Label>
                      <Input
                        id="line2"
                        name="line2"
                        value={customerInfo.line2}
                        onChange={handleInputChange}
                        placeholder="Apt 4B"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="city" className="text-gray-400 text-sm">City *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={customerInfo.city}
                          onChange={handleInputChange}
                          placeholder="New York"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-gray-400 text-sm">State *</Label>
                        <select
                          id="state"
                          name="state"
                          value={customerInfo.state}
                          onChange={handleInputChange}
                          className="w-full h-10 px-3 mt-1 rounded-md bg-gray-800 border border-gray-700 text-white text-sm"
                          required
                        >
                          <option value="">Select...</option>
                          {US_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="postal_code" className="text-gray-400 text-sm">ZIP *</Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          value={customerInfo.postal_code}
                          onChange={handleInputChange}
                          placeholder="10001"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          required
                        />
                      </div>
                    </div>

                    <Button
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                      onClick={() => setStep(2)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-5 sm:py-6 text-sm sm:text-base"
                    >
                      Continue to Payment
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
=======
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
                    >
=======
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
                    >
>>>>>>> Stashed changes
=======
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
                    >
>>>>>>> Stashed changes
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </>
                      )}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                    </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="order-first lg:order-last">
            <Card className="bg-gray-900 border-gray-800 lg:sticky lg:top-24">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white text-lg sm:text-xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2 text-sm sm:text-base">
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

                <div className="flex justify-between text-white text-lg sm:text-xl font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                {/* Discount Code */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                  <Label htmlFor="discount" className="text-gray-400 mb-2 block text-sm">Discount Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="discount"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code"
                      className="bg-gray-700 border-gray-600 text-white flex-1 text-sm"
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
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 sm:px-4"
                      >
                        {isApplyingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                      </Button>
                    ) : (
                      <Button
                        onClick={removeDiscount}
                        variant="outline"
                        className="border-gray-700 text-white hover:bg-gray-700 text-sm px-3 sm:px-4"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {appliedDiscount && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 text-green-400 text-xs sm:text-sm flex items-center gap-1"
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
