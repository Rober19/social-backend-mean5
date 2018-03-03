'use strict'

const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination');

const dbPublication = require('../model/publication');
const dbFollow = require('../model/follow');
const dbUser = require('../model/user');


function modelPub(req) {
  const publication = {
    text: req.body.text,
    file: null,
    created_at: moment().unix(),
    user: req.user.sub
  }
  return publication;
}

function createPublication(req, res) {
  //se tomaran los valores
  dbPublication.create(modelPub(req), (err, data) => {
    //si ocurre algun error pues lo retornaremos
    if (err) return res.status(500).send(config.resJson(config.resMsg.publicationErr, 500));
    //sino retornaremos un mensaje exitoso
    res.status(200).send(config.resJson(data, 200));
  });
}

function deletePublication(req, res) {
  const public_id = req.params.id;

  dbPublication.findById({ _id: public_id }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.publicationsBackErr, 500));
    if (!data) return res.status(500).send(config.resJson(config.resMsg.publicationNotFound, 500));

    if (data.user == req.user.sub) {
      dbPublication.findByIdAndRemove({ _id: public_id }, (err, data) => {
        if (err) return res.status(500).send(config.resJson(config.resMsg.publicationsBackErr, 500));
        if (!data) return res.status(500).send(config.resJson(config.resMsg.publicationNotFound, 500));
        return res.status(200).send(config.resJson(data, 200));
      });
    } else {      
      return res.status(500).send(config.resJson(config.resMsg.nonAuth, 500));
    }


  });
}

function getPublications(req, res) {
  let page = '1';

  if (req.query.page) {
    page = req.query.page;
  }
  let itemsPerPage = 4;

  dbFollow.find({ user: req.user.sub }).populate('followed').exec((err, data) => {
    //si ocurre algun error pues lo retornaremos
    if (err) return res.status(500).send(config.resJson(config.resMsg.error, 500));

    let follows_clean = [];

    data.forEach((follow) => {
      follows_clean.push(follow.followed);
    });

    dbPublication.find({ user: { '$in': follows_clean } })
      .sort('-created_at')
      .populate('user')
      .paginate(page, itemsPerPage, (err, data, total) => {
        if (err) return res.status(500).send(config.resJson(config.resMsg.publicationsBackErr, 500));
        if (!data) return res.status(500).send(config.resJson(config.resMsg.publicationNotFound, 500));

        return res.status(200).send({
          total_items: total,
          pages: Math.ceil(total / itemsPerPage),
          page: page,
          data
        })
      });

  });
}

function getPublication(req, res) {
  const public_id = req.params.id;

  dbPublication.findById({ _id: public_id }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.publicationsBackErr, 500));
    if (!data) return res.status(500).send(config.resJson(config.resMsg.publicationNotFound, 500));
    return res.status(200).send(config.resJson(data, 200));
  });

}



module.exports = {
  createPublication,
  getPublications,
  getPublication,
  deletePublication
}