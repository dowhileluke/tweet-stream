var db = require('./index.js');

var username = 'testUser';
var password = 'testUser';

db.createUser(username, password, function (err, user) {
  // output result
  console.log('db.createUser #1 returned: ', err || user);

  // try to create duplicate user
  db.createUser(username, password, function (err, user) {
    console.log('db.createUser #2 returned: ', err || user);

    // try to login with user but no password
    db.authenticateUser(username, false, function (err, user) {
      console.log('db.authenticateUser #1 returned: ', err || user);

      // try again with password
      db.authenticateUser(username, password, function (err, user) {
        console.log('db.authenticateUser #2 returned: ', err || user);

        db.disconnect();
      });
    });
  });
});
