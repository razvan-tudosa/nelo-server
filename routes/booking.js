var mongoose = require('mongoose');
var moment = require('moment');
var users = require('./users');
var alerts = require('./alerts');
var nodemailer = require('nodemailer');

var overbooking = true;
var loggedUser;
var booking = {};

var bookRoom = function(res, room, booked, bookingType) {

  var roomCopy = room.toObject();

  delete roomCopy._id;

  var opts = {
    multi: false
  };

  if(booked) {

    booking.roomid = room._id.toString();
    booking.status = 'pending';

    mongoose.model('Room').update({_id: room._id}, roomCopy, opts, function (err) {
      if(err) {
        console.log(err);
        res.send(500, err);
      } else {

        var alert = {
          type: bookingType,
          status: "new",
          'booking': booking,
          user: loggedUser
        };

        alerts.addAlert(alert); 
        users.addBooking(booking, loggedUser.userid); //Update the user document with his booking
        res.send(200, {message: "Booked with success!"});
      }
    }); 
  } else {
    res.send(400, {message: "Did not succeed!"});
  }

};

var verifyRoom = function(res, room, desiredBooking) {
  
  desiredBooking.bookedBy = loggedUser.userid;

  if(room.booking.length == 0) {
    //Room hasn't been booked yet so it's eligible for booking
    room.booking.push(desiredBooking);
    bookRoom(res, room, true, 'booking');
  } else if(room.booking.length == 1) {
    
    if( moment(desiredBooking.startDate).isAfter(room.booking[0].endDate) ) {
      //Put it last
      room.booking.push(desiredBooking);
      bookRoom(res, room, true, 'booking');
    } if( moment(desiredBooking.endDate).isBefore(room.booking[0].startDate) ) {
      //Put it first
      room.booking.unshift(desiredBooking);
      bookRoom(res, room, true, 'booking');
    } else {
      //Maybe we'll overbook it

      var condition2 = room.booking[0].hasOwnProperty('overbooking');
      var condition3 = Math.abs(moment(desiredBooking.startDate).diff(room.booking[0].endDate)) <= 1;

      if( overbooking && !condition2 && condition3 ) {
        //Overbook it at the end
        room.booking[0].overbooking = desiredBooking;
        bookRoom(res, room, true, 'overbooking');
      }
    }

  } else if(room.booking.length >= 2) {
    //There are more than 2 bookings on this room
    //Let's see if it fits between some gap
    var fitsIn = false;
    for(var i = 0, ii = room.booking.length - 1; i < ii; i++) {

      var after = moment(desiredBooking.startDate).isAfter(room.booking[i].endDate);
      var before = moment(desiredBooking.endDate).isBefore(room.booking[i+1].startDate);
      var startOverlapping = Math.abs(moment(desiredBooking.startDate).diff(room.booking[i].endDate)) <= 1;

      if( after && before ) {
        room.booking.splice(i+1, 0, desiredBooking);
        fitsIn = true;
        bookRoom(res, room, true, 'booking');
        break;
      } else if( startOverlapping && before) {
        //Overbooking
        var condition2 = room.booking[i].hasOwnProperty('overbooking');

        if( overbooking && !condition2 ) {
          //Overbook it between
          room.booking[i].overbooking = desiredBooking;
          bookRoom(res, room, true, 'overbooking');
          fitsIn = true;
          break;
        }
      }
    }

    if(!fitsIn) {
      //Date does not fit between any gap maybe we'll put it last
      var fitsLast = moment(desiredBooking.startDate).isAfter(room.booking[ room.booking.length - 1 ].endDate);
      var fitsFirst = moment(desiredBooking.endDate).isBefore(room.booking[0].startDate);

      if(fitsLast) {
        //Put it last
        room.booking.push(desiredBooking);
        bookRoom(res, room, true, 'booking');
      } if(fitsFirst) {
        //Put it first
        room.booking.unshift(desiredBooking);
        bookRoom(res, room, true, 'booking');
      } else {
        //Overbooking maybe?

        var condition2 = room.booking[ room.booking.length - 1 ].hasOwnProperty('overbooking');
        var condition3 = Math.abs(moment(desiredBooking.startDate).diff(room.booking[ room.booking.length - 1 ].endDate)) <= 1;
        
        if( overbooking && !condition2 && condition3 ) {
          //Overbook it at the end
          room.booking[ room.booking.length - 1 ].overbooking = desiredBooking;
          bookRoom(res, room, true, 'overbooking');
        } else {
          bookRoom(res, room, false);
        }
      }
    }
  }
};

var bookingCleanup = function(res, room, desiredBooking) {
  var presentDate = moment();

  if(room.booking.length > 0) { //If the booking array is empty there is no need to run these tests

    for(var i = 0, ii = room.booking.length; i < ii; i++) {

      var hasOverbooking = room.booking[i].hasOwnProperty('overbooking');
      var condition1 =  hasOverbooking ? moment(presentDate).isAfter(room.booking[i].overbooking.endDate) : false;
      var condition2 = moment(presentDate).isAfter(room.booking[i].endDate);

      if( (hasOverbooking && condition1) || (!hasOverbooking && condition2) ) {
        room.booking.splice(i,1);
        i--; ii--; //We deleted a position we should go back and update the length
      }
    }
  }

  verifyRoom(res, room, desiredBooking);
};

exports.booking = function(req, res) {

  mongoose.model('Room').find({_id: req.params.id}, function (err, items) {
    if(err) {
      res.send(500, { message: err });
    } else {

      loggedUser =  {
        userid: req.session.user._id,
        username: req.session.user.username,
        email: req.session.user.email,
        phone: req.session.user.phone
      };


      booking = req.body.booking;
      booking.id = new Date().getTime().toString();

      bookingCleanup(res, items[0], booking);
    }
  });
};

exports.changeBookingStatus = function(req, res) {
  var newStatus = req.body.newStatus;
  var bookingId = req.body.bookingId;
  var success;

  mongoose.model('User').findById(req.body.userId, function(err, userFound) {
    if(err) {
      console.log(err);
    } else {
      updateUser(userFound);
    }
  });

  function updateUser(user) {
   

    for(var i = 0, ii = user.myBookings.length; i < ii; i++) {
      if(user.myBookings[i].id == bookingId) {
        user.myBookings[i].status = newStatus;
      }
    }


    mongoose.model('User')
    .update({'_id': user._id},
    {'myBookings':user.myBookings},
    { multi: false },
    function (err, alerts) {
      if(err) {
        res.send(500, { message: err });
      } else {
        mongoose.model('Alert').findById(req.body.alertId, function(err, alertFound) {
          if(err) {
            res.send(500, { message: err });
          } else {
            updateAlert(alertFound);
          }
        });
      }
    });

  }; 

  function updateAlert(alert) {

    alert.booking.status = newStatus;

    mongoose.model('Alert')
    .update({'_id': alert._id},
    {'booking': alert.booking},
    { multi: false },
    function (err) {
      if(err) {
        res.send(500, { message: err });
      } else {
        if(newStatus == 'aprooved') {
          res.send(200, { message: 'Status updated with success!' });
          sendEmail(req.body.clientEmail, 'You booking has been aprooved!');
        }
      }
    });

  }; 

  if(newStatus == 'rejected') {
    mongoose.model('Room').findById(req.body.roomId, function(err, roomFound) {
      if(err) {
        console.log(err);
      } else {
        deleteBooking(roomFound);
      }
    });
  }

  function deleteBooking(room) {
    /*for(booking in room.bookings) {
      if(booking.id == bookingId) {
        delete booking;
        sendEmail(req.body.clientEmail, req.body.message);
      }
    }*/

    console.log(room);

    for(var i = 0, ii = room.booking.length; i < ii; i++) {
      if(room.booking[i].id == bookingId) {
        room.booking[i].status = newStatus;
        res.send(200, {message: 'Action completed with success!'});
      }
    }

  }

};

var sendEmail = function(email, message) {
  var transport = nodemailer.createTransport('SMTP', {
    service: 'Gmail',
    auth: {
      user: 'tw.nelo@gmail.com',
      pass: 'adminnelo13'
    }
  });

  transport.sendMail({
    from: 'admin@nelo.com',
    to: email,
    subject: 'Test',
    text: 'This is a test asdasd',
    html: message
  }, function (err, response) {
    if(err) {
      console.log(err);
      //res.send(500, {message: err});
    }
    console.log('Email was sent!');
    //res.send(200, {message: 'E-mail sent!'});
  });
};
