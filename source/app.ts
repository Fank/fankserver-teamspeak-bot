import TeamSpeakClient = require('node-teamspeak');
import mongoose = require('mongoose');
import splitargs = require('splitargs');

require('./model/applink');
require('./model/user');

import {Config} from "./config/config";

var config = new Config();
config.loadConfig();

mongoose.connect(config.config.mongo.db);
mongoose.connection.on('error', (err) => {
	console.error(err);
});

var AppLink = mongoose.model('AppLink');
var User = mongoose.model('User');

function getUserByAppLink(account_id: string, callback: (user?: mongoose.Document) => void) {
	AppLink
		.findOne({
			'provider': 'Teamspeak3',
			'account_id': account_id
		})
		.exec((err, appLink) => {
			if (appLink) {
				User
					.findOne({
						'appLinks': appLink._id
					})
					.exec((err, user) => {
						if (user) {
							callback(user);
						}
						else {
							callback();
						}
					});
			}
			else {
				callback();
			}
		});
}

var clientDB = {};
var teamspeakClient = new TeamSpeakClient(config.config.teamspeak.host);
teamspeakClient.on('error', (err) => {
	console.log(err);
});
teamspeakClient.send('login', {client_login_name: config.config.teamspeak.user, client_login_password: config.config.teamspeak.password}, (err, response, rawResponse) => {
	console.log(err);
	teamspeakClient.send('use', {sid: 1}, (err, response, rawResponse) => {
		console.log(err);
		teamspeakClient.send('clientupdate', {client_nickname: config.config.teamspeak.nickname}, (err, response, rawResponse) => {
			console.log(err);
			teamspeakClient.send('servernotifyregister', {event: 'server'}, (err, response, rawResponse) => {
				console.log(err);
			});
			teamspeakClient.send('servernotifyregister', {event: 'textprivate'}, (err, response, rawResponse) => {
				console.log(err);
			});
		});
	});
});

teamspeakClient.on('cliententerview', (response) => {
	console.log(response);
	clientDB[response.clid] = response;

	getUserByAppLink(response.client_unique_identifier, (user) => {
		// client is registered
		if (user) {
			// say hello
			teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.clid, msg: 'Hallo ' + user.get('username')}, (err) => {
				console.log(err);
			});
			// check if client is a guest
			teamspeakClient.send('servergroupsbyclientid', {cldbid: response.client_database_id}, (err, response) => {
				if (!err) {
					if (!Array.isArray(response)) {
						response = [response];
					}

					response.forEach((servergroup) => {
						// client is guest, add to registered group
						if (servergroup.sgid === config.config.teamspeak.guestgrpid) {
							teamspeakClient.send('servergroupaddclient', {sgid: config.config.teamspeak.registeredgrpid, cldbid: response.client_database_id}, (err, response) => {
								console.log(err);
							});
						}
					});
				}
			});
		}
		else {
			teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.clid, msg: 'Hallo'}, (err) => {
				console.log(err);
			});
		}
	});
});

teamspeakClient.on('textmessage', (response) => {
	if (response.invokeruid !== config.config.teamspeak.nickname) {
		if (response.msg.charAt(0) === '.') {
			let args = splitargs(response.msg.substr(1));

			switch (args[0] || '') {
				case 'register':
					if (args.length === 4) {
						var user = new User({
							username: args[1],
							password: args[3],
							email: args[2]
						});

						user.save((err, asd: any) => {
							if (err) {
								console.log(err);
								if (err.code == 11000) {
									teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Benutzer existiert bereits'}, (err) => {
										console.log(err);
									});
								}
								else {
									teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Ein unbekannter Fehler ist aufgereten'}, (err) => {
										console.log(err);
									});
								}
							}
							else {
								if (!asd) {
									teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Registrierung fehlgeschlagen'}, (err) => {
										console.log(err);
									});
								}
								else {
									teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Registrierung erfolgreich'}, (err) => {
										var appLink = new AppLink({
											'provider': 'Teamspeak3',
											'account_id': clientDB[response.invokerid].client_unique_identifier
										});
										appLink.save((err) => {
											if (err) {
												if (err.code === 11000) {
													teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Verlinkung existiert bereits'}, (err) => {
														console.log(err);
													});
												}
												else {
													teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Ein unbekannter Fehler ist aufgereten'}, (err) => {
														console.log(err);
													});
												}
											}
											else {
												asd.update({$push: {'appLinks': appLink._id}}, (err) => {
													if (err) {
														teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Verlinkung speichern ist fehlgeschlagen'}, (err) => {
															console.log(err);
														});
													}
													else {
														teamspeakClient.send('servergroupaddclient', {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id}, (err, response) => {
															console.log(err);
														});
													}
												});
											}
										});
									});
								}
							}
						});
					}
					else {
						teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Parameter falsch\n.register <Username> <Email> <Password>'}, (err) => {
							console.log(err);
						});
					}
					break;

				case 'login':
					if (args.length === 3) {
						User.findOne({ username: args[1] }, (err, user) => {
							if (!user) {
								teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Benutzer nicht bekannt'}, (err) => {
									console.log(err);
								});
							}
							else {
								(<any>user).validatePassword(args[2], (valid: boolean) => {
									if (valid) {
										var appLink = new AppLink({
											'provider': 'Teamspeak3',
											'account_id': clientDB[response.invokerid].client_unique_identifier
										});
										appLink.save((err) => {
											if (err) {
												if (err.code === 11000) {
													teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Verlinkung existiert bereits'}, (err) => {
														console.log(err);
													});
												}
												else {
													teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Ein unbekannter Fehler ist aufgereten'}, (err) => {
														console.log(err);
													});
												}
											}
											else {
												(<any>user).update({$push: {'appLinks': appLink._id}}, (err) => {
													if (err) {
														teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Verlinkung speichern ist fehlgeschlagen'}, (err) => {
															console.log(err);
														});
													}
													else {
														teamspeakClient.send('servergroupaddclient', {sgid: config.config.teamspeak.registeredgrpid, cldbid: clientDB[response.invokerid].client_database_id}, (err, response) => {
															console.log(err);
														});
													}
												});
											}
										});
									}
									else {
										teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Password falsch'}, (err) => {
											console.log(err);
										});
									}
								});
							}
						});
					}
					else {
						teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Parameter falsch\n.login <Username> <Password>'}, (err) => {
							console.log(err);
						});
					}
					break;

				default:
					teamspeakClient.send('sendtextmessage', {targetmode: 1, target: response.invokerid, msg: 'Befehl nicht bekannt'}, (err) => {
						console.log(err);
					});
			}
		}
		else {
			// Trash talk
		}
	}
});
