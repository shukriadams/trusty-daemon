(async function(){

    const http = require('http'),
        fs = require('fs-extra'),
        colors = require('colors/safe'),
        exec = require('madscience-node-exec'),
        path = require('path'),
        process = require('process'),
        Express = require('express'),
        Logger = require('./lib/logger'),
        daemon = require('./lib/daemon');

    try {

        const app = Express(),
            settingsProvider = require('./lib/settings'),
            settings = await settingsProvider.get(),
            routeFiles = await fs.readdir(path.join(__dirname, 'routes'));

        if (!await fs.exists('./settings.yml')){
            console.log('settings.yml not found, app will exit');
            process.exit(1);
        }

        // set us up the log
        fs.ensureDirSync(settings.logPath);
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

        // set env variables from settings
        if (settings.environment)
            for(const arg in settings.environment)
                process.env[arg] = settings.environment[arg];

        await daemon.start();
        
        // prettify JSON output
        app.set('json spaces', 4);

        // load routes
        for (const routeFile of routeFiles){
            const name = routeFile.match(/(.*).js/).pop(),
                routes = require(`./routes/${name}`);

            await routes(app);
        }

        const server = http.createServer(app);
        server.timeout = settings.timeout;
        server.listen(settings.port);    

        console.log(colors.green(`trusty-daemon is now running on port ${settings.port}`));
    } catch(ex){
        console.error(colors.red('ERROR : trusty-daemon failed to start'));
        console.error(colors.red(ex));
    }

})()
