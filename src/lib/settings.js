let fs = require('fs-extra'),
    yaml = require('js-yaml'),
    _settings = null;

module.exports = {
    get : async function(){

        if (!_settings){
            let rawSettings = null;

            try {
                let settingsYML = await fs.readFile('./settings.yml', 'utf8');
                rawSettings = yaml.safeLoad(settingsYML);
            } catch (e) {
                console.log('settings.yml contains invalid markup');
                console.log(e);
            }
            
            // force default structures
            rawSettings = Object.assign({
                version : 1,
                pgdumpTestMode : false,
                jobs : {}
            }, rawSettings);
    
            for (let jobName in rawSettings.jobs){
                let job = rawSettings.jobs[jobName];
                rawSettings.jobs[jobName] = Object.assign({
                    
                    // standard cron mask for job to run at
                    cronmask : '*/10 * * * * *',

                    // if set to true, job will be ignored. convenient way to keep job in settings file without having to run it
                    enabled : true,

                    // max number of previous backups above which files will be auto-deleted
                    preserve : 10,  

                    // object of arguments to pass to pg_dump
                    args : {},

                    archive : null

                }, job);
            }

            _settings = rawSettings;
        }

        return _settings;
    }
};