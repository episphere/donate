//repl = function(){}

async function get(url='http://localhost:3000',format='text'){
    return (await fetch(url))[format]()
}

async function post(url='http://localhost:3000',data={hello:'world!',at:Date()},format='text'){
    return (await fetch(url,{
        method:"POST",
        body:JSON.stringify(data)
    }))[format]()
}

function makeTokens(n=1,m=16,str='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
  return [...Array(n)].map(_=>[...Array(m)]
  .map(_=>str[Math.floor(Math.random()*62)]).join(''))
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

export {get,post,makeTokens,getParms}