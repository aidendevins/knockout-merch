import React, { createContext, useContext, useState, useEffect } from 'react';
import analytics from '@/services/analytics';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('knockout-cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('knockout-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Add item to cart
  const addToCart = (design, size = 'M', quantity = 1) => {
    setCartItems((prevItems) => {
      // Check if item with same design and size already exists
      const existingItemIndex = prevItems.findIndex(
        (item) => item.design.id === design.id && item.size === size
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        // Add new item
        return [...prevItems, { design, size, quantity }];
      }
    });
    
    // Track analytics
    analytics.addToCart(design.id, design.product_type || 'tshirt', design.color || 'black', size);
    
    // Open cart drawer when item is added
    setIsCartOpen(true);
  };

  // Remove item from cart
  const removeFromCart = (designId, size) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item.design.id === designId && item.size === size))
    );
    
    // Track analytics
    analytics.removeFromCart(designId);
  };

  // Update item quantity
  const updateQuantity = (designId, size, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(designId, size);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.design.id === designId && item.size === size
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculate totals
  const cartTotal = cartItems.reduce((total, item) => {
    const price = typeof item.design.price === 'number' 
      ? item.design.price 
      : parseFloat(item.design.price || 0);
    return total + price * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

