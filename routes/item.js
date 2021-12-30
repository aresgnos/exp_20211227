var express = require('express');
var router = express.Router();

// npm i mongodb --save
const db = require('mongodb').MongoClient;
// mongodb ://아이디:암호@서버주소:포트번호/DB명
// const dburl = require('../config/db').mongodbURL;
// = const dbUrl = 'mongodb://id216:pw216@1.234.5.158:37017/db216';

// config/db.js 파일의 내용 가져오기
const DBURL = require('../config/db').mongodbURL
const DBNAME = require('../config/db').mongodbDB;

// cmd> npm i multer --save
const multer = require('multer');
// 특정 폴더에 파일을 보관 or 메모리(DB에 보관)
const upload = multer({storage:multer.memoryStorage()});



// 물품 등록 : http://localhost:3000/item/insert
// 이미지1, 물품코드(x), 물품명, 물품내용, 물품가격, 재고수량, 등록일(x)
router.post('/insert', upload.single("file"), async function(req, res, next) {
  try {
      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("sequence"); 
      const result = await coll.findOneAndUpdate(
          {_id:'SEQ_ITEM_NO'}, { $inc : { seq :1 } }
    );
    
      //console.log(result.value.req);

      const obj = {
          _id : result.value.seq, // 물품번호(자동부여)
          name : req.body.name, // 물품명
          content : req.body.content, // 물품내용
          price : req.body.price, // 가격
          quantity : req.body.quantity, //수량
          filename : req.file.originalname, // 파일명
          filetype : req.file.mimetype,
          filedata : req.file.buffer,
          filesize : req.file.size,
          regdate : new Date()
      };

      const coll1 = dbConn.db(DBNAME).collection("item");
      const result1 = await coll1.insertOne(obj);
      if(result1.insertedId > 0 ){
        return res.send({status:200});
      }
      return res.send({status:0});
  }

  catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
    } 
});

// 이미지(1개) : http://localhost:3000/item/image
router.get('/image', async function(req, res, next) {
    try {
        const no = Number(req.query.no);
        const dbConn = await db.connect(DBURL);
        const coll = dbConn.db(DBNAME).collection("item");

        const result = await coll.findOne(
          {_id:no}, //조건
          {projection : {filedata:1, filetype:1}} //필요한 항목만
        );

        console.log(result);
        res.contentType(result.filetype); // json -> image/jpg
        return res.send(result.filedata.buffer);    
      }
    
    catch(err){
        console.error(err);
        return res.send({status:-1, result : err});
  } 
});


// 물품 목록 : http://localhost:3000/item/select
router.get('/select', async function(req, res, next) {
  try {
      const page = Number(req.query.page);
      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("item");

      // 물품코드, 물품명, 가격, 수량, 등록일
      const result = await coll.find(
        { }, // 조건
        {projection : {_id:1, name:1, price:1, quantity:1, regdate:1} } // 가져올 항목만
        )
              .sort({_id:-1})  // 1일 때 : 오름차순, -1일 때 : 내림차순
              .skip((page-1) * 10 )      // 생략할 개수
              .limit(10)       // 10개까지만
              .toArray();

      const total = await coll.countDocuments({});
      return res.send({status:200, result:result, total:total});
  }

  catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
  } 

});

// 물품 1개 조회(이미지 포함) : http://localhost:3000/item/selectone?code=10001
router.get('/selectone', async function(req, res, next) {
  try {
      const code = Number(req.query.code);
      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("item");

      const result = await coll.findOne(
        {_id : code}, // 조건
        {projection : {filename:0, filedata:0, filesize:0, filetype:0}}, //필요한 항목만, // 0=빼겠다.안 가져오겠다.
      );
      console.log(result); // 확인
      // '/item/image?no=10008' = 이미지 url
      
      // 이미지는 데이터를 전달X, 이미지를 볼 수 있는 URL정보를 전달한다.
      result['image'] = '/item/image?no=' + code;
      return res.send({status:200, result:result});
  }

  catch(err){
    console.error(err);
    return res.send({status:-1, result : err});
  } 
});

// 물품 삭제 : http://localhost:3000/item/delete?code=10001
router.delete('/delete', async function(req, res, next) {
  try {
      const code = Number(req.query.code);
      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("item");

      const result = await coll.deleteOne({_id : code});
        if(result.deletedCount === 1){
            return res.send({status:200});
        }
        return res.send({status:0});
    }
    catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
} 
});

// 물품 수정 : http://localhost:3000/item/update?code=10001
// query + body 혼용
router.put('/update', upload.single("file"), 
                        async function(req, res, next) {
  try {
      let code = Number(req.query.code);
      // 물품명, 물품내용, 물품가격, 재고수량, 이미지 변동
      
      // const = 상수, 처음 만든 값에 +,-가 불가능(변경 불가능)
      // let, var = 변수, 처음 만든 값에 +,- 가능 (변경 가능)
      let obj = {
        name     : req.body.name, 
        content  : req.body.content, 
        price    : req.body.price, 
        quantity : req.body.quantity, 
    };

    if (typeof req.file !== 'undefined') {
          obj['filename'] = req.file.originalname, 
          obj.filetype    = req.file.mimetype,
          obj.filedata    = req.file.buffer,
          obj.filesize    = req.file.size
        }

      console.log(code);
      console.log(obj);

      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("item");
      const result = await coll.updateOne(
            { _id : code }, //조건
            { $set : obj } // 실제 변경할 내용
        );
        console.log(result);
        if(result.modifiedCount === 1){
            return res.send({status:200});
        }
        return res.send({status:0});
    }    
    catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
  } 
}); 



module.exports = router;
