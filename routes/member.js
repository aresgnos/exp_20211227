var express = require('express');
var router = express.Router();

// 몽고 DB 연동
// CMD > npm i mongodb --save
const db      = require('mongodb').MongoClient;
const DBURL   = require('../config/db').mongodbURL;
const DBNAME  = require('../config/db').mongodbDB;

// 로그인 시에 토큰 발행
// CMD > npm i jsonwebtoken --save
const jwt = require('jsonwebtoken');
const jwtKey = require('../config/auth').securityKey;
const jwtOptions = require('../config/auth').options;

//회원가입, 로그인시 암호 hash용(못알아보게 특수문자 변형)
const crypto = require('crypto');

// 회원가입 : http://localhost:3000/member/insert
router.post('/insert', async function(req, res, next) {
    try{
        console.log(req.body);
        
        // hash(salt)는 abc -> ajslfjaskl23jl4rjlkesajfsd 로 바꿈
        const hash = crypto.createHmac('sha256', req.body.uid) // 첨가물(salt)인 아이디를 넣음
                            .update(req.body.upw).digest('hex');
        const obj = {
            _id : req.body.uid,
            userpw : hash,
            userage : Number(req.body.uage),
            username : req.body.uname,
            userbirth : req.body.ubirth,
            useremail : req.body.uemail,
            useremail2 : req.body.uemail2,
            usercheck : req.body.ucheck,
            usergender : Number(req.body.ugender)
        };

        console.log(obj);

        const dbConn   = await db.connect(DBURL);
        const coll     = dbConn.db(DBNAME).collection("member");
        
        const result = await coll.insertOne(obj); //{ }
        console.log(result);
        if (result.insertedId === obj._id ){
            return res.send({status :200});
        }
        return res.send({status:0});
    }
    catch(err) {
        console.error(err);
        return res.send({status:-1, result : err});
    }
});

// 아이디 중복확인 : http://localhost:3000/member/idcheck?uid=aa
router.get('/idcheck', async function(req, res, next) {
    try{
        const userid = req.query.uid;

        const dbConn   = await db.connect(DBURL);
        const coll     = dbConn.db(DBNAME).collection("member");

        const query = { _id : userid };
        const result = await coll.countDocuments(query)

        console.log(result);

        return res.send({status:200, result:result});
    }
    catch(err) {
        console.error(err);
        return res.send({status:-1, result : err});
    }
});

// 로그인 : http://localhost:3000/member/select
// 암호 정보가 있어서 post
router.post('/select', async function(req, res, next) {
    try{
        // 회원가입시 사용했던 암호화 방식으로 hash해야
        // DB에서 로그인 비교가 가능함.
        // 암호화 방식을 원래대로 돌릴 수가 없어서
        const hash = crypto.createHmac('sha256', req.body.uid) // 첨가물(salt)인 아이디를 넣음
                            .update(req.body.upw).digest('hex');

        const obj = {
            userid : req.body.uid,
            userpw : hash
        };

        console.log (obj);

        const dbConn   = await db.connect(DBURL);
        const coll     = dbConn.db(DBNAME).collection("member");

        // const query = { $and : [{_id:10037}, {name:'aaa'}] } AND
        const query = { _id:obj.userid, userpw:obj.userpw};
        const result = await coll.findOne(query);

        console.log(result); // 일치할 경우, 일치하지 않을 경우를 비교해서 꼭 확인해야한다!!
                            // 그래야 if문을 쓸 수 있다. (성공할 경우, 실패할 경우)

        if(result !== null){ // DB에 일치하는 경우
            const token = {
                token : jwt.sign( 
                    { uid:result._id }, // 토큰에 포함할 내용들...
                     jwtKey, // 토큰 생성 키
                     jwtOptions // 옵션
                ),
                refreshgToken : null, // null
            }
            return res.send({status:200, result:token});
        }

        // DB에 일치하지 않을 경우
        return res.send({status:0});

    }
    catch(err) {
        console.error(err);
        return res.send({status:-1, result : err});
    }
});





module.exports = router;
