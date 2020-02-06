# Trusty-daemon

A really simply daemon that executes job at regular intervals, and easily reports that jobs, or the daemon itself, is running reliably.
Available as a Docker container.

## Use

This daemon was written to reliably manage backups of various docker containers running live, but it can be used for any purpose where you need to execute commands at intervals, and determine if the commands have been successfully executed.

Trusty-daemon is itself available in a docker container, so you can deploy and manage it with minimal fuss.

## Config

In your favorite editor, created a file called settings.yml. Add the following example content

    version: 1
    port: 3000
    jobs:

        myJob:
            cronmask: "* * * * * *"
            command: "ls /"

        myOtherJob:
            cronmask: "* * * * * *"
            command: echo \"whatever\" 

This creates two jobs which call two different commands every second. Cronmask should be wrapped in double quotes because raw cronmasks can break the YML parser used in this project. Commands can be wrapped too if necessary.

