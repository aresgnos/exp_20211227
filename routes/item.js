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
      result['image'] = '/item/image?no=' + code +'&dt=' + new Date().getTime();
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

// 물품 일괄 등록 : http://localhost:3000/item/insertbatch
router.post('/insertbatch', upload.array("file"), 
                    async function(req, res, next) {

    try {
        const dbConn = await db.connect(DBURL);
        const coll = dbConn.db(DBNAME).collection("sequence"); 

        // const aaa = ['aaa', 'bbb', 'ccc'] ; //aaa.length => 3
        // console.log( aaa[1] ) = 'bbb'

        const count = req.body.name.length;
        let arr = []; //[ {obj},{obj} ]
        for(let i=0; i<count; i++){
        const result = await coll.findOneAndUpdate(
            {_id:'SEQ_ITEM_NO'}, { $inc : { seq :1 } }
        );

        let obj = {
            _id     : result.value.seq,
            name    : req.body.name[i],
            content : req.body.content[i],
            price   : req.body.price[i],
            quantity : req.body.quantity[i],
            filename : req.files[i].originalname,
            filedata : req.files[i].buffer,
            filetype : req.files[i].mimetype,
            filesize : req.files[i].size,
            regdate : new Date()
        };

        arr.push(obj);
      }

      const coll1 = dbConn.db(DBNAME).collection("item");
      const result1 = await coll1.insertMany(arr); //[{},{}]
      console.log(result1);

      if (result1.insertedCount === count){
        return res.send({status :200});

      }
      return res.send({status:0});

        // coll.insertOne({    });
        // coll.insertMany([{},{},{}]); => arr.push(obj);

        // console.log(req);
        // console.log(req.files); // 여러개일 경우
        // console.log(req.body) // 물품명, 내용, 가격, 수량 
              
      }

    catch(err){
        console.error(err);
        return res.send({status:-1, result : err});
      }
});

// 물품 일괄 삭제 : http://localhost:3000/item/deletebatch
router.delete('/deletebatch', async function(req, res, next) {
    try {

        // req.body => {code : [10020, 10021, 1003]} 이 방식도 있고
        // req.body.code[0], req.body.code[1]

        // [ { code: 10020 }, { code: 10021 }, { code: 10019 } ] (cmd에 이렇게 옴) 이 방식도 있고
        // req.body[0].code    req.body[1].code

        console.log(req.body);
        let arr = []; // [1,2,3]의 형태로 와야함
        for(let i=0; i< req.body.length; i++) { // 0 1 2
            arr.push( req.body[i].code );
        }

        const dbConn = await db.connect(DBURL);
        const coll = dbConn.db(DBNAME).collection("item");

        const result = coll.deleteMany({
            _id : { $in : arr } // arr = 위에서 선언한 변수
        });
        console.log(result);
        // {acknowledged: true, deletedCount: 3}

        if(result.deletedCount === req.body.length){
          return res.send({status:200});
        }        
        return res.send({status:0});
    }
    catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
      }
    });

// 물품 일괄 수정 : http://localhost:3000/item/updatebatch
router.put('/updatebatch', upload.array("file"), async function(req, res, next) {
    try {
      console.log(req.body);
      const count = req.body.name.length;

      const dbConn = await db.connect(DBURL);
      const coll = dbConn.db(DBNAME).collection("item");

      let cnt = 0;
      for(let i=0; i<count; i++){ // 0 1

        // 변경할 내용들
        let obj = {
            name     : req.body.name[i],
            content  : req.body.content[i],
            price    : req.body.price[i],
            quantity : req.body.quantity[i],
        };

        // req.files ==> [{},{}]
        if(req.files[i] === null ){
            console.log('null');
        }
        // req.files ==> []
        if(typeof req.files[i] !== 'undefined'){
            obj['filename'] = req.files[i].originalname;
            obj['filedata'] = req.files[i].buffer;
            obj['filetype'] = req.files[i].mimetype;
            obj.filesize = req.files[i].size;
        }

        const result = await coll.updateOne(
            { _id : Number(req.body.code[i]) },
            { $set : obj } 

          );
          console.log(result);
          
          cnt += result.modifiedCount; // cnt에 누적하기
      }
      if (cnt === count){
        return res.send({status:200});
      }
      return res.send({status:0});

    }
    catch(err){
      console.error(err);
      return res.send({status:-1, result : err});
  } 

});

// 체크항목 조회하기 : http://localhost:3000/item/selectcheck
// {"chks":[10037,10038,10039]}   => req.body.chks[0]
// [{"chks":10037},{"chks":10038},{"chks":10039}] => req.body[0].chk
router.post('/selectcheck', async function(req, res, next) {
  try {
      const chks = req.body.chks; //[10037, 10038, 10039]
      console.log(chks);

      const dbConn   = await db.connect(DBURL);
      const coll     = dbConn.db(DBNAME).collection("item");

      // { _id  : {$eq:10037} } === { _id : 10037}    EQ
      // { _id  : {$ne:10039} }                       NE
      // { _id  : {$in:[10037, 100038, 10039]} }      IN 
      // { $or  : [{_id:10037}, {_id:100038}] }       OR
      // { $and : [{_id:10037}, {name:'aaa'}] }       AND
      // { _id  : {$gt:10030} }                        > 
      // { _id  : {$gte:10030} }                       >= 
      // { _id  : {$lt:10030} }                        < 
      // { _id  : {$lte:10030} }                       <= 
      const result   = await coll.find(
          { _id :{$in: chks } },
          { projection: {filedata:0,filename:0,filetype:0,filesize:0} }
      )
      .sort({_id : -1}).toArray();

      //[{0},{1},{2}] => result[0]['image']
      // for(let i=0; i<result.length; i++){
      //     result[i]['image'] = '/item/image?no='+result[i]._id;
      // }

      for(let tmp of result){ //[{tmp},{tmp}]
          tmp['image'] = '/item/image?no=' + tmp._id;
      }
      console.log(result); //key가 7개인 object로 변경

      return res.send({status:200, result:result});
  }
  catch(err) {
      console.error(err);
      return res.send({status:-1, result : err});
  }
});





module.exports = router;
