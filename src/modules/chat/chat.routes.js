const express = require("express");
const router  = express.Router();
const ctrl    = require("./chat.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.use(protect);

router.get("/",                     ctrl.getConversations);
router.post("/",                    ctrl.startConversation);
router.get("/:id/messages",         ctrl.getMessages);
router.post("/:id/messages",        ctrl.sendMessage);

module.exports = router;