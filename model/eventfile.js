var mongoose = require('mongoose');

var fileSchema = mongoose.Schema({
  content: [],
  eventId: String
});

module.exports = mongoose.model('file', fileSchema);
