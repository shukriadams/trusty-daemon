let winston = require('winston'),
    fs = require('fs-extra'),
    _jobLogs = {},
    _global,
    process = require('process'),
    path = require('path'),
    settingsProvider = require('./settings');

class Logger {
    constructor(logFolder){

        if (!fs.existsSync(logFolder))
            fs.mkdirSync(logFolder);

        // apply rotation override for winston
        require('winston-daily-rotate-file');

        this.info = new (winston.Logger)({
            transports: [
                new (winston.transports.DailyRotateFile)({
                    filename: path.join(logFolder, '.log'),
                    datePattern: 'info.yyyy-MM-dd',
                    prepend: true,
                    level: 'info'
                })
            ]
        });

        this.error = new (winston.Logger)({
            transports: [
                new (winston.transports.DailyRotateFile)({
                    filename: path.join(logFolder, '.log'),
                    datePattern: 'error.yyyy-MM-dd',
                    prepend: true,
                    level: 'error'
                })]
        });

    }
}

module.exports = {
    
    // inits the global log, this is used by trusty-daemon for its own errors.
    initializeGlobal : async function(){
        const settings = await settingsProvider.get();
        _global = new Logger(settings.logPath);
        return _global;
    },

    // initializes loggers used for each job
    initializeJobs : async function(){
        const settings = await settingsProvider.get();

        for(const jobName in settings.jobs) {
            const job = settings.jobs[jobName];
            const logpath = path.join(settings.operationLog, job.__safeName, 'logs');
            
            await fs.ensureDir(logpath);
            _jobLogs[job.name] = new Logger(logpath);
        }
    },

    // returns an instance of logger
    instance : function(jobName) {
        return _jobLogs[jobName];
    }

};