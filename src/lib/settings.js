let fs = require('fs-extra'),
    yaml = require('js-yaml'),
    sanitize = require('sanitize-filename'),
    _settings = null;

module.exports = {
    get : async function(forceRead){

        if (!_settings || forceRead === true){
            let rawSettings = null;

            try {
                let settingsYML = await fs.readFile('./settings.yml', 'utf8');
                rawSettings = yaml.safeLoad(settingsYML);
            } catch (e) {
                console.log('Error reading settings.yml');
                console.log(e);
            }
            
            // force default structures
            rawSettings = Object.assign({
                version : 1,
                port: 3000,
                logPath : './logs',
                operationLog : './jobs',
                timeout: 600000, // timeout of http calls. default is 10 minutes. Set to 0 to disable.
                onstart : null,
                jobs : {}
            }, rawSettings);
    
            for (const jobName in rawSettings.jobs){

                let job = rawSettings.jobs[jobName];

                rawSettings.jobs[jobName] = Object.assign({
                    
                    __name : jobName,

                    __safeName : sanitize(jobName),

                    // enabled field is optional, is always one by default
                    enabled : true,

                    // shell command to run
                    command : '',

                    // if true, all console out will be written to log. This can bloat your logs, so use carefully
                    logResults : false

                }, job);
            }

            _settings = rawSettings;
        }

        return _settings;
    }
};
