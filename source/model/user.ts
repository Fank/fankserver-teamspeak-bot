import CryptoJS = require("crypto-js");
import gravatar = require("gravatar");
import mongoose = require("mongoose");
import timestamp = require("mongoose-timestamp");

const usernameRegex = /^([\w\-]{4,})$/i;
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
const passwordRegex = /^(\S{6,}$)/i;

export interface IUserSchema extends mongoose.Document {
	username: string;
	password: string;
	salt: string;
	email: string;
	avatar: string;
	appLinks: Array<number>;
	validatePassword(password: string, callback: (valid: boolean) => void);
}

export class UserValidator {
	static username(value: string): RegExpExecArray {
		return usernameRegex.exec(value);
	}

	static email(value: string): RegExpExecArray {
		return emailRegex.exec(value);
	}

	static password(value: string): RegExpExecArray {
		return passwordRegex.exec(value);
	}
}

var UserSchema = new mongoose.Schema({
	username: {type: String, required: true, unique: true, dropDups: true},
	password: {type: String, required: true},
	salt: {type: String, required: false},
	email: {type: String, required: true, unique: true, dropDups: true},
	avatar: {type: String, default: "/assets/images/user.jpg"},
	appLinks: [{type: mongoose.Schema.Types.ObjectId, ref: "AppLink", required: true}],
});
UserSchema.plugin(timestamp);
UserSchema.pre("save", function(next) {
	if (this.isNew) {
		// set encrypted password
		let salt = (<any>CryptoJS).lib.WordArray.random(128 / 8);
		this.set("password", CryptoJS.SHA3(this.get("password") + salt));
		this.set("salt", salt);
	}

	// set gravatar url avatar
	this.set("avatar", gravatar.url(this.email));

	next();
});

(<any>UserSchema).methods.validatePassword = function(password: string, callback: (valid: boolean) => void) {
	callback(this.get("password") === CryptoJS.SHA3(password + this.get("salt")).toString());
};

mongoose.model("User", UserSchema);
