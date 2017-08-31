var MailListener = require("mail-listener2"); //email API
var fs = require("fs");
var mailCreds = JSON.parse(fs.readFileSync("./res/cfg/privatemail.json")); //read and parse the email login details
var mailListener = new MailListener({
	username: mailCreds.username,
	password: mailCreds.password, //log in
	host: mailCreds.host,
	port: 993,
	tls: true,
	mailbox: "INBOX",
	markSeen: true
});
 
mailListener.start(); //start listening 

 mailListener.on("server:connected", function() {
	console.log("Connected to email.");
});
mailListener.on("server:disconnected", function() {
	console.log("Disconnected from email!");
	mailListener.start(); //reconnect
});