const ext_link = "";
const CHIMES	= new Audio(ext_link+"audio/CHIMES.WAV");
const CHORD		= new Audio(ext_link+"audio/CHORD.WAV");
const CLICK		= new Audio(ext_link+"audio/CLICK.WAV");
const DING		= new Audio(ext_link+"audio/DING.WAV");
const LOGON		= new Audio(ext_link+"audio/LOGON.WAV");
const NOTIFY	= new Audio(ext_link+"audio/NOTIFY.WAV");
const RECYCLE	= new Audio(ext_link+"audio/RECYCLE.WAV");
const SWIPE		= new Audio(ext_link+"audio/SWIPE.WAV");
const TADA		= new Audio(ext_link+"audio/TADA.WAV");

const STOP = 'STOP';
const PLAY = 'PLAY';
const PAUSE = 'PAUSE';
const STATES = {
	STOP:{url:ext_link+"images/stop.png",color:'#000'},
	PLAY:{url:ext_link+"images/play.png",color:'#F00'},
	PAUSE:{url:ext_link+"images/pause.png",color:'#00F'}
}

var LASTTASK = {};
var CURRTASK = {};

function reset_task(task){
	task.id=-1;
	task.name='';
	task.tags='';
	task.time_started=-1;
	task.time_ended=-1;
	task.time_frames={};
	//----
	task.frame_started=-1;
	task.time_to_add=0;		//only in current task
}

function copy_object(obj){
	return JSON.parse(JSON.stringify(obj));
}

reset_task(CURRTASK);

var timer_sql = openDatabase("tasks", "1.0", "Tasks db", 1024 * 1024 * 1024);

function log(tr,res){
	try {
		console.log(res.rows.item(0))
	}
	catch(err) {
		console.log(res);
	}
}

function get_unix_time(){
	var d = new Date;
	return d.getTime();
}

function get_time(stamp,days,hours,minutes,seconds){
	//var d = Math.abs(date_future - date_now) / 1000;                         // delta
	var d = stamp / 1000;
	var r = {};                                                                // result
	var s = {                                                                  // structure
		//year: 31536000,
		//month: 2592000,
		//week: 604800, // uncomment row to ignore
		day: 86400,   // feel free to add your own row
		hour: 3600,
		minute: 60,
		second: 1
	};

	Object.keys(s).forEach(function(key){
		r[key] = Math.floor(d / s[key]);
		d -= r[key] * s[key];
		//if((key=='minute' || key=='second') && r[key]<10) r[key] = "0"+r[key];
	});
	time_string = "";
	if(r.day>0){
		time_string+=r.day+"d:";
	}
	if(!(r.day==0 && r.hour==0)){
		time_string+=r.hour+"h:";
	}
	time_string+=r.minute+'m:'+r.second+'s';
	return time_string;
}





function change_icon(STATE){
	message('change_favicon',STATES[STATE].url);
	chrome.browserAction.setIcon({path:STATES[STATE].url});
	chrome.browserAction.setBadgeBackgroundColor({color:STATES[STATE].color});
}
function change_text(txt){
	message('change_page_title',txt);
	message('change_task_display',txt);
	txt = txt.replace(/^0h\:/,'').replace(/^0m\:/,'').replace('h','').replace('m','').replace('s','');
	//need 01 here
	//and flashing :
	chrome.browserAction.setBadgeText({text:txt});
}

function init_task_details(){
	if(CURRTASK.id>-1){
		message('change_task_details',CURRTASK);
		
	} else if (LASTTASK.id>-1){
		message('change_task_details',LASTTASK);
	}
}

function fill_curr_task_details(){
	message('change_task_details',CURRTASK);
}
function fill_last_task_details(){
	message('change_task_details',LASTTASK);
}

function timer_refresh_loop(){
	if(CURRTASK.id >0){
		if(CURRTASK.frame_started>0){
			display_time_string = get_time((get_unix_time() - CURRTASK.frame_started) + CURRTASK.time_to_add);
		} else {
			display_time_string = get_time(CURRTASK.time_to_add);
		}
		change_text(display_time_string);
		if(CURRTASK.frame_started>0){
			setTimeout(timer_refresh_loop,1000);
		}
	}
}
function task_change(task){
	CURRTASK.name = task.name;
	CURRTASK.tags = task.tags;
	//CURRTASK.id = task.id;
	fill_curr_task_details();
	if(task.id>-1){
		timer_sql.transaction(function(tr) {
			tr.executeSql("UPDATE tasks SET name=?, tags=? WHERE id=?", [task.name,task.tags,CURRTASK.id], function(tr,res){
				
			}, log);
		});
	}
}

function task_play(task){
	CLICK.play();
	//if stopped state - create a new task
	if(CURRTASK.id ==-1){
		CURRTASK = copy_object(task);
		var time_started = get_unix_time();
		var time_frames = {};
		CURRTASK.time_frames = {};
		time_frames[time_started] = -1;
		timer_sql.transaction(function(tr) {
			tr.executeSql("INSERT INTO tasks (time_started, time_ended, time_frames, name, tags, state) VALUES (?, ?, ?, ?, ?, 1)", [time_started,-1,JSON.stringify(time_frames),task.name,task.tags], function(tr,res){
				//console.log(res);
				CURRTASK.id = res.insertId;
				CURRTASK.frame_started = time_started;
				CURRTASK.time_to_add = 0;
				fill_curr_task_details();
				timer_refresh_loop();
			}, log);
		});
		change_icon(PLAY);
		//get all the data from form and issue a transaction then change icon and ipdate display
	} else {//if there is a current id (not -1)
		if(CURRTASK.frame_started == -1){ //(paused state) we create new chunk, write it to db
			//issue transaction, get chunks from db, add new unfinished chunk, write to db, change icon and update display
			var time_started = get_unix_time();
			CURRTASK.time_frames[time_started] = -1;
			CURRTASK.frame_started = time_started;
			CURRTASK.time_to_add = 0;
			for(var frame_start in CURRTASK.time_frames){
				var frame_end = CURRTASK.time_frames[frame_start];
				if(frame_end>0) CURRTASK.time_to_add+=frame_end - frame_start;
			}
			
			timer_sql.transaction(function(tr) {
				tr.executeSql("UPDATE tasks SET time_frames=?, name=?, tags=?, state=1 WHERE id=?", [JSON.stringify(CURRTASK.time_frames),task.name,task.tags,CURRTASK.id], function(tr,res){
					//
				}, log);
			});
			change_icon(PLAY);
			fill_curr_task_details();
			timer_refresh_loop();
		} else { //playing state, nothing to do
			change_icon(PLAY);
			fill_curr_task_details();
		}
	
	}		
}
function task_pause(task){
	CLICK.play();
	if(CURRTASK.id >0 && CURRTASK.frame_started >0){
		CURRTASK.time_frames[CURRTASK.frame_started] = get_unix_time();
		CURRTASK.time_to_add+= CURRTASK.time_frames[CURRTASK.frame_started] - CURRTASK.frame_started;
		CURRTASK.frame_started = -1;
		
		
		//if we actually run some task, finish chunk and write to db
		change_icon(PAUSE);
		fill_curr_task_details();
		timer_sql.transaction(function(tr) {
			tr.executeSql("UPDATE tasks SET time_frames=?, name=?, tags=?, state=2 WHERE id=?", [JSON.stringify(CURRTASK.time_frames),task.name,task.tags,CURRTASK.id], function(tr,res){
				
			}, log);
		});	
	}
}
function task_stop(task){
	CLICK.play();
	if(CURRTASK.id !=-1){
		//if we actually run some task, or have it paused - optionally finish chunk and finish task and write to db
		var time_ended = get_unix_time();
		if(CURRTASK.frame_started > 0){
			//running state, finish chunk
			CURRTASK.time_frames[CURRTASK.frame_started] = time_ended;
		} else {
			//paused state, we just need to update one field
		}
		//write this shit to db
		timer_sql.transaction(function(tr) {
			tr.executeSql("UPDATE tasks SET time_ended=?, time_frames=?, name=?, tags=?, state=0 WHERE id=?", [time_ended,JSON.stringify(CURRTASK.time_frames),task.name,task.tags,CURRTASK.id], function(tr,res){
				LASTTASK = copy_object(CURRTASK);
				reset_task(CURRTASK);
			}, log);
		});
		change_icon(STOP);
		NOTIFY.play();
	}
}

function sum_finished_chunks(task){
	task.time_to_add = 0;
	task.frame_started = -1; //latest unfinished chunk if any or -1
	for(var frame_start in task.time_frames){
		var frame_end = task.time_frames[frame_start];
		if(frame_end>0){
			task.time_to_add+=frame_end - frame_start;
		} else {
			task.frame_started = frame_start;
		}
	}
	return task;
}

function fetch_timesheet(params,callback){
	CLICK.play();
	timer_sql.transaction(function(tr) {
		tr.executeSql("SELECT * FROM tasks ORDER BY state DESC, id DESC", [], function(tr,res){
			CLICK.play();
			var timesheet = [];
			for(var t=0;t<res.rows.length;t++){
				var task = res.rows.item(t);
				timesheet[t] =  {
					id:task.id,
					time_started:task.time_started,
					time_ended:task.time_ended,
					time_frames:JSON.parse(task.time_frames),
					name:task.name,
					tags:task.tags,
					state:task.state
				}
				timesheet[t] = sum_finished_chunks(timesheet[t]);
				//timesheet[t] = res.rows.item(t);
				//timesheet[t].time_frames = JSON.parse(timesheet[t].time_frames);
			}
			
			callback(timesheet);
		});
	});
}
//0 - stopped
//1 - running
//2 - paused
window.onload = function(){
	timer_sql.transaction(function(tr) {
		tr.executeSql("CREATE TABLE IF NOT EXISTS tasks	(id INTEGER PRIMARY KEY, time_started INTEGER, time_ended INTEGER, time_frames TEXT, name TEXT, tags TEXT, state INTEGER)", [], nothing, log);	
		tr.executeSql("SELECT * FROM tasks WHERE ROWID IN ( SELECT max( ROWID ) FROM tasks );", [], function(tr,res){
			if(res.rows.length >0){ //if we have any items at all in db
				LASTTASK = res.rows.item(0);
				//console.log(LASTTASK);
				LASTTASK.time_frames = JSON.parse(LASTTASK.time_frames);
				if(LASTTASK.time_ended > 0){
					//null, undefined, -1 or 0 can't be >0
					//latest task is closed
					change_icon(STOP);
				} else {
				//if task is open
					CURRTASK = sum_finished_chunks(copy_object(LASTTASK));
					if(CURRTASK.frame_started >0){
						change_icon(PLAY);
					} else {
						change_icon(PAUSE);
					}
					timer_refresh_loop();
				}
				//wouldn't fire but hey
				message('change_task_details',LASTTASK);
			}
		}, log);
		
	});


}