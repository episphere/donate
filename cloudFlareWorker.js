addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request))
  })
  addEventListener("get", event => {
      event.respondWith(handleRequest(event.request))
  })
  
  var headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
  });
  var responseInitVal = {status:200,headers:headers}
  var tokens = []
  var adminTk = []
  
  //handleRequest() processes the request the client sends to Cloudflare
  async function handleRequest(request) {
      //Initialize tokens array and adminTk variable
      tokens = await getTokens()
      adminTk = await adminToken()
      let res = processRequest(request)
      //let res = await createResponse()
      return res
  }
  
  //Verifies whether a JSON has permission to be read
  function readCheck(x) {
      // check for read/write permissions
      let y = JSON.parse(x)
      //Verify that JSON is not null
      if(y) {
          // if no block no need to re-stringify x
          if (y.readWrite) {
              if (y.readWrite.read === false) {
                  x = JSON.stringify({
                      error: 'reading blocked'
                  })
              }
          }
      }
      return x
  }
  
  //Global variable to store array of tokens
  async function getTokens(n=10) {
      // get tokens or create them first
      tks = []
      try {
          tks = await data_txt.get('tokens')
          tks = tks.split(',')
      } catch (err) {
          // tokens not created yet, do it first
          await data_txt.put("tokens", [...Array(n)].map(_=>makeTokens(1, 32)).join(','))
          tks = await data_txt.get('tokens')
          tks = tks.split(",")
      }
      return tks
  }
  
  //Extract parms from request URL
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
  
  //Returns the list of admin tokens
  async function adminToken() {
      //Verify whether an admin token exists
      let adminToken = await data_admin.get('admin')
      if(!adminToken) {
          //If no admin token exists, create one with makeTokens()
          let tk = makeTokens(1, 64).join(",")
          await data_admin.put("admin", tk)
          adminToken = await data_admin.get('admin')
      }
      return adminToken.split(',')
  }
  
  //Verifies whether the token passed in the request URL is valid
  function checkToken(url) {
      let tk = false
      if (url.indexOf('?') > -1) {
          let av = url.slice(url.indexOf('?') + 1).match('token=[^&]*')
          if (av) {
              // a token was submitted
              let tkCandidate = av[0].slice(6)
              if (tokens.includes(tkCandidate)){
                  tk = tkCandidate
              }
          }
      }
      return tk
  }
  
  //Returns the token passed in a request URL
  function getTokenFromURL(url){
      let tk
      if(url.match(/token=[^?&=]+/)){
          tk=url.match(/token=([^?&=]+)/)[1]
      }
      return tk
  }
  
  //Create n tokens of length m
  function makeTokens(n=1, m=32, str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      return [...Array(n)].map(_=>[...Array(m)].map(_=>str[Math.floor(Math.random() * 62)]).join(''))
  }
  
  
  /*
  readExists() is only called for .admin files, so we only need 
  to reference the data_admin namespace
  */
  async function readExists(filename) {
      let json
      let val = await data_admin.get(filename)
      if(val) {
          try {json = JSON.parse(val)}
          catch (err) {console.log(err)}
      }
      else {console.log(filename + " not retrieved")}
      return json
  }
  
  /*
  Verifies whether the oauth information passes in a request 
  URL is valid
  */
  async function validateOauth(parms, res) {
      let x,y
      if(!parms.id){ // if this is a validated donor getting token info
          try{
              x = await fetch(parms.authURL,{
                  headers:{
                      authorization:'Bearer '+parms.getOauth
                  }
              })
              x = await x.json()
              // extract token from oauth
              console.log("Token extracted from oauth")
              //Debug
              console.log("Authorization fetch result: ", x)
              console.log("ID being used: " + x.id)
              let test = await oauth_json.get(`${x.id}.json`, {type:"text"})
              console.log("Extracted value from oauth_json: " + test)
              //Debug
              y = JSON.parse(await oauth_json.get(`${x.id}.json`, {type:"text"}))
              //Debug
              console.log("Token data: ", y)
              //Debug
          }catch(err){
              x = {
                  msg:'oauth2 bearer token validation failed',
                  err:err
              }
              y = JSON.stringify(x)
          }
      }else{ // if this is an admin getting oauth info
          // check that bearer token is an admin token
          if(adminTk.indexOf(parms.getOauth)!=-1){ // if admin token valid
              console.log("Getting oauth files")
              let files = await oauth_json.list()
              let keysArr = []
              files.keys.forEach(function(el){
                  keysArr.push(el.name)
              })
              let ids = keysArr.filter(x=>x.match(/\.json?/))
              if(ids.indexOf(parms.id+'.json')!=-1){
                  console.log("Getting specific oauth file")
                  y = JSON.parse(await oauth_json.get(`${parms.id}.json`, {type:"text"}))
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
      res = new Response(y,responseInitVal)
      return res
  }
  
  
  //Extract data from request body and attempt to post data with token tk
  async function postDonorData(req, tk, res) {
      let bodyData = ''
      bodyData = JSON.stringify(await req.json())
      //let filename=body.filename||`${tk}.json` // what was I thinking ...
      let filename = `${tk}.json`
      //read first to make sure it can be overwritten
      let oldData
      //Message to include in Response
      let message
      try {
          oldData = await data_json.get(filename, {type:"text"})
      } catch (err) {
          console.log(err)
      }
      if (oldData) {
          //If there is existing data, we check for write privilege
          if (oldData.readWrite) {
              if (oldData.readWrite.write === false) {
                  message = JSON.stringify({error: "writing blocked",
                      msg: "file exists but is write-blocked"})
                  res = new Response(message, responseInitVal)
              } else {
                  //If old data has write privilege, update the value
                  try {
                      await data_json.put(filename, bodyData)
                      message = JSON.stringify({msg:`successfully posted ${Date()}`})
                      console.log(`successfully posted ${Date()}`)
                      res = new Response(message, responseInitVal)
                  } catch (err) {
                      message = JSON.stringify({msg:"POSTing failed"})
                      res = new Response(message, responseInitVal)
                  }
              }
          } else {
              //If no readWrite information exists, try posting data
              try {
                  await data_json.put(filename, bodyData)
                  message = JSON.stringify({msg:`successfully posted at ${Date()}`})
                  res = new Response(message, responseInitVal)
              } catch(err) {
                  message = JSON.stringify({msg:"POSTing failed"})
                  res = new Response(message, responseInitVal)
              }
          }
      }
      else{ // no oldData
          try {
              await data_json.put(filename, bodyData)
              message = JSON.stringify({msg:`successfully posted at ${Date()}`})
              console.log(`successfully posted ${Date()}`)
              res = new Response(message, responseInitVal)
          } catch(err) {
              message = JSON.stringify({msg:"POSTing failed"})
              res = new Response(message, responseInitVal)
          }
      }
      return res
  }
  
  
  //Get donor data using token tk
  async function getDonorData(parms, tk, res) {
      if(parms.bearer){
          res = await getDonorDataHelper(parms, res);
      } else {
          let data = await data_json.get(`${tk}.json`, {type:"text"});
          try {
              let message = "A valid token was provided, but with no data associated with it. To GET data you have to POST it first";
              //Verify that data is associated with token tk
              if(data == null) {
                  err = `Error: No such file or directory data_json/${tk}.json exists`;
                  data = JSON.stringify({error:err,msg:message});
              }
              //If data acquired is not null, verify the data can be read
              else
                  data = readCheck(data);
          }
          catch(err) {
              data = JSON.stringify({error:err,msg:message})
          }
          res = new Response(data,responseInitVal);
      }
      return res
  }
  
  
  async function getDonorDataHelper(parms, res) {
      //Fetch authentication information
      parms.authURL=parms.authURL||"https://www.googleapis.com/oauth2/v1/userinfo?alt=json"
      let authenticationResult = await fetch(parms.authURL,{
          headers:{
              authorization:'Bearer '+parms.bearer
          }
      })
      authenticationResult = await authenticationResult.json()
      //Variable to store body of Response
      let responseBody
      if(authenticationResult.error) {
          responseBody = JSON.stringify(authenticationResult)
          res = new Response(responseBody,responseInitVal)
      }
      else {
          authenticationResult.oldToken = parms.token
          authenticationResult.token = parms.newToken || makeTokens().join()
          try {
              //Recreate old file with new name and delete the old file
              let fileData = await data_json.get(`${parms.token}.json`, {type:"text"})
              await data_json.put(`${authenticationResult.token}.json`, fileData)
              await data_json.delete(`${parms.token}.json`)
          } catch(err) {
              console.log(`no need to rename ${authenticationResult.token}.json, it doesn't exist`)
          }
          // replace old token by new one in list of tokens
          let updatedTokens = await data_txt.get("tokens", {type:"text"})
          updatedTokens = updatedTokens.replace(parms.token, authenticationResult.token)
          await data_txt.put("tokens", updatedTokens)
          //Update tokens in memory
          tokens = await getTokens()
          // save oauth link file with new token
          console.log("Saving oauth link file with new token")
          await oauth_json.put(`${authenticationResult.id}.json`, JSON.stringify(authenticationResult))
          // debugger
          responseBody = JSON.stringify({msg:`OAuth ${authenticationResult.id} linked to token ${authenticationResult.token}`,
              token:authenticationResult.token,id:authenticationResult.id})
          res = new Response(responseBody,responseInitVal)
      }
      return res
  }
  
  
  async function adminGetData(parms, tk, res) {
      let json={}
      if (parms.doc) { 
          //Obtain donor token from parms and try fetching its data
          json.docId = parms.doc
          try {
              json=JSON.parse(await data_json.get(`${json.docId}.json`, {type:"text"}))
          } catch (err) {
              json.msg="Either no data file was created for that token or the token is not valid. Try to get it directly to find out which case it is."
              json.error=err
          }
      } else if (parms.oauth) { 
          //Obtain oauth ID from parms and try fetching its data
          json.oauthId = parms.oauth
          try {
              console.log("Getting specific oauth file ")
              //Debug
              console.log(`Getting oauth file ${json.oauthId}`)
              //Debug
              json=JSON.parse(await oauth_json.get(`${json.oauthId}.json`, {type:"text"}))
          } catch (err) {
              json.msg="Either no data file was created for that token or the token is not valid. Try to get it directly to find out which case it is."
              json.error=err
          }
      } else { // admin harvest or token insert
          if(!parms.role){ // harvest
              //Generate list of keys in data_json namespace
              dataFiles = await data_json.list()
              let dataFileNames = []
              dataFiles.keys.forEach(function(el){
                  dataFileNames.push(el.name)
              })
              //Generate a list of keys in oauth_json namespace
              oauthFiles = await oauth_json.list()
              oauthFileNames = []
              oauthFiles.keys.forEach(function(el){
                  oauthFileNames.push(el.name)
              })
              
              json = JSON.parse(`{"msg":"admin harvest at ${Date()}","donations":${JSON.stringify(dataFileNames.filter(x=>x.match(/.json$/)))},"oauth":${JSON.stringify(oauthFileNames.filter(x=>x.match(/.json$/)))}}`)
              //Check if value indexed by tk exists in data_admin namespace
              json.data = await readExists(`${tk}.admin`)
          }else{ // token insert
              //Create new token(s)
              json.newTokens = makeTokens(parseInt(parms.num),parseInt(parms.lgh))
              json.role = parms.role
              json.msg = `${parms.num} new ${parms.lgh} character-long ${parms.role} tokens created`
              if(parms.role=='admin'){
                  //Append admin token(s) to admin key in data_admin namespace
                  let dataToAppend = `${json.newTokens.join(',')}`
                  let currentData = await data_admin.get('admin')
                  let updatedData = currentData + "," + dataToAppend
                  await data_admin.put('admin', updatedData)
                  //Update the global admin token list in memory
                  adminTk = await adminToken()
              } else { // role donor
                  //Append donor token(s) to tokens key in data_txt namespace
                  let dataToAppend = `${json.newTokens.join(',')}`
                  let currentData = await data_txt.get('tokens')
                  let updatedData = currentData + "," + dataToAppend
                  await data_txt.put('tokens', updatedData)
                  //Update the global donor token list in memory
                  tokens = await getTokens()
              }
          }
      }
      res = new Response(JSON.stringify(json),responseInitVal)
      return res
  }
  
  //Posts data to data_admin namespace with tk as key
  async function adminPostData(req, tk, res) {
      let responseBody = ''
      //Get body of request
      let bodyData = ''
      bodyData = JSON.stringify(await req.json())
      console.log("Admin Data being posted: " + bodyData)
          // check if this targets a doc
          let doc = req.url.match(/doc=([^&=]+)/)
          if(doc){
              let docID=doc[1]
              await data_json.put(`${docID}.json`,bodyData)
              responseBody = JSON.stringify({msg:"admin POSTing to donor document"})
              res = new Response(responseBody, responseInitVal)
          }else{
              await data_admin.put(`${tk}.admin`,bodyData)
              responseBody = JSON.stringify({msg:"POSTing to admin"})
              res = new Response(responseBody, responseInitVal)
          }
      return res
  }
  
  
  //Handle a user's epiDonate request
  async function processRequest(req) {
      //Initialize an empty Response body
      let emptyBody = JSON.stringify({message:"Empty Response Body"})
      let res = new Response(emptyBody,responseInitVal)
      //Verify token specified in request    
      let tk = checkToken(req.url)
      //debugger 
      let parms = getParms(req.url)
      if(parms.getOauth){ // get token from oauth
          res = await validateOauth(parms, res);
      }else if (tk) { // token is being provided directly
          // if valid user token provided
          if (req.method == "POST") {
              res = await postDonorData(req, tk, res);
          } else { // DONOR GET
              res = await getDonorData(parms, tk, res);
          }
      } else {
          tk = getTokenFromURL(req.url)||new RegExp(/^$/g)
          console.log("Token: " + tk)
          console.log("Admin Tokens: " + adminTk)
          if (adminTk.indexOf(tk)!=-1) { // if not donor but Admin token 
              // Admin token
              parms
              if(req.method=="GET"){ // Admin GET
                  res = await adminGetData(parms, tk, res)
              }else{ // Admin POST 
                  res = await adminPostData(req, tk, res)
              }           
          } else { // if neither donor nor admin 
              let bodyMessage = `{"msg":"no valid token provided","date":"${Date()}"}`
              res = new Response(bodyMessage, responseInitVal)
          }
      }
      return res;
  }
