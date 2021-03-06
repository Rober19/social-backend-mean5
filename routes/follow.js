'use strict';

const express = require('express');
const app = express.Router();
const middlw_auth = require('../middlewares/authenticated');
const followController = require('../controller/followController');

app.post('/follow', middlw_auth.ensure_Auth, followController.createFollow);
app.get('/follow/:id', middlw_auth.ensure_Auth, followController.isFollow);
app.post('/unfollow', middlw_auth.ensure_Auth, followController.deleteFollow);
app.get('/following/:id', middlw_auth.ensure_Auth, followController.getFollowingUsers);
app.get('/followers/:id', middlw_auth.ensure_Auth, followController.getFollowersUsers);

module.exports = app;
