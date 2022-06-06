// donation SDK methods

var serviceUrl = 'https://donate.jonasalmeida.repl.co'//'http://localhost:3000'

function setUrl(url=serviceUrl){ // set default url as something else
  serviceUrl=url
  return url
}

async function get(url=serviceUrl,format='text'){
    if(!url.match(/[:]/)){ // url is a token
      url = `${serviceUrl}?token=${url}`
    }
    return (await fetch(url))[format]()
}

async function post(url=serviceUrl,data={created:Date()},format='text'){
  if(!url.match(/[:]/)){ // url is a token
      url = `${serviceUrl}?token=${url}`
  }
  return (await fetch(url,{
      method:"POST",
      body:JSON.stringify(data)
  }))[format]()
}

function makeTokens(n=1,m=32,str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
  const k = str.length
  return [...Array(n)].map(_=>[...Array(m)]
  .map(_=>str[Math.floor(Math.random()*k)]).join(''))
}

function getParms(str=location.search+location.hash){
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

// Create and append new donor and admin tokens 
async function newToken(tk,parm={n:1},role="donor",url=serviceUrl){ 
  if(typeof(parm)=='number'){ // if parm is passing the number of tokens, an integer
    parm={n:parm}
  }
  if(!parm.L){
    if(role=="donor"){
      parm.L=32
    } else { // admin
      parm.L=64
    }
  }
  url+=`?token=${tk}&role=${role}&num=${parm.n}&lgh=${parm.L}`
  return await get(url)
}

async function setOauth(token,bearer,newToken=dona.makeTokens(1,token.length).join(),authURL="https://www.googleapis.com/oauth2/v1/userinfo?alt=json"){
  return await get(serviceUrl+'/?token='+token+'&bearer='+bearer+'&newToken='+newToken+'&authURL='+authURL)
}

async function getOauth(bearer,id,authURL="https://www.googleapis.com/oauth2/v1/userinfo?alt=json"){ // 
  let url=bearer
  if(!id){ // if this is not an admin call for id information    
    if(!url.match(':')){
      url=serviceUrl+'/?getOauth='+bearer+'&authURL='+authURL
    }
  }else{ // bearer token if an admin token looking for a auth id
    url=serviceUrl+'/?getOauth='+bearer+'&id='+id+'&authURL='+authURL
  }
  return await get(url)
}

// enabling epiVerse of multiple epiDonate backends


function deployment(url="https://donate.jonasalmeida.repl.co"){
  this.date=Date()
  this.serviceUrl=url
  this.get=(x='',format='json')=>get(this.serviceUrl+'?token='+x,format)
  this.post=(x='',dt={created:Date()},format='json')=>post(this.serviceUrl+'?token='+x,dt,format)
  this.makeTokens=makeTokens
  this.getParms=getParms
  this.newToken=newToken
  //this.setUrl=serviceUrl -> not clear why this would make sense,
  //it would set the serviceUrl parameter of the module, not of the instantiated deployment
  this.setOauth=setOauth
  this.getOauth=getOauth
}

export {get,post,makeTokens,getParms,newToken,setUrl,setOauth,getOauth,serviceUrl,deployment}