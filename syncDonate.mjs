// synchronizing questionnaire responses to epiDonate
//
// 1) load library: s = await import('episphere.github.io/donate/syncDonate.mjs')
//
// 2) oldData = await s.sync( newData , token , deploymentUrl )
//
// at anytime, you can get current data as 
// 3) currentData = await s.dona.get( token , deploymentUrl )
// note 3 is not completely necessary - synching anything in will return the last value

console.log(`syncDonate.mjs imported\n ${Date()}`);

let dona = await import('https://episphere.github.io/donate/methods.js')

function getToken(){ // extract parameters from search or hash
    let donateToken=null
    if(location.href.match(/donateToken=[^&#]+/)){
        donateToken=(location.search+location.hash).match(/donateToken=[^&#]+/)[0].split('=')[1]
        //remove token from hash if that is where it is (that would be ideal):
        location.hash=location.hash.replace(/[#&]donateToken=[^&#]+/,'')
    }
    return donateToken
}

function getUrl(){ // get deployment url
    let donateUrl=null
    if(location.href.match(/donateUrl=[^&#]+/)){
        donateUrl=(location.search+location.hash).match(/donateUrl=[^&#]+/)[0].split('=')[1]
        //remove url from hash if that is where it is (that would be ideal):
        location.hash=location.hash.replace(/[#&]donateUrl=[^&#]+/,'')
    }
    return donateUrl
}

let token = await getToken() // sync token
let url = await getUrl() // deployment url

// test tokens at test deployment: https://replit.com/@jonasalmeida/donate#data/tokens.txt
async function sync(dt,token0,url0="https://donate.jonasalmeida.repl.co"){ // synch data to donate backend
    token = token || token0
    url = url || url0
    dona.setUrl(url) // set deployment
    //console.log('deployment:',dona)
    let old = JSON.parse(await dona.get(token))
    let res = null
    if(dt){
        await dona.post(token,dt)   
    }
    return old
}

export{
    dona,
    url,
    token,
    sync  // only this one is needed, other methods are for debugging
}