const express = require("express");
const router  = express.Router();
const ctrl    = require("./notification.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.use(protect);

router.get("/",                   ctrl.getMyNotifications);
router.patch("/read-all",         ctrl.markAllAsRead);
router.patch("/:id/read",         ctrl.markAsRead);
router.delete("/:id",             ctrl.deleteNotification);

module.exports = router;