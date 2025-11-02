import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Initialize Supabase client using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define standard order statuses for the dropdown
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  // activeTab can be 'profiles' or 'products' or 'orders'
  const [activeTab, setActiveTab] = useState('profiles'); 
  // New state to track which user's orders are being viewed
  const [selectedUserId, setSelectedUserId] = useState(null); 
  
  // Auth State
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  // ⭐ NEW STATE: To toggle between sign-in and sign-up forms
  const [isSigningUp, setIsSigningUp] = useState(false); 
  const [authMessage, setAuthMessage] = useState('');

  // Profiles Management State
  const [editingProfile, setEditingProfile] = useState(null);

  // Orders Management State
  const [newOrder, setNewOrder] = useState({ user_id: '', total_amount: 0, shipping_address: '', payment_method: 'COD', product_id: '', quantity: 1, price_at_purchase: 0, product_size: '', product_color: '' });
  const [editingOrder, setEditingOrder] = useState(null);

  // Products Management State
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, stock_quantity: 1, image: null, color: '' });
  const [editingProduct, setEditingProduct] = useState(null);

  // --- AUTHENTICATION & SESSION MANAGEMENT ---
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false); 
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- DATA FETCHING (Triggered on Auth/Logout) ---
  useEffect(() => {
    if (user && !loading) {
      fetchProfiles();
      fetchOrders();
      fetchProducts();
    }
    if (!user && !loading) {
      setProfiles([]);
      setOrders([]);
      setProducts([]);
    }
  }, [user, loading]);

  // --- UTILITY/API FUNCTIONS ---
  const signIn = async () => {
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage('Sign in failed: ' + error.message);
  };
  
  // ⭐ NEW FUNCTION: Sign Up
  const signUp = async () => {
    setAuthMessage('');
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthMessage('Sign up failed: ' + error.message);
    } else {
      // Supabase typically requires email confirmation.
      // After sign up, the user won't immediately have a session unless using passwordless or email is confirmed.
      setAuthMessage('Sign up successful! Please check your email to confirm your account.');
      setIsSigningUp(false); // Switch back to sign-in screen
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error('Fetch profiles error:', error);
    else setProfiles(data);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*, order_items(*)');
    if (error) console.error('Fetch orders error:', error);
    else setOrders(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error('Fetch products error:', error);
    else setProducts(data);
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) console.error('Upload image error:', error);
    else return data.path;
  };

  // --- PROFILES MANAGEMENT FUNCTIONS (Omitted for brevity, assumed unchanged) ---
  const editProfile = async () => {
    const { error } = await supabase.from('profiles').update({
      username: editingProfile.username, full_name: editingProfile.full_name,
      age: editingProfile.age, phone: editingProfile.phone, address: editingProfile.address
    }).eq('id', editingProfile.id);
    if (error) console.error('Edit profile error:', error);
    else { fetchProfiles(); setEditingProfile(null); }
  };
  const deleteProfile = async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error('Delete profile error:', error);
    else fetchProfiles();
  };
  
  const viewUserOrders = (userId) => {
    setSelectedUserId(userId);
    setActiveTab('orders');
  };

  // --- ORDERS MANAGEMENT FUNCTIONS (Omitted for brevity, assumed unchanged) ---
  const addOrder = async () => {
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      user_id: newOrder.user_id, total_amount: newOrder.total_amount,
      shipping_address: newOrder.shipping_address, payment_method: newOrder.payment_method
    }).select().single();
    if (orderError) return console.error('Add order error:', orderError);
    
    const { error: itemError } = await supabase.from('order_items').insert({
      order_id: orderData.id, product_id: newOrder.product_id,
      quantity: newOrder.quantity, price_at_purchase: newOrder.price_at_purchase,
      product_size: newOrder.product_size, product_color: newOrder.product_color
    });
    
    if (itemError) console.error('Add order item error:', itemError);
    else { fetchOrders(); setNewOrder({ user_id: '', total_amount: 0, shipping_address: '', payment_method: 'COD', product_id: '', quantity: 1, price_at_purchase: 0, product_size: '', product_color: '' }); }
  };

  const editOrder = async () => {
    const { error } = await supabase.from('orders').update({
      status: editingOrder.status, total_amount: editingOrder.total_amount,
      shipping_address: editingOrder.shipping_address, payment_method: editingOrder.payment_method
    }).eq('id', editingOrder.id);
    if (error) console.error('Edit order error:', error);
    else { fetchOrders(); setEditingOrder(null); }
  };
  
  const deleteOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.error('Delete order error:', error);
    else fetchOrders();
  };

  // --- PRODUCT MANAGEMENT FUNCTIONS (Omitted for brevity, assumed unchanged) ---
  const addProduct = async () => {
    let imagePath = newProduct.image ? await uploadImage(newProduct.image) : null;
    const { error } = await supabase.from('products').insert({
      name: newProduct.name, description: newProduct.description,
      price: newProduct.price, stock_quantity: newProduct.stock_quantity, 
      image_path: imagePath, color: newProduct.color
    });
    if (error) console.error('Add product error:', error);
    else { fetchProducts(); setNewProduct({ name: '', description: '', price: 0, stock_quantity: 1, image: null, color: '' }); }
  };

  const editProduct = async () => {
    let imagePath = editingProduct.image_path;
    if (editingProduct.image instanceof File) { imagePath = await uploadImage(editingProduct.image); }
    const { error } = await supabase.from('products').update({
      name: editingProduct.name, description: editingProduct.description,
      price: editingProduct.price, stock_quantity: editingProduct.stock_quantity, 
      image_path: imagePath, color: editingProduct.color
    }).eq('id', editingProduct.id);
    if (error) console.error('Edit product error:', error);
    else { fetchProducts(); setEditingProduct(null); }
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('Delete product error:', error);
    else fetchProducts();
  };

  // Filter orders based on the selected user ID
  const filteredOrders = orders.filter(order => order.user_id === selectedUserId);

  // --- CONDITIONAL RENDERING ---

  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return (
      <div className="auth-container">
        {/* ⭐ NEW: Inner container for mobile responsiveness and styling (from CSS) */}
        <div> 
          {/* ⭐ NEW: Conditional rendering for Sign Up vs. Sign In */}
          <h1>{isSigningUp ? 'Sign Up for Admin Access' : 'Sign In to Admin Dashboard'}</h1>
          
          {/* ⭐ NEW: Display Auth messages */}
          {authMessage && <p style={{ color: authMessage.includes('failed') ? 'var(--danger-color)' : 'var(--success-color)', marginBottom: '15px', fontWeight: 'bold' }}>{authMessage}</p>}
          
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          
          {isSigningUp ? (
            <button onClick={signUp}>Sign Up</button>
          ) : (
            <button onClick={signIn}>Sign In</button>
          )}

          {/* ⭐ NEW: Toggle button */}
          <button 
            style={{ 
              backgroundColor: '#95a5a6', /* Muted button for secondary action */
              marginTop: '10px' 
            }}
            onClick={() => {
              setIsSigningUp(!isSigningUp);
              setAuthMessage(''); // Clear message when switching
              setEmail('');
              setPassword('');
            }}
          >
            {isSigningUp ? 'Already have an account? Sign In' : 'Need Admin Access? Sign Up'}
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD UI (Omitted for brevity, assumed unchanged) ---
  return (
    <div className="App">
      <h1>Admin Dashboard</h1>
      <button onClick={signOut}>Sign Out</button>
      <div className="tab-buttons">
        <button onClick={() => { setActiveTab('profiles'); setSelectedUserId(null); }}>Profiles</button>
        <button onClick={() => { setActiveTab('products'); setSelectedUserId(null); }}>Products</button>
      </div>
      
      <hr/>

      {activeTab === 'profiles' && (
        <div className="profiles-tab">
          <h2>👤 User Profiles</h2>
          <ul>
            {profiles.map(profile => (
              <li key={profile.id} style={{ borderBottom: '1px dotted #ccc', padding: '10px 0' }}>
                <p>
                  <strong>ID:</strong> {profile.id} | 
                  <strong>Username:</strong> {profile.username} | 
                  <strong>Full Name:</strong> {profile.full_name} 
                </p>
                <button onClick={() => setEditingProfile(profile)}>Edit Profile</button>
                <button onClick={() => viewUserOrders(profile.id)}>View Orders</button>
                <button onClick={() => deleteProfile(profile.id)}>Delete Profile</button>
              </li>
            ))}
          </ul>
          {editingProfile && (
            <div className="edit-form">
              <h3>Edit Profile</h3>
              <input type="text" value={editingProfile.username} onChange={e => setEditingProfile({...editingProfile, username: e.target.value})} placeholder="Username" />
              <input type="text" value={editingProfile.full_name} onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})} placeholder="Full Name" />
              <input type="number" value={editingProfile.age} onChange={e => setEditingProfile({...editingProfile, age: parseInt(e.target.value)})} placeholder="Age" />
              <input type="text" value={editingProfile.phone} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} placeholder="Phone" />
              <input type="text" value={editingProfile.address} onChange={e => setEditingProfile({...editingProfile, address: e.target.value})} placeholder="Address" />
              <button onClick={editProfile}>Save</button>
              <button onClick={() => setEditingProfile(null)}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && selectedUserId && (
        <div className="orders-tab">
          <h2>📦 Orders for User ID: {selectedUserId}</h2>
          <button onClick={() => setActiveTab('profiles')}>← Back to Profiles</button>
          <hr/>

          {filteredOrders.length > 0 ? (
            <ul>
              {filteredOrders.map(order => (
                <li key={order.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                  <p>
                    <strong>Order ID:</strong> {order.id} | 
                    <strong>Total:</strong> ₱{order.total_amount} | 
                    <strong>Status:</strong> {order.status}
                  </p>
                  <p><strong>Shipping:</strong> {order.shipping_address} | <strong>Payment:</strong> {order.payment_method}</p>
                  
                  <h4>Items:</h4>
                  <ul style={{ listStyleType: 'disc', marginLeft: '20px' }}>
                    {order.order_items.map((item, index) => (
                      <li key={index}>
                        Product ID: {item.product_id}, Qty: {item.quantity}, Price: ₱{item.price_at_purchase} 
                        {item.product_size && ` (Size: ${item.product_size})`}
                        {item.product_color && ` (Color: ${item.product_color})`}
                      </li>
                    ))}
                  </ul>
                  
                  <button onClick={() => setEditingOrder(order)}>Edit</button>
                  <button onClick={() => deleteOrder(order.id)}>Delete</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No orders found for this user.</p>
          )}

          {editingOrder && (
            <div className="edit-form">
              <h3>Edit Order Status/Details (Order ID: {editingOrder.id})</h3>
              
              <label>Status:</label>
              <select 
                value={editingOrder.status} 
                onChange={e => setEditingOrder({...editingOrder, status: e.target.value})}
              >
                {ORDER_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <label>Total Amount:</label>
              <input type="number" value={editingOrder.total_amount} onChange={e => setEditingOrder({...editingOrder, total_amount: parseFloat(e.target.value)})} placeholder="Total Amount" />
              <label>Shipping Address:</label>
              <input type="text" value={editingOrder.shipping_address} onChange={e => setEditingOrder({...editingOrder, shipping_address: e.target.value})} placeholder="Shipping Address" />
              <label>Payment Method:</label>
              <input type="text" value={editingOrder.payment_method} onChange={e => setEditingOrder({...editingOrder, payment_method: e.target.value})} placeholder="Payment Method" />
              
              <button onClick={editOrder}>Save</button>
              <button onClick={() => setEditingOrder(null)}>Cancel</button>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'products' && (
        <div className="products-tab">
          <h2>🛒 Products</h2>
          {/* Add Product Form */}
          <div className="add-form">
            <h3>Add New Product</h3>
            <input type="text" placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input type="text" placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
            <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
            <input type="number" placeholder="Stock Quantity" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value)})} />
            <input type="text" placeholder="Color" value={newProduct.color} onChange={e => setNewProduct({...newProduct, color: e.target.value})} />
            <input type="file" onChange={e => setNewProduct({...newProduct, image: e.target.files[0]})} />
            <button onClick={addProduct}>Add Product</button>
          </div>
          <hr/>
          {/* Products List */}
          <ul>
            {products.map(product => (
              <li key={product.id} style={{ borderBottom: '1px dotted #ccc', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {product.image_path ? (
                    <img 
                      src={supabase.storage.from('product-images').getPublicUrl(product.image_path).data.publicUrl} 
                      alt={product.name} 
                      width="100" 
                      style={{ height: '100px', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>[No Image]</span> 
                  )}
                  <div>
                    <strong>{product.name}</strong> - ₱{product.price} ({product.stock_quantity} in stock)
                    {product.color && <span> | Color: {product.color}</span>}
                    <p style={{ fontSize: '0.9em', color: '#666' }}>{product.description}</p>
                    <button onClick={() => setEditingProduct({...product, image: null})}>Edit</button>
                    <button onClick={() => deleteProduct(product.id)}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {/* Edit Product Form */}
          {editingProduct && (
            <div className="edit-form">
              <h3>Edit Product</h3>
              <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Name" />
              <input type="text" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Description" />
              <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} placeholder="Price" />
              <input type="number" value={editingProduct.stock_quantity} onChange={e => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value)})} placeholder="Stock Quantity" />
              <input type="text" value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} placeholder="Color" />
              <input type="file" onChange={e => setEditingProduct({...editingProduct, image: e.target.files[0]})} />
              <button onClick={editProduct}>Save</button>
              <button onClick={() => setEditingProduct(null)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
