# postgres-plus

Fork of official Postgres 9 docker container from https://github.com/docker-library/postgres

Adds automatic backup process and HTTP status API.

## Setup

- create a folder to store dumps etc in, and assign it to postgres user id

        mkdir backups
        chown 999 -R ./backups

- if you're setting up a brand new container instance with no existin data folder,
    - comment out the command line in the docker-compose.yml to disable  backup service.
    - start 

            docker-compose up -d
    
    - confirm that container is running and postgres has started

            docker logs postgres

    - stop container

            docker-compose down

    - uncomment command line in docker-compose.yml to re-enable backup service

- start 

        docker-compose up -d

