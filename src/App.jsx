import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  ChevronRight, 
  ShoppingBag, 
  User, 
  Filter, 
  Clock, 
  ChevronDown, 
  ArrowLeft,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Bike,
  Tag,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Edit2
} from 'lucide-react';

// --- Structured Mock Data for SQL Simulation ---

const LOCALITIES = [
  "Connaught Place", "South Extension", "Dwarka", "Rohini", "Hauz Khas", 
  "Indirapuram", "Vasant Kunj", "Lajpat Nagar", "Malviya Nagar", 
  "Greater Kailash", "Pitampura", "Chandni Chowk", "Saket", "Noida Sector 18"
];

// Dynamic images based on restaurant name/cuisine
const getRestaurantImage = (restaurant) => {
  const cuisine = restaurant.cuisine?.toLowerCase();
  const name = restaurant.name?.toLowerCase();
  
  if (cuisine?.includes('biryani') || name?.includes('biryani')) {
    return "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80";
  } else if (cuisine?.includes('pizza') || name?.includes('pizza')) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";
  } else if (cuisine?.includes('chinese') || name?.includes('chinese')) {
    return "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80";
  } else if (cuisine?.includes('dessert') || name?.includes('sweet')) {
    return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80";
  } else if (cuisine?.includes('north indian') || name?.includes('dhaba')) {
    return "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80";
  } else if (cuisine?.includes('healthy') || name?.includes('salad')) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80";
  } else {
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"; // Default restaurant
  }
};

// Restaurants will be fetched from API
const RESTAURANTS = [];

// --- Shared Components ---

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-1 bg-green-700 text-white px-1.5 py-0.5 rounded text-[11px] font-bold">
    {rating} <Star size={10} fill="currentColor" />
  </div>
);

const VegIcon = ({ isVeg }) => (
  <div className={`w-3 h-3 border-2 ${isVeg ? 'border-green-600' : 'border-red-600'} rounded-sm flex items-center justify-center p-[1px]`}>
    <div className={`w-full h-full rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

// --- Main Application ---

export default function App() {
  const [view, setView] = useState('home');
  const [userId, setUserId] = useState(1);
  const [selectedLocality, setSelectedLocality] = useState(LOCALITIES[0]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartRestaurantId, setCartRestaurantId] = useState(null);
  const [filters, setFilters] = useState({ vegOnly: false, minRating: 0 });
  
  // API fetched data
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  
  const [currentOrder, setCurrentOrder] = useState(null);
  const [pastOrders, setPastOrders] = useState([
    { id: 'ORD-7291', restaurant: 'Royal Biryani House', amount: 450, date: '2023-12-01', rating: 5, status: 'Delivered', satisfaction: 'Good', userId: 1 },
    { id: 'ORD-8102', restaurant: 'The Pizza Box', amount: 899, date: '2023-11-28', rating: 4, status: 'Delivered', satisfaction: 'Good', userId: 1 }
  ]);

  // Fetch restaurants on component mount
  useEffect(() => {
    fetch("http://127.0.0.1:5000/restaurants")
      .then(res => res.json())
      .then(data => setRestaurants(data))
      .catch(err => console.error("Failed to fetch restaurants:", err));
  }, []);

  // Fetch menu items when restaurant is selected
  useEffect(() => {
    if (!selectedRestaurant) {
      setMenuItems([]);
      return;
    }

    fetch(`http://127.0.0.1:5000/menu/${selectedRestaurant.restaurant_id}`)
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => console.error("Failed to fetch menu:", err));
  }, [selectedRestaurant]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cart]);
  const cartCount = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  // Delivery and platform fees
  const DELIVERY_FEE = 40;
  const PLATFORM_FEE = 25;
  const grandTotal = cartTotal + DELIVERY_FEE + PLATFORM_FEE;

  const updateCart = (item, delta) => {
    setCart(prev => {
      if (prev.length === 0 && delta > 0) {
        setCartRestaurantId(item.restaurant_id);
      }

      // BLOCK cross-restaurant items
      if (cartRestaurantId && item.restaurant_id !== cartRestaurantId) {
        alert("You can order from only one restaurant at a time");
        return prev;
      }

      const existing = prev.find(i => i.item_id === item.item_id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          const updated = prev.filter(i => i.item_id !== item.item_id);
          if (updated.length === 0) setCartRestaurantId(null);
          return updated;
        }
        return prev.map(i =>
          i.item_id === item.item_id ? { ...i, quantity: newQty } : i
        );
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const placeOrder = async () => {
    // Build items payload from cart
    const itemsPayload = cart.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
      item_price: item.price
    }));

    const orderData = {
      user_id: userId, // ✅ Use state userId (can be changed in UI)
      restaurant_id: cartRestaurantId,
      total_amount: cartTotal, // 👈 SAME VALUE
      items: itemsPayload
    };

    try {
      const response = await fetch("http://127.0.0.1:5000/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Order success:", data);
        setCurrentOrder({
          order_id: data.order_id,
          amount: cartTotal,
          rating: 0,
          satisfaction: null
        });
        setView("tracking"); // go to tracking page
        setCart([]);
        setCartRestaurantId(null);
      } else {
        console.error("Order failed:", data);
        if (data.error && data.error.includes("foreign key constraint")) {
          alert(`User ID ${userId} doesn't exist in database. Please use an existing user ID (1, 2, 3) or create this user first.`);
        } else {
          alert("Order failed. Check backend.");
        }
      }

    } catch (error) {
      console.error("Backend not reachable:", error);
      alert("Backend not running!");
    }
  };

  const handleRating = async (rating) => {
    setCurrentOrder(prev => ({ ...prev, rating }));
    
    // Send rating to backend (reviews table)
    try {
      console.log("Sending rating:", {
        order_id: currentOrder?.order_id,
        rating: rating
      });
      
      const response = await fetch("http://127.0.0.1:5000/rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: currentOrder?.order_id,
          rating: rating
        })
      });
      
      const result = await response.json();
      console.log("Rating response:", result);
      
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const handleSatisfaction = (satisfaction) => {
    setCurrentOrder(prev => ({ ...prev, satisfaction }));
  };

  const renderHome = () => (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <MapPin className="text-[#FC8019]" size={20} />
        <div className="flex-1">
          <p className="text-[10px] uppercase font-bold text-gray-400">Current Locality</p>
          <select 
            value={selectedLocality}
            onChange={(e) => setSelectedLocality(e.target.value)}
            className="w-full font-bold text-gray-800 outline-none bg-transparent appearance-none cursor-pointer"
          >
            {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button 
          onClick={() => setFilters(f => ({ ...f, vegOnly: !f.vegOnly }))}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${filters.vegOnly ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          {filters.vegOnly ? 'Pure Veg Only' : 'Veg / Non-Veg'}
        </button>
        <button 
          onClick={() => setFilters(f => ({ ...f, minRating: f.minRating === 4 ? 0 : 4 }))}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${filters.minRating === 4 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          Rating 4.0+
        </button>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Restaurants in {selectedLocality}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants && restaurants.length > 0 ? restaurants
            .filter(r => (!filters.vegOnly || r.isVeg) && (r.rating || 4.0) >= filters.minRating)
            .map(res => (
            <div 
              key={res.restaurant_id} 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelectedRestaurant(res); setView('detail'); }}
            >
              <img src={getRestaurantImage(res)} className="w-full h-48 object-cover" />
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 leading-tight">{res.name}</h3>
                  <StarRating rating={res.rating || 4.0} />
                </div>
                <p className="text-xs text-gray-500 mb-3">{res.cuisine} • ₹{res.priceForTwo || 500} for two</p>
                <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 border-t border-gray-50 pt-3">
                  <div className="flex items-center gap-1"><Clock size={12}/> {res.deliveryTime || '30 min'}</div>
                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                  <div>{res.priceRange || 'Medium'} Price</div>
                </div>
              </div>
            </div>
          ))
          : (
            <div className="col-span-full text-center py-8 text-gray-500">
              Loading restaurants...
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderDetail = () => (
    <div className="max-w-3xl mx-auto pb-20">
      <button onClick={() => setView('home')} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={16}/> Back to Discovery</button>
      
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{selectedRestaurant.name}</h1>
            <p className="text-gray-500 font-medium">{selectedRestaurant.cuisine}</p>
          </div>
          <div className="text-right">
            <StarRating rating={selectedRestaurant.rating || 4.0} />
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">ID: {selectedRestaurant.restaurant_id}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {menuItems.map(item => {
          const inCart = cart.find(i => i.item_id === item.item_id);
          return (
            <div key={item.item_id} className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
              <div className="space-y-1">
                <VegIcon isVeg={item.is_veg === 1} />
                <h4 className="font-bold text-gray-800">{item.item_name}</h4>
                <p className="text-sm font-black text-gray-900">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-3">
                {inCart ? (
                  <div className="flex items-center gap-3 bg-orange-50 text-[#FC8019] px-3 py-1.5 rounded-xl border border-orange-100 font-bold">
                    <button onClick={() => updateCart(item, -1)}><Minus size={16}/></button>
                    <span className="min-w-[12px] text-center">{inCart.quantity}</span>
                    <button onClick={() => updateCart(item, 1)}><Plus size={16}/></button>
                  </div>
                ) : (
                  <button onClick={() => updateCart(item, 1)} className="bg-white border border-gray-200 text-[#FC8019] px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-gray-50 uppercase text-xs">Add</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCart = () => (
    <div className="max-w-2xl mx-auto pb-20">
      <h1 className="text-2xl font-black mb-6">Checkout</h1>
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Your cart is empty</p>
          <button onClick={() => setView('home')} className="mt-4 text-[#FC8019] font-bold">Browse Food</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800">Order from {selectedRestaurant.name}</h3>
            {cart.map(item => (
              <div key={item.item_id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <VegIcon isVeg={item.is_veg === 1} />
                  <span className="font-medium">{item.item_name} x {item.quantity}</span>
                </div>
                <span className="font-bold">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-50 space-y-2 text-xs font-medium text-gray-500">
              <div className="flex justify-between">
                <span>Item Total</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{DELIVERY_FEE}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>₹{PLATFORM_FEE}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2">
                <span>Grand Total</span>
                <span className="text-[#E23744] font-bold">
                  ₹{grandTotal}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={placeOrder}
            className="w-full bg-[#FC8019] text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Proceed to Payment <ChevronRight />
          </button>
        </div>
      )}
    </div>
  );

  const renderTracking = () => (
    <div className="max-w-xl mx-auto space-y-6 pb-20 text-center">
      <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
        <h2 className="text-2xl font-black">Order Placed!</h2>
        <p className="text-gray-400 font-mono text-sm mt-1 uppercase">{currentOrder?.order_id}</p>
        <p className="text-gray-500 mt-2 text-lg font-bold">₹{currentOrder?.amount}</p>
        <p className="text-gray-500 mt-4 text-sm font-medium">Ordering as: {userId}</p>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-bold mb-2">Rate your experience</h3>
        <div className="flex justify-center gap-2">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => handleRating(s)} className={`p-1 transition-transform hover:scale-110 ${currentOrder?.rating >= s ? 'text-amber-400' : 'text-gray-200'}`}><Star size={32} fill="currentColor" /></button>
          ))}
        </div>
        {currentOrder?.rating > 0 && (
          <div className="pt-4 border-t border-gray-50">
            <p className="text-sm font-bold text-gray-700 mb-3">Overall Satisfaction</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => handleSatisfaction('Good')} className={`flex items-center gap-2 px-6 py-2 rounded-xl border font-bold transition-all ${currentOrder.satisfaction === 'Good' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-100 text-gray-400'}`}><ThumbsUp size={18}/> Good</button>
              <button onClick={() => handleSatisfaction('Bad')} className={`flex items-center gap-2 px-6 py-2 rounded-xl border font-bold transition-all ${currentOrder.satisfaction === 'Bad' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-100 text-gray-400'}`}><ThumbsDown size={18}/> Bad</button>
            </div>
          </div>
        )}
      </div>
      <button onClick={() => setView('home')} className="w-full py-4 font-bold text-gray-400 hover:text-gray-800">Return to Home</button>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-[#FC8019] p-8 rounded-3xl text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black">User Profile</h1>
            <p className="opacity-80 text-sm font-medium">Session-based data generation</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10 w-64">
            <p className="text-[10px] uppercase font-bold mb-2 opacity-70">Manual User ID Switcher</p>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={userId} 
                onChange={(e) => setUserId(parseInt(e.target.value) || 1)}
                className="bg-white/20 border border-white/20 rounded-lg px-3 py-1 text-sm outline-none focus:bg-white/30 flex-1 font-mono"
              />
              <div className="p-1.5 bg-white/10 rounded-lg"><Edit2 size={14}/></div>
            </div>
            <p className="text-[9px] mt-2 opacity-60">Change this to simulate orders for different users in your SQL tables.</p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">Transaction History</h3>
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pastOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[11px] text-blue-600 font-bold">{o.userId}</td>
                  <td className="px-6 py-4 font-mono text-gray-500">{o.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{o.restaurant}</td>
                  <td className="px-6 py-4 font-black text-[#FC8019]">₹{o.amount}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {o.rating ? <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">{o.rating} <Star size={10} fill="currentColor"/></div> : '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center shadow-sm">
        <div className="max-w-6xl mx-auto px-4 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer transition-transform active:scale-95" onClick={() => setView('home')}>
            <span className="text-2xl font-black text-[#FC8019] tracking-tighter font-bold">Swiggy</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
               <span className="text-[10px] font-bold text-gray-400 uppercase">User:</span>
               <span className="text-xs font-mono font-bold text-[#FC8019]">{userId}</span>
            </div>
            <button className={`relative transition-colors ${view === 'cart' ? 'text-[#FC8019]' : 'text-gray-500'}`} onClick={() => setView('cart')}>
              <ShoppingBag size={24} />
              {cartCount > 0 && <span className="absolute -top-1 -right-2 bg-[#FC8019] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </button>
            <button className={view === 'profile' ? 'text-[#FC8019]' : 'text-gray-500'} onClick={() => setView('profile')}><User size={24} /></button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {view === 'home' && renderHome()}
        {view === 'detail' && renderDetail()}
        {view === 'cart' && renderCart()}
        {view === 'tracking' && renderTracking()}
        {view === 'profile' && renderProfile()}
      </main>
      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; }.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }body { font-family: 'Inter', sans-serif; }`}} />
    </div>
  );
}