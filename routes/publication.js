'use strict'

const express = require('express');
const app = express.Router();
const middle_auth = require('../middlewares/authenticated');
const middle_file = require('../middlewares/multer_valid');
const config = require('../config/config');
const publicationController = require('../controller/publicationController');

app.post('/publication', middle_auth.ensure_Auth, publicationController.createPublication);

module.exports = app;