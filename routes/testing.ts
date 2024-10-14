import express from "express";

const router = express.Router();

// Update a specific user
router.get("/test", async (req, res) => {
  try {
    res.json("HELLO");
  } catch (error) {
    res.json("ERROR");
  }
});


export default router;
