import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface Product {
  _id?: string
  name: string
  price: number
  originalPrice?: number
  discount?: number
  rating: number
  reviews: number
  image: string
  category: string
  description?: string
  inStock: boolean
  brand?: string
}

export default function MOxEStore() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<any[]>([])

  const categories = [
    { id: 'all', label: 'All', icon: 'fa-th' },
    { id: 'electronics', label: 'Electronics', icon: 'fa-mobile-alt' },
    { id: 'fashion', label: 'Fashion', icon: 'fa-tshirt' },
    { id: 'home', label: 'Home', icon: 'fa-home' },
    { id: 'books', label: 'Books', icon: 'fa-book' },
    { id: 'sports', label: 'Sports', icon: 'fa-dumbbell' },
    { id: 'beauty', label: 'Beauty', icon: 'fa-palette' },
  ]

  useEffect(() => {
    loadProducts()
    loadCart()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [selectedCategory, searchQuery, products])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/store/products').catch(() => ({ data: { products: [] } }))
      setProducts(response.data.products || [])
      setFilteredProducts(response.data.products || [])
    } catch (error) {
      console.error('Failed to load products:', error)
      // Use fallback data
      const fallbackProducts: Product[] = [
        {
          _id: '1',
          name: 'Wireless Bluetooth Headphones',
          price: 2999,
          originalPrice: 4999,
          discount: 40,
          rating: 4.5,
          reviews: 1250,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
          category: 'electronics',
          inStock: true,
          brand: 'TechSound',
        },
        {
          _id: '2',
          name: 'Smart Watch Pro',
          price: 8999,
          originalPrice: 12999,
          discount: 31,
          rating: 4.7,
          reviews: 890,
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          category: 'electronics',
          inStock: true,
          brand: 'SmartTech',
        },
        {
          _id: '3',
          name: 'Cotton T-Shirt',
          price: 599,
          originalPrice: 999,
          discount: 40,
          rating: 4.3,
          reviews: 450,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
          category: 'fashion',
          inStock: true,
          brand: 'FashionHub',
        },
        {
          _id: '4',
          name: 'Home Decor Set',
          price: 2499,
          originalPrice: 3499,
          discount: 29,
          rating: 4.6,
          reviews: 320,
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          category: 'home',
          inStock: true,
          brand: 'HomeStyle',
        },
        {
          _id: '5',
          name: 'Fitness Tracker',
          price: 1999,
          originalPrice: 2999,
          discount: 33,
          rating: 4.4,
          reviews: 680,
          image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
          category: 'sports',
          inStock: true,
          brand: 'FitLife',
        },
        {
          _id: '6',
          name: 'Skincare Bundle',
          price: 1499,
          originalPrice: 2499,
          discount: 40,
          rating: 4.8,
          reviews: 920,
          image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
          category: 'beauty',
          inStock: true,
          brand: 'BeautyCare',
        },
        {
          _id: '7',
          name: 'Best Seller Book Collection',
          price: 899,
          originalPrice: 1299,
          discount: 31,
          rating: 4.5,
          reviews: 210,
          image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
          category: 'books',
          inStock: true,
          brand: 'BookWorld',
        },
        {
          _id: '8',
          name: 'Wireless Mouse',
          price: 799,
          originalPrice: 1299,
          discount: 38,
          rating: 4.2,
          reviews: 560,
          image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop',
          category: 'electronics',
          inStock: true,
          brand: 'TechGear',
        },
      ]
      setProducts(fallbackProducts)
      setFilteredProducts(fallbackProducts)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCart = async () => {
    try {
      const savedCart = localStorage.getItem('moxe_cart')
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error('Failed to load cart:', error)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
  }

  const addToCart = (product: Product) => {
    const updatedCart = [...cart, { ...product, quantity: 1 }]
    setCart(updatedCart)
    localStorage.setItem('moxe_cart', JSON.stringify(updatedCart))
    alert(`${product.name} added to cart!`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <i className="fas fa-store text-primary-light"></i>
            MOxE Store
          </h1>
          <p className="text-sm text-text-gray">Shop the best deals</p>
        </div>
        <button
          onClick={() => navigate('/cart')}
          className="relative bg-medium-gray p-3 rounded-lg hover:bg-light-gray transition-colors"
        >
          <i className="fas fa-shopping-cart text-xl"></i>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-medium-gray text-text-light px-4 py-3 pl-12 rounded-xl border border-light-gray focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-text-gray"></i>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-gray hover:text-text-light"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="bg-medium-gray rounded-2xl p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-dark-gray text-text-gray hover:bg-light-gray'
              }`}
            >
              <i className={`fas ${category.icon} text-xl`}></i>
              <span className="text-xs font-semibold whitespace-nowrap">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-4xl text-primary-light mb-4"></i>
          <p className="text-text-gray">Loading products...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="bg-medium-gray rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/store/product/${product._id}`)}
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-dark-gray overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/400x400?text=Product'
                  }}
                />
                {product.discount && (
                  <div className="absolute top-2 left-2 bg-danger text-white text-xs font-bold px-2 py-1 rounded">
                    {product.discount}% OFF
                  </div>
                )}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold">Out of Stock</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3">
                {product.brand && (
                  <p className="text-xs text-text-gray mb-1">{product.brand}</p>
                )}
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star text-xs ${
                          i < Math.floor(product.rating)
                            ? 'text-warning'
                            : 'text-text-gray'
                        }`}
                      ></i>
                    ))}
                  </div>
                  <span className="text-xs text-text-gray">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-lg">{formatPrice(product.price)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-text-gray line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (product.inStock) {
                      addToCart(product)
                    }
                  }}
                  disabled={!product.inStock}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    product.inStock
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-light-gray text-text-gray cursor-not-allowed'
                  }`}
                >
                  <i className="fas fa-shopping-cart mr-2"></i>
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <i className="fas fa-search text-4xl text-text-gray mb-4"></i>
          <p className="text-text-gray">No products found</p>
          <p className="text-sm text-text-gray mt-1">Try a different search or category</p>
        </div>
      )}
    </div>
  )
}


