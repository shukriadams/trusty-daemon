(async function(){

    const http = require('http'),
        settingsProvider = require('./lib/settings'),
        Logger = require('winston-wrapper'),
        daemon = require('./lib/daemon'),
        fs = require('fs-extra'),
        jsonfile = require('jsonfile'),
        path = require('path'),
        process = require('process'),
        settings = await settingsProvider.get(),
        logPath = './backups/logs';

    if (!await fs.exists('./settings.yml')){
        console.log('settings.yml not found, app will exit');
        process.exit(1);
    }

    fs.ensureDirSync(logPath);
    Logger.initialize(logPath);
    await daemon.start();

    // query types :
    // get job status : returns json with job's last expected run, and if that run failed. also returns a count of how many times the job has passed, and failed
    let server = http.createServer(async function (req, res) {

        const route = req.url.toLowerCase();


        /**
         * List jobs
         */
        if (route === '/jobs'){
            res.writeHead(200, {'Content-Type': 'text/json'});
            return res.end(`${JSON.stringify(Object.keys(settings.jobs), null, 4)}\n`);
        }


        /**
         * Returns array of jobs currently failing; .array is empty if all jobs passing.
         */
        if (route === '/failing'){
            let failed = [];
            const now = new Date();
            for (const job in settings.jobs){
                
                const statusPath = path.join('./backups/flags', job, 'status.json');

                // has status flag been created?
                if (!await fs.exists(statusPath)){
                    failed.push(`${job} - never run`)
                    continue;
                }

                // has job passed?
                let status = jsonfile.readFileSync(statusPath);
                if (!status.passed){
                    failed.push(`${job} - failed`)
                    continue;
                }

                // has job run as expected
                if (status.next < now){
                    failed.push(`${job} - stalled`)
                    continue;
                }
            }

            res.writeHead(200, {'Content-Type': 'text/json'});
            return res.end(`${JSON.stringify(failed, null, 4)}\n`);
        }


        /**
         * General status - has any job failed at all. Requires manually cleaning out fail flags to reset.
         */
        if (route === '/failed'){
            let failed = [];
            
            for (let job in settings.jobs){
                let folder = path.join('./backups/flags', job);
                var files = await fs.readdir(folder);
                files = files.filter((file)=>{
                    return file === 'status.json' ? null: file;
                });

                if (files.length)
                    failed.push(job);
            }

            res.writeHead(200, {'Content-Type': 'text/json'});
            return res.end(`${JSON.stringify(failed, null, 4)}\n`);
        }


        /**
         * Status for specific job
         */
        if (route.indexOf('/jobs/') !== -1){
            let job = route.match(/\/jobs\/(.*)/).pop();
            let statusPath = path.join('./backups/flags', job, 'status.json');

            // force job check against settings object to prevent route injection attack
            if (!settings.jobs[job] || !await fs.exists(statusPath)){
                res.statusCode = 404;
                return res.end('status.json not found for job. check logs');
            }

            let status = jsonfile.readFileSync(statusPath);
            res.writeHead(200, {'Content-Type': 'text/json'});
            return res.end(`${JSON.stringify(status, null, 4)}\n`);
        }


        /**
         * Default route, fallthrought
         */
        res.writeHead(200, {'Content-Type': 'text/plain'});
        return res.end(
`trusty-daemon service is running.\n
Use /failing to get a list of failing jobs.\n
Use /failed to get a list of jobs which failed at any time.\n
Use /jobs to get jobs list.\n
Use /jobs/JOBNAME to get details on a specific job list.\n`
        );


    });

    server.listen(settings.port);
    console.log(`trusty-daemon backup running on port ${settings.port}`);

})()
