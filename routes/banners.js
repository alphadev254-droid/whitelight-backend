const express = require('express');
const bannerController = require('../controllers/bannerController');

const router = express.Router();

// Get hero carousel images
router.get('/hero', bannerController.getHeroImages);

// Get category images
router.get('/categories', bannerController.getCategoryImages);

// Get CTA banner images
router.get('/cta', bannerController.getCtaImages);

module.exports = router;