// Analytics tracking service
// Tracks user events and sends them to our backend for admin dashboard

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

// Generate or retrieve session ID (persists for browser session)
function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Track an analytics event
async function trackEvent(eventType, eventData = {}) {
  try {
    const payload = {
      event_type: eventType,
      event_data: eventData,
      page_url: window.location.pathname,
      referrer: document.referrer || null,
      session_id: getSessionId(),
    };

    // Fire and forget - don't await to avoid blocking UI
    fetch(`${apiBase}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(err => {
      // Silently fail - analytics should never break the app
      console.warn('Analytics tracking failed:', err.message);
    });
  } catch (error) {
    console.warn('Analytics tracking error:', error.message);
  }
}

// Convenience methods for common events
const analytics = {
  // Page views
  pageView: (pageName) => trackEvent('page_view', { page: pageName }),
  
  // Design events
  designStarted: (templateId) => trackEvent('design_started', { template_id: templateId }),
  designCreated: (designId, templateId) => trackEvent('design_created', { design_id: designId, template_id: templateId }),
  designViewed: (designId) => trackEvent('design_viewed', { design_id: designId }),
  
  // Template events
  templateSelected: (templateId) => trackEvent('template_selected', { template_id: templateId }),
  templateViewed: (templateId) => trackEvent('template_viewed', { template_id: templateId }),
  
  // Photo/AI events
  photoUploaded: (templateId) => trackEvent('photo_uploaded', { template_id: templateId }),
  aiGenerationStarted: (templateId) => trackEvent('ai_generation_started', { template_id: templateId }),
  aiGenerationCompleted: (templateId, success) => trackEvent('ai_generation_completed', { template_id: templateId, success }),
  
  // Shopping events
  addToCart: (designId, productType, color, size) => trackEvent('add_to_cart', { 
    design_id: designId, 
    product_type: productType, 
    color, 
    size 
  }),
  removeFromCart: (designId) => trackEvent('remove_from_cart', { design_id: designId }),
  checkoutStarted: (cartTotal, itemCount) => trackEvent('checkout_started', { 
    cart_total: cartTotal, 
    item_count: itemCount 
  }),
  purchaseCompleted: (orderId, total) => trackEvent('purchase_completed', { 
    order_id: orderId, 
    total 
  }),
  
  // User events
  signupStarted: () => trackEvent('signup_started'),
  signupCompleted: () => trackEvent('signup_completed'),
  loginCompleted: () => trackEvent('login_completed'),
  
  // Community events
  communityViewed: () => trackEvent('community_viewed'),
  communityDesignClicked: (designId) => trackEvent('community_design_clicked', { design_id: designId }),
  
  // Generic event for custom tracking
  track: trackEvent,
};

export default analytics;
