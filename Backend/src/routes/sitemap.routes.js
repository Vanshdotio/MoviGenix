const express = require("express");
const router = express.Router();
const { getSitemap } = require("../controllers/sitemap.controller");

router.get("/sitemap.xml", getSitemap);

module.exports = router;
