const express = require("express");
const router  = express.Router();
const { getPublicUniversities } = require("./university.controller");

/**
 * PUBLIC route — no authentication required.
 * Used by the student registration form to populate the university dropdown.
 * Only returns active universities (isActive: true).
 */
router.get("/", getPublicUniversities);

module.exports = router;