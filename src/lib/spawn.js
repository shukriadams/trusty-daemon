let spawn = require('cross-spawn'),
    process = require('process');

/**
 * options: 
 * {
 *     cmd : main command to run.
 *     args : array or space-delimited string of arguments to run cmd with 
 *     options : object of options to pass directly to spawn.
 *     failOnStderr : bool. True if stderr output will be treated as errors. True by default.
 *     verbose : bool, true if results should be written to console
 * }
 */
module.exports = async function (options){
    return new Promise(function(resolve, reject){

        options.cwd = options.cwd || process.cwd();
        options.args = options.args || [];
        
        if (options.ignoreWarnings === undefined)
            options.ignoreWarnings = true;
        
        if (typeof options.args === 'string')
            options.args = options.args.split(' ');

        let result = '',
            error = '',
            child = spawn(options.cmd, options.args, options);

        child.stdout.on('data', function (data) {
            let chunk = data.toString('utf8');

            if (options.verbose)
                console.log(chunk);

            result += chunk;
        });
            
        child.stderr.on('data', function (data) {
            let chunk = data.toString('utf8');

            if (options.verbose)
                console.log(chunk);

            
            if (options.ignoreWarnings && chunk.toLowerCase().includes('warning'))
                return;
                    
            error += chunk;
        });
    
        child.on('error', function (err) {
            return reject(err);
        });
        
        child.on('close', function (code) {
            if (error.length)
                return reject(error);

            resolve( {
                code : code,
                result : result
            });
        });
    })
}  