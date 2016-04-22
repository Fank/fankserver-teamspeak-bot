import * as CryptoJS from "crypto-js";
import * as gravatar from "gravatar";
import * as mongoose from "mongoose";
import * as timestamp from "mongoose-timestamp";

const usernameRegex = /^([\w\-]{4,})$/i;
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
const passwordRegex = /^(\S{6,}$)/i;

export class UserTags {
	static CoreAdmin = "Core Admin";

	static TeamspeakAdmin = "Teamspeak Admin";
	static TeamspeakMod = "Teamspeak Mod";
	static TeamspeakSubTier1 = "Teamspeak Tier1";
	static TeamspeakSubTeamMulm = "Teamspeak Team Mulm";

	static GameEvE = "EvE";
	static GameGuildWars = "Guild Wars";
	static GameCounterStrike = "Counter Strike";
	static GameLeagueOfLegends = "League of Legends";
	static GameRainbow6 = "Rainbow 6";
	static GameStarCitizen = "Star Citizen";
	static GameStarcraft = "Starcraft";
}

export interface IUserSchema extends mongoose.Document {
	username: string;
	password: string;
	salt: string;
	email: string;
	avatar: string;
	appLinks: Array<number>;
	tags: Array<UserTags>;
	validatePassword(password: string, callback: (valid: boolean) => void);
}

export class UserValidator {
	public static username(value: string): RegExpExecArray {
		return usernameRegex.exec(value);
	}

	public static email(value: string): RegExpExecArray {
		return emailRegex.exec(value);
	}

	public static password(value: string): RegExpExecArray {
		return passwordRegex.exec(value);
	}
}

let userTagValues: Array<string> = Object.keys(UserTags).filter((element: string, index: number) => (index % 2) !== 0);
let userSchema = new mongoose.Schema({
	appLinks: [{ref: "AppLink", required: true, type: mongoose.Schema.Types.ObjectId}],
	avatar: {default: "/assets/images/user.jpg", type: String},
	email: {dropDups: true, required: true, type: String, unique: true},
	password: {required: true, type: String},
	salt: {required: false, type: String},
	tags: [{enum: userTagValues, required: true, type: String, unique: true}],
	username: {dropDups: true, required: true, type: String, unique: true},
});
userSchema.plugin(timestamp);
userSchema.pre("save", function(next: any): void {
	if (this.isNew) {
		// set encrypted password
		let salt: string = (<any>CryptoJS).lib.WordArray.random(128 / 8);
		this.set("password", CryptoJS.SHA3(this.get("password") + salt));
		this.set("salt", salt);
	}

	// set gravatar url avatar
	this.set("avatar", gravatar.url(this.email));

	next();
});

(<any>userSchema).methods.validatePassword = function(password: string, callback: (valid: boolean) => void): void {
	callback(this.get("password") === CryptoJS.SHA3(password + this.get("salt")).toString());
};

mongoose.model("User", userSchema);
