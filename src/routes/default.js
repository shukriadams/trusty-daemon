

module.exports = async function(app){

    const logger = await (require('./../lib/logger')).global()

    app.get('/', async function(req, res){
        try {

            res.end(`
trusty-daemon service is running.\n
Use /failing to get a list of currently failing jobs.\n
Use /failed to get a list of any jobs which failed since last admin check-in.\n
Use /jobs to get a list of jobs.\n
Use /jobs/JOBNAME to get details on a specific job.\n
Use /reset/JOBNAME to clear errors on a job.\n
Use /reset/* to clear errors on all jobs.\n
\n
`)

        } catch(ex) {
            res.status(500)
            res.end('Something went wrong - check logs for details.')
            logger.error.error(ex)
        }
    })
}