var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , md5 = require('MD5')
  , mongoose = require('mongoose')
  , fs = require('fs')
  , cors = require('cors')
  , path = require('path')
  , formidable = require('formidable')
  , nodemailer = require('nodemailer');


//Connect to DB
require('./db');

//Include Routes
var hotel = require('./routes/hotel');
var users = require('./routes/users');
var rooms = require('./routes/rooms');
var authentication = require('./routes/authentication');
var booking = require('./routes/booking');
var alerts = require('./routes/alerts');

//Include Models
fs.readdirSync('./models').forEach(function (filename) {
  require('./models/' + filename);
});

var app = express();

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.use(express.cookieParser());
  app.use(express.session({ 
    secret: 'whatisthemeaningoflifeandeverything',
    cookie: { 
      maxAge: 86400000 
    }
  }));
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser({defer: true}));
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler());
});


//Custom middleware to check if the user who is making calls is logged in
var proxyRoute = {
  _requireLogIn: function (fn) {
    return function (req, res) {

      res.header('Access-Control-Allow-Credentials'   , true);
      res.header('Access-Control-Allow-Headers'       , 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Prototype-Version, Origin, Allow, *');
      res.header('Access-Control-Allow-Methods'       , 'GET,PUT,POST,DELETE,OPTIONS,HEAD');
      res.header('Access-Control-Allow-Origin'        , req.headers.origin);
      res.header('Access-Control-Max-Age'             , 1728000);

      if(!req.session || !req.session.loggedIn) {
        res.send(401, { message: 'Access unauthorized! Please log in!' });
      } else {
        fn(req, res);
      }
    }
  },
  get: function(route, fn) {
    app.get(route, proxyRoute._requireLogIn(fn));
  },
  post: function(route, fn) {
    app.post(route, proxyRoute._requireLogIn(fn));
  },
  put: function(route, fn) {
    app.put(route, proxyRoute._requireLogIn(fn));
  },
  delete: function(route, fn) {
    app.delete(route, proxyRoute._requireLogIn(fn));
  }
};

var setHeaders = function(fn) {
  //Just a Wrapper function to ease my job for setting the right headers
  return function (req, res) {
    res.header('Access-Control-Allow-Credentials'   , true);
    res.header('Access-Control-Allow-Headers'       , 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Prototype-Version, Origin, Allow, *');
    res.header('Access-Control-Allow-Methods'       , 'GET,PUT,POST,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Origin'        , req.headers.origin);
    res.header('Access-Control-Max-Age'             , 1728000);

    fn(req, res);
  }
};

//Public Routes
app.get('/', routes.index);

app.post('/login', setHeaders(authentication.login));

app.post('/register', setHeaders(users.createUser));

app.get('/photos/:id', function (req, res) {

  res.sendfile(__dirname + '/uploaded/' + req.params.id);
});

app.options('*', function (req, res) {
  //Setting the headers for OPTIONS calls
  res.header('Access-Control-Allow-Credentials'   , true);
  res.header('Access-Control-Allow-Headers'       , 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Prototype-Version, Origin, Allow, *');
  res.header('Access-Control-Allow-Methods'       , 'GET,PUT,POST,DELETE,OPTIONS,HEAD');
  res.header('Access-Control-Allow-Origin'        , req.headers.origin);
  res.header('Access-Control-Max-Age'             , 1728000);

  res.send(200, 'ok');
});

app.post('/get-rooms', setHeaders(rooms.getRooms));

app.get('/send-mail', function (req, res) {
  var transport = nodemailer.createTransport('SMTP', {
    service: 'Gmail',
    auth: {
      user: 'tw.nelo@gmail.com',
      pass: 'adminnelo13'
    }
  });

  transport.sendMail({
    from: 'admin@nelo.com',
    to: 'tudosa.razvan@gmail.com',
    subject: 'Test',
    text: 'This is a test asdasd',
    html: '<b>This is a <span style="color:red">test</span></b>'
  }, function (err, response) {
    if(err) {
      console.log(err);
      res.send(500, {message: err});
    }

    res.send(200, {message: 'E-mail sent!'});
  });

});

//Private Routes
proxyRoute.post('/upload', function (req, res) {
  //Files upload

  var uploadedFiles = [];

  var incomingForm = new formidable.IncomingForm({
    uploadDir: __dirname + '\\uploaded' //Setting up the path for our upcoming files
  });

  incomingForm.on('error', function (err) {
    console.log(err);
    res.send(500, {
      message: err
    })
  });

  //Files Begin listener
  incomingForm.on('fileBegin', function (name, file) {
    uploadedFiles.push(path.basename(file.path));
  });

  //Finished upload listener
  incomingForm.on('end', function () {
    res.send(200, {
      msg: 'Got your files!',
      files: uploadedFiles
    });
  });

  //This triggers the upload
  incomingForm.parse(req, function (err, fields, files) {

  });

});

proxyRoute.delete('/photo/:id', function (req, res) {
  
  fs.unlink(__dirname + '/uploaded/' + req.params.id, function (err) {
    if(err) {
      res.send(500, {message: err});
    } else {
      res.send(200, { message: "Photo deleted with success!" });
    }
  });
});

proxyRoute.get('/hotel', hotel.getHotel);

proxyRoute.get('/users', users.getAllUsers);

proxyRoute.get('/users/:id', users.getUser);

proxyRoute.get('/my-bookings', users.getBookings);

proxyRoute.post('/logout', authentication.logout);

proxyRoute.get('/test-access', authentication.grantAccess);

proxyRoute.put('/room/:id', rooms.updateRoom);

proxyRoute.post('/room', rooms.addRoom);

proxyRoute.get('/room/:id', rooms.getRoom);

proxyRoute.post('/book-room/:id', booking.booking);

proxyRoute.post('/change-booking-status', booking.changeBookingStatus);

proxyRoute.get('/notifications', alerts.getAlerts);

proxyRoute.get('/notifications/new', alerts.countNewAlerts);

proxyRoute.put('/notifications/mark', alerts.markAlerts);


//Helps us to clear the DB
app.get('/clear-db', function (req, res) {

  mongoose.model('Room')
  .update({}, 
    { booking: [] }, 
    { multi: true }, 
    function (err, alerts) {
      if(err) {
        console.log(err);
      } else {
        console.log("Done!");
      }
    });

  mongoose.model('User')
  .update({}, 
    { myBookings: [] }, 
    { multi: true }, 
    function (err, alerts) {
      if(err) {
        console.log(err);
      } else {
        console.log("Done!");
      }
    });

  mongoose.model('Alert').remove({}, function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log('Alerts removed!');
    }
  });

  res.send(200, { msg: 'ok' });

});

//Create the server
http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
