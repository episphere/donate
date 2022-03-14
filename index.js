var http = require("http");
var fs = require("fs");
function getTokens(n=1000){ // get tokens or create them first
  let tks=[]
  try{
    tks=fs.readFileSync('./data/tokens.txt','utf8').split(',')
  } catch (err) { // tokens not created yet, do it first
    fs.mkdirSync('data')
    fs.writeFileSync("./data/tokens.txt",[...Array(n)].map(_=>makeTokens(1,32)).join(','))
    tks=fs.readFileSync('./data/tokens.txt','utf8').split(',')
  }
  return tks
}
var tokens = getTokens()

function adminToken(){
  // check for admin token
  let adminTk
  try {
    adminTk=fs.readFileSync('./data/admin.txt','utf8')
  } catch (err) {
    fs.writeFileSync("./data/admin.txt",makeTokens(1,64)[0])
    adminTk=fs.readFileSync('./data/admin.txt','utf8')
  }
  return adminTk
}
var adminTk=adminToken()

//var tokens = fs.readFileSync('./data/tokens.txt','utf8').split(',')
function checkToken(url){
  let tk=false
  if(url.indexOf('?')>-1){
    let av = url.slice(url.indexOf('?')+1).match('token=[^&]*')
    if(av){ // a token was submitted
      let tkCandidate=av[0].slice(6)
      if(tokens.includes(tkCandidate)||tkCandidate==adminTk){
        tk=tkCandidate
      }
    }
  }
  return tk
}

function makeTokens(n=1,m=32,str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
  return [...Array(n)].map(_=>[...Array(m)]
  .map(_=>str[Math.floor(Math.random()*62)]).join(''))
}

//create a server object:
http
  .createServer(function (req, res) {
    //console.log(`${Date()}\n`,req)
    let tk=checkToken(req.url)
    res.setHeader("Access-Control-Allow-Origin", "*")
    //res.setrHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    if(tk){ // if valid token provided
      if(req.method=="POST"){
        let body=''
        req.on('data',function(data){
          body+=data
        })
        req.on('end',function(){
          let bodyJSON=JSON.parse(body)
          let filename=body.filename||`${tk}.json`
          fs.writeFile(`./data/${filename}`,body,function(err,data){
            if (err) {
              //console.log('posted failed:',err);
              res.end("POSTing failed")
            }else{
              res.end(`{"msg":"successufly posted at ${Date()}","donate":"post"}`)
            }
            //console.log(`posted to ${filename}:\n`,bodyJSON)
          })
        })
        //debugger
      }else{ // GET
        if(tk==adminTk){ // Admin token
          let json = JSON.parse(`{"donate":"admin","msg":"admin stuff","files":${JSON.stringify(fs.readdirSync('data'))}}`)
          try{
            json.data=JSON.parse(fs.readFileSync(`data/${tk}.json`,'utf8'))
          }catch(err){
            //
          }
          res.end(JSON.stringify(json))
        }else{
          fs.readFile(`data/${tk}.json`,'utf8',function(err,data){
            if(err){
              data = `{"donate":"get","error":"${err}","msg":"A valid token was provided but with no data. Some data needs to be POSTed for this token first.","date":"${Date()}"}`
            }
            res.end(data)
          })
        }
          
        //res.write(`Hello World from Jonas :-), you have provided a valid token at ${Date()}`); //write a response to the client
        //res.end(); //end the response
      }
    }else{ // no valid token
      //res.write(`no valid token provided`); //write a response to the client
      // check if this is admin
      res.end(`{"donate":"invalid","msg":"no valid token provided","date":"${Date()}"}`); //end the response
      
    }
      
      
  })
  .listen(3000); //the server object listens on port 8080
