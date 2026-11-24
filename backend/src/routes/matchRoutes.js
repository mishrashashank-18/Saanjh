const express = require("express")
const { authenticate } = require("../middleware/authMiddleware")
const matchmakerService = require("../services/matchmakerService")

const router = express.Router()

/**
 * GET /api/matches
 * Returns AI curated matches for current authenticated user using Dual-Transformer & Qdrant
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const result = await matchmakerService.getMatches(req.user._id)
    return res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/matches/status
 * Returns Qdrant vector database and Transformer model status
 */
router.get("/status", async (req, res, next) => {
  try {
    const result = await matchmakerService.getEngineStatus()
    return res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/matches/sync
 * Triggers a sync of all profiles into Qdrant vector database
 */
router.post("/sync", authenticate, async (req, res, next) => {
  try {
    const result = await matchmakerService.syncAllVectors()
    return res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router
