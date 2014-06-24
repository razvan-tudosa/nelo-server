var mongoose = require('mongoose');


exports.getAllUsers = function(req, res) {
  mongoose.model('User').find({}, function (err, items) {
    if (err) {
      res.send(500, { message: err });
    } else {
      res.send(200, { data: items });
    }
  });
};

exports.getUser = function(req, res) {
  mongoose.model('User').find({ _id: req.params.id }, function (err, items) {
    if (err) {
      res.send(500, { message: err });
    } else {
      res.send(200, { data: items });
    }
  });
};

exports.createUser = function(req, res) {
  
  var User = mongoose.model('User');

  var status = {
    userFound: false,
    emailFound: false
  };

  var newUser = new User({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
    phone: req.body.phone,
    type: 'client' //Hardcode
  });

  //We are checking if the user is already in the DB
  var userLookup = function(next) {
    User.find({ username: req.body.username }, function (err, item) {
      if (err) {
        res.send(500, { message: err });
      } else {
        if (item.length != 0) {
          status.userFound = true;
        } 
        
        next();
      }
    });
  };

  //We are making sure he is not using the same email address twice
  var emailLookup = function() {
    User.find({ email: req.body.email }, function (err, item) {
      if (err) {
        res.send(500, { message: err });
      } else {
        if (item.length != 0) {
          status.emailFound = true;
        }
        takeActions();
      }
    });
  };


  var takeActions = function() {
    if(status.userFound) {
      res.send(400, { message: 'Username already exists in the Database! Please choose something diffrent!' });
    } else if (status.emailFound) {
      res.send(400, { message: 'Email already exists in the Database! Please choose something diffrent!' });
    } else {
      //If we get on this branch it means everything is ok and we can create a user
      newUser.save(function (err, item) {
        if (err) {
          res.send(400, { message: err });
        } else {
          res.send(200, { message: 'Account created succesfully!' });
        }
      });
    }
  };

  userLookup(emailLookup);
  
};

//Add booking reference on the user document too
exports.addBooking = function(booking, userId) {

  mongoose.model('User').find({ _id: userId }, function (err, details) {
    if (err) {
      console.log(err);
    } else {
      updateUser(details[0], userId);
    }
  });

  function updateUser(userDetails, userId) {

    userDetails.myBookings.push(booking);

    booking = userDetails.myBookings;

    var toUpdate = {
      myBookings: booking
    };

    mongoose.model('User').update({ _id: userId }, toUpdate, {safe: false, multi: false}, function(err) {

      if(err) {
        console.log(err);
      } else {
        console.log('Updated with success!');
      }
    });
  }
};

exports.getBookings = function(req, res) {

  var userId = req.session.user._id;

  mongoose.model('User').findById(userId, function (err, item) {
    if (err) {
      console.log(err);
      res.send(500, { message: err });
    } else {
      res.send(200, { data: item.myBookings });
    }
  });
};