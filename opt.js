function get_task_object(){
	var task  = {};
	task.name = $('#task_name').val();
	task.tags = $('#task_tags').val();
	task.id   = $('#task_id').val();
	return task;
}
function change_task_display(txt){
	$('#task_display').val(txt);
}

function change_task_details(task){
	//adding descriptions from the last task just in case i need em
	$('#task_name').val(task.name);
	$('#task_tags').val(task.tags);
	$('#task_id').val(task.id);
}

function change_favicon(url){
	$('#favicon').attr("href",url);
}

function change_page_title(txt){
	$('head title').text(txt);
}

const app  = new Vue({
	el:"#excel",
	data:{
		timesheet:[]
	},
	filters: {
		localaze_date:function(timestamp){
			timestamp = parseInt(timestamp);
			if(timestamp==-1) timestamp = "-/-";
			else if(timestamp!=0) timestamp  = moment(timestamp);
			return timestamp;
		},
		total_time:function(timestamp){
			return moment(parseInt(timestamp)).format('H:mm:ss');
		},
		task_state:function(state){
			var str  =  '';
			switch(state){
				case 0: str = 'finished';break;
				case 1: str = 'running';break;
				case 2: str = 'paused';break;
			}
			return str;
		}
	}
/*	created(){
		message('fetch_timesheet',{},function(timesheet){
			this.timesheet = timesheet;
		});
	}*/
});



window.onload = function(){
	message('fetch_timesheet',{},function(timesheet){
		app.timesheet = timesheet;
	});
	message('init_task_details');
	$('body').on('input','#task_name,#task_tags',function(event){
		message('task_change',get_task_object());
	});
	
	$('body').on('click','#task_start',function(event){
		message('task_play',get_task_object());
	});

	$('body').on('click','#task_stop',function(event){
		message('task_stop',get_task_object());
	});
	$('body').on('click','#task_pause',function(event){
		message('task_pause',get_task_object());
	});
}