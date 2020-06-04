var log4js = require('log4js');

log4js.configure({
    appenders: {
      access: { type: 'dateFile', filename: 'log/access.log', pattern: '-yyyy-MM-dd' },
      app: { type: 'file', filename: 'log/app.log', maxLogSize: 10485760, numBackups: 3 },
      errorFile: { type: 'file', filename: 'log/errors.log' },
      errors: { type: 'logLevelFilter', level: 'error', appender: 'errorFile' }
    },
    categories: {
      default: { appenders: ['app', 'errors'], level: 'info' },
      http: { appenders: ['access'], level: 'info' }
    }
  });

module.exports = {
    access: log4js.getLogger('access'),
    system: log4js.getLogger('app'),
    error: log4js.getLogger('errors'),
    express: log4js.connectLogger(log4js.getLogger('access'), { level: log4js.levels.INFO }),
    isDebug: function (category) {
        return (log4js.levels.DEBUG.level = category.level.level);
    }
};