import mongoose = require("mongoose");
import timestamp = require("mongoose-timestamp");

var AppLink = new mongoose.Schema({
	provider: {type: String, required: true},
	account_id: {type: String, required: true},
	verifiedAt: Date
});
AppLink.index({
	provider: 1,
	account_id: 1
}, {
	unique: true,
	dropDups: true
});
AppLink.plugin(timestamp);

module.exports = mongoose.model('AppLink', AppLink);
