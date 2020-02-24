(async function(){

    const http = require('http'),
        Logger = require('./lib/logger'),
        daemon = require('./lib/daemon'),
        fs = require('fs-extra'),
        ago = require('s-ago').default,
        exec = require('madscience-node-exec'),
        fsUtils = require('madscience-fsUtils'),
        jsonfile = require('jsonfile'),
        path = require('path'),
        process = require('process'),
        settingsProvider = require('./lib/settings'),
        settings = await settingsProvider.get();

    if (!await fs.exists('./settings.yml')){
        console.log('settings.yml not found, app will exit');
        process.exit(1);
    }

    fs.ensureDirSync(settings.logPath);
    const logError = (await Logger.initializeGlobal()).error.error,
        logInfo = (await Logger.initializeGlobal()).info.info;

    await Logger.initializeJobs();


    if (settings.onstart){
        console.log('onstart command executing');

        try {
            const result = await exec({ 
                cmd : `sh`,
                args : ['-c',`${settings.onstart}`]
            });
            console.log(`onstart finished with result`, result);
        } catch(ex){
            console.log(`onstart failed with`, ex);
            process.exit(1);
        }
    }


    await daemon.start();

    // query types :
    // get job status : returns json with job's last expected run, and if that run failed. also returns a count of how many times the job has passed, and failed
    let server = http.createServer(async function (req, res) {

        const route = req.url.toLowerCase();

        /**
         * Returns a string array for all jobs
         */
        if (route === '/jobs'){

            try {
                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${JSON.stringify(Object.keys(settings.jobs), null, 4)}\n`);
            } catch(ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }

        }


        /**
         * Returns object jobs currently failing; 
         * Object structure 
         * 
         * jobname : {
         *     reason : string. can be 'never run', 'failed' or 'stalled'
         * }
         * 
         * object is empty if all jobs are passing.
         * 
         */
        if (route === '/failing'){
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
    
                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${JSON.stringify(failed, null, 4)}\n`);

            } catch(ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


        /**
         * Returns 200 if no jobs are failing, 400.01 if any jobs are currently failing.
         */  
        if (route === '/status/failing'){
            try {
                let failed = false;
                const now = new Date();

                for (const jobName in settings.jobs){
                    let job = settings.jobs[jobName];
    
                    const statusPath = path.join(settings.operationLog, job.__safeName, 'status.json');
    
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
                    res.statusCode = 400.01;
                    return res.end(`Some services are failing.\n`);
                }

                return res.end(`All services are passing\n`);


            } catch(ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


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
        if (route === '/failed'){
            try {
                let failed = {};
            
                for (let jobName in settings.jobs){
                    let job = settings.jobs[jobName];
                    let folder = path.join(settings.operationLog, job.__safeName, 'unchecked');

                    if (!await fs.exists(folder))
                        continue;

                    var files = await fs.readdir(folder);
    
                    if (files.length)
                        failed[jobName] = {
                            errors : files.length,
                            reason : 'Failed'
                        };
                }
    
                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${JSON.stringify(failed, null, 4)}\n`);
            }catch(ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


        /**
         * Returns 200 if nothing has failed, 400.02 if any job has failed since last reset.
         */
        if (route === '/status/failed'){
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
                    res.statusCode = 400.02;
                    return res.end(`Some services have failed.\n`);
                }

                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${JSON.stringify(failed, null, 4)}\n`);
            }catch(ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


        /**
         * Gets status.json for a specific job. This reveals the job's status, when it was
         * last run, and when it will next run.
         */
        if (route.startsWith('/jobs/')){
            try {
                let jobName = route.match(/\/jobs\/(.*)/).pop();
                let job = settings.jobs[jobName];
                if (!job) {
                    res.statusCode = 404;
                    return res.end(`job ${jobName} not found.\n`);
                }
                
                let statusPath = path.join(settings.operationLog, job.__safeName, 'status.json');
    
                // force job check against settings object to prevent route injection attack
                if (!await fs.exists(statusPath)){
                    res.statusCode = 404;
                    return res.end(`status.json not found for job ${jobName}. check logs\n`);
                }
    
                let status = jsonfile.readFileSync(statusPath);
                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${JSON.stringify(status, null, 4)}\n`);
            } catch (ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


        /**
         * Resets all errors for a given job. 
         */
        if (route.startsWith('/reset/')){
            try {
                let jobName = route.match(/\/reset\/(.*)/).pop();
                let job = settings.jobs[jobName];
                if (!job) {
                    res.statusCode = 404;
                    return res.end(`job ${jobName} not found\n`);
                }
                
                let uncheckedFolder = path.join(settings.operationLog, job.__safeName, 'unchecked');
                let checkedFolder = path.join(settings.operationLog, job.__safeName, 'checked');
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

                res.writeHead(200, {'Content-Type': 'text/json'});
                return res.end(`${files.length} error(s) reset for job ${jobName} reset. The last error was from ${lastError} (${ago(lastError)}).\n`);
            } catch (ex){
                logError(ex);
                console.log(ex);
                res.statusCode = 500;
                res.end('An unexpected error occurred. Please check server logs.\n');
            }
        }


        /**
         * Runs a specific job in debug mode
         */
        if (route.startsWith('/debug/')){
            let command = null;
            try {

                let newSettings = await settingsProvider.get(true);
                let jobName = route.match(/\/debug\/(.*)/).pop();
                let job = settings.jobs[jobName];
                
                if (!job || !newSettings.jobs[jobName]) {
                    res.statusCode = 404;
                    return res.end(`job ${jobName} not found\n`);
                }
                
                if (job.enabled){
                    res.statusCode = 400;
                    return res.end(`job ${jobName} cannot be debugged if its enabled - set its \"enabled\" flag to false, and restart trusty-daemon.\n`);
                }

                command = newSettings.jobs[jobName].command;

                let result = await exec({ 
                    cmd : `sh`,
                    verbose : true,
                    args : ['-c',`${command}`]
                });

                if (result.code !== 0)
                    return res.end(`Debug failed with errors. Command ${command}, ${JSON.stringify(result)} `);

                return res.end(`Debug passed without errors : ${JSON.stringify(result.result)}\n`, );
            } catch (ex){
                res.statusCode = 500;
                return res.end(`Debug failed with errors. Command ${command}, ${JSON.stringify(ex)} `);
            }
        }

        /**
         * Default route, fallthrought
         */
        res.writeHead(200, {'Content-Type': 'text/plain'});
        return res.end(`
trusty-daemon service is running.\n
Use /failing to get a list of currently failing jobs.
Use /failed to get a list of any jobs which failed since last admin check-in.
Use /jobs to get a list of jobs.
Use /jobs/JOBNAME to get details on a specific job.\n`
        );


    });

    server.timeout = settings.timeout;
    server.listen(settings.port);
    console.log(`trusty-daemon is now running on port ${settings.port}`);

})()
