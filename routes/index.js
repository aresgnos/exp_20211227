var express = require('express');
var router = express.Router();


// localhost:3000/
router.get('/', function(req, res, next) {
  const obj = {id:'aaa', name:'홍길동'};
  res.send(obj);
  res.end();
});


// localhost:3000/test1 같은 주소를 쓸 수 없다.
router.get('/test1', function(req, res, next) {
  const obj = {id:'bbb', name:'홍길동', age:23};
  res.send(obj);
  res.end();
});

// localhost:3000/sera
router.get('/sera', function(req, res, next) {
  const obj = {id:'aresgnos', name:'송세라', age:8};
  res.send(obj);
  res.end();
});

// localhost:3000/test3
router.get('/test3', function(req, res, next) {
  const obj = {id:'noodle', name:'라면', age:358};
  res.send(obj);
  res.end();
});


module.exports = router;
