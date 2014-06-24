var mongoose = require('mongoose');

exports.login = function(req, res) {

  var username;
  var password;
  
  //Getting the credentials from the body of the request
  req.body.username ? username = req.body.username : username = '';
  req.body.password ? password = req.body.password : password = '';

  //We're looking up for the user in the DB
  mongoose.model('User').find({username: username}, function (err, items) {
    
    if (err) {
      res.send(500, {message: err});
    } else {

      if(items.length == 0) {
        res.send(400, { message: 'Username not found!' });
      } else {
        if(items[0].password != password) {
          res.send(400, { message: 'Wrong password!' });
        } else {
          req.session.loggedIn = true;
          req.session.user = items[0]; 

          var user = items[0];

          delete user.password; 

          res.send(200, { 
            message: "You've been logged in successfully!",
            user: user
          });
        }
      }
    }
  });
};

exports.logout = function(req, res) {
  req.session.loggedIn = false;
  res.send(200, { message: "You've been logged out successfully!" });
};

//If user is already logged in this function will give him access to our API
exports.grantAccess = function(req, res) {
  res.send(200, { 
    user: {
      username: req.session.user.username,
      isAdmin: req.session.user.isAdmin
    }
  });
};