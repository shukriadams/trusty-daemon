let CronJob = require('cron').CronJob,
    Logger = require('./logger'),
    exec = require('madscience-node-exec'),
    path = require('path'),
    timebelt = require('timebelt'),
    jsonfile = require('jsonfile'),
    
    fs = require('fs-extra'),
    settingsProvider = require('./settings'),
    _jobs = [];

class CronProcess
{
    constructor(database, job){

        this.database = database;
        this.job = job;
        this.logInfo = Logger.instance(job.name).info.info;
        this.logError = Logger.instance(job.name).error.error;
        this.busy = false;
        
    }

    async start(){
        
        this.logInfo(`Starting job ${this.database}`);
        
        const settings = await settingsProvider.get();
        const operationLogFolder = path.join(settings.operationLog, this.job.__safeName);

        await fs.ensureDir(path.join(operationLogFolder, 'unchecked'));

        this.cronJob = new CronJob(this.job.cronmask, async ()=>{
        
            let jobPassed = false;
            let logException = null;
            try
            {
                let now = new Date(),
                    filenameTimestamp = `${timebelt.toShortDate(now, 'y-m-d')}__${timebelt.toShortTime(now, 'h-m-s')}`;

                if (this.job.enabled){
                    let result = await exec({ 
                        cmd : `sh`,
                        args : ['-c',`${this.job.command}`]
                    });
    
                    if (this.job.logResults)
                        this.logInfo(result);
   
                }

                // log
                this.logInfo(`Completed job ${this.database}`);
                
                jobPassed = true;
                
            } catch (ex){
                logException = ex;
                this.logError(ex);
            } finally {
                this.busy = false;
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

        }, 
        null, 
        true, 
        null, 
        null, 
        true /* runonitit */ );

        
    }
}

module.exports = {
    
    jobs : _jobs,

    start : async ()=>{

        const settings = await settingsProvider.get();

        for (const database in settings.jobs){
            const job = settings.jobs[database];

            if (!job.enabled)
                continue;

            const process = new CronProcess(database, job);

            _jobs.push(process);
            await process.start();
        }
    }
}
