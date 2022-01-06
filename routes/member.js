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
const checkToken = require('../config/auth').checkToken;

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
            userbirth : req.body.ubirth,
            useremail : req.body.uemail,
            usercheck : req.body.ucheck,
            usergender : Number(req.body.ugender),
            username : req.body.uname,
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
                    { uid:result._id }, // 토큰에 포함할 내용들... 더 추가 가능
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

// 마이페이지
// 회원 정보 수정 : http://localhost:3000/member/mypage?menu=1
// 비밀번호 변경  : http://localhost:3000/member/mypage?menu=2
// 회원 탈퇴      : http://localhost:3000/member/mypage?menu=3
// 로그인시에 토큰이 발행되었고 토큰은 아이디를 포함하고 있으므로 아이디를 주지 않아도 된다.
router.put('/mypage', checkToken, async function(req, res, next) {
    try{
        // **console.log(req.query.menu); => 넘어오는 결과 정보, cmd로 확인
        // **console.log(typeof req.query.menu); => 어느 타입인지 cmd로 확인 둘 다 꼭 해봐야 함!!
        // 실제로 console로 찍어보는게 중요!!

        const menu = Number(req.query.menu);

        const dbConn   = await db.connect(DBURL);
        const coll     = dbConn.db(DBNAME).collection("member"); // 셋 다 같은 컬렉션을 쓰기 때문에 밖으로 뺀다.

        if(menu === 1){
            const result = await coll.updateOne(
                { _id : req.body.userid }, // 조건
                { $set : { userage : req.body.userage, useremail:req.body.useremail }}, // 변경내용
            );
        
            console.log(result); // 실패 or 성공
            if(result.modifiedCount === 1){
                return res.send({status:200});
            }
            return res.send({status:0});
        }
        else if(menu === 2){
            // console.log(req.body.userid); 아이디(변경X)
            // console.log(req.body.userpw); 현재 암호
            // console.log(req.body.userpw1); 바꿀 암호

            const hash = crypto.createHmac('sha256', req.body.userid) 
                            .update(req.body.userpw).digest('hex');

            const hash1 = crypto.createHmac('sha256', req.body.userid) 
                            .update(req.body.userpw1).digest('hex');

            const result = await coll.updateOne(
                { _id:req.body.userid, userpw:hash }, // 조건 아이디와 현재암호가 일치하는 조건
                { $set : { userpw:hash1 }}, // 변경할 내용 = 바꿀 암호
            );

            console.log(result); // 실패 or 성공
            if(result.modifiedCount === 1){
                return res.send({status:200});
            }
            return res.send({status:0});
        }
        else if(menu === 3){
            console.log(req.body.userid);
            console.log(req.body.userpw);

            const hash = crypto.createHmac('sha256', req.body.userid) 
                            .update(req.body.userpw).digest('hex');

            const result = await coll.deleteOne(
                { _id:req.body.userid, userpw:hash } // 삭제 조건 : 아이디, 암호 일치할 경우
            );

            console.log(result);
            // 삭제보다는 필요시에 중요 정보를 updateOne.
            if(result.deletedCount === 1){
                return res.send({status:200});
            }
            return res.send({status:0});
        }
        return res.send({status:-1, result:"메뉴정보 없음"});

        // console.log("2. member.js =>", req.body); // 아이디, 이메일, 나이가 포함되어 있어야함.
        // return res.send({status:200});
    }
    catch(err) {
        console.error(err);
        return res.send({status:-1, result : err});
    }
});


// 회원 정보 전달 (한개) : http://localhost:3000/member/selectone
router.get('/selectone', checkToken, async function(req, res, next) {
    try{

        // 아이디 : req.body.userid(auth.js에 수동으로 전달!!)
        const dbConn   = await db.connect(DBURL);
        const coll     = dbConn.db(DBNAME).collection("member");

        const result = await coll.findOne(
            { _id : req.body.userid }, // 조건
            { projection : { userpw:0 }} // 필요없는 항목 제거
        );
        return res.send({status:200, result:result});
        
    }
    catch(err) {
        console.error(err);
        return res.send({status:-1, result : err});
    }
});



module.exports = router;
