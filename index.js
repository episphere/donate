var http = require("http");
var fs = require("fs");
var tokens = fs.readFileSync('./data/tokens.txt','utf8').split(',')
function checkToken(url){
  let tk=false
  if(url.indexOf('?')>-1){
    let av = url.slice(url.indexOf('?')+1).match('token=[^&]*')
    if(av){ // a token was submitted
      let tkCandidate=av[0].slice(6)
      if(tokens.includes(tkCandidate)){
        tk=tkCandidate
      }
    }
  }
  return tk
}

//create a server object:
http
  .createServer(function (req, res) {
    console.log(`${Date()}\n`,req)
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
              res.end(`{"msg":"successufly posted at ${Date()}","status":"donate"}`)
            }
            //console.log(`posted to ${filename}:\n`,bodyJSON)
          })
        })
        //debugger
      }else{
        fs.readFile(`data/${tk}.json`,'utf8',function(err,data){
          if(err){
            data = `{"status":"donate","error":"${err}","msg":"A valid token was provided but with no data. Some data needs to be POSTed for this token first.","date":"${Date()}"}`
          }
          res.end(data)
        })
        //res.write(`Hello World from Jonas :-), you have provided a valid token at ${Date()}`); //write a response to the client
        //res.end(); //end the response
      }
    }else{
      //res.write(`no valid token provided`); //write a response to the client
      res.end(`{"status":"donate","msg":"no valid token provided","date":"${Date()}"}`); //end the response
    }
      
      
  })
  .listen(3000); //the server object listens on port 8080
