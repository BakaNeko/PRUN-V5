var colors = require("colors"); //awsome console

function errPrint(text) {
	console.log("\n--------------------");
	console.log(colors.red("ERROR: ") + text);
	console.log("--------------------\n");
}
function wrnPrint(text) {
	console.log(colors.yellow("WARNING: ") + text);
}

var configPath = "./res/cfg/";

var mysql = require('mysql'); //MySQL API
var fs = require("fs"); //file reader
var mysqlCreds = JSON.parse(fs.readFileSync(configPath + "mysql.json")); //read and parse the MySQL login details
var con = mysql.createConnection({
	host: mysqlCreds.host,
	user: mysqlCreds.user,
	password: mysqlCreds.password, //log in
	database: mysqlCreds.database //USE command
});
con.connect(function(err) {
	if(err) { //if an error occured
		errPrint("Could not connect to MySQL!");
		throw err;
	}
});

function querySQL(cmd, data) {
	var dataPromise = new Promise(function(resolve, reject) {
		con.query(cmd, data, function(err, result) {
			if(err) throw err;
			resolve(result);
		});
	});
	return dataPromise;
} //end querySQL()

var MailListener = require("mail-listener2"); //email API
var mailCreds = JSON.parse(fs.readFileSync(configPath + "mail.json")); //read and parse the email login details
var mailListener = new MailListener({
	username: mailCreds.username,
	password: mailCreds.password, //log in
	host: mailCreds.host,
	port: 993,
	tls: true,
	mailbox: "INBOX",
	markSeen: false
});
 
mailListener.start(); //start listening 

 mailListener.on("server:connected", function() {
	console.log("Connected to email.");
});
mailListener.on("server:disconnected", function() {
	console.log("Disconnected from email!");
	mailListener.start(); //reconnect
});
mailListener.on("mail", function(mail, seqno, attributes) {
	var from = []; //for passing data into MySQL
	from[0] = mail.from[0].address; //isolate the email address
	switch(mail.headers.subject.toLowerCase().trim()) {
		case "subscribe": //user wants to be added
			var cmd = "SELECT * FROM v5 WHERE email = ?;"; //look for that user...
			querySQL(cmd, from).then(function(fromResolve) {
				if(!fromResolve[0]) { //and if there were no results...
					cmd = "INSERT INTO v5 (email) VALUES (?);"; //...add them
					querySQL(cmd, from).then(function() {
						console.log("Added " + from[0]);
					}).catch(function(fromReject) { //catch for INSERT
						console.log("Could not add user " + from[0] + ":\n" + fromReject);
					});
				} //end if(!fromResolve[0])
				else { //if there was a result in the email lookup
					console.log(from[0] + " already exists!");
				}
			}).catch(function(fromReject) { //catch for SELECT
				console.log(fromReject);
			});

			mailListener.imap.addFlags(attributes.uid, "\\Seen");
		break; //end case "subscribe"
		case "unsubscribe":
			var cmd = "DELETE FROM v5 WHERE email = ?;";
			querySQL(cmd, from);
			console.log("Removed " + from[0]);
			mailListener.imap.addFlags(attributes.uid, "\\Seen");
		break; //end case "usubscribe"
		default:
		break;
	} //end switch(mail subject)
}); //end mailListener.on("mail")

var http = require("http");
var port = 80;
var forbiddenFiles = [configPath + "mysqlConfig.json", configPath + "mailConfig.json"];
var landingPage = "./index.html"; //the page you get when you request "/"


http.createServer(function(request, response) { //on every request to the server:
	var filePath = "." + request.url;
	if(filePath == "./") filePath = landingPage; //there isn't actually a file as the directory.
	//so we need to redirect the filepath to the actual landing page.

	if(forbiddenFiles.join().includes(filePath)) {
		serveError(403, "403, file forbidden.", request, response);
	}
	try {
		var content = fs.readFileSync(filePath); //check if the file exists and read it!
		//no error yet? That means the file was found.
		var type = filePath.split(".")[filePath.split(".").length - 1];
		switch(type) {
			//images:
			case "png":
				response.writeHead(200, {"Content-Type": "image/png"});
			break;
			case "jpg":
			case "jpeg":
				response.writeHead(200, {"Content-Type": "image/jpg"});
			break;
			case "ico":
				response.writeHead(200, {"Content-Type": "image/x-icon"});
			break;

			//scripts or programs
			case "js":
				response.writeHead(200, {"Content-Type": "application/javascript"});
			break;

			//serve as text/format
			default:
				response.writeHead(200, {"Content-Type": "text/" + type});
			break;
		} //end switch(type)
		response.end(content); //serve the requseted file
	} //end try
	catch(error) {
		if(error.code == "ENOENT") { //the file wasn't found
			serveError(404, "404, file not found", request, response);
			wrnPrint("Could not find file " + filePath);
		}
		else {
			serveError(500, "500: " + error.toString().replace("Error: ", ""), request, response);
		}
	} //end catch
}).listen(port); //end http.createServer()

function serveError(code, text, request, response) { //internal server error
	try {
		var content = fs.readFileSync("./error.html").toString().replace("ERRBODY", text);
		response.writeHead(code, {"Content-Type": "text/html"});
		response.end(content);
	}
	catch(error2) { //if another error was thrown
		var msg = "A severe error occured.\n" + error2 + "\n\nCaused by " + request.url + "\n\n" + text;
		errPrint(msg);
		response.writeHead(500, {"Content-Type": "text/plain"});
		response.end(msg);
	}
} //end serveError()

function parseCookies(cookies) {
	cookies = {
		email: cookies.split("=")[1].split(";")[0],
		pw: cookies.split("=")[2]
	}
	return cookies;
} //end parseCookies()

function serveText(text, response) {
	try {
		response.writeHead(200, {"Content-Type": "text/plain"});
		response.end(text);
	}
	catch(err) { //if an error was thrown
		errPrint("in serving plaintext: " + err);
		response.writeHead(500, {"Content-Type": "text/plain"});
		response.end("Error: " + err);
	}
} //end serveText()