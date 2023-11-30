// 모듈포함
// expresss, fabric-ca-client, fabric-network
var express = require('express');
const {Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

var path = require('path');
var fs = require('fs');

// lib/APPUtil.js, CAUtils.js
const { buildCAClient, enrollAdmin, registerAndEnrollUser } = require('./lib/CAUtils.js');
const { buildCCPOrg1, buildWallet } = require('./lib/APPUtils.js');

// connection profile 빌드
const ccp = buildCCPOrg1();

// 서버설정 - 미들웨어(static, body-parser), app객체
var app = express();
app.use('/public', express.static( path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// constant 설정 - 채널명, 체인코드명, 웰렛경로, 연결할 기관ID
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const channelName = 'tempchannel';
const chaincodeName = 'exp';

// HTML 라우팅 '/' GET index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname+("/views/index_theme.html"));
})

app.get('/wallet', (req, res) => {
    res.sendFile(__dirname+("/views/wallet.html"));
})
app.get('/exp_propose', (req, res) => {
    res.sendFile(__dirname+("/views/exp-propose.html"));
})
app.get('/exp_confirm', (req, res) => {
    res.sendFile(__dirname+("/views/exp-confirm.html"));
})
app.get('/exp_query', (req, res) => {
    res.sendFile(__dirname+("/views/exp-query.html"));
})

// REST 라우팅 
// /admin, POST 라우팅 - 관리자 인증서 생성
app.post('/admin', async(req, res) => {
    var aid = req.body.adminid;
    var apw = req.body.adminpw;

    console.log('/admin POST - ', aid, apw);

    try {
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
        const wallet = await buildWallet(Wallets, walletPath);
        await enrollAdmin(caClient, wallet, mspOrg1, aid, apw);

        var rObj = {};
        rObj.result = "success";
        rObj.message = "An admin id is created";
        res.status(200).json(rObj);

    } catch (error) {
        console.log(error);
        var rObj = {};
        rObj.result = "fail";
        rObj.error = error.message;
        res.status(200).json(rObj);
    }
})
// /user, POST 라우팅 - 사용자 인증서 생성
app.post('/user', async(req, res) => {
    var uid = req.body.userid;
    var affiliation = req.body.affiliation;

    console.log('/user POST - ', uid, affiliation);
    try {
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
        const wallet = await buildWallet(Wallets, walletPath);
        await registerAndEnrollUser(caClient, wallet, mspOrg1, uid, affiliation);

        var rObj = {};
        rObj.result = "success";
        rObj.message = `An user id is created - ${uid}`;
        res.status(200).json(rObj);
    } catch (error) {
        console.log(error);
        var rObj = {};
        rObj.result = "fail";
        rObj.error = error.message;
        res.status(200).json(rObj);
    }
});

// 1. '/experience' POST                - ProposeEXP
app.post('/experience', async(req, res) => {
    var cert = req.body.p_cert;
    var eid = req.body.p_eid;
    var sid = req.body.p_sid;
    var kcid = req.body.p_kcid;

    console.log("/experience POST : ", cert, eid, sid, kcid);

    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();

    try {
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork(channelName);
        const contract = await network.getContract(chaincodeName);

        await contract.submitTransaction('ProposeEXP', eid, sid, kcid);

        //성공응답
        var rObj = {};
        rObj.result = "success";
        rObj.message = "tx has been submitted";
        res.json(rObj);

    } catch (error) {
        //실패응답
        console.log(error.message);
        var rObj = {};
        rObj.result = "fail";
        rObj.error = error.message;
        res.json(rObj);

    } finally {
        gateway.disconnect();
    }
});
// 2. '/experience' GET                 - QueryEXP
app.get('/experience', async(req, res) => {
    var cert = req.query.q_cert;
    var id = req.query.q_eid;

    console.log("/exp GET : ", cert, id);

    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();

    try {
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork(channelName);
        const contract = await network.getContract(chaincodeName);

        let result = await contract.evaluateTransaction('ReadEXP', id);
        var parsed_data = JSON.parse(result);
        console.log(parsed_data)
        //성공응답
        var rObj = {};
        rObj.result = "success";
        rObj.message = parsed_data;
        res.json(rObj);

    } catch (error) {
        //실패응답
        console.log(error.message);
        var rObj = {};
        rObj.result = "fail";
        rObj.error = error.message;
        res.json(rObj);

    } finally {
        gateway.disconnect();
    }
});

// 3. '/experience/:eid' POST           - ConfirmEXP
// 4. '/experience/participation POST   - (TODO) 체인코드 버전업 필요
// 5. '/experience/history' GET         - QueryEXPHistory
app.get('/experience/history', async(req, res) => {
    var cert = req.query.h_cert;
    var id = req.query.h_id;

    console.log("/experience/history GET : ", cert, id);

    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();

    try {
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork(channelName);
        const contract = await network.getContract(chaincodeName);

        let result = await contract.evaluateTransaction('QueryEXPHistory', id);
        var parsed_data = JSON.parse(result);
        console.log(parsed_data)
        //성공응답
        var rObj = {};
        rObj.result = "success";
        rObj.message = parsed_data;
        res.json(rObj);

    } catch (error) {
        //실패응답
        console.log(error.message);
        var rObj = {};
        rObj.result = "fail";
        rObj.error = error.message;
        res.json(rObj);

    } finally {
        gateway.disconnect();
    }
});

// 서버시작
app.listen(3000, () => {
    console.log("Server is started. : 3000");
})