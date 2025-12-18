import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Image, Trash2, Star, StarOff, Plus, X,
  ShieldCheck, Package, Users, DollarSign, Loader2, Check, Cloud, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export default function Admin() {
  const queryClient = useQueryClient();
  const [uploadingStill, setUploadingStill] = useState(false);
  const [newStill, setNewStill] = useState({ title: '', round: '', file: null });
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Fetch data
  const { data: stills = [], isLoading: stillsLoading } = useQuery({
    queryKey: ['admin-stills'],
    queryFn: () => base44.entities.FightStill.list('-created_date'),
  });

  const { data: designs = [], isLoading: designsLoading } = useQuery({
    queryKey: ['admin-designs'],
    queryFn: () => base44.entities.Design.list('-created_date'),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  // Mutations
  const uploadStillMutation = useMutation({
    mutationFn: async ({ file, title, round }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return await base44.entities.FightStill.create({
        title,
        round,
        image_url: file_url,
        is_featured: false,
        usage_count: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-stills', 'fight-stills']);
      toast.success('Fight still uploaded!');
      setShowUploadDialog(false);
      setNewStill({ title: '', round: '', file: null });
    },
    onError: (err) => {
      toast.error('Failed to upload still');
      console.error(err);
    },
  });

  const deleteStillMutation = useMutation({
    mutationFn: (id) => base44.entities.FightStill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-stills', 'fight-stills']);
      toast.success('Still deleted');
    },
  });

  const toggleStillFeatureMutation = useMutation({
    mutationFn: ({ id, is_featured }) => 
      base44.entities.FightStill.update(id, { is_featured: !is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-stills', 'fight-stills']);
    },
  });

  const toggleDesignFeatureMutation = useMutation({
    mutationFn: ({ id, is_featured }) => 
      base44.entities.Design.update(id, { is_featured: !is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-designs', 'featured-designs']);
    },
  });

  // Sync from S3
  const syncFromS3Mutation = useMutation({
    mutationFn: () => base44.entities.FightStill.syncFromS3(),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['admin-stills', 'fight-stills']);
      toast.success(`Synced ${result.added} new images from S3!`);
    },
    onError: (err) => {
      toast.error('Failed to sync from S3: ' + (err.message || 'Unknown error'));
      console.error(err);
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewStill(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = () => {
    if (!newStill.file || !newStill.title) {
      toast.error('Please provide a title and select an image');
      return;
    }
    uploadStillMutation.mutate({
      file: newStill.file,
      title: newStill.title,
      round: newStill.round,
    });
  };

  // Stats
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const publishedDesigns = designs.filter(d => d.is_published).length;

  return (
    <div className="min-h-screen bg-black pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage fight stills and designs</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stills.length}</p>
                  <p className="text-gray-500 text-sm">Fight Stills</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{publishedDesigns}</p>
                  <p className="text-gray-500 text-sm">Published Designs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                  <p className="text-gray-500 text-sm">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(0)}</p>
                  <p className="text-gray-500 text-sm">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stills" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger 
              value="stills" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Fight Stills
            </TabsTrigger>
            <TabsTrigger 
              value="designs" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Designs
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Fight Stills Tab */}
          <TabsContent value="stills">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-white">Fight Stills</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => syncFromS3Mutation.mutate()}
                    disabled={syncFromS3Mutation.isPending}
                  >
                    {syncFromS3Mutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 mr-2" />
                        Sync from S3
                      </>
                    )}
                  </Button>
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Still
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                      <DialogTitle className="text-white">Upload Fight Still</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label className="text-gray-400">Title</Label>
                        <Input
                          value={newStill.title}
                          onChange={(e) => setNewStill(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., The Knockout Punch"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Round (optional)</Label>
                        <Input
                          value={newStill.round}
                          onChange={(e) => setNewStill(prev => ({ ...prev, round: e.target.value }))}
                          placeholder="e.g., 5"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400">Image</Label>
                        <div className="mt-1">
                          {newStill.file ? (
                            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                              <img 
                                src={URL.createObjectURL(newStill.file)} 
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setNewStill(prev => ({ ...prev, file: null }))}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center aspect-video bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                              <Upload className="w-8 h-8 text-gray-500 mb-2" />
                              <span className="text-gray-500 text-sm">Click to upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleUpload}
                        disabled={uploadStillMutation.isPending || !newStill.file || !newStill.title}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {uploadStillMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Still
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {stillsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                  </div>
                ) : stills.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No stills uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {stills.map((still) => (
                      <div 
                        key={still.id}
                        className="relative group bg-gray-800 rounded-lg overflow-hidden"
                      >
                        <img 
                          src={still.image_url} 
                          alt={still.title}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleStillFeatureMutation.mutate({ 
                              id: still.id, 
                              is_featured: still.is_featured 
                            })}
                            className="bg-white/10 hover:bg-white/20"
                          >
                            {still.is_featured ? (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteStillMutation.mutate(still.id)}
                            className="bg-white/10 hover:bg-red-500/50"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                        <div className="p-2">
                          <p className="text-white text-xs font-medium truncate">{still.title}</p>
                          {still.round && (
                            <p className="text-gray-500 text-xs">Round {still.round}</p>
                          )}
                        </div>
                        {still.is_featured && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px]">
                            Featured
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Designs Tab */}
          <TabsContent value="designs">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Community Designs</CardTitle>
              </CardHeader>
              <CardContent>
                {designsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                  </div>
                ) : designs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No designs created yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {designs.map((design) => (
                      <div 
                        key={design.id}
                        className="relative group bg-gray-800 rounded-lg overflow-hidden"
                      >
                        <div className="aspect-square bg-gray-700 flex items-center justify-center">
                          {design.design_image_url ? (
                            <img 
                              src={design.design_image_url} 
                              alt={design.title}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-600" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleDesignFeatureMutation.mutate({ 
                              id: design.id, 
                              is_featured: design.is_featured 
                            })}
                            className="bg-white/10 hover:bg-white/20"
                          >
                            {design.is_featured ? (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        <div className="p-2">
                          <p className="text-white text-xs font-medium truncate">{design.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-500 text-xs">{design.sales_count || 0} sales</span>
                            {design.is_published && (
                              <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                                Published
                              </Badge>
                            )}
                          </div>
                        </div>
                        {design.is_featured && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px]">
                            Featured
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div 
                          key={order.id}
                          className="p-4 bg-gray-800 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">{order.customer_name}</p>
                            <p className="text-gray-500 text-sm">{order.customer_email}</p>
                            <p className="text-gray-600 text-xs mt-1">
                              {order.product_type} • Size {order.size} • Qty: {order.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">${order.total_amount?.toFixed(2)}</p>
                            <Badge className={`mt-1 ${
                              order.status === 'paid' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}