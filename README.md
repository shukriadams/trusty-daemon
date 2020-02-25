# Trusty-daemon

A really simply daemon that executes job at regular intervals, and easily reports if jobs, or the daemon itself, is running reliably.

Trusty-daemon is available in a docker container, so you can deploy and manage it with minimal fuss.

## Use

This daemon was written to reliably manage backups of various docker containers, but it can be used for any purpose where you need to execute commands at intervals, and determine if the commands have been successfully executed.

## Config

In your favorite editor, create a file called settings.yml. Add some jobs, for example 

    version: 1
    port: 3000
    jobs:
        foo:
            cronmask: "* * * * * *"
            logResults: true
            command: "ls /"

        bar:
            cronmask: "* * * * * *"
            command: echo \"bar\" 

This creates two jobs which call two different commands every second. Cronmasks should be wrapped in double quotes because raw cronmasks can break YML parsing. Commands can be wrapped too if necessary.

Longer commands can be split over multiple lines

    version: 1
    port: 3000
    jobs:
        myjob:
            cronmask: "*/10 * * * * *" # cronmask must be wrapped in quotes, as the slashes can break YML
            logResults: true
            command: "echo "first " \
                      && echo \"second\"

### Environment variables

You can add global environment variables to settings, these will be exposed to all jobs.

    version: 1
    port: 3000
    environemnt:
        FOO: bar
    jobs:
        myjob:
            command: echo "${FOO}"


## Logs

Trusty-daemon logs to two locations. Its own logs are written to ./logs in the deploy folder, while job logs are written to ./jobs/[jobname]/logs.

## How it works

Trusty-daemon uses a dead man's switch mechanism to ensure that it's running. When the daemon process starts, it calculates the expected time the next operation will run. It exposes an HTTP interface which reports a failure if any daemon has not checked in in-time, or if the expected time process itself is not being written.

In addition to this, Trusty-daemon is written to be slaved to simpler but more trusted uptime monitors, such as [Uptimerobot.com](https://uptimerobot.com). Trusty-daemon can return a simple fail flag if any job is currently failing, or a simple fail flag if any job has failed since your last checked in.

Trusty-daemon does not expose error logs, to get details on why a job has failed you'll need to peruse logs the old fashioned way.

## How to use it

Trusty-daemon has no security or permission system of its own. It _will_ expose the names of your jobs and their failing state to whoever knows where to ask. If you want to use trusty-daemon as a remote monitoring system, it is recommended you chain two instances of trusty-daemon together,and use one to expose the overall failing state of the other. 

If you want reliable push alerts, you can chain a service like uptimerobot.com to a public trusty-daemon, and in that in turn to a private trusty-daemon instance.

### Debugging commands

Trusy-daemon runs shell commands - normally, these would be written and tested in advance in your preferred shell. However, if you want to write and debug a command from trusty-daemon, you can do so by setting the jobs's "enabled" property to false, and calling

    /debug/[your-job-name]

This runs the job immediately, reads the command directly from settings.yml, and consoles out all output. Debugged jobs will not be written to logs.