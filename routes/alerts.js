var mongoose = require('mongoose');
var moment = require('moment');
var nodemailer = require('nodemailer');

exports.getAlerts = function(req, res) {
  mongoose.model('Alert').find({}, function (err, items) {
    if(err) {
      console.log(err);
      res.send(500, { message: err });
    } else {
      res.send(200, { data: items });
    }
  });
};

exports.addAlert = function (alert) {

  var Alert = mongoose.model('Alert');

  alert = new Alert(alert);

  alert.save(function(err) {
    if(err) {
      console.log(err);
    }
  });

};

exports.countNewAlerts = function(req, res) {
  if(req.session.user.isAdmin) {

    mongoose.model('Alert')
    .count({status: 'new'}, function (err, count) {
      if(err) {
        res.send(500, { message: err});
      } else {
        res.send(200, { newMessages: count });
      }
    });
  } else {
    res.send(401, { message: "You are not authorized!"});
  }
};

exports.markAlerts = function(req, res) {
  mongoose.model('Alert')
  .update({
    '_id' : { $in: req.body.alerts }
  }, 
  { status: req.body.status }, 
  { multi: true }, 
  function (err, alerts) {
    if(err) {
      res.send(500, { message: err });
    } else {
      res.send(200, { message: 'Action completed with success!'});
    }
  });
};




