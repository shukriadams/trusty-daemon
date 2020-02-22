# Mariadb backup to S3

This example runs an sql backup dump of a mariadb (aka mysql) instance down to disk, then sync the backup files to an S3 bucket. Syncing is done with duplicity. This example demonstrates how to use docker-compose (see compose file) to link a mariadb and trusty-daemon container. The backup and sync scripts are in the latter, but run against content in the former. 

