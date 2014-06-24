var mongoose = require('mongoose');
var moment = require('moment'); 

var overbooking = true;

//This retrievs all the rooms in the DB
exports.getRooms = function(req, res) {

  var filters = req.body.filters;

  var verifyRoom = function(room, desiredBooking) {
   
    if(room.booking.length == 0) {
      //Room hasn't been booked yet so it's eligible for listing
      return true;
    } else if(room.booking.length == 1) {
      
      if( moment(desiredBooking.startDate).isAfter(room.booking[0].endDate) ) {
        //Put it last
        return true;
      } if( moment(desiredBooking.endDate).isBefore(room.booking[0].startDate) ) {
        //Put it first
        return true;
      } else {
        //Maybe we'll overbook it

        var condition2 = room.booking[0].hasOwnProperty('overbooking');
        var condition3 = Math.abs(moment(desiredBooking.startDate).diff(room.booking[0].endDate)) <= 1;

        if( overbooking && !condition2 && condition3 ) {
          //Eligible for Overbooking at the end
          return true;
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
          fitsIn = true;
          return true;
        } else if( startOverlapping && before) {
          //Overbooking
          var condition2 = room.booking[i].hasOwnProperty('overbooking');

          if( overbooking && !condition2 ) {
            //Eligible for Overbooking between
            fitsIn = true;
            return true;
          }
        }
      }

      if(!fitsIn) {
        //Date does not fit between any gap maybe we'll put it last
        var fitsLast = moment(desiredBooking.startDate).isAfter(room.booking[ room.booking.length - 1 ].endDate);
        var fitsFirst = moment(desiredBooking.endDate).isBefore(room.booking[0].startDate);

        if(fitsLast) {
          //Put it last
          return true;
        } if(fitsFirst) {
          //Put it first
          return true;
        } else {
          //Overbooking maybe?

          var condition2 = room.booking[ room.booking.length - 1 ].hasOwnProperty('overbooking');
          var condition3 = Math.abs(moment(desiredBooking.startDate).diff(room.booking[ room.booking.length - 1 ].endDate)) <= 1;
          
          if( overbooking && !condition2 && condition3 ) {
            //Eligible for Overbooking at the end
            return true;
          } else {
            return false;
          }
        }
      }
    }
  };

  var utilitiesFilter = function (room, filters) {

    var utils = filters.utilities;

    if(utils.length > 0) {

      for(var i = 0, ii = utils.length; i < ii; i++) {

        if(!room.utilities[ utils[i] ]) { 
          return false;
          break;
        }
      }
    }

    return true;
  };

  var servicesFilter = function (room, filters) {

    var services = filters.services;

    if(services.length > 0) {

      for(var i = 0, ii = services.length; i < ii; i++) {

        if(!room.services[ services[i] ]) {
          return false;
          break;
        }
      }
    }

    return true;
  };

  var filterRooms = function(rooms, filters) {
    var response = [];

    for(var i = 0, ii = rooms.length; i < ii; i++) {

      //We apply 3 filters to our rooms collection
      var cond1; 

      if(filters.booking) {
        //filter.booking exists, so that means we want to search rooms in a time interval
        cond1 = verifyRoom(rooms[i], filters.booking);
      } else {
        cond1 = true;
      }

      var cond2 = utilitiesFilter(rooms[i], filters);
      var cond3 = servicesFilter(rooms[i], filters);
      
      if( cond1 && cond2 && cond3 ) {
        response.push(rooms[i]);
      }
    }

    return response;
  };

  mongoose.model('Room')
  .find()
  .sort({ price: 1 })
  .exec(function (err, items) {
    if(err) {
      res.send(500, { message: err });
    } else {

      var filteredRooms = items;

      if(filters) {
        //Filtering our rooms according to the desired booking dates
        filteredRooms = filterRooms(items, filters);
      }

      res.send(200, {
        data: { 'rooms': filteredRooms}
      });
    }
  });
};

//This retrieves a specific room from the DB
exports.getRoom = function(req, res) {

  mongoose.model('Room').find({ _id: req.params.id}, function (err, items) {
    if(err) {
      res.send(500, { message: err });
    } else {
      res.send(200, {
        room: items 
      });
    }
  });
};

//This updates a room from the DB
exports.updateRoom = function(req, res) {

  if(req.session.user.isAdmin) {

    var room = req.body.room;
    delete room._id;

    mongoose.model('Room').update({ _id: req.params.id}, room, {safe: false, multi: false}, function(err) {

      if(err) {
        res.send(500, { message: err });
      } else {
        res.send(200, { message: "Operation completed succesfully!" });
      }
    });
  } else {
    res.send(401, { message: "You are not allowed to take this action!" });
  }
};

exports.addRoom = function(req, res) {

  var room = req.body.room;

  if(room) {

    var Room = mongoose.model('Room');

    room = new Room(room);

    room.save(function(err) {
      if(err) {
        console.log(err);
      } else {
        //Success!
        res.send(200, {message: 'Room created!'});
      }
    });

  } else {
    //No room object was sent
    res.send(400, {message: 'You must send a room to add!'})
  }
};


