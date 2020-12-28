module.exports = async function(app){

    const 
        path = require('path'),
        fs = require('fs-extra'),
        ago = require('s-ago').default,
        fsUtils = require('madscience-fsUtils'),
        settingsProvider = require('./../lib/settings'),
        settings = await settingsProvider.get(),
        logger = await (require('./../lib/logger')).global();

    async function resetJob(jobName, job){
        let uncheckedFolder = path.join(settings.operationLog, job.__safeName, 'unchecked'),
            checkedFolder = path.join(settings.operationLog, job.__safeName, 'checked');

        await fs.ensureDir(checkedFolder);

        // force job check against settings object to prevent route injection attack
        if (!await fs.exists(uncheckedFolder)){
            res.statusCode = 400.03;
            return res.end(`unchecked folder for job ${jobName} not found\n`);
        }
        
        let lastError = new Date('1980/1/1');
        let now = new Date();
        let files = fsUtils.readFilesInDirSync(uncheckedFolder);
        for (let file of files){
            let filename = fsUtils.fileNameWithoutExtension(file);
            let filedate = new Date(parseInt(filename));

            if (filedate.getTime() > now.getTime())
                continue;
            
            if (filedate.getTime() > lastError.getTime())
                lastError = filedate;
            
            const targetPath = path.join(checkedFolder, `${filename}.json`);
            await fs.move(file, targetPath);
        }

        return `${files.length} error(s) reset for job ${jobName} reset. The last error was from ${lastError} (${ago(lastError)}).\n`
    }

    /**
     * Resets alarm on job that has failed. Job will no longer show as "has failed".
     */
    app.get('/reset/:jobName', async function(req, res){
        try {
            const jobName = req.params.jobName,
                job = settings.jobs[jobName]
            
            if (!job) {
                res.statusCode = 404
                return res.end(`job ${jobName} not found\n`)
            }
            
            const result = await resetJob(jobName, job)
            res.end(result)

        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.');
            logger.error.error(ex);
        }
    })
    
    app.get('/reset', async function(req, res){
        try {
            
            if (req.query.all !== undefined){
                // reset all
                let result = 'resetting all jobs\n'
                for (const jobName in settings.jobs)
                    result += await resetJob(jobName, settings.jobs[jobName])

                return res.end(result)
            }

            res.end('Invalid argument')    
        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.')
            logger.error.error(ex)
        }


    })
}