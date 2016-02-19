import {Promise} from "es6-promise";
import mongoose = require("mongoose");
import TeamSpeakClient = require("node-teamspeak");
import splitargs = require("splitargs");

require("./model/applink");
require("./model/user");

import {Config} from "./config/config";
import {IAppLinkSchema} from "./model/applink";
import {IUserSchema} from "./model/user";

var config = new Config();
config.loadConfig();

class UnkownError extends Error {
	constructor() {
		this.name = "UnkownError";
		super();
	}
}
class UserNotExistsError extends Error {
	constructor() {
		this.name = "UserNotExistsError";
		super();
	}
}
class UserExistsError extends Error {
	constructor() {
		this.name = "UserExistsError";
		super();
	}
}
class LinkExistsError extends Error {
	constructor() {
		this.name = "LinkExistsError";
		super();
	}
}
class LinkFailedError extends Error {
	constructor() {
		this.name = "LinkFailedError";
		super();
	}
}

class BackendConnector {
	private _mongooseConnection: mongoose.Connection;

	constructor(config: any) {
		this._connectMongoose(config.mongo.db);
	}

	private _connectMongoose(dns: string) {
		this._mongooseConnection = mongoose.createConnection(dns);
		this._mongooseConnection.on("error", (err) => {
			console.error(err);
		});
	}

	getUserByAppLink(appAccountId: string): Promise<IUserSchema> {
		return new Promise<any>((resolve, reject) => {
			this._mongooseConnection.model<IAppLinkSchema>("AppLink")
				.findOne({
					"provider": "Teamspeak3",
					"account_id": appAccountId
				})
				.exec((err, appLink) => {
					if (appLink) {
						this._mongooseConnection.model<IUserSchema>("User")
							.findOne({
								"appLinks": appLink._id
							})
							.exec((err, user) => {
								if (user) {
									resolve(user);
								}
								else {
									reject();
								}
							});
					}
					else {
						reject();
					}
				});
			});
	}

	linkAppToUser(userDocument: IUserSchema, appAccountId: string): Promise<IAppLinkSchema> {
		return new Promise<IAppLinkSchema>((resolve, reject) => {
			let AppLink = this._mongooseConnection.model<IAppLinkSchema>("AppLink");

			var appLink = new AppLink({
				"provider": "Teamspeak3",
				"account_id": appAccountId
			});
			appLink.save<IAppLinkSchema>((err, appLinkDocument) => {
				if (err) {
					// Duplicate entry
					if (err.code === 11000) {
						reject(new LinkExistsError());
					}
					// unkown
					else {
						reject(new UnkownError());
					}
				}
				else {
					(<any>userDocument).update({$push: {"appLinks": appLink._id}}, (err) => {
						if (err) {
							reject(new LinkFailedError());
						}
						else {
							resolve(appLinkDocument);
						}
					});
				}
			});
		});
	}

	registerUser(username: string, email: string, password: string, appAccountId: string): Promise<IUserSchema> {
		return new Promise<IUserSchema>((resolve, reject) => {
			let User = this._mongooseConnection.model<IUserSchema>("User");

			var user = new User({
				username: username,
				password: password,
				email: email
			});
			user.save<IUserSchema>((err, userDocument) => {
				if (err) {
					// Duplicate entry
					if (err.code == 11000) {
						reject(new UserExistsError());
					}
					// unkown
					else {
						reject(new UnkownError());
					}
				}
				else {
					this.linkAppToUser(userDocument, appAccountId).then((appLink) => {
						resolve(userDocument);
					}).catch((err) => {
						// Remove user account if app link failed
						userDocument.remove(() => {
							reject(err);
						});
					});
				}
			});
		});
	}

	loginUser(username: string, password: string, appAccountId: string): Promise<IUserSchema> {
		return new Promise<IUserSchema>((resolve, reject) => {
			this._mongooseConnection.model<IUserSchema>("User")
				.findOne({ username: username }, (err, userDocument) => {
					if (userDocument) {
						userDocument.validatePassword(password, (valid: boolean) => {
							this.linkAppToUser(userDocument, appAccountId).then((appLink) => {
								resolve(userDocument);
							}).catch((err) => {
								reject(err);
							});
						});
					}
					else {
						reject(new UserNotExistsError());
					}
				});
		});
	}
}

var backendConnector = new BackendConnector(config.config);

var clientDB = {};
var teamspeakClient = new TeamSpeakClient(config.config.teamspeak.host);
teamspeakClient.on("error", (err) => {
	console.log(err);
});
teamspeakClient.send("login", {client_login_name: config.config.teamspeak.user, client_login_password: config.config.teamspeak.password}, (err, response, rawResponse) => {
	console.log(err);
	teamspeakClient.send("use", {sid: 1}, (err, response, rawResponse) => {
		console.log(err);
		teamspeakClient.send("clientupdate", {client_nickname: config.config.teamspeak.nickname}, (err, response, rawResponse) => {
			console.log(err);
			teamspeakClient.send("servernotifyregister", {event: "server"}, (err, response, rawResponse) => {
				console.log(err);
			});
			teamspeakClient.send("servernotifyregister", {event: "textprivate"}, (err, response, rawResponse) => {
				console.log(err);
			});

			// Keep alive loop
			setInterval(() => {
				teamspeakClient.send("clientlist");
			}, 15000);
		});
	});
});

teamspeakClient.on("cliententerview", (eventResponse) => {
	// Ignore serveradmin
	if (eventResponse.client_database_id > 1) {
		console.log(eventResponse);
		clientDB[eventResponse.clid] = eventResponse;

		backendConnector.getUserByAppLink(eventResponse.client_unique_identifier).then((user) => {
			teamspeakClient.send("sendtextmessage", {targetmode: 1, target: eventResponse.clid, msg: "Willkommen " + user.get("username")});
			teamspeakClient.send("servergroupsbyclientid", {cldbid: eventResponse.client_database_id}, (err, response) => {
				if (!err) {
					if (!Array.isArray(response)) {
						response = [response];
					}

					let filteredResponse = response.filter((v) => {
						return v.sgid === config.config.teamspeak.registeredgrpid;
					});
					if (filteredResponse.length === 0)  {
						teamspeakClient.send("servergroupaddclient", {sgid: config.config.teamspeak.registeredgrpid, cldbid: eventResponse.client_database_id}, (err, response) => {
							console.log(err);
						});
					}
				}
			});
		}).catch(() => {
			teamspeakClient.send("sendtextmessage", {targetmode: 1, target: eventResponse.clid, msg: `
          Willkommen!

Du besitzt aktuell keine Rechte.

Zum Registrieren [b].register Benutzername Email Password[/b]
Zum Anmelden    [b].login Benutzername Password[/b]

[u]Die EMail adresse wird nur zum zurücksetzten des Passwords benötigt[/u]
	`}, (err) => {
				console.log(err);
			});
			teamspeakClient.send("servergroupsbyclientid", {cldbid: eventResponse.client_database_id}, (err, response) => {
				if (!err) {
					if (!Array.isArray(response)) {
						response = [response];
					}

					response.forEach((servergroup) => {
						teamspeakClient.send("servergroupdelclient", {sgid: servergroup.sgid, cldbid: servergroup.cldbid});
					});
				}
			});
		});
	}
});

teamspeakClient.on("clientleftview", (eventResponse) => {
	delete clientDB[eventResponse.clid];
});

teamspeakClient.on("textmessage", (response) => {
	if (response.invokeruid !== config.config.teamspeak.nickname) {
		if (response.msg.charAt(0) === ".") {
			let args = splitargs(response.msg.substr(1));

			switch (args[0] || "") {
				case "register":
					if (args.length === 4) {
						backendConnector.registerUser(args[1], args[2].replace(/^\[URL=mailto:[^\]]+\]([^\[]+)\[\/URL\]$/, (match, p1) => { return p1; }), args[3], clientDB[response.invokerid].client_unique_identifier).then((userDocument) => {
							teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Registrierung erfolgreich, du wurdest automatisch eingeloggt"});
							teamspeakClient.send("servergroupaddclient", {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id});
						}).catch((err) => {
							teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: err.name}, (err) => {
								console.log(err);
							});
						});
					}
					else {
						teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Parameter falsch\n.register Benutzername Email Password"}, (err) => {
							console.log(err);
						});
					}
					break;

				case "login":
					if (args.length === 3) {
						backendConnector.loginUser(args[1], args[2], clientDB[response.invokerid].client_unique_identifier).then((userDocument) => {
							teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Login erfolgreich"});
							teamspeakClient.send("servergroupaddclient", {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id});
						}).catch((err) => {
							teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: err.name}, (err) => {
								console.log(err);
							});
						});
					}
					else {
						teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Parameter falsch\n.login Benutzername Password"}, (err) => {
							console.log(err);
						});
					}
					break;

				default:
					teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Befehl nicht bekannt"}, (err) => {
						console.log(err);
					});
			}
		}
		else {
			// Trash talk
		}
	}
});
