var http = require("http");
var fs = require("fs");
function getTokens(n=10) {
    // get tokens or create them first
    let tks = []
    try {
        tks = fs.readFileSync('./data/tokens.txt', 'utf8').split(',')
    } catch (err) {
        // tokens not created yet, do it first
        fs.mkdirSync('data')
        fs.writeFileSync("./data/tokens.txt", [...Array(n)].map(_=>makeTokens(1, 32)).join(','))
        tks = fs.readFileSync('./data/tokens.txt', 'utf8').split(',')
    }
    return tks
}
var tokens = getTokens()

function adminToken() {
    // check for admin token
    let adminTk
    try {
        adminTk = fs.readFileSync('./data/admin.txt', 'utf8')
    } catch (err) {
        fs.writeFileSync("./data/admin.txt", makeTokens(1, 64).join(','))
        adminTk = fs.readFileSync('./data/admin.txt', 'utf8')
    }
    return adminTk
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
    } catch (err) {}
    return json
}

//create a server object:
http.createServer(function(req, res) {
    //console.log(`${Date()}\n`,req)
    let tk = checkToken(req.url)
    res.setHeader("Access-Control-Allow-Origin", "*")
    //res.setrHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    if (tk) {
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
                } catch (err) {}
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
                                    res.end(`{"msg":"successufly posted at ${Date()}"}`)
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
            fs.readFile(`data/${tk}.json`, 'utf8', function(err, data) {
                if (err) {
                    data = `{"error":"${err}","msg":"A valid token was provided, but with no data associated with it. To retrieve (GET) data you have to POST it first","date":"${Date()}"}`
                }
                res.end(readCheck(data))
            })
        }
    } else {
        tk = getTokenFromURL(req.url)
        //debugger
        if (adminTk.match(tk)) { // if not donor but Admin token 
            // Admin token
            if(req.method=="GET"){ // Admin GET
                let json={}
                //let json = JSON.parse(`{"msg":"admin harvest at ${Date()}","files":${JSON.stringify(fs.readdirSync('data').filter(x=>x.match(/.json$/)))}}`)
                //json.data=readExists(`data/${tk}.admin`)
                let doc = req.url.match(/doc=([^&=]+)/)
                //debugger
                if (doc) { 
                    json.docId = doc[1]
                    try {
                        json=JSON.parse(fs.readFileSync(`data/${json.docId}.json`, 'utf8'))
                    } catch (err) {
                        json.msg="Either no data file was created for that token or the token is not valid. Try to get it directly to find out which case it is."
                        json.error=err
                    }
                } else { // admin harvest
                    json = JSON.parse(`{"msg":"admin harvest at ${Date()}","files":${JSON.stringify(fs.readdirSync('data').filter(x=>x.match(/.json$/)))}}`)
                    json.data=readExists(`data/${tk}.admin`)
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

