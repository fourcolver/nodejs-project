//jshint esversion:6

// Converts Javascript Date to yyyy-mm-dd
exports.dateToString = function(date) {

  if (date) {
    var day = date.getDate();
    var month = date.getMonth() + 1; //Be careful! January is 0 not 1
    var year = date.getFullYear();

    if (day < 10) {
      day = '0' + day;
    }

    if (month < 10) {
      month = '0' + month;
    }

    return year + "-" + month + "-" + day;
  } else {
    return null;
  }
};

// Converts Javascript Date to dd.mm.yyyy
exports.dateToGermanDateString = function(date) {

  if (date) {
    var day = date.getDate();
    var month = date.getMonth() + 1; //Be careful! January is 0 not 1
    var year = date.getFullYear();

    if (day < 10) {
      day = '0' + day;
    }

    if (month < 10) {
      month = '0' + month;
    }

    return day + "." + month + "." + year;
  } else {
    return null;
  }
};

// Converts yyyy-mm-dd to Javascript Date
exports.stringToDate = function(dateString) {

  if (dateString) {
    return Date.parse(dateString);
  } else {
    return null;
  }
};

// Returns the german abbreviation for the weekday of a given Date
exports.getWeekdayName = function(date) {
  if (date) {
    var weekdayNames = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    var weekday = date.getDay();
    return weekdayNames[weekday];
  }
}
