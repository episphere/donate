
(async function(){ // loading ES6 module for script tag
    donation = await import('./tools.js')    
})()


console.log("donation.js loaded")