const { options } = require("../routes/member");

// 파일명 : config/auth.js

// 토큰 생성, 추출, 검증에 필요함
const jwt = require('jsonwebtoken');

var self = module.exports = {
    securityKey : 'jfchbghjjiuygrfjiluyt459io4q',
    options : {
        algorithm : 'HS256', // 토큰 생성 hash알고리즘
        expiresIn : '9h', // 토큰 만료 시간 ex) 9시간
        issuer : 'corp01', // 토큰 발행자 (없어도 됨)
    },

    // 토큰이 전달되면 토큰의 유효성을 검증함.
    checkToken : async(req, res, next) => {
        try{
            // 토큰이 있는지, 시간이 남았는지 검증

            const token = req.headers.token;
            
            // 1. 토큰이 있는가
            if(!token){
                return res.send({status:888, result:'유효하지 않는 토큰입니다.'});
            }

            // 2. 토큰 decode 추출(토큰과 암호키)
            const user = jwt.verify(token, self.securityKey);
            if(typeof user.uid === 'undefined'){
                return res.send({status:888, result:'유효하지 않는 토큰입니다.'});
            }

            console.log('토큰에서 추출한 아이디=>' , user.uid);
            
            // member에는 아이디가 없기 때문에 아이디를 포함시켜줌
            req.body.userid = user.uid;

            console.log(req.headers.token);

            // 토큰은 headers로 첨부해서 보냄(body로 X)
            // console.log(req.headers);

            // console.log("1. auth.js =>", req.body);
            // res.send({status:888});

            // next가 없으면 member.js파일의 /mypage로 전달 불가
            // 위쪽에서 토큰에 대한 유효성을 모두 pass할 경우 다음으로 넘김
            next();

        }
        catch(err){
            console.error(err);
        }
    }
}