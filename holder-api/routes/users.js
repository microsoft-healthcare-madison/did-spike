var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  // res.send('respond with a resource');
  res.json([{
    id: 1,
    username: "TestUser01"
  }, {
    id: 2,
    username: "TestUser02"
  }, {
    id: 3,
    username: "TestUser03"
  }]);
});

module.exports = router;
