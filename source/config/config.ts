import fs = require("fs");
import path = require("path");
import toml = require("toml");

export class Config {
	private _configPath: string = path.join(__dirname, "..", "..", "config.toml");
	private _config: any;

	get config() {
		return this._config;
	}

	loadConfig() {
		try {
			fs.statSync(this._configPath);
		}
		catch (e) {
			try {
				let configContent = fs.readFileSync(this._configPath + ".example");
				fs.writeFileSync(this._configPath, configContent);
			}
			catch (e) {
				console.error(e);
				process.exit(1);
			}
		}

		try {
			this._config = toml.parse(fs.readFileSync(this._configPath).toString());
		}
		catch (e) {
			console.error(e);
			process.exit(1);
		}
	}
}
