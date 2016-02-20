import mongoose = require("mongoose");
import timestamp = require("mongoose-timestamp");

export interface IAppLinkSchema extends mongoose.Document {
	provider: string;
	account_id: string;
	verifiedAt: Date;
}

let AppLinkSchema = new mongoose.Schema({
	provider: {type: String, required: true},
	account_id: {type: String, required: true},
	verifiedAt: Date
});
AppLinkSchema.index({
	provider: 1,
	account_id: 1
}, {
	unique: true,
	dropDups: true
});
AppLinkSchema.plugin(timestamp);

mongoose.model("AppLink", AppLinkSchema);
