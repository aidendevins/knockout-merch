import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Upload, Image, Star, StarOff, Loader2, Check, X, Save, Edit, Plus, Trash2,
  ShieldCheck, Package, Users, DollarSign, FileText, Sparkles, Settings, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LOCAL_TEMPLATES } from '@/config/templates';

// Helper to get image URL (use proxy if needed for CORS)
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Always use proxy for S3 URLs to avoid CORS issues
  if (url.includes('s3.amazonaws.com') || url.includes('s3://') || url.includes('.s3.')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Try to extract S3 key from URL for more reliable proxying
    let proxyUrl;
    try {
      // Extract key from URL like: https://bucket.s3.region.amazonaws.com/key
      const urlMatch = url.match(/\.s3\.[^/]+\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const key = decodeURIComponent(urlMatch[1]);
        proxyUrl = `${apiBase}/upload/proxy-image?key=${encodeURIComponent(key)}`;
      } else {
        // Fallback to URL parameter
        proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }
    } catch (e) {
      // Fallback to URL parameter if key extraction fails
      proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
    }
    
    console.log('🖼️ Using proxy for S3 image:', { original: url, proxy: proxyUrl });
    return proxyUrl;
  }
  return url;
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [uploadingRefImage, setUploadingRefImage] = useState(false);
  const [editingSchema, setEditingSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);
  const [editingMaxPhotos, setEditingMaxPhotos] = useState({});

  // Fetch data
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => apiClient.entities.Template.list(),
  });

  // Debug: Log templates when they're fetched
  useEffect(() => {
    if (templates.length > 0) {
      console.log('📋 Templates fetched:', templates);
      templates.forEach(t => {
        console.log(`Template ${t.id}:`, {
          name: t.name,
          reference_image: t.reference_image,
          hasRefImage: !!t.reference_image,
        });
      });
    }
  }, [templates]);

  const { data: designs = [], isLoading: designsLoading } = useQuery({
    queryKey: ['admin-designs'],
    queryFn: () => base44.entities.Design.list('-created_date'),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  // Mutations
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await apiClient.entities.Template.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-templates']);
      queryClient.invalidateQueries(['templates']); // Also invalidate templates query used in design studio
      toast.success('Template updated!');
      setEditingTemplate(null);
      setEditingSchema(null);
      setEditedSchema(null);
    },
    onError: (err) => {
      toast.error('Failed to update template');
      console.error(err);
    },
  });

  const uploadReferenceImageMutation = useMutation({
    mutationFn: async ({ templateId, imageBase64 }) => {
      return await apiClient.entities.Template.uploadReferenceImage(templateId, imageBase64);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-templates']);
      toast.success('Reference image uploaded!');
      setUploadingRefImage(false);
    },
    onError: (err) => {
      toast.error('Failed to upload reference image');
      console.error(err);
      setUploadingRefImage(false);
    },
  });

  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.entities.Template.syncTemplates(LOCAL_TEMPLATES);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['admin-templates']);
      queryClient.invalidateQueries(['templates']);
      const { results } = result;
      const summary = `Created: ${results.created.length}, Updated: ${results.updated.length}`;
      if (results.errors.length > 0) {
        toast.warning(`${summary}, Errors: ${results.errors.length}`);
        console.error('Sync errors:', results.errors);
      } else {
        toast.success(`Sync completed! ${summary}`);
      }
    },
    onError: (err) => {
      toast.error('Failed to sync templates: ' + (err.message || 'Unknown error'));
      console.error(err);
    },
  });

  const toggleDesignFeatureMutation = useMutation({
    mutationFn: ({ id, is_featured }) => 
      base44.entities.Design.update(id, { is_featured: !is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-designs', 'featured-designs']);
    },
  });

  const handleEditPrompt = (template) => {
    setEditingTemplate(template);
    setEditedPrompt(template.prompt || '');
  };

  const handleSavePrompt = () => {
    if (!editingTemplate) return;
    
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: { prompt: editedPrompt },
    });
  };

  const handleEditSchema = (template) => {
    setEditingSchema(template);
    // Deep clone the schema to avoid mutating the original
    const schema = template.panel_schema || { showStyleTweaks: false, fields: [] };
    setEditedSchema({
      showStyleTweaks: schema.showStyleTweaks || false,
      fields: schema.fields ? [...schema.fields] : [],
    });
  };

  const handleSaveSchema = () => {
    if (!editingSchema || !editedSchema) return;
    
    updateTemplateMutation.mutate({
      id: editingSchema.id,
      data: { panel_schema: editedSchema },
    });
  };

  const handleAddField = () => {
    if (!editedSchema) return;
    
    const newField = {
      type: 'text',
      id: `field_${Date.now()}`,
      label: 'New Field',
      placeholder: '',
      required: false,
    };
    
    setEditedSchema({
      ...editedSchema,
      fields: [...editedSchema.fields, newField],
    });
  };

  const handleUpdateField = (index, updates) => {
    if (!editedSchema) return;
    
    const newFields = [...editedSchema.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setEditedSchema({
      ...editedSchema,
      fields: newFields,
    });
  };

  const handleDeleteField = (index) => {
    if (!editedSchema) return;
    
    const newFields = editedSchema.fields.filter((_, i) => i !== index);
    setEditedSchema({
      ...editedSchema,
      fields: newFields,
    });
  };

  const handleMaxPhotosChange = (templateId, value) => {
    setEditingMaxPhotos(prev => ({ ...prev, [templateId]: parseInt(value) || 1 }));
  };

  const handleSaveMaxPhotos = (templateId) => {
    const maxPhotos = editingMaxPhotos[templateId];
    if (maxPhotos === undefined || maxPhotos < 1) {
      toast.error('Max photos must be at least 1');
      return;
    }
    
    updateTemplateMutation.mutate({
      id: templateId,
      data: { max_photos: maxPhotos },
    });
    
    // Clear the editing state for this template
    setEditingMaxPhotos(prev => {
      const newState = { ...prev };
      delete newState[templateId];
      return newState;
    });
  };

  const handleReferenceImageUpload = async (templateId, file) => {
    if (!file) return;
    
    setUploadingRefImage(true);
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      uploadReferenceImageMutation.mutate({
        templateId,
        imageBase64: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  // Stats
  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  const publishedDesigns = designs.filter(d => d.is_published).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950/20 to-black pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Manage templates, designs, and orders</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{templates.length}</p>
                  <p className="text-gray-400 text-sm">Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{publishedDesigns}</p>
                  <p className="text-gray-400 text-sm">Published Designs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                  <p className="text-gray-400 text-sm">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(0)}</p>
                  <p className="text-gray-400 text-sm">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-pink-900/30 backdrop-blur">
            <TabsTrigger 
              value="templates" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="designs" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <Package className="w-4 h-4 mr-2" />
              Designs
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p>Local templates in <code className="text-pink-400">templates.js</code>: {LOCAL_TEMPLATES.length}</p>
                <p className="text-xs mt-1">Click sync to upload new templates or update existing ones</p>
              </div>
              <Button
                onClick={() => syncTemplatesMutation.mutate()}
                disabled={syncTemplatesMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {syncTemplatesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Sync All Local Templates
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-4">
              {templatesLoading ? (
                <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" />
                  </CardContent>
                </Card>
              ) : templates.length === 0 ? (
                <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
                  <CardContent className="p-12 text-center text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No templates found</p>
                    <p className="text-sm mt-1">Run the seed script to create initial templates</p>
                  </CardContent>
                </Card>
              ) : (
                templates.map((template) => (
                  <Card 
                    key={template.id}
                    className="bg-gray-900/50 border-pink-900/30 backdrop-blur overflow-hidden"
                  >
                    <CardHeader className={`bg-gradient-to-r ${template.gradient || 'from-pink-600 to-red-600'} bg-opacity-10`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white text-xl flex items-center gap-2">
                            {template.name}
                            <Badge className="bg-white/10 text-white text-xs">
                              {template.id}
                            </Badge>
                          </CardTitle>
                          <p className="text-white/70 text-sm mt-1">{template.description}</p>
                        </div>
                        <Badge className="bg-white/20 text-white">
                          Max {template.max_photos} photos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Max Photos Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Image className="w-4 h-4 text-pink-400" />
                            Max Photos
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={editingMaxPhotos[template.id] !== undefined ? editingMaxPhotos[template.id] : template.max_photos}
                            onChange={(e) => handleMaxPhotosChange(template.id, e.target.value)}
                            className="w-24 bg-gray-800 border-pink-900/30 text-white"
                            placeholder="6"
                          />
                          <span className="text-gray-400 text-sm">photos</span>
                          {editingMaxPhotos[template.id] !== undefined && editingMaxPhotos[template.id] !== template.max_photos && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveMaxPhotos(template.id)}
                              disabled={updateTemplateMutation.isPending}
                              className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                              {updateTemplateMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                          {editingMaxPhotos[template.id] !== undefined && editingMaxPhotos[template.id] !== template.max_photos && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMaxPhotos(prev => {
                                  const newState = { ...prev };
                                  delete newState[template.id];
                                  return newState;
                                });
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">Maximum number of photos users can upload for this template</p>
                      </div>

                      {/* Background Removal Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-pink-400" />
                            Background Removal
                          </Label>
                        </div>
                        <div className="p-4 bg-black/40 border border-pink-900/30 rounded-lg">
                          <div className="mb-2">
                            <p className="text-white text-sm">Remove background before printing</p>
                            <p className="text-gray-400 text-xs mt-1">Select background removal method</p>
                          </div>
                          <select
                            value={template.remove_background || ''}
                            onChange={(e) => {
                              const value = e.target.value || null;
                              updateTemplateMutation.mutate({
                                id: template.id,
                                data: { remove_background: value },
                              });
                            }}
                            disabled={updateTemplateMutation.isPending}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-pink-900/30 text-white text-sm focus:border-pink-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">None</option>
                            <option value="remove-simple">Simple</option>
                            <option value="remove-complex">Complex</option>
                          </select>
                        </div>
                      </div>

                      {/* Visibility Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            {template.is_hidden ? (
                              <EyeOff className="w-4 h-4 text-pink-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-pink-400" />
                            )}
                            Visibility
                          </Label>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-black/40 border border-pink-900/30 rounded-lg">
                          <div>
                            <p className="text-white text-sm">
                              {template.is_hidden ? 'Hidden from design page' : 'Visible on design page'}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              {template.is_hidden 
                                ? 'This template will not appear in the template picker' 
                                : 'Users can see and use this template'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              updateTemplateMutation.mutate({
                                id: template.id,
                                data: { is_hidden: !template.is_hidden },
                              });
                            }}
                            disabled={updateTemplateMutation.isPending}
                            className={`${
                              template.is_hidden
                                ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {template.is_hidden ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Show
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Hide
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Reference Image Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Image className="w-4 h-4 text-pink-400" />
                            Reference Image
                            {process.env.NODE_ENV === 'development' && (
                              <Badge className="ml-2 bg-gray-700 text-gray-300 text-[10px]">
                                {template.reference_image ? 'Has URL' : 'No URL'}
                              </Badge>
                            )}
                          </Label>
                          <Label htmlFor={`ref-upload-${template.id}`}>
                            <div className="cursor-pointer flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm">
                              <Upload className="w-4 h-4" />
                              Upload New
                            </div>
                          </Label>
                          <input
                            id={`ref-upload-${template.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReferenceImageUpload(template.id, file);
                            }}
                            className="hidden"
                          />
                        </div>
                        {/* Debug info in development */}
                        {process.env.NODE_ENV === 'development' && template.reference_image && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 space-y-1">
                            <div className="break-all">Original: {template.reference_image}</div>
                            <div className="break-all text-pink-400">Proxy: {getImageUrl(template.reference_image) || 'N/A'}</div>
                          </div>
                        )}
                        {template.reference_image && template.reference_image.trim() !== '' ? (
                          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-pink-900/30">
                            <img 
                              src={getImageUrl(template.reference_image) || template.reference_image}
                              alt="Reference"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const originalUrl = template.reference_image;
                                const proxyUrl = getImageUrl(originalUrl);
                                console.error('❌ Failed to load reference image');
                                console.error('Original URL:', originalUrl);
                                console.error('Proxy URL:', proxyUrl);
                                console.error('Image src:', e.target.src);
                                console.error('Template data:', template);
                                // Show error state
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'flex flex-col items-center justify-center h-full text-red-400 p-4';
                                errorDiv.innerHTML = `
                                  <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <p class="text-sm font-medium">Failed to load image</p>
                                  <p class="text-xs mt-1 text-gray-500 break-all">${proxyUrl || originalUrl}</p>
                                `;
                                e.target.parentElement.replaceChild(errorDiv, e.target);
                              }}
                              onLoad={() => {
                                console.log('✅ Reference image loaded successfully');
                                console.log('URL:', template.reference_image);
                                console.log('Proxy URL:', getImageUrl(template.reference_image));
                              }}
                            />
                            <Badge className="absolute top-2 right-2 bg-green-500/80 text-white text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-800/50 border-2 border-dashed border-pink-900/30 rounded-lg flex flex-col items-center justify-center text-gray-500">
                            <Image className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">No reference image</p>
                            <p className="text-xs mt-1">This image will be sent to AI for style guidance</p>
                          </div>
                        )}
                        {uploadingRefImage && (
                          <div className="mt-2 flex items-center gap-2 text-pink-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </div>
                        )}
                      </div>

                      {/* Prompt Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-pink-400" />
                            AI Prompt Template
                          </Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPrompt(template)}
                            className="text-pink-400 hover:text-pink-300 hover:bg-pink-600/10"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="bg-black/40 border border-pink-900/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                          <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                            {template.prompt || 'No prompt set'}
                          </pre>
                        </div>
                      </div>

                      {/* Schema Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Settings className="w-4 h-4 text-pink-400" />
                            Panel Schema
                          </Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSchema(template)}
                            className="text-pink-400 hover:text-pink-300 hover:bg-pink-600/10"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Schema
                          </Button>
                        </div>
                        <div className="bg-black/40 border border-pink-900/30 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Show Style Tweaks:</span>
                            <Badge className={template.panel_schema?.showStyleTweaks ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}>
                              {template.panel_schema?.showStyleTweaks ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm block mb-2">Fields ({template.panel_schema?.fields?.length || 0}):</span>
                            <div className="flex flex-wrap gap-2">
                              {template.panel_schema?.fields?.map((field) => (
                                <Badge 
                                  key={field.id}
                                  className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                                >
                                  {field.label} ({field.type})
                                  {field.required && <span className="ml-1 text-pink-400">*</span>}
                                </Badge>
                              ))}
                              {(!template.panel_schema?.fields || template.panel_schema.fields.length === 0) && (
                                <span className="text-gray-500 text-sm">No fields defined</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Designs Tab - User Created Designs */}
          <TabsContent value="designs">
            <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Published Designs</CardTitle>
                <p className="text-gray-400 text-sm">Designs created and purchased by users</p>
              </CardHeader>
              <CardContent>
                {designsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" />
                  </div>
                ) : designs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No designs created yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {designs.map((design) => (
                      <div 
                        key={design.id}
                        className="relative group bg-gray-800/50 rounded-lg overflow-hidden border border-pink-900/20 hover:border-pink-600/50 transition-colors"
                      >
                        <div className="aspect-square bg-black flex items-center justify-center">
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
                        <div className="p-3">
                          <p className="text-white text-xs font-medium truncate">{design.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-500 text-xs">{design.sales_count || 0} sales</span>
                            {design.is_published && (
                              <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                                Published
                              </Badge>
                            )}
                          </div>
                          {design.template_id && (
                            <Badge className="mt-1 bg-purple-500/20 text-purple-300 text-[10px]">
                              {design.template_id}
                            </Badge>
                          )}
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
            <Card className="bg-gray-900/50 border-pink-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div 
                          key={order.id}
                          className="p-4 bg-gray-800/50 border border-pink-900/20 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">{order.customer_name}</p>
                            <p className="text-gray-400 text-sm">{order.customer_email}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {order.product_type} • {order.color} • Size {order.size} • Qty: {order.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">${Number(order.total_amount || 0).toFixed(2)}</p>
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

      {/* Edit Prompt Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="bg-gray-900 border-pink-900/30 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-pink-400" />
              Edit Prompt - {editingTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 text-sm mb-2 block">
                AI Prompt Template
              </Label>
              <p className="text-gray-500 text-xs mb-3">
                Use placeholders like [NAME], [PRIMARY_COLOR], [SECONDARY_COLOR], [BACKGROUND_COLOR], [PHOTO_COUNT]
              </p>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="min-h-[400px] bg-black/40 border-pink-900/30 text-white font-mono text-sm resize-y"
                placeholder="Enter AI prompt template..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingTemplate(null)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePrompt}
                disabled={updateTemplateMutation.isPending}
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
              >
                {updateTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Schema Dialog */}
      <Dialog open={!!editingSchema} onOpenChange={() => setEditingSchema(null)}>
        <DialogContent className="bg-gray-900 border-pink-900/30 max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-pink-400" />
              Edit Panel Schema - {editingSchema?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Show Style Tweaks Toggle */}
              <div className="flex items-center justify-between p-4 bg-black/40 border border-pink-900/30 rounded-lg">
                <div>
                  <Label className="text-white font-medium">Show Style Tweaks</Label>
                  <p className="text-gray-400 text-xs mt-1">Allow users to add custom style instructions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedSchema?.showStyleTweaks || false}
                    onChange={(e) => setEditedSchema({ ...editedSchema, showStyleTweaks: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {/* Fields Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-white font-medium">Fields</Label>
                  <Button
                    size="sm"
                    onClick={handleAddField}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-4">
                  {editedSchema?.fields?.map((field, index) => (
                    <div
                      key={field.id || index}
                      className="p-4 bg-black/40 border border-pink-900/30 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-purple-500/20 text-purple-300">
                          Field {index + 1}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteField(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Field Type</Label>
                          <select
                            value={field.type || 'text'}
                            onChange={(e) => handleUpdateField(index, { type: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-pink-900/30 text-white text-sm focus:border-pink-600 focus:outline-none"
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="colorPicker">Color Picker</option>
                            <option value="select">Select</option>
                            <option value="toggle">Toggle</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Field ID *</Label>
                          <Input
                            value={field.id || ''}
                            onChange={(e) => handleUpdateField(index, { id: e.target.value })}
                            placeholder="e.g., customName"
                            className="bg-gray-800 border-pink-900/30 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-400 text-xs mb-1 block">Label *</Label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                          placeholder="e.g., Add Name"
                          className="bg-gray-800 border-pink-900/30 text-white text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                            placeholder="e.g., Enter name..."
                            className="bg-gray-800 border-pink-900/30 text-white text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Hint</Label>
                          <Input
                            value={field.hint || ''}
                            onChange={(e) => handleUpdateField(index, { hint: e.target.value })}
                            placeholder="e.g., (Name)"
                            className="bg-gray-800 border-pink-900/30 text-white text-sm"
                          />
                        </div>
                      </div>

                      {field.type === 'colorPicker' && (
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Default Color (Hex)</Label>
                          <Input
                            value={field.defaultValue || ''}
                            onChange={(e) => handleUpdateField(index, { defaultValue: e.target.value })}
                            placeholder="#ec4899"
                            className="bg-gray-800 border-pink-900/30 text-white text-sm"
                          />
                        </div>
                      )}

                      {field.type === 'text' && (
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Default Value</Label>
                          <Input
                            value={field.defaultValue || ''}
                            onChange={(e) => handleUpdateField(index, { defaultValue: e.target.value })}
                            placeholder="Default text value"
                            className="bg-gray-800 border-pink-900/30 text-white text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-gray-400 text-xs mb-1 block">Prompt Template</Label>
                        <Textarea
                          value={field.promptTemplate || ''}
                          onChange={(e) => handleUpdateField(index, { promptTemplate: e.target.value })}
                          placeholder='e.g., The name text should be "{value}" displayed prominently.'
                          className="bg-gray-800 border-pink-900/30 text-white text-sm min-h-[60px] resize-none"
                        />
                        <p className="text-gray-500 text-xs mt-1">Use {"{value}"} as placeholder for field value</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                        </label>
                        <Label className="text-gray-400 text-sm">Required Field</Label>
                      </div>
                    </div>
                  ))}

                  {(!editedSchema?.fields || editedSchema.fields.length === 0) && (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-pink-900/30 rounded-lg">
                      <p className="text-sm">No fields defined</p>
                      <p className="text-xs mt-1">Click "Add Field" to create one</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2 justify-end pt-4 border-t border-pink-900/30">
            <Button
              variant="outline"
              onClick={() => setEditingSchema(null)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchema}
              disabled={updateTemplateMutation.isPending}
              className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Schema
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
