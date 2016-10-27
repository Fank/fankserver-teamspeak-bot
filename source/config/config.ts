export class Config {
	private _config: any;

	constructor() {
		this._config = {
			mongo: {
				db: `${process.env.DB_PORT || ''}/${process.env.DB_NAME || ''}`,
			},
			teamspeak: {
				host: process.env.TEAMSPEAK_PORT_10011_TCP_ADDR,
				user: process.env.TEAMSPEAK_USERNAME,
				password: process.env.TEAMSPEAK_PASSWORD,
				nickname: process.env.TEAMSPEAK_NICKNAME,
				guestgrpid: 8,
				registeredgrpid: 35,
			},
		};
		this._config.mongo.db = this._config.mongo.db.replace(/^tcp/, 'mongodb');
	}

	get config() {
		return this._config;
	}
}
