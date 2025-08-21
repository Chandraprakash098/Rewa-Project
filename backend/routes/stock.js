const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");
const { auth, checkRole } = require("../middleware/auth");
const upload = require("../config/multer");

router.use(auth, checkRole("stock"));

router.get("/products", stockController.getAllProducts);

router.put("/update-quantity", stockController.updateQuantity);

router.get("/history/:productId", stockController.getStockHistory);
router.get("/history", stockController.getallStockHistory);

router.post(
  "/check-in",
  upload.single("checkInImage"),
  stockController.checkIn
);
router.post("/check-out", stockController.checkOut);
router.get("/daily-updates", stockController.getDailyStockUpdates);

module.exports = router;
