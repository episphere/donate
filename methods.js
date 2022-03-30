// donation SDK methods

var serviceUrl = 'http://localhost:3000'

function setUrl(url='http://localhost:3000'){ // set default url as something else
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

function makeTokens(n=1,m=16,str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
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

export {get,post,makeTokens,getParms,newToken,setUrl}