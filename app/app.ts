import {Promise} from "es6-promise";
import mongoose = require("mongoose");
import TeamSpeakClient = require("node-teamspeak");
import _ = require("underscore");

import * as Database from 'fankserver-database-schema';
Database.init();

import {Config} from "./config/config";

let config = new Config();

class UnkownError extends Error {
	constructor() {
		super();
		this.name = "UnkownError";
	}
}
class UserNotExistsError extends Error {
	constructor() {
		super();
		this.name = "UserNotExistsError";
	}
}
class UserExistsError extends Error {
	constructor() {
		super();
		this.name = "UserExistsError";
	}
}
class LinkExistsError extends Error {
	constructor() {
		super();
		this.name = "LinkExistsError";
	}
}
class LinkNotExistsError extends Error {
	constructor() {
		super();
		this.name = "LinkNotExistsError";
	}
}
class LinkFailedError extends Error {
	constructor() {
		super();
		this.name = "LinkFailedError";
	}
}

enum ServergroupMapping {
	TeamspeakAdmin = 6,
	TeamspeakMod = 22,
	TeamspeakSubTier1 = 36,
	TeamspeakSubTeamMulm = 37,

	GameEvE = 44,
	GameGuildWars = 45,
	GameCounterStrike = 39,
	GameLeagueOfLegends = 38,
	GameRainbow6 = 40,
	GameStarCitizen = 42,
	GameStarcraft = 41
}

class BackendConnector {
	private _mongooseConnection: mongoose.Connection;

	constructor(conf: any) {
		this._connectMongoose(conf.mongo.db);
	}

	getUserByAppLink(appAccountId: string): Promise<Database.IUserSchema> {
		return new Promise<Database.IAppLinkSchema>((resolve, reject) => {
			Database.AppLinkModel.findOne({
				"provider": "Teamspeak3",
				"account_id": appAccountId
			})
			.exec((err, appLink) => {
				if (appLink) {
					resolve(appLink);
				}
				else {
					reject(new LinkNotExistsError());
				}
			});
		})
		.then((appLink) => {
			return new Promise<Database.IUserSchema>((resolve, reject) => {
				Database.UserModel.findOne({
					"appLinks": appLink._id
				})
				.exec((err, user) => {
					if (user) {
						resolve(user);
					}
					else {
						reject(new UserNotExistsError());
					}
				});
			});
		});
	}

	linkAppToUser(userDocument: Database.IUserSchema, appAccountId: string): Promise<Database.IAppLinkSchema> {
		return new Promise<Database.IAppLinkSchema>((resolve, reject) => {
			Database.AppLinkModel
				.findOne({
					"provider": "Teamspeak3",
					"account_id": appAccountId
				})
				.exec((err, appLink) => {
					if (appLink) {
						this._mongooseConnection.model<Database.IUserSchema>("User")
							.findOne({
								"appLinks": appLink._id
							})
							.exec((err, user) => {
								if (!err && !user) {
									userDocument.update({$push: {"appLinks": appLink._id}}, (err) => {
										if (err) {
											reject(new LinkFailedError());
										}
										else {
											resolve(appLink);
										}
									});
								}
								else if (!err && user) {
									reject(new LinkExistsError());
								}
								else {
									reject(new UnkownError());
								}
							});
					}
					else {
						let appLink = new Database.AppLinkModel({
							"provider": "Teamspeak3",
							"account_id": appAccountId
						});
						appLink.save((err, appLinkDocument) => {
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
								userDocument.update({$push: {"appLinks": appLink._id}}, (err) => {
									if (err) {
										reject(new LinkFailedError());
									}
									else {
										resolve(appLinkDocument);
									}
								});
							}
						});
					}
				});
		});
	}

	registerUser(username: string, email: string, password: string, appAccountId: string): Promise<Database.IUserSchema> {
		return new Promise<Database.IUserSchema>((resolve, reject) => {
			let user = new Database.UserModel({
				username: username,
				password: password,
				email: email
			});
			user.save((err, userDocument) => {
				if (err) {
					// Duplicate entry
					if (err.code === 11000) {
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

	loginUser(username: string, password: string, appAccountId: string): Promise<Database.IUserSchema> {
		return new Promise<Database.IUserSchema>((resolve, reject) => {
			this._mongooseConnection.model<Database.IUserSchema>("User").findOne({ username: username }, (err, userDocument) => {
				if (userDocument) {
					resolve(userDocument);
				}
				else {
					reject(new UserNotExistsError());
				}
			});
		})
		.then((userDocument) => {
			return new Promise<Database.IUserSchema>((resolve, reject) => {
				userDocument.validatePassword(password, (valid: boolean) => {
					if (valid) {
						resolve(userDocument);
					}
					else {
						reject(new LinkNotExistsError());
					}
				});
			});
		})
		.then((userDocument) => {
			return new Promise<Database.IUserSchema>((resolve, reject) => {
				this.linkAppToUser(userDocument, appAccountId).then((appLink) => {
					resolve(userDocument);
				}).catch((err) => {
					reject(err);
				});
			});
		});
	}

	private _connectMongoose(dns: string) {
		this._mongooseConnection = mongoose.createConnection(dns);
		this._mongooseConnection.on("error", (err) => {
			console.error(err);
		});
	}
}

let backendConnector = new BackendConnector(config.config);

let clientDB = {};
let servergroups = [];
let teamspeakClient = new TeamSpeakClient(config.config.teamspeak.host);
teamspeakClient.on("error", (err) => {
	console.error(err);
	process.exit(1);
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
			teamspeakClient.send("servergrouplist", (err, response, rawResponse) => {
				servergroups = response;
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
		clientDB[eventResponse.clid] = eventResponse;

		backendConnector.getUserByAppLink(eventResponse.client_unique_identifier).then((user) => {
			//teamspeakClient.send("sendtextmessage", {targetmode: 1, target: eventResponse.clid, msg: "Willkommen " + user.get("username")});
			teamspeakClient.send("servergroupsbyclientid", {cldbid: eventResponse.client_database_id}, (err, response) => {
				if (!err) {
					if (!Array.isArray(response)) {
						response = [response];
					}

					let currentServergroups = response.map(servergroup => servergroup.sgid);
					let userServergroups = [config.config.teamspeak.registeredgrpid];
					let formatedTags = {};
					Object.keys(Database.UserTags).forEach((tag) => {
						formatedTags[Database.UserTags[tag]] = tag;
					});

					user.tags.forEach((tag) => {
						if (ServergroupMapping[formatedTags[<any>tag]]) {
							userServergroups.push(ServergroupMapping[formatedTags[<any>tag]]);
						}
					});

					// Remove servergroups
					_
						.difference(currentServergroups, userServergroups)
						.filter(v => v > 5) // Ignore queries & templates
						.filter(v => servergroups.filter(servergroup => servergroup.sgid === v)[0].name.charAt(0) !== "-")
						.forEach((servergroupId) => {
							teamspeakClient.send("servergroupdelclient", {sgid: servergroupId, cldbid: eventResponse.client_database_id});
						});

					// Add servergroups
					_
						.difference(userServergroups, currentServergroups)
						.filter(v => v > 5) // Ignore queries & templates
						.forEach((servergroupId) => {
							teamspeakClient.send("servergroupaddclient", {sgid: servergroupId, cldbid: eventResponse.client_database_id});
						});
				}
				else {
					console.error(err);
				}
			});
		}).catch(() => {
			teamspeakClient.send("sendtextmessage", {targetmode: 1, target: eventResponse.clid, msg: `
Hallo ${eventResponse.client_nickname}!

Aufgrund einiger Änderungen unseres Teamspeaks müssen die Rechte der User neu vergeben werden.

Zunächst würden wir dich zu reinen Identifikationszwecken bitten, Folgendes in den Teamspeak-Chat des Butlers einzugeben:
[b].register Benutzername Email Passwort[/b]

Sobald du dies getan hast, wird dir ein Administrator deine alten Rechte zurückgeben bzw. neue Rechte zuteilen, falls du ein Neuling bist.
Solltest du dich mit anderen Endgeräten auf dem Teamspeak einloggen wollen, wird deine ID durch deinen Benutzernamen und das Passwort identifiziert, wenn du Folgendes eingibst:
[b].login Benutzername Passwort[/b]

Deine Daten werden verschlüsselt und vertraulich behandelt! Die eMail wird nur zum Zurücksetzen des Passworts benötigt.`});
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

let registerRegex = /^\s*\.register\s+(\S+)\s+(\S+)\s+(\S+)\s*$/i;
let loginRegex = /^\s*\.login\s+(\S+)\s+(\S+)\s*$/i;
teamspeakClient.on("textmessage", (response) => {
	if (response.invokeruid !== config.config.teamspeak.nickname) {
		// Register
		let match = registerRegex.exec(response.msg);
		if (match) {
			// remove BBCode from email
			match[2] = match[2].replace(/^\[URL=mailto:[^\]]+\]([^\[]+)\[\/URL\]$/, (match, p1) => { return p1; });

			if (!Database.UserValidator.username(match[1])) {
				teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Benutzername muss 4 oder mehr Zeichen (A-Z, 0-9, -, _) beinhanten"});
			}
			else if (!Database.UserValidator.email(match[2])) {
				teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "EMail ist nicht gültig"});
			}
			else if (!Database.UserValidator.password(match[3])) {
				teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Passwort muss 6 oder mehr Zeichen beinhanten"});
			}
			else {
				backendConnector.registerUser(match[1], match[2], match[3], clientDB[response.invokerid].client_unique_identifier).then((userDocument) => {
					teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Registrierung erfolgreich, du wurdest automatisch eingeloggt"});
					teamspeakClient.send("servergroupaddclient", {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id});
				}).catch((registerErr) => {
					teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: registerErr.name});
				});
			}
		}

		// Login
		match = loginRegex.exec(response.msg);
		if (match) {
			if (!Database.UserValidator.username(match[1])) {
				teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Benutzername muss 4 oder mehr Zeichen (A-Z, 0-9, -, _) beinhanten"});
			}
			else if (!Database.UserValidator.password(match[2])) {
				teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Passwort muss 6 oder mehr Zeichen beinhanten"});
			}
			else {
				backendConnector.loginUser(match[1], match[2], clientDB[response.invokerid].client_unique_identifier).then((userDocument) => {
					teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: "Login erfolgreich"});
					teamspeakClient.send("servergroupaddclient", {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id});
				}).catch((loginErr) => {
					teamspeakClient.send("sendtextmessage", {targetmode: 1, target: response.invokerid, msg: loginErr.name});
				});
			}
		}
	}
});
