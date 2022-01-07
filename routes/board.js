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
    // {title: '제목', writer: '홍길동', content: 'aaa'}
    console.log("-----------------------");

    // 순서 = 접속->DB 선택 -> 컬렉션선택 -> CRUD(추가, 수정, 삭제, 조회)
    // 1회만 
    // dbConn은 DB연결이다.
    const dbConn = await db.connect(dbUrl);

    const coll = dbConn.db("db216").collection("sequence"); 
    //            db선택                 컬렉션선택

    // 글번호 자동적으로 {가져오기}, {수정하기}
    // _id가 SEQ_BOARD_NO인 것을 가지고 오고,
    // seq 값을 기존값에 1 증가시킴
    const result = await coll.findOneAndUpdate(
        {_id:'SEQ_BOARD_NO'}, { $inc : { seq :1} }
    );
    // 글번호 (26-36라인)
    console.log(result.value.seq);


    // // 1. DB접속
    // const dbConn = await db.connect(dbUrl);
    // // 2. 컬렉션 == 테이블
    const coll1 = dbConn.db("db216").collection("board"); 
    const result1 = await coll1.insertOne({
        _id : Number(result.value.seq), // 글번호(PK)
        title : req.body.title, // 전송되는 항목 글제목
        content : req.body.content, // 전송되는 항목 글내용
        writer : req.body.writer, // 전송되는 항목 작성자
        hit : 1, // 조회수
        regdate : new Date() // 현재 시간
    });

    // { acknowledged: true, insertedId: 8 } 성공시에 cmd에 이렇게 나옴.
    console.log(result1);
    if(result1.insertedId > 0 ){
        return res.send({status:200});
    }
    return send ({status:-1});
}

    // 오류가 난 시점에 오는 곳, 오류 찾기가 쉬움
    // 성공하면 200이 나오고 오류가 나오면 888이 나옴
    // 실제로 나오면 큰일;;
    catch(err){
        console.error(err);
        res.send({status:888});
    } 

});

// 게시물 상세내용 : http://localhost:3000/board/selectone
// req 전송되는 값 : GET -> req.query (req 밑에 query로 담겨져있다.)
router.get('/selectone', async function(req, res, next) {
    try {
        const no = Number(req.query.no); //글번호
        console.log(no);

        // DB접속 -> DB선택 -> 컬렉션(board) -> 필요한 것 1개 가져오기
        const dbConn = await db.connect(dbUrl);
        const coll = dbConn.db("db216").collection("board");

        const result = await coll.findOne({_id : no});
        console.log(result);

        return res.send({status:200, result:result});
    }
    catch(err){
        console.error(err);
        // mongodb에 오류난 부분 찍힘
        return res.send({status:-1, result : err});
        // vue에 오류를 알려줌
    } 

});

// 게시물 목록 : http://localhost:3000/board/select
router.get('/select', async function(req, res, next) {
    try {
        // 페이지 정보가 전달 (몇페이지인지)
        const page = Number(req.query.page);
        const text = req.query.text;

        // 페이지가 1일 경우 -> skip(0) -> skip( (page-1) * 10 ) 
        // 페이지가 2일 경우 -> skip(10)     10개씩 가야하니까
        // 페이지가 3일 경우 -> skip(20) 
        
        const dbConn = await db.connect(dbUrl);
        const coll = dbConn.db("db216").collection("board");

        // 여러개 가져오기 find()   ..... toArray() 변환 = 배열로 가져옴
        // 정규 표현식 => new RegExp(검색단어, i) i=대소문자 구분하지 않겠다.
        // 정규 표현식은 이메일 오류, 전화번호 정확한지에 쓰임
        const query = { title : new RegExp(text, 'i')}; 
        const result = await coll.find(query)
                .sort({_id:-1})  // 1일 때 : 오름차순, -1일 때 : 내림차순
                .skip((page-1) * 10 )      // 생략할 개수
                .limit(10)       // 10개까지만
                .toArray();
        console.log(result);

        // 페이지네이션에서 사용할 전체 게시물 수
        const total = await coll.countDocuments({});

        return res.send({status:200, result:result, total:total});
    }

    catch(err){
        console.error(err);
        // mongodb에 오류난 부분 찍힘
        return res.send({status:-1, result : err});
        // vue에 오류를 알려줌
    } 

});

// 조회수 증가 : http://localhost:3000/board/updatehit
router.put('/updatehit', async function(req, res, next) {
    try {
        const no = Number(req.query.no); //글번호

        const dbConn = await db.connect(dbUrl);
        const coll = dbConn.db("db216").collection("board");

        // 변경하기 updateOne ({조건},{변경할 내용})
        const result = await coll.updateOne(
            {_id : no }, // 조건
            { $inc : {hit : 1} } // 실제 변경될 내용
        );

        console.log(result);
        if(result.modifiedCount === 1){
            return res.send({status:200});
        }
        return res.send({status:-1});
    }

    catch(err){
        console.error(err);
        return res.send({status:-1, result : err});
    }
});

// 게시물 삭제 : http://localhost:3000/board/delete
// paramter는 글번호 no
router.delete('/delete', async function(req, res, next) {
    
    // 글번호가 오면 삭제 후에 결과를 리턴
    // DB접속 -> DB선택 -> 컬렉션(board) -> 삭제
    try {
        // 문자를 숫자로 Number( 바꿀 문자 )
        // 숫자를 문자로 String( 바꿀 숫자 )
        const no = Number(req.query.no); //글번호

        const dbConn = await db.connect(dbUrl);
        const collection = dbConn.db("db216").collection("board");
        const result = await collection.deleteOne({_id : no});

        console.log(result); // 콘솔은 삭제가 되던 안되던 성공
        // { acknowledged: true, deletedCount: 1 }
        if(result.deletedCount === 1){
            return res.send({status:200});
        }
        return res.send({status:0}); // 삭제를 못 한 경우
    }

catch(err){ // 데이터 접속을 못했거나(아이디, 암호 틀린 경우), DB전원이 꺼졌거나, 네트워크가 안되거나
    console.error(err);
    return res.send({status:-1, result: err}); // 시스템 오류
    }

});

// 게시물 수정 : http://localhost:3000/board/update
router.put('/update', async function(req, res, next) {
    try{
        // 제목, 내용만 수정가능 + 조건으로 사용할 글번호
        const no = Number(req.body.no);
        const title = req.body.title;
        const content = req.body.content;
        // body : 안 보이게 보내거나 긴 내용을 보낼 때
        // query : 보이게, 내용이 길지 않을 때

        // DB접속 -> DB선택 -> 컬렉션(board) -> 수정
        const dbConn = await db.connect(dbUrl);
        const coll = dbConn.db("db216").collection("board");

        const result = await coll.updateOne(
            { _id : no }, //조건
            { $set:{title: title, content: content} } // 실제 변경할 내용
        );
        console.log(result);
        if(result.modifiedCount === 1){
            return res.send({status:200});
        }
        return res.send({status:0});
    }    
catch(err){
        console.error(err);
        return res.send({status:-1, result: err});
    }

});

// 이전글 : http://localhost:3000/board/preno
router.get('/preno', async function(req, res, next) {
    try {
        const no = Number(req.query.cno);

        const dbConn = await db.connect(dbUrl);
        const collection = dbConn.db("db216").collection("board");
        // 미만 { $lt : }  <
        // 이하 { $lte : }  <=
        // 초과 { $gt : }  >
        // 이상 { $gte : }  >=
        // $set     $and     $or
        const result = await collection.find(
            { _id: {$lt : no } },  //조건
            { projection : {_id : 1} } // 필요한 항목만(_id만)
        ).sort({_id:-1}).limit(1).toArray(); // find를 쓰면 toArray로 변환시켜줘야함

        // 결과값 = result = [ { _id: 56 } ], 배열임 => result[0]._id
        //[{}] = 배열이 하나,   [] = 없다.
        console.log(result);
        if(result.length === 1){
            return res.send({status:200, no:result[0]._id});
        }
        return res.send({status:200, no:0});
        }
    catch(err){
        console.error(err);
        return res.send({status:-1, result: err});
    }
});

// 다음글 : http://localhost:3000/board/nextno
router.get('/nextno', async function(req, res, next) {
    try {
        const no = Number(req.query.cno);

        const dbConn = await db.connect(dbUrl);
        const collection = dbConn.db("db216").collection("board");
        // 미만 { $lt : }  <
        // 이하 { $lte : }  <=
        // 초과 { $gt : }  >
        // 이상 { $gte : }  >=
        // $set     $and     $or
        const result = await collection.find(
            { _id: {$gt : no } },  //조건
            { projection : {_id : 1} } // 필요한 항목만(_id만)
        ).sort({_id:1}).limit(1).toArray(); // find를 쓰면 toArray로 변환시켜줘야함

        // 결과값 = result = [ { _id: 56 } ], 배열임 => result[0]._id
        //[{}] = 배열이 하나,   [] = 없다.
        console.log(result);
        if(result.length === 1){
            return res.send({status:200, no:result[0]._id});
        }
        return res.send({status:200, no:0});
        }
    catch(err){
        console.error(err);
        return res.send({status:-1, result: err});
    }
});


module.exports = router;
