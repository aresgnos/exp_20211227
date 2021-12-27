var express = require('express');
var router = express.Router();

// get(조회), post(추가), put(수정), delete(삭제)

// npm i mongodb --save
const db = require('mongodb').MongoClient;
// mongodb ://아이디:암호@서버주소:포트번호/DB명
const dbUrl = 'mongodb://id216:pw216@1.234.5.158:37017/db216';

// 글쓰기 : localhost:3000/board/insert
// req(request) : 들어오는 값의 정보
// res(response) : 전달하는 값의 정보
router.post('/insert', async function(req, res, next) {
    try {
    console.log("-----------------------");
    console.log(req.body);
    // {no:100, title: '제목', writer: '홍길동', content: 'aaa'}
    console.log("-----------------------");

    // 1. DB접속
    const dbConn = await db.connect(dbUrl);
    // 2. 컬렉션 == 테이블
    const coll = dbConn.db("db216").collection("board"); 
    const result = await coll.insertOne(req.body);
    console.log(result);


    const obj = {status:200};
    res.send(obj);
}

    // 오류가 난 시점에 오는 곳, 오류 찾기가 쉬움
    // 성공하면 200이 나오고 오류가 나오면 888이 나옴
    // 실제로 나오면 큰일;;
    catch(err){
        console.error(err);
        res.send({status:888});
    } 

});

module.exports = router;
