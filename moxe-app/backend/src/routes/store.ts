import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
} from '../controllers/storeController'

const router = express.Router()

// Get all products
router.get('/products', authenticate, getProducts)

// Get products by category
router.get('/products/category/:category', authenticate, getProductsByCategory)

// Search products
router.get('/products/search', authenticate, searchProducts)

// Get single product
router.get('/products/:id', authenticate, getProductById)

export default router

