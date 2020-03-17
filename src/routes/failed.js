module.exports = async function(app){

    const 
        path = require('path'),
        fs = require('fs-extra'),
        settingsProvider = require('./../lib/settings'),
        settings = await settingsProvider.get(),
        logger = await (require('./../lib/logger')).global();

    /**
     * Returns object of all jobs which have failed since last manual reset. Job
     * 
     * Object structure
     * 
     * {
     *     errors : int. Number of errors since last reset.
     * }
     * 
     */
    app.get('/failed', async function(req, res){
        try {

            let failed = {};
            
            for (let jobName in settings.jobs){
                let job = settings.jobs[jobName],
                    folder = path.join(settings.operationLog, job.__safeName, 'unchecked');

                if (!await fs.exists(folder))
                    continue;

                let files = await fs.readdir(folder);

                if (files.length)
                    failed[jobName] = {
                        errors : files.length,
                        reason : 'Failed'
                    };
            }

            return res.json(failed, null, 4);

        } catch(ex) {
            res.status(500);
            res.end('Something went wrong - check logs for details.');
            logger.error.error(ex);
        }
    });

}