import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Package, Truck, CreditCard, Check, 
  ArrowLeft, ChevronRight, Loader2, AlertCircle,
  Shirt, User, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const PRODUCT_PRICES = {
  tshirt: 29.99,
  hoodie: 49.99,
};

export default function Checkout() {
  const urlParams = new URLSearchParams(window.location.search);
  const designId = urlParams.get('designId');
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [orderComplete, setOrderComplete] = useState(false);

  // Fetch design
  const { data: design, isLoading, error } = useQuery({
    queryKey: ['design', designId],
    queryFn: async () => {
      const designs = await base44.entities.Design.filter({ id: designId });
      return designs[0];
    },
    enabled: !!designId,
  });

  // Load user data
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const order = await base44.entities.Order.create({
        design_id: designId,
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
        product_type: design?.product_type || 'tshirt',
        size,
        quantity,
        total_amount: (PRODUCT_PRICES[design?.product_type || 'tshirt'] * quantity) + 5.99,
        status: 'paid',
      });

      // Update design sales count and publish it
      await base44.entities.Design.update(designId, {
        sales_count: (design?.sales_count || 0) + quantity,
        is_published: true,
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['designs']);
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

  const canProceedStep2 = size && quantity > 0;
  const canProceedStep3 = customerInfo.name && customerInfo.email && 
    customerInfo.line1 && customerInfo.city && 
    customerInfo.state && customerInfo.postal_code;

  const subtotal = PRODUCT_PRICES[design?.product_type || 'tshirt'] * quantity;
  const shipping = 5.99;
  const total = subtotal + shipping;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Design not found</h2>
          <Link to={createPageUrl('Community')}>
            <Button variant="outline" className="mt-4">
              Browse Designs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <Link to={createPageUrl('Community')}>
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

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Link to={createPageUrl('Community')}>
          <Button variant="ghost" className="text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to designs
          </Button>
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Product preview */}
          <div>
            <Card className="bg-gray-900 border-gray-800 overflow-hidden sticky top-24">
              <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 p-8 flex items-center justify-center">
                {design.mockup_urls?.[0] ? (
                  <img 
                    src={design.mockup_urls[0]} 
                    alt={design.title}
                    className="w-full h-full object-contain"
                  />
                ) : design.design_image_url ? (
                  <div className="relative w-64 h-80 bg-gray-800 rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
                    <img 
                      src={design.design_image_url} 
                      alt={design.title}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-80 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Shirt className="w-24 h-24 text-gray-600" />
                  </div>
                )}
              </div>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-2">{design.title}</h2>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Badge variant="outline" className="border-gray-700 capitalize">
                    {design.product_type || 'T-Shirt'}
                  </Badge>
                  {design.creator_name && (
                    <span>by {design.creator_name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right - Checkout flow */}
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
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
                  {s < 3 && (
                    <div className={`flex-1 h-0.5 ${step > s ? 'bg-red-600' : 'bg-gray-800'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Size & Quantity */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-red-500" />
                      Select Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Size selection */}
                    <div>
                      <Label className="text-gray-400 mb-3 block">Size</Label>
                      <RadioGroup 
                        value={size} 
                        onValueChange={setSize}
                        className="flex gap-2 flex-wrap"
                      >
                        {SIZES.map((s) => (
                          <Label
                            key={s}
                            className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 cursor-pointer transition-all ${
                              size === s 
                                ? 'border-red-500 bg-red-500/20 text-white' 
                                : 'border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            <RadioGroupItem value={s} className="sr-only" />
                            {s}
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-gray-400 mb-3 block">Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="border-gray-700 text-white"
                        >
                          -
                        </Button>
                        <span className="text-white text-xl font-bold w-12 text-center">
                          {quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(quantity + 1)}
                          className="border-gray-700 text-white"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Price summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Shipping</span>
                        <span>${shipping.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white text-xl font-bold pt-2">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceedStep2}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
                    >
                      Continue to Shipping
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
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
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Full Name</Label>
                        <Input
                          value={customerInfo.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Email</Label>
                        <Input
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400">Address Line 1</Label>
                      <Input
                        value={customerInfo.line1}
                        onChange={(e) => handleInputChange('line1', e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-400">Address Line 2 (Optional)</Label>
                      <Input
                        value={customerInfo.line2}
                        onChange={(e) => handleInputChange('line2', e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-400">City</Label>
                        <Input
                          value={customerInfo.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">State</Label>
                        <Input
                          value={customerInfo.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">ZIP Code</Label>
                        <Input
                          value={customerInfo.postal_code}
                          onChange={(e) => handleInputChange('postal_code', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 border-gray-700 text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(3)}
                        disabled={!canProceedStep3}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        Continue to Payment
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-red-500" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Order details */}
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 bg-gray-800/50 rounded-lg">
                        <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                          {design.design_image_url && (
                            <img 
                              src={design.design_image_url} 
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{design.title}</p>
                          <p className="text-gray-400 text-sm capitalize">
                            {design.product_type || 'T-Shirt'} • Size {size} • Qty: {quantity}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Shipping to</span>
                        </div>
                        <p className="text-white">{customerInfo.name}</p>
                        <p className="text-gray-400 text-sm">
                          {customerInfo.line1}{customerInfo.line2 && `, ${customerInfo.line2}`}<br />
                          {customerInfo.city}, {customerInfo.state} {customerInfo.postal_code}
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Price summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Shipping</span>
                        <span>${shipping.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white text-xl font-bold pt-2">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="flex-1 border-gray-700 text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={() => createOrderMutation.mutate()}
                        disabled={createOrderMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6"
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Complete Order • ${total.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Demo checkout - no real payment will be processed
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