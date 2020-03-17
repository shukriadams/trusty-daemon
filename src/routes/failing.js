module.exports = async function(app){
    const 
        path = require('path'),
        fs = require('fs-extra'),
        jsonfile = require('jsonfile'),
        settingsProvider = require('./../lib/settings'),
        settings = await settingsProvider.get(),
        logger = await (require('./../lib/logger')).global();

    /**
     * Returns object jobs currently failing; 
     * Object structure 
     * 
     * jobname : {
     *     reason : string. can be 'never run', 'failed' or 'stalled'
     * }
     * 
     * object is empty if all jobs are passing.
     */
    app.get('/failing', async function(req, res){
        try {

            let failed = {};
                const now = new Date();

                for (const jobName in settings.jobs){
                    let job = settings.jobs[jobName];
    
                    const statusPath = path.join(settings.operationLog, job.__safeName, 'status.json');
    
                    // has status flag been created?
                    if (!await fs.exists(statusPath)){
                        failed[jobName] = { reason : 'never run' };
                        continue;
                    }
    
                    // has job passed?
                    let status = jsonfile.readFileSync(statusPath);
                    if (!status.passed){
                        failed[jobName] = { reason : 'failed' };
                        continue;
                    }
    
                    // has job run as expected
                    if (status.next < now){
                        failed[jobName] = { reason : 'stalled' };
                        continue;
                    }
                }
    
                return res.json(failed);

        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.');
            logger.error.error(ex);
        }
    });
}