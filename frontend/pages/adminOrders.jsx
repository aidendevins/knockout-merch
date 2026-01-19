import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import { motion } from 'framer-motion';
import { 
  Package, Mail, User, MapPin, DollarSign, Calendar, 
  Filter, Download, Search, Eye, Loader2, AlertCircle,
  CheckCircle, Clock, XCircle, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch orders
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    pending: orders.filter(o => o.payment_status === 'pending').length,
    revenue: orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            <Package className="w-8 h-8 inline mr-3" />
            Orders Dashboard
          </h1>
          <p className="text-gray-400">View and manage all customer orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Orders</p>
                  <p className="text-3xl font-black text-white">{stats.total}</p>
                </div>
                <Package className="w-10 h-10 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Paid</p>
                  <p className="text-3xl font-black text-green-400">{stats.paid}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-black text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Revenue</p>
                  <p className="text-3xl font-black text-white">${stats.revenue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by name, email, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                <TabsList className="bg-gray-800">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Orders ({filteredOrders.length})</span>
              <Button variant="outline" size="sm" className="border-gray-700">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-white font-bold mb-2">Error loading orders</p>
                <p className="text-gray-400">Please try again later</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-bold mb-2">No orders found</p>
                <p className="text-gray-400">Orders will appear here once customers make purchases</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, index) => {
                  const shippingAddress = typeof order.shipping_address === 'string' 
                    ? JSON.parse(order.shipping_address) 
                    : order.shipping_address;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500/50 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Order Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(order.payment_status)}>
                              {getStatusIcon(order.payment_status)}
                              <span className="ml-1 capitalize">{order.payment_status}</span>
                            </Badge>
                            <span className="text-gray-500 text-xs">
                              Order #{order.id?.slice(-8)}
                            </span>
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.created_at || order.created_date).toLocaleDateString()} at {new Date(order.created_at || order.created_date).toLocaleTimeString()}
                            </span>
                            {order.stripe_session_id && (
                              <span className="text-gray-600 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">
                                {order.stripe_session_id.slice(0, 20)}...
                              </span>
                            )}
                          </div>

                          <div className="grid sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <User className="w-4 h-4 text-gray-500" />
                              <span>{order.customer_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="truncate">{order.customer_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>
                                {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postal_code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Package className="w-4 h-4 text-gray-500" />
                              <span className="capitalize">
                                {order.product_type} • {order.color} • {order.size} • Qty: {order.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-black text-white">
                              ${parseFloat(order.total_price || 0).toFixed(2)}
                            </p>
                            {order.stripe_session_id && (
                              <p className="text-xs text-gray-500">via Stripe</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-gray-700 hover:bg-gray-700"
                            onClick={() => {
                              // Open Stripe payment in new tab if available
                              if (order.stripe_payment_id) {
                                window.open(`https://dashboard.stripe.com/payments/${order.stripe_payment_id}`, '_blank');
                              } else if (order.stripe_session_id) {
                                window.open(`https://dashboard.stripe.com/payments/${order.stripe_session_id}`, '_blank');
                              } else {
                              console.log('Order details:', order);
                              }
                            }}
                            title={order.stripe_payment_id || order.stripe_session_id ? "View in Stripe" : "View details"}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Full Address (expandable) */}
                      {shippingAddress?.line1 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Shipping Address:</p>
                          <p className="text-sm text-gray-400">
                            {shippingAddress.line1}
                            {shippingAddress.line2 && `, ${shippingAddress.line2}`}
                            <br />
                            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                            <br />
                            {shippingAddress.country || 'US'}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

