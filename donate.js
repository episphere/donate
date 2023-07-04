// copying donation.js to donate.js here, 
// to address https://github.com/episphere/donate/issues/3

(async function(){ // loading ES6 module for script tag
    dona = await import('https://episphere.github.io/donate/methods.js')    
})()

console.log("dona imported by donate.js from https://github.com/episphere/donate/blob/main/methods.js")
