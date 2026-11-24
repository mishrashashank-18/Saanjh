const express = require("express")
const adminController = require("../controllers/adminController")
const { authenticate, requireAdmin } = require("../middleware/authMiddleware")

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(requireAdmin)

// User monitoring & management endpoints
router.get("/users", adminController.getUsers)
router.get("/users/:userId", adminController.getUserDetails)
router.delete("/users/:userId", adminController.deleteUser)
router.patch("/users/:userId/role", adminController.updateUserRole)
router.patch("/users/:userId/status", adminController.updateUserStatus)

// Qdrant vector database management
router.get("/qdrant/status", adminController.getQdrantStatus)
router.post("/qdrant/sync", adminController.syncQdrant)

module.exports = router
