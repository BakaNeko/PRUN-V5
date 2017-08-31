var mysql = require('mysql'); //MySQL API
var fs = require("fs"); //file reader
var mysqlCreds = JSON.parse(fs.readFileSync("./res/cfg/mysql.json")); //read and parse the MySQL login details
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
var mailCreds = JSON.parse(fs.readFileSync("./res/cfg/mail.json")); //read and parse the email login details
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