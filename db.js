var mongoose = require('mongoose');

var dbCredentials = {
  username: 'admin',
  password: 'admin13#'
};

var dbUrl = 'mongodb://' + 
            dbCredentials.username + ':' + 
            dbCredentials.password + 
            '@oceanic.mongohq.com:10038/wtProject';

mongoose.connect(dbUrl);

var db = mongoose.connection;

db.on('error', function(){
  console.error.bind(console, 'DB connection error: ');
  console.log('Attempting to re-connect...');
  mongoose.connect(dbUrl);
});

db.once('open', function() {
  console.log('Connected to DB!');
});