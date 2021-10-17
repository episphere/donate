var http = require("http");
var fs = require("fs");
var tokens = fs.readFileSync('./data/tokens.txt','utf8').split(',').map(x=>parseInt(x))

//create a server object:
http
  .createServer(function (req, res) {
    console.log(`${Date()}\n`,req)
    res.setHeader("Access-Control-Allow-Origin", "*")
    //res.setrHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    if(req.method=="POST"){
      let body=''
      req.on('data',function(data){
        body+=data
      })
      req.on('end',function(){
        let bodyJSON=JSON.parse(body)
        let filename=body.filename||'hello.json'
        fs.writeFile(`./data/${filename}`,body,function(err,data){
          if (err) {
            return console.log('posted failed:',err);
          }
          console.log(`posted to ${filename}:\n`,bodyJSON)
          res.end(`successufly posted at ${Date()}`)
        })
      })
      //debugger
    }else{
      res.write(`Hello World from Jonas :-D ! at ${Date()}`); //write a response to the client
      res.end(); //end the response
    }
      
  })
  .listen(3000); //the server object listens on port 8080
