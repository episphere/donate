
(async function(){ // loading ES6 module for script tag
    donation = await import('./methods.js')    
})()


console.log("donation.js loaded")