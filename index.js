var http = require("http");
var fs = require("fs");
function getTokens(n=10000) {
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
        fs.writeFileSync("./data/admin.txt", makeTokens(10, 64).join(','))
        adminTk = fs.readFileSync('./data/admin.txt', 'utf8')
    }
    return adminTk
}
var adminTk = adminToken()

//var tokens = fs.readFileSync('./data/tokens.txt','utf8').split(',')
function checkToken(url) {
    let tk = false
    if (url.indexOf('?') > -1) {
        let av = url.slice(url.indexOf('?') + 1).match('token=[^&]*')
        if (av) {
            // a token was submitted
            let tkCandidate = av[0].slice(6)
            if (tokens.includes(tkCandidate) || adminTk.match(tkCandidate)) {
                tk = tkCandidate
            }
        }
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

//create a server object:
http.createServer(function(req, res) {
    //console.log(`${Date()}\n`,req)
    let tk = checkToken(req.url)
    res.setHeader("Access-Control-Allow-Origin", "*")
    //res.setrHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    if (tk) {
        // if valid user token provided
        if (req.method == "POST") {
            let body = ''
            req.on('data', function(data) {
                body += data
            })
            req.on('end', function() {
                let bodyJSON = JSON.parse(body)
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
                                msg: "this file already exists and is write-blocked"
                            }))
                        } else {
                            fs.writeFile(`./data/${filename}`, body, function(err, data) {
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
                        fs.writeFile(`./data/${filename}`, body, function(err, data) {
                            if (err) {
                                //console.log('posted failed:',err);
                                res.end("POSTing failed")
                            } else {
                                res.end(`{"msg":"successufly posted at ${Date()}"}`)
                            }
                        })
                    }
                }else{ // no oldData
                    fs.writeFile(`./data/${filename}`, body, function(err, data) {
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
        } else {
            // GET
            //if(tk==adminTk){ // Admin token
            if (adminTk.match(tk)) {
                // Admin token
                let json = JSON.parse(`{"msg":"admin harvest at ${Date()}","files":${JSON.stringify(fs.readdirSync('data').filter(x=>x.match(/.json$/)))}}`)
                debugger
                try {
                    json.data = JSON.parse(fs.readFileSync(`data/${tk}.json`, 'utf8'))
                } catch (err) {}
                debugger
                let doc = req.url.match(/doc=([^&=]+)/)
                if (doc) {
                    json.docId = doc[1]
                    try {
                        //json.doc=JSON.parse(fs.readFileSync(`data/${json.docId}.json`,'utf8'))
                        json = JSON.parse(fs.readFileSync(`data/${json.docId}.json`, 'utf8'))
                    } catch (err) {
                        json.error = err
                    }
                }
                res.end(JSON.stringify(json))
            } else {
                // user token
                fs.readFile(`data/${tk}.json`, 'utf8', function(err, data) {
                    if (err) {
                        data = `{"donate":"get","error":"${err}","msg":"A valid token was provided, but with no data associated with it. To retrieve (GET) data you have to POST it first","date":"${Date()}"}`
                    }
                    res.end(readCheck(data))
                })
            }

            //res.write(`Hello World from Jonas :-), you have provided a valid token at ${Date()}`); //write a response to the client
            //res.end(); //end the response
        }
    } else {
        // no valid token
        //res.write(`no valid token provided`); //write a response to the client
        // check if this is admin
        res.end(`{"donate":"invalid","msg":"no valid token provided","date":"${Date()}"}`);
        //end the response

    }

}).listen(3000);
//the server object listens on port 8080
