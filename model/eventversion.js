var mongoose = require('mongoose');

var eventVersionSchema = mongoose.Schema(
  {event: {}}
  );

module.exports = mongoose.model('eventversion', eventVersionSchema);
