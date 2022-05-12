var http = require("http");
var fs = require("fs");
//import fetch from 'node-fetch';
var fetch = require("node-fetch") // not needed after ver 17.5
function getTokens(n=10) {
    // get tokens or create them first
    let tks = []
    try {
        tks = fs.readFileSync('./data/tokens.txt', 'utf8').split(',')
    } catch (err) {
        // tokens not created yet, do it first
        fs.mkdirSync('data')
        fs.mkdirSync('oauth')
        fs.writeFileSync("./data/tokens.txt", [...Array(n)].map(_=>makeTokens(1, 32)).join(','))
        tks = fs.readFileSync('./data/tokens.txt', 'utf8').split(',')
    }
    return tks
}
var tokens = getTokens()

function getParms(str=req.url){
  let parms={}
  let arr = str.match(/[^#?&=]*=[^#?&=]*/g)
  if(arr){
    arr.forEach(a=>{
      a=a.split('=')
      parms[a[0]]=a[1]
    })
  }
  return parms
}

function adminToken() {
    // check for admin token
    let adminTk
    try {
        adminTk = fs.readFileSync('./data/admin.txt', 'utf8')
    } catch (err) {
        fs.writeFileSync("./data/admin.txt", makeTokens(1, 64).join(','))
        adminTk = fs.readFileSync('./data/admin.txt', 'utf8')
    }
    return adminTk.split(',')
}
var adminTk = adminToken()

//var tokens = fs.readFileSync('./data/tokens.txt','utf8').split(',')
function checkToken(url) { // donor token
    let tk = false
    if (url.indexOf('?') > -1) {
        let av = url.slice(url.indexOf('?') + 1).match('token=[^&]*')
        if (av) {
            // a token was submitted
            let tkCandidate = av[0].slice(6)
            //if (tokens.includes(tkCandidate)){ //|| adminTk.match(tkCandidate)) {
            if (tokens.includes(tkCandidate)){
                tk = tkCandidate
            }
        }
    }
    return tk
}
function getTokenFromURL(url){
    let tk
    if(url.match(/token=[^?&=]+/)){
        tk=url.match(/token=([^?&=]+)/)[1]
    }
    return tk
}

function readCheck(x) {
    // check for read/write permissions
    let y = JSON.parse(x)
    // if no block no need to re-stringify x
    if (y.readWrite) {
        if (y.readWrite.read === false) {
            x = JSON.stringify({
                error: 'reading blocked'
            })
        }
    }
    return x
}

function makeTokens(n=1, m=32, str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    return [...Array(n)].map(_=>[...Array(m)].map(_=>str[Math.floor(Math.random() * 62)]).join(''))
}

function readExists(filename){
    let json
    try {json = JSON.parse(fs.readFileSync(filename, 'utf8'))
    } catch (err) {
        console.log(err)
    }
    return json
}

//create a server object:
http.createServer(async function(req, res) {
    //console.log(`${Date()}\n`,req)
    let tk = checkToken(req.url)
    res.setHeader("Access-Control-Allow-Origin", "*")
    //res.setrHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    //debugger 
    let parms = getParms(req.url)
    if(parms.getOauth){ // get token from oauth
        let x,y
        if(!parms.id){ // if this is a validated donor getting token info
            try{
                x = await (await fetch(parms.authURL,{
                    headers:{
                        authorization:'Bearer '+parms.getOauth
                    }
                })).json()
                // extract token from oauth
                y = fs.readFileSync(`oauth/${x.id}.json`, 'utf8')
            }catch(err){
                x = {
                    msg:'oauth2 bearer token validation failed',
                    err:err
                }
                y=JSON.stringify(x)
            }
        }else{ // if this si an admin getting oauth info
            // check that bearer token is an admin token
            //if(adminTk.match(parms.getOauth)){ // if admin token valid
            if(adminTk.indexOf(parms.getOauth)!=-1){ // if admin token valid
                let ids = fs.readdirSync('oauth').filter(x=>x.match(/\.json?/))
                if(ids.indexOf(parms.id+'.json')!=-1){
                    y = fs.readFileSync(`oauth/${parms.id}.json`, 'utf8')
                }else{
                    y={msg:`auth id ${parms.id} not found`}
                }
                
            }else{
                y={msg:'invalid admin token'}
            }
        }
        if(typeof(y)=='object'){
            y=JSON.stringify(y)
        }
        res.end(y)
    }else if (tk) { // token is being provided directly
        // if valid user token provided
        if (req.method == "POST") {
            let bodyData = ''
            req.on('data', function(data) {
                bodyData += data
            })
            req.on('end', function() {
                let bodyJSON = JSON.parse(bodyData)
                //let filename=body.filename||`${tk}.json` // what was I thinking ...
                let filename = `${tk}.json`
                //read first to make sure it can be overwritten
                let oldData
                try {
                    oldData = fs.readFileSync(`data/${tk}.json`, 'utf8')
                } catch (err) {
                    console.log(err)
                }
                if (oldData) {
                    oldData = JSON.parse(oldData)
                    if (oldData.readWrite) {
                        if (oldData.readWrite.write === false) {
                            res.end(JSON.stringify({
                                error: "writing blocked",
                                msg: "file exists but is write-blocked"
                            }))
                        } else {
                            fs.writeFile(`./data/${filename}`, bodyData, function(err, data) {
                                if (err) {
                                    //console.log('posted failed:',err);
                                    res.end("POSTing failed")
                                } else {
                                    res.end(`{"msg":"successufly posted ${Date()}"}`)
                                }
                            })
                        }
                    } else {
                        // no readWrite, go ahead
                        fs.writeFile(`./data/${filename}`, bodyData, function(err, data) {
                            if (err) {
                                //console.log('posted failed:',err);
                                res.end("POSTing failed")
                            } else {
                                res.end(`{"msg":"successufly posted at ${Date()}"}`)
                            }
                        })
                    }
                }else{ // no oldData
                    fs.writeFile(`./data/${filename}`, bodyData, function(err, data) {
                        if (err) {
                            //console.log('posted failed:',err);
                            res.end("POSTing failed")
                        } else {
                            res.end(`{"msg":"successufly posted at ${Date()}"}`)
                        }
                    })
                }
            })
            //debugger
        } else { // DONOR GET
            if(parms.bearer){
                //parms.clientId=parms.clientId||"1061219778575-61rsuqnukha35jgbt2hkl8de17sehf4c.apps.googleusercontent.com"
                //parms.authURL=parms.authURL||"https://accounts.google.com/o/oauth2/auth"
                parms.authURL=parms.authURL||"https://www.googleapis.com/oauth2/v1/userinfo?alt=json"
                fetch(parms.authURL,{
                    headers:{
                        authorization:'Bearer '+parms.bearer
                    }
                }).then(x=>x.json().then(y=>{
                    //console.log(y)
                    // disable invite token, first generate a new none and rename existing user data file
                    if(y.error){
                        res.end(JSON.stringify(y)) // most likely authentication went wrong
                    }else{
                        y.oldToken=parms.token // in case system crahses halfway
                        y.token = parms.newToken||makeTokens().join() // use new token if provided, or create a new one
                        try{ // rename data file if it exists
                            fs.renameSync(`./data/${parms.token}.json`,`./data/${y.token}.json`)
                        }catch(err){
                            console.log(`no need to rename ${y.token}.json, it doesn't exist`)
                        }
                        // replace old token by new one in list of tokens, maybe this could be async ...
                        fs.writeFileSync(`./data/tokens.txt`,fs.readFileSync(`./data/tokens.txt`,'utf8').replace(parms.token,y.token))
                        tokens = getTokens() // update tokens in memory
                        // save oauth link file with new token
                        fs.writeFileSync(`./oauth/${y.id}.json`,JSON.stringify(y))
                        // debugger
                        res.end(JSON.stringify({msg:`OAuth ${y.id} linked to token ${y.token}`,token:y.token,id:y.id}))
                    }
                }))
            } else { // none of the above
                fs.readFile(`data/${tk}.json`, 'utf8', function(err, data) {
                    if (err) {
                        data = `{"error":"${err}","msg":"A valid token was provided, but with no data associated with it. To GET data you have to POST it first"}`
                    }
                    res.end(readCheck(data))
                })
            }
                
        }
    } else {
        tk = getTokenFromURL(req.url)||new RegExp(/^$/g)
        if (adminTk.indexOf(tk)!=-1) { // if not donor but Admin token 
            // Admin token
            parms
            if(req.method=="GET"){ // Admin GET
                let json={}
                //let json = JSON.parse(`{"msg":"admin harvest at ${Date()}","files":${JSON.stringify(fs.readdirSync('data').filter(x=>x.match(/.json$/)))}}`)
                //json.data=readExists(`data/${tk}.admin`)
                //let doc = req.url.match(/doc=([^&=]+)/)
                //debugger 
                if (parms.doc) { 
                    json.docId = parms.doc
                    try {
                        json=JSON.parse(fs.readFileSync(`data/${json.docId}.json`, 'utf8'))
                    } catch (err) {
                        json.msg="Either no data file was created for that token or the token is not valid. Try to get it directly to find out which case it is."
                        json.error=err
                    }
                } else if (parms.oauth) { 
                    json.oauthId = parms.oauth
                    try {
                        json=JSON.parse(fs.readFileSync(`oauth/${json.oauthId}.json`, 'utf8'))
                    } catch (err) {
                        json.msg="Either no data file was created for that token or the token is not valid. Try to get it directly to find out which case it is."
                        json.error=err
                    }
                } else { // admin harvest or token insert
                    if(!parms.role){ // harvest
                        json = JSON.parse(`{"msg":"admin harvest at ${Date()}","donations":${JSON.stringify(fs.readdirSync('data').filter(x=>x.match(/.json$/)))},"oauth":${JSON.stringify(fs.readdirSync('oauth').filter(x=>x.match(/.json$/)))}}`)
                        json.data=readExists(`data/${tk}.admin`)
                    }else{ // token insert
                        json.newTokens = makeTokens(parseInt(parms.num),parseInt(parms.lgh))
                        json.role = parms.role
                        json.msg = `${parms.num} new ${parms.lgh} character-long ${parms.role} tokens created`
                        if(parms.role=='admin'){
                            fs.appendFileSync('data/admin.txt', `,${json.newTokens.join(',')}`);
                            adminTk = adminToken() // updating the global admin token list in memory
                        } else { // role donor
                            fs.appendFileSync('data/tokens.txt', `,${json.newTokens.join(',')}`);
                            tokens = getTokens() // updating the global donor token list in memory
                        }
                    }
                }
                res.end(JSON.stringify(json))
            }else{ // Admin POST 
                // get body
                let bodyData = ''
                req.on('data', function(data) {
                    bodyData += data
                })
                req.on('end', function() {
                    let bodyJSON = JSON.parse(bodyData)
                    // check if this targets a doc
                    let doc = req.url.match(/doc=([^&=]+)/)
                    if(doc){
                        let docID=doc[1]
                        fs.writeFileSync(`./data/${docID}.json`,bodyData)
                        res.end(JSON.stringify({msg:"admin POSTing to donor document"}))
                    }else{
                        fs.writeFileSync(`./data/${tk}.admin`,bodyData)
                        res.end(JSON.stringify({msg:"POSTing to admin"}))
                    }
                })
            }           
        } else { // if neither donor nor admin 
            res.end(`{"msg":"no valid token provided","date":"${Date()}"}`);
        }
    }
}).listen(3000);