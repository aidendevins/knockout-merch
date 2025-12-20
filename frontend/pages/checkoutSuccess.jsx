import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { useCart } from '@/context/CartContext';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    // Clear the cart
    clearCart();

    // Optionally fetch session details
    if (sessionId) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/stripe/session/${sessionId}`)
        .then(res => res.json())
        .then(data => setSessionData(data))
        .catch(err => console.error('Error fetching session:', err));
    }
  }, [sessionId, clearCart]);

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <Card className="bg-gray-900 border-gray-800 text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-black text-white">
              Order Confirmed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-400 text-lg">
              Thank you for your purchase! Your order has been successfully placed.
            </p>

            {sessionData?.customer_details?.email && (
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Mail className="w-5 h-5 text-red-500" />
                <span>
                  Confirmation email sent to <strong>{sessionData.customer_details.email}</strong>
                </span>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3 text-left">
                <Package className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">What's Next?</h3>
                  <p className="text-gray-400 text-sm">
                    Your designs are being prepared for printing. You'll receive tracking information once your order ships.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <Mail className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Check Your Email</h3>
                  <p className="text-gray-400 text-sm">
                    We've sent you an order confirmation with all the details.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link to={createPageUrl('Home')}>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold">
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {sessionId && (
              <p className="text-gray-600 text-xs">
                Order ID: {sessionId.slice(-12)}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

