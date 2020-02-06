let CronJob = require('cron').CronJob,
    Logger = require('winston-wrapper'),
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
        this.logInfo = Logger.instance().info.info;
        this.logError = Logger.instance().error.error;
        this.busy = false;
        
    }

    async start(){
        
        this.logInfo(`Starting job ${this.database}`);
        
        const folder = path.join('./backups/dumps', this.database);
        const settings = await settingsProvider.get();
        const historyLogFolder = path.join('./backups/flags', this.database);

        fs.ensureDirSync(folder);
        fs.ensureDirSync(historyLogFolder);

        this.cronJob = new CronJob(this.job.cronmask, async ()=>{
        
            let jobPassed = false;
            
            try
            {
                let now = new Date(),
                    filenameTimestamp = `${timebelt.toShortDate(now, 'y-m-d')}__${timebelt.toShortTime(now, 'h-m-s')}`;

                // convert args object into array, property name prepended with single dash for single char names
                // and double dash for longer
                let pgArgs = [];
                for (let arg in this.job.args){
                    pgArgs.push(arg.length === 1 ? `-${arg}` : `--${arg}`);
                    pgArgs.push(this.job.args[arg]);
                }

                pgArgs.push('-f');
                pgArgs.push(`${folder}/${this.database}_${filenameTimestamp}.dmp`);
                pgArgs.push(this.database);

                if (settings.pgdumpTestMode){
                    // in test mode, write a shim dump file with a string in it.
                    fs.outputFile(`${folder}/${this.database}_${filenameTimestamp}.dmp`, 'test dump content');
                } else {
                    let result = await exec({ 
                        cmd : `sh`,
                        args : ['-c',`${this.job.command}`]
                    });
                    this.logInfo(result);
                }

                // cleanup old
                var files = await fs.readdir(folder);
                if (files.length > this.job.preserve){
                    files.sort(function(a, b) {
                        return fs.statSync(path.join(folder, a)).mtime.getTime() - 
                            fs.statSync(path.join(folder, b)).mtime.getTime();
                    });

                    for (let i = 0 ; i < files.length - this.job.preserve ; i ++ ){
                        let file = path.join(folder, files[i]);
                        await fs.remove(file);
                        this.logInfo(`Cleaned out dump ${file}.`);
                    }
                }

                // push to s3

                // log
                this.logInfo(`Completed job ${this.database}`);
                
                jobPassed = true;
                
            } catch (ex){
                this.logError(ex);
            } finally {
                this.busy = false;
            }
            
            const now = new Date();

            // write static status flag
            jsonfile.writeFileSync(path.join(historyLogFolder, `status.json`), {
                passed : jobPassed,
                next : new Date(this.cronJob.nextDates().toString()),
                date : now
            });
            
            // write per-fail flag
            if (!jobPassed)
                jsonfile.writeFileSync(path.join(historyLogFolder, `fail-${now.getTime()}.json`), {
                    date : now
                });

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
