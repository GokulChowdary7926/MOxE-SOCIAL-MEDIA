import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'

// Mock product data - In production, this would come from a database
const mockProducts = [
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
    description: 'Premium wireless headphones with noise cancellation',
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
    description: 'Advanced smartwatch with health tracking',
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
    description: 'Comfortable cotton t-shirt in various colors',
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
    description: 'Beautiful home decoration set',
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
    description: 'Track your fitness goals with this advanced tracker',
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
    description: 'Complete skincare routine bundle',
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
    description: 'Collection of best-selling books',
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
    description: 'Ergonomic wireless mouse',
  },
]

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, limit = 50, page = 1 } = req.query

    let products = [...mockProducts]

    // Filter by category
    if (category && typeof category === 'string') {
      products = products.filter((p) => p.category === category.toLowerCase())
    }

    // Search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      )
    }

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit)
    const endIndex = startIndex + Number(limit)
    const paginatedProducts = products.slice(startIndex, endIndex)

    res.json({
      success: true,
      products: paginatedProducts,
      total: products.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(products.length / Number(limit)),
    })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    })
  }
}

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const product = mockProducts.find((p) => p._id === id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    res.json({
      success: true,
      product,
    })
  } catch (error: any) {
    console.error('Error fetching product:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    })
  }
}

export const getProductsByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params
    const products = mockProducts.filter(
      (p) => p.category === category.toLowerCase()
    )

    res.json({
      success: true,
      products,
      category,
    })
  } catch (error: any) {
    console.error('Error fetching products by category:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    })
  }
}

export const searchProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        products: [],
      })
    }

    const searchLower = q.toLowerCase()
    const products = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
    )

    res.json({
      success: true,
      products,
      query: q,
    })
  } catch (error: any) {
    console.error('Error searching products:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message,
    })
  }
}

