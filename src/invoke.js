(async function(){
    let command = null,
        colors = require('colors/safe'),
        exec = require('madscience-node-exec'),
        process = require('process');

    try {
    
        const 
            settingsProvider = require('./lib/settings'),
            settings = await settingsProvider.get(true),
            argv = require('minimist')(process.argv.slice(2));
        
        if (!argv.job){
            console.error(colors.red(`ERROR : Job required. Use "--job [job name]"`));
            process.exit(1);
        }
    
    
        let jobName = argv.job,
            job = settings.jobs[argv.job];
        
        if (!job) {
            return console.error(colors.red(`job ${jobName} not found\n`));
        }
        
        if (job.enabled && !argv.force){
            return console.error(colors.red(`job ${jobName} cannot be debugged if it is enabled - set its \"enabled\" flag to false and restart trusty-daemon, or use --force.\n`));
        }
    
        command = settings.jobs[jobName].command;
    
        // set env variables from settings
        if (settings.environment)
        for(const arg in settings.environment)
            process.env[arg] = settings.environment[arg];

        let result = await exec({ 
            cmd : `sh`,
            verbose : true,
            args : ['-c',`${command}`]
        });
    
        if (result.code !== 0)
            return console.error(colors.red(`Debug failed with errors. Command ${command}, ${JSON.stringify(result)}\n`));
    
        console.log(colors.green(`Debug passed without errors : ${JSON.stringify(result.result)}\n`));
    
    } catch (ex){
        console.error(colors.red(`Debug failed with errors. Command ${command}, ${JSON.stringify(ex)}\n`));
    }
})()
