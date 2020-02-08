function nothing(){
	//nothing!
}
//just execute whatever part of the extension told you to execute
chrome.runtime.onMessage.addListener(
	function(request, sender, callback) {
		if(typeof this[request.action] === 'function'){
			this[request.action](request.params,callback);
		} else {
			callback(); //needed for buggy chrome to shut up
		}
		return true; //to return async
	}
);
function message(action,params,callback){
	if(typeof callback !== 'function'){
		callback = nothing;
	}
	if(typeof params === 'undefined'){
		params = {};
	}
	chrome.runtime.sendMessage({action:action,params:params},function(response){
		if (chrome.runtime.lastError) { //needed for chrome to shut up
			console.log('establishing extension connections');
		} else {
			callback(response);
		}
	});
}