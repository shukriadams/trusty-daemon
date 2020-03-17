module.exports = async function(app){

    const 
        path = require('path'),
        fs = require('fs-extra'),
        settingsProvider = require('./../lib/settings'),
        jsonfile = require('jsonfile'),
        settings = await settingsProvider.get(),
        logger = await (require('./../lib/logger')).global();

    /**
     * Returns 200 if no jobs are failing, 400 if any jobs are currently failing.
     */  
    app.get('/status/failing', async function(req, res){
        try {
            let failed = false,
                now = new Date();

            for (const jobName in settings.jobs){
                const job = settings.jobs[jobName],
                    statusPath = path.join(settings.operationLog, job.__safeName, 'status.json');

                // has status flag been created?
                if (!await fs.exists(statusPath)){
                    failed = true;
                    break;
                }

                // has job passed?
                let status = jsonfile.readFileSync(statusPath);
                if (!status.passed){
                    failed = true;
                    break;
                }

                // has job run as expected
                if (status.next < now){
                    failed = true;
                    break;
                }
            }

            if (failed){
                res.statusCode = 400;
                return res.end(`Some services are failing.\n`);
            }

            return res.end(`All services are passing\n`);

        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.');
            logger.error.error(ex);
        }
    });


    /**
     * Returns 200 if nothing has failed, 400 if any job has failed since last reset.
     */
    app.get('/status/failed', async function(req, res){
        try {
            let failed = false;
            
            for (let jobName in settings.jobs){
                let job = settings.jobs[jobName];
                let folder = path.join(settings.operationLog, job.__safeName, 'unchecked');

                if (!await fs.exists(folder)){
                    continue;
                }

                var files = await fs.readdir(folder);

                if (files.length){
                    failed = true;
                    break;
                }
            }

            if (failed){
                res.statusCode = 400;
                return res.end(`Some services have failed.\n`);
            }

            res.end(`All is well - no jobs have failed since last reset.`);

        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.');
            logger.error.error(ex);
        }
    });
}