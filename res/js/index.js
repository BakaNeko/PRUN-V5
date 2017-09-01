var updateText;
var lastCheckTime = 0;

window.onLoad = jQuery.get("/update.txt", function(data, status) { //init
	updateText = data;
	assignSplit();

	var img = document.getElementById("background");
	var width = img.clientWidth;
	var height = img.clientHeight + (img.clientHeight / 4);
	var offset = (Math.random() * (height - (height / 2))) - (height / 2);
	img.style.bottom = offset + "px";

	setInterval(function() {
		if (lastCheckTime == 60){ //reset the check loop
			updateInfo(); //refresh
			lastCheckTime = 0;
		}
		lastCheckTime ++;
	}, 1000);
});

function updateInfo() {
	jQuery.get("./update.txt", function(data, status) {
		if(data == updateText) {} //no update
		else { //yes update
			assignSplit();
			notify(updateText.split("\n")[2]);
		}
		updateText = data;
	});
}

function assignSplit() {
	document.getElementById("time").innerHTML = "Update time: " + updateText.split("\n")[0];
	document.getElementById("title").innerHTML = "Update title : " + updateText.split("\n")[1];
	document.getElementById("background").src = updateText.split("\n")[2];
}

function notify(image) {
	if (!Notification) {
		alert("Prague Race updated!");
		return;
	}

	if (Notification.permission !== "granted"){ //if you didn't get permission
		Notification.requestPermission();
	}
	else { //if you did though
		var notification = new Notification("Prague Race updated!", {
			icon: image,
			body: "PRUN just noticed an update to Prague Race, you should go check it out!",
		});

		notification.onclick = function() {
			window.open("http://www.praguerace.com/");
			notification.close();      
		};

		setTimeout(function() {
			notification.close();
		}, 60000);
	}
}