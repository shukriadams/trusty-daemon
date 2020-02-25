let CronJob = require('cron').CronJob,
    Logger = require('./logger'),
    exec = require('madscience-node-exec'),
    path = require('path'),
    jsonfile = require('jsonfile'),
    fs = require('fs-extra'),
    settingsProvider = require('./settings'),
    _jobs = [];

class CronProcess
{
    constructor(name, job){
        this.name = name;
        this.job = job;
        this.logInfo = Logger.instance(job.name).info.info;
        this.logError = Logger.instance(job.name).error.error;
        this.busy = false;
    }

    async start(){
        
        console.log(`Starting job ${this.name}`);
        
        const settings = await settingsProvider.get();
        const operationLogFolder = path.join(settings.operationLog, this.job.__safeName);

        await fs.ensureDir(path.join(operationLogFolder, 'unchecked'));
        
        this.cronJob = new CronJob(this.job.cronmask, async ()=>{

            if (this.busy)
                return;

            try {
                this.busy = true;

                let jobPassed = false,
                    logException = null;

                try
                {
                    let result = await exec({ 
                        cmd : `sh`,
                        args : ['-c',`${this.job.command}`]
                    });

                    if (this.job.logResults)
                        this.logInfo(result);

                    // log
                    this.logInfo(`Completed job ${this.name}`);

                    jobPassed = true;

                } catch (ex){
                    logException = ex;
                    this.logError(ex);
                } 

                const now = new Date();

                // write static status flag
                jsonfile.writeFileSync(path.join(operationLogFolder, `status.json`), {
                    passed : jobPassed,
                    next : new Date(this.cronJob.nextDates().toString()),
                    date : now
                });
                
                // write fail flag, we don't care about specific successes, last-success is good enough
                if (!jobPassed){
                    jsonfile.writeFileSync(path.join(operationLogFolder, 'unchecked', `${now.getTime()}.json`), {
                        date : now,
                        error : logException
                    });
                }

            } finally {
                this.busy = false;
            }
        }, 
        null, 
        true, 
        null, 
        null, 
        false /* runonitit */ );
       
    }
}

module.exports = {
    
    jobs : _jobs,

    start : async ()=>{

        const settings = await settingsProvider.get();

        for (const name in settings.jobs){
            const job = settings.jobs[name];

            if (!job.enabled){
                console.log(`Job ${name} is disabled, skipping`);
                continue;
            }

            const process = new CronProcess(name, job);

            _jobs.push(process);
            await process.start();
        }
    }
}
