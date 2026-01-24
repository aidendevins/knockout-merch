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
  const [uploadingExampleImage, setUploadingExampleImage] = useState(false);
  const [editingSchema, setEditingSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);
  const [editingMaxPhotos, setEditingMaxPhotos] = useState({});
  const [editingPrintifyId, setEditingPrintifyId] = useState({});
  const [expandedDesign, setExpandedDesign] = useState(null);
  const [quickDeleteMode, setQuickDeleteMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, design: null });
  const [geminiKeysInfo, setGeminiKeysInfo] = useState({ activeKey: 1, key1Configured: false, key2Configured: false });
  const [switchingKey, setSwitchingKey] = useState(false);

  // Fetch Gemini API key status on mount
  useEffect(() => {
    const fetchGeminiKeys = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
        const response = await fetch(`${apiBase}/upload/gemini-keys`);
        if (response.ok) {
          const data = await response.json();
          setGeminiKeysInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch Gemini keys info:', error);
      }
    };
    fetchGeminiKeys();
  }, []);

  // Switch Gemini API key
  const switchGeminiKey = async (keyIndex) => {
    setSwitchingKey(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
      const response = await fetch(`${apiBase}/upload/gemini-keys/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIndex }),
      });
      const data = await response.json();
      if (response.ok) {
        setGeminiKeysInfo(prev => ({ ...prev, activeKey: data.activeKey }));
        toast.success(`Switched to API Key ${data.activeKey}`);
      } else {
        toast.error(data.error || 'Failed to switch API key');
      }
    } catch (error) {
      toast.error('Failed to switch API key');
      console.error(error);
    } finally {
      setSwitchingKey(false);
    }
  };

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

  const uploadExampleImageMutation = useMutation({
    mutationFn: async ({ templateId, imageBase64 }) => {
      return await apiClient.entities.Template.uploadExampleImage(templateId, imageBase64);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-templates']);
      queryClient.invalidateQueries(['templates']);
      toast.success('Example image uploaded!');
      setUploadingExampleImage(false);
    },
    onError: (err) => {
      toast.error('Failed to upload example image');
      console.error(err);
      setUploadingExampleImage(false);
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
      const summary = `Created: ${results.created.length}, Skipped: ${results.skipped.length} (existing)`;
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

  const deleteDesignMutation = useMutation({
    mutationFn: (id) => base44.entities.Design.delete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin-designs']);
      queryClient.invalidateQueries(['admin-orders']);
      if (data.ordersDeleted > 0) {
        toast.success(`Design and ${data.ordersDeleted} order(s) deleted`);
      } else {
        toast.success('Design deleted');
      }
      setExpandedDesign(null);
      setDeleteModal({ open: false, design: null });
    },
    onError: (err) => {
      toast.error('Failed to delete: ' + (err.message || 'Unknown error'));
      console.error(err);
      setDeleteModal({ open: false, design: null });
    },
  });

  // Handle delete click - show modal or delete directly if quick delete mode
  const handleDeleteClick = (design, e) => {
    if (e) e.stopPropagation();
    
    if (quickDeleteMode) {
      deleteDesignMutation.mutate(design.id);
    } else {
      setDeleteModal({ open: true, design });
    }
  };

  // Confirm delete from modal
  const confirmDelete = () => {
    if (!deleteModal.design) return;
    deleteDesignMutation.mutate(deleteModal.design.id);
  };

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

  const handlePrintifyIdChange = (templateId, value) => {
    setEditingPrintifyId(prev => ({ ...prev, [templateId]: value }));
  };

  const handleSavePrintifyId = (templateId) => {
    const printifyId = editingPrintifyId[templateId];
    
    updateTemplateMutation.mutate({
      id: templateId,
      data: { printify_product_id: printifyId || null },
    });
    
    // Clear the editing state for this template
    setEditingPrintifyId(prev => {
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

  const handleExampleImageUpload = async (templateId, file) => {
    if (!file) return;
    
    setUploadingExampleImage(true);
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      uploadExampleImageMutation.mutate({
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">Manage templates, designs, and orders</p>
            </div>
          </div>
          
          {/* Gemini API Key Switcher */}
          <div className="flex items-center gap-3 bg-gray-900/50 border border-pink-900/30 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Gemini API Key:</span>
            </div>
            <select
              value={geminiKeysInfo.activeKey}
              onChange={(e) => switchGeminiKey(parseInt(e.target.value))}
              disabled={switchingKey}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
            >
              <option value={1} disabled={!geminiKeysInfo.key1Configured}>
                Key 1 {!geminiKeysInfo.key1Configured ? '(not configured)' : ''}
              </option>
              <option value={2} disabled={!geminiKeysInfo.key2Configured}>
                Key 2 {!geminiKeysInfo.key2Configured ? '(not configured)' : ''}
              </option>
            </select>
            {switchingKey && <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />}
            <div className={`w-2 h-2 rounded-full ${geminiKeysInfo.activeKey === 1 ? 'bg-green-500' : 'bg-blue-500'}`} />
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
                <p className="text-xs mt-1">Click sync to add new templates only (existing templates are skipped)</p>
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

                      {/* Printify Product ID Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Package className="w-4 h-4 text-pink-400" />
                            Printify Product ID
                          </Label>
                          {template.printify_product_id && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Linked to Printify
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={editingPrintifyId[template.id] !== undefined ? editingPrintifyId[template.id] : (template.printify_product_id || '')}
                            onChange={(e) => handlePrintifyIdChange(template.id, e.target.value)}
                            className="flex-1 bg-gray-800 border-pink-900/30 text-white font-mono text-sm"
                            placeholder="Enter Printify Product ID..."
                          />
                          {editingPrintifyId[template.id] !== undefined && editingPrintifyId[template.id] !== (template.printify_product_id || '') && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSavePrintifyId(template.id)}
                                disabled={updateTemplateMutation.isPending}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                              >
                                {updateTemplateMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPrintifyId(prev => {
                                    const newState = { ...prev };
                                    delete newState[template.id];
                                    return newState;
                                  });
                                }}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                          Link this template to a Printify product to display it on the landing page
                        </p>
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

                      {/* Canvas Config Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Settings className="w-4 h-4 text-pink-400" />
                            Canvas Positioning Config
                          </Label>
                          {template.canvas_config && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                              🔒 Locked Position
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 bg-black/40 border border-pink-900/30 rounded-lg space-y-3">
                          {template.canvas_config ? (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-gray-400 text-xs mb-1 block">Width Scale</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={template.canvas_config.width_scale || template.canvas_config.scale || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      updateTemplateMutation.mutate({
                                        id: template.id,
                                        data: {
                                          canvas_config: {
                                            ...template.canvas_config,
                                            width_scale: value,
                                          },
                                        },
                                      });
                                    }}
                                    className="bg-gray-800 border-pink-900/30 text-white text-sm"
                                    placeholder="0.92"
                                  />
                                  <p className="text-gray-500 text-[10px] mt-0.5">% of print area</p>
                                </div>
                                <div>
                                  <Label className="text-gray-400 text-xs mb-1 block">Height Scale</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={template.canvas_config.height_scale || template.canvas_config.scale || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      updateTemplateMutation.mutate({
                                        id: template.id,
                                        data: {
                                          canvas_config: {
                                            ...template.canvas_config,
                                            height_scale: value,
                                          },
                                        },
                                      });
                                    }}
                                    className="bg-gray-800 border-pink-900/30 text-white text-sm"
                                    placeholder="0.87"
                                  />
                                  <p className="text-gray-500 text-[10px] mt-0.5">% of print area</p>
                                </div>
                                <div>
                                  <Label className="text-gray-400 text-xs mb-1 block">X Offset</Label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="1"
                                    value={template.canvas_config.x_offset || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      updateTemplateMutation.mutate({
                                        id: template.id,
                                        data: {
                                          canvas_config: {
                                            ...template.canvas_config,
                                            x_offset: value,
                                          },
                                        },
                                      });
                                    }}
                                    className="bg-gray-800 border-pink-900/30 text-white text-sm"
                                    placeholder="0.04"
                                  />
                                  <p className="text-gray-500 text-[10px] mt-0.5">from left edge</p>
                                </div>
                                <div>
                                  <Label className="text-gray-400 text-xs mb-1 block">Y Offset</Label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="1"
                                    value={template.canvas_config.y_offset || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      updateTemplateMutation.mutate({
                                        id: template.id,
                                        data: {
                                          canvas_config: {
                                            ...template.canvas_config,
                                            y_offset: value,
                                          },
                                        },
                                      });
                                    }}
                                    className="bg-gray-800 border-pink-900/30 text-white text-sm"
                                    placeholder="0.065"
                                  />
                                  <p className="text-gray-500 text-[10px] mt-0.5">from top edge</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-pink-900/20">
                                <p className="text-gray-400 text-xs">
                                  Design will be locked in place at these coordinates. User cannot move/resize.
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Remove canvas config? Design will become freely movable.')) {
                                      updateTemplateMutation.mutate({
                                        id: template.id,
                                        data: { canvas_config: null },
                                      });
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Remove Lock
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-6">
                              <Settings className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                              <p className="text-gray-400 text-sm mb-3">No canvas positioning configured</p>
                              <p className="text-gray-500 text-xs mb-4">
                                Without this config, users can freely move/resize the design on the canvas.
                              </p>
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateTemplateMutation.mutate({
                                    id: template.id,
                                    data: {
                                      canvas_config: {
                                        width_scale: 0.92,
                                        height_scale: 0.87,
                                        x_offset: 0.04,
                                        y_offset: 0.065,
                                        rotation: 0,
                                      },
                                    },
                                  });
                                }}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Canvas Config
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text Behavior Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-pink-400" />
                            Text Behavior
                          </Label>
                        </div>
                        <div className="p-4 bg-black/40 border border-pink-900/30 rounded-lg">
                          <div className="mb-2">
                            <p className="text-white text-sm">Text visibility on different fabric colors</p>
                            <p className="text-gray-400 text-xs mt-1">Controls which fabric colors are available</p>
                          </div>
                          <select
                            value={template.text_behavior || 'none'}
                            onChange={(e) => {
                              const value = e.target.value || 'none';
                              updateTemplateMutation.mutate({
                                id: template.id,
                                data: { text_behavior: value },
                              });
                            }}
                            disabled={updateTemplateMutation.isPending}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-pink-900/30 text-white text-sm focus:border-pink-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="none">None - No text in design</option>
                            <option value="static-light">Static Light - Light text (white/cream), blocks white fabric only</option>
                            <option value="static-dark">Static Dark - Dark text (black), blocks black fabric only</option>
                            <option value="user-controlled">User Controlled - Color picker filters fabric color</option>
                          </select>
                          <div className="mt-3 p-2 bg-black/40 rounded border border-pink-900/20">
                            <p className="text-xs text-gray-400">
                              <span className="font-semibold text-white">Current: </span>
                              {template.text_behavior === 'none' && 'No restrictions'}
                              {template.text_behavior === 'static-light' && 'Blocks white fabric only (light text invisible on white)'}
                              {template.text_behavior === 'static-dark' && 'Blocks black fabric only (dark text invisible on black)'}
                              {template.text_behavior === 'user-controlled' && 'Color picker excludes selected fabric color'}
                              {!template.text_behavior && 'None (default)'}
                            </p>
                          </div>
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

                      {/* Example/Cover Image Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-white font-medium flex items-center gap-2">
                            <Image className="w-4 h-4 text-pink-400" />
                            Example/Cover Image
                            {process.env.NODE_ENV === 'development' && (
                              <Badge className="ml-2 bg-gray-700 text-gray-300 text-[10px]">
                                {template.example_image ? 'Has URL' : 'No URL'}
                              </Badge>
                            )}
                          </Label>
                          <Label htmlFor={`example-upload-${template.id}`}>
                            <div className="cursor-pointer flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm">
                              <Upload className="w-4 h-4" />
                              Upload New
                            </div>
                          </Label>
                          <input
                            id={`example-upload-${template.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleExampleImageUpload(template.id, file);
                            }}
                            className="hidden"
                          />
                        </div>
                        {/* Debug info in development */}
                        {process.env.NODE_ENV === 'development' && template.example_image && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 space-y-1">
                            <div className="break-all">Original: {template.example_image}</div>
                            <div className="break-all text-pink-400">Proxy: {getImageUrl(template.example_image) || 'N/A'}</div>
                          </div>
                        )}
                        {template.example_image && template.example_image.trim() !== '' ? (
                          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-pink-900/30">
                            <img 
                              src={getImageUrl(template.example_image) || template.example_image}
                              alt="Example"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const originalUrl = template.example_image;
                                const proxyUrl = getImageUrl(originalUrl);
                                console.error('❌ Failed to load example image');
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
                                console.log('✅ Example image loaded successfully');
                                console.log('URL:', template.example_image);
                                console.log('Proxy URL:', getImageUrl(template.example_image));
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
                            <p className="text-sm">No example image</p>
                            <p className="text-xs mt-1">This image will be shown to users in the template picker</p>
                          </div>
                        )}
                        {uploadingExampleImage && (
                          <div className="mt-2 flex items-center gap-2 text-pink-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading to S3 examples folder...
                          </div>
                        )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">All Designs ({designs.length})</CardTitle>
                    <p className="text-gray-400 text-sm">User-created designs - click to expand details</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-gray-400 text-sm">Quick Delete</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={quickDeleteMode}
                          onChange={(e) => setQuickDeleteMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                      </div>
                    </label>
                    {quickDeleteMode && (
                      <Badge className="bg-red-500/20 text-red-400 text-xs">
                        No confirmation
                      </Badge>
                    )}
                  </div>
                </div>
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
                  <div className="space-y-3">
                    {designs.map((design) => (
                      <div 
                        key={design.id}
                        className="bg-gray-800/50 rounded-lg overflow-hidden border border-pink-900/20 hover:border-pink-600/50 transition-colors"
                      >
                        {/* Collapsed View - Always Visible */}
                        <div 
                          className="flex items-center gap-4 p-4 cursor-pointer"
                          onClick={() => setExpandedDesign(expandedDesign === design.id ? null : design.id)}
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 bg-black rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {design.mockup_urls?.[0] ? (
                              <img 
                                src={design.mockup_urls[0]} 
                                alt={design.title}
                                className="w-full h-full object-cover"
                              />
                            ) : design.design_image_url ? (
                              <img 
                                src={design.design_image_url} 
                                alt={design.title}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{design.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-gray-400 text-xs">{design.product_type || 'tshirt'}</span>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-400 text-xs">{design.color || 'black'}</span>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-400 text-xs">${parseFloat(design.price || 29.99).toFixed(2)}</span>
                              {design.template_id && (
                                <>
                                  <span className="text-gray-600">•</span>
                                  <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">
                                    {design.template_id}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {design.is_featured && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                                Featured
                              </Badge>
                            )}
                            {design.is_published && (
                              <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                                Published
                              </Badge>
                            )}
                            <span className="text-gray-500 text-sm">
                              {expandedDesign === design.id ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Expanded View */}
                        {expandedDesign === design.id && (
                          <div className="border-t border-pink-900/20 p-4 space-y-4 bg-black/20">
                            {/* Mockups Gallery */}
                            {design.mockup_urls && design.mockup_urls.length > 0 && (
                              <div>
                                <Label className="text-gray-400 text-xs mb-2 block">Mockups ({design.mockup_urls.length})</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {design.mockup_urls.map((url, idx) => (
                                    <img 
                                      key={idx}
                                      src={url} 
                                      alt={`Mockup ${idx + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border border-pink-900/30"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Design Image */}
                            {design.design_image_url && (
                              <div>
                                <Label className="text-gray-400 text-xs mb-2 block">Design Image</Label>
                                <img 
                                  src={design.design_image_url} 
                                  alt="Design"
                                  className="w-32 h-32 object-contain rounded-lg border border-pink-900/30 bg-white/5"
                                />
                              </div>
                            )}
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-gray-500 text-xs">ID</Label>
                                <p className="text-white text-xs font-mono truncate">{design.id}</p>
                              </div>
                              <div>
                                <Label className="text-gray-500 text-xs">Printify ID</Label>
                                <p className="text-white text-xs font-mono truncate">{design.printify_product_id || 'N/A'}</p>
                              </div>
                              <div>
                                <Label className="text-gray-500 text-xs">Sales Count</Label>
                                <p className="text-white text-xs">{design.sales_count || 0}</p>
                              </div>
                              <div>
                                <Label className="text-gray-500 text-xs">Created</Label>
                                <p className="text-white text-xs">{design.created_at ? new Date(design.created_at).toLocaleDateString() : 'N/A'}</p>
                              </div>
                            </div>
                            
                            {/* Prompt Used */}
                            {design.prompt_used && (
                              <div>
                                <Label className="text-gray-500 text-xs mb-1 block">Prompt Used</Label>
                                <p className="text-gray-300 text-xs bg-black/40 p-2 rounded-lg max-h-20 overflow-y-auto">
                                  {design.prompt_used}
                                </p>
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t border-pink-900/20">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDesignFeatureMutation.mutate({ 
                                    id: design.id, 
                                    is_featured: design.is_featured 
                                  });
                                }}
                                className={design.is_featured ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-white'}
                              >
                                {design.is_featured ? (
                                  <>
                                    <Star className="w-4 h-4 mr-1 fill-current" />
                                    Unfeature
                                  </>
                                ) : (
                                  <>
                                    <StarOff className="w-4 h-4 mr-1" />
                                    Feature
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/product/${design.id}`, '_blank');
                                }}
                                className="text-pink-400 hover:text-pink-300"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Product
                              </Button>
                              <div className="flex-1" />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleDeleteClick(design, e)}
                                disabled={deleteDesignMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                {deleteDesignMutation.isPending && deleteModal.design?.id === design.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
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

                      {/* Validation Section */}
                      <div className="border border-pink-900/20 rounded-lg p-3 bg-black/20">
                        <Label className="text-gray-400 text-xs mb-2 block">Field Validation (optional)</Label>
                        
                        <div className="space-y-3">
                          {/* Validation Type */}
                          <div>
                            <Label className="text-gray-500 text-xs mb-1 block">Validation Type</Label>
                            <select
                              value={field.validation?.type || 'none'}
                              onChange={(e) => {
                                const validationType = e.target.value;
                                if (validationType === 'none') {
                                  // Remove validation
                                  const { validation, ...fieldWithoutValidation } = field;
                                  handleUpdateField(index, fieldWithoutValidation);
                                } else {
                                  // Initialize validation object
                                  handleUpdateField(index, {
                                    validation: {
                                      type: validationType,
                                      value: '',
                                      errorMessage: '',
                                      ...(validationType === 'contains' && { caseSensitive: false }),
                                      ...(validationType === 'regex' && { flags: '' }),
                                    }
                                  });
                                }
                              }}
                              className="w-full px-2 py-1.5 rounded bg-gray-800 border border-pink-900/30 text-white text-xs focus:border-pink-600 focus:outline-none"
                            >
                              <option value="none">None</option>
                              <option value="contains">Contains Text</option>
                              <option value="regex">Regex Pattern</option>
                              <option value="minLength">Min Length</option>
                              <option value="maxLength">Max Length</option>
                            </select>
                          </div>

                          {/* Validation Value - Show if validation type is selected */}
                          {field.validation?.type && field.validation.type !== 'none' && (
                            <>
                              <div>
                                <Label className="text-gray-500 text-xs mb-1 block">
                                  {field.validation.type === 'contains' && 'Text to Find'}
                                  {field.validation.type === 'regex' && 'Regex Pattern'}
                                  {(field.validation.type === 'minLength' || field.validation.type === 'maxLength') && 'Length'}
                                </Label>
                                <Input
                                  value={field.validation?.value || ''}
                                  onChange={(e) => handleUpdateField(index, {
                                    validation: { ...field.validation, value: e.target.value }
                                  })}
                                  placeholder={
                                    field.validation.type === 'contains' ? 'e.g., love' :
                                    field.validation.type === 'regex' ? 'e.g., ^[A-Za-z]+$' :
                                    'e.g., 5'
                                  }
                                  className="bg-gray-800 border-pink-900/30 text-white text-xs"
                                />
                              </div>

                              {/* Case Sensitive for "contains" type */}
                              {field.validation.type === 'contains' && (
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.validation?.caseSensitive || false}
                                      onChange={(e) => handleUpdateField(index, {
                                        validation: { ...field.validation, caseSensitive: e.target.checked }
                                      })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-pink-600"></div>
                                  </label>
                                  <Label className="text-gray-500 text-xs">Case Sensitive</Label>
                                </div>
                              )}

                              {/* Regex Flags */}
                              {field.validation.type === 'regex' && (
                                <div>
                                  <Label className="text-gray-500 text-xs mb-1 block">Regex Flags</Label>
                                  <Input
                                    value={field.validation?.flags || ''}
                                    onChange={(e) => handleUpdateField(index, {
                                      validation: { ...field.validation, flags: e.target.value }
                                    })}
                                    placeholder="e.g., i (case-insensitive)"
                                    className="bg-gray-800 border-pink-900/30 text-white text-xs"
                                  />
                                </div>
                              )}

                              {/* Custom Error Message */}
                              <div>
                                <Label className="text-gray-500 text-xs mb-1 block">Error Message</Label>
                                <Input
                                  value={field.validation?.errorMessage || ''}
                                  onChange={(e) => handleUpdateField(index, {
                                    validation: { ...field.validation, errorMessage: e.target.value }
                                  })}
                                  placeholder='e.g., Text must include the word "love"'
                                  className="bg-gray-800 border-pink-900/30 text-white text-xs"
                                />
                              </div>

                              {/* Validation Preview */}
                              <div className="p-2 bg-gray-900/50 rounded border border-pink-900/20">
                                <p className="text-xs text-gray-400">
                                  <span className="text-pink-400 font-semibold">Preview: </span>
                                  {field.validation.type === 'contains' && (
                                    <>Must contain "{field.validation.value}"{field.validation.caseSensitive ? ' (case-sensitive)' : ''}</>
                                  )}
                                  {field.validation.type === 'regex' && (
                                    <>Must match pattern: {field.validation.value}</>
                                  )}
                                  {field.validation.type === 'minLength' && (
                                    <>Minimum {field.validation.value} characters</>
                                  )}
                                  {field.validation.type === 'maxLength' && (
                                    <>Maximum {field.validation.value} characters</>
                                  )}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, design: null })}>
        <DialogContent className="bg-gray-900 border-pink-900/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Design
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">"{deleteModal.design?.title}"</span>?
            </p>
            <p className="text-gray-400 text-sm">
              This will also delete any associated orders. This action cannot be undone.
            </p>
            
            {/* Preview thumbnail */}
            {deleteModal.design && (
              <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-pink-900/20">
                <div className="w-12 h-12 bg-black rounded flex-shrink-0 overflow-hidden">
                  {deleteModal.design.mockup_urls?.[0] ? (
                    <img src={deleteModal.design.mockup_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : deleteModal.design.design_image_url ? (
                    <img src={deleteModal.design.design_image_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-600 m-auto mt-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{deleteModal.design.title}</p>
                  <p className="text-gray-500 text-xs">{deleteModal.design.product_type} • {deleteModal.design.color}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, design: null })}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteDesignMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteDesignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
