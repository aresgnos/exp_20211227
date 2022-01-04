const { options } = require("../routes/member");

// 파일명 : config/auth.js
module.exports = {
    
    securityKey : 'jfchbghjjiuygrfjiluyt459io4q',
    options : {
        algorithm : 'HS256', // 토큰 생성 hash알고리즘
        expiresIn : '9h', // 토큰 만료 시간 ex) 9시간
        issuer : 'corp01', // 토큰 발행자 없어도 됨

    }
}