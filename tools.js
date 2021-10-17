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

function makeTokens(n){
  return [...Array(n)].
  map(_=>Math.random().toString().slice(2))
}

export {get,post,makeTokens}