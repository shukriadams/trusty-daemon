# Trusty-daemon

A really simply daemon that executes job at regular intervals, and easily reports if jobs, or the daemon itself, is running reliably.

Trusty-daemon is available in a docker container, so you can deploy and manage it with minimal fuss.

## Use

This daemon was written to reliably manage backups of various docker containers, but it can be used for any purpose where you need to execute commands at intervals, and determine if the commands have been successfully executed.

## Config

In your favorite editor, create a file called settings.yml. Add the following example content

    version: 1
    port: 3000
    jobs:
        foo:
            cronmask: "* * * * * *"
            command: "ls /"

        bar:
            cronmask: "* * * * * *"
            command: echo \"bar\" 

This creates two jobs which call two different commands every second. Cronmasks should be wrapped in double quotes because raw cronmasks can break YML parsing. Commands can be wrapped too if necessary.


## Logs

Trusty-daemon writes two kinds of logs. Normal text logs (console out of commands or errors), and then JSON data logs, which are used to report when specific things ran and if they passed or failed.

## How it works

Trusty-daemon uses a dead man's switch mechanism to ensure that it's running. When the daemon process starts, it calculates the expected time the next operation will run. It exposes an HTTP interface which reports a failure if any daemon has not checked in in-time, or if the expected time process itself is not being written.

In addition to this, Trusty-daemon is written to be slaved to simpler but more trusted uptime monitors, such as [Uptimerobot.com](https://uptimerobot.com). Trusty-daemon can return a simple fail flag if any job is currently failing, or a simple fail flag if any job has failed after a manual checkup.

## How to use it

Trusty-daemon has no security or permission system of its own. It _will_ expose the names of your jobs and their failing state to whoever knows where to ask. If you want to use trusty-daemon as remote monitoring system, it is recommended you chain two instances of trusty-daemon together,and use one to expose the overall failing state of the other. 

If you want reliable push alerts, you can chain a service like uptimerobot.com to a public trusty-daemon to a private trusty-daemon.