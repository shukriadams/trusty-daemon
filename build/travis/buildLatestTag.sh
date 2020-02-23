# Builds UBUNTU version of trusty-daemon docker image
#
# Build and docker image will be tagged with the most recent git tag.
# The docker image will be is pushed to dockerhub after building if DOCKER_USER and DOCKER_PASS are set as env variables

# Tag is whatever tag this git clone travis did for us
TAG=$(git describe --tags --abbrev=0) &&
echo "Tag \"${TAG}\" found."

# hardcode build to ubuntu
TARGET_DOCKERFILE="Dockerfile-ubuntu"

# Kill any existing build container, then start again. This isn't necessary on Travis, but helps when running locally.
docker-compose kill &&
docker-compose up -d &&

# create stage folder inside build container, we need this for cleaning the build
docker exec buildcontainer sh -c 'mkdir -p /tmp/trusty-daemon-stage' &&

# This repo is mounted in buildcontainer as /tmp/trusty-daemon.
# Install with --no-bin-links to avoid simlinks, this is needed to copy build content around
docker exec buildcontainer sh -c 'cd /tmp/trusty-daemon/src && npm install --no-bin-links' &&

# copy everything in /src to staging folder, then remove node_modules, we do this to strip out packages in dev_dependencies
docker exec buildcontainer sh -c 'cd /tmp/trusty-daemon/src && cp -R ./* /tmp/trusty-daemon-stage && rm -rf /tmp/trusty-daemon-stage/node_modules' &&

# do a fresh npm install of production-only modules
docker exec buildcontainer sh -c 'cd /tmp/trusty-daemon-stage && npm install --production --no-bin-links' &&

# zip the producion ready build up, then copy this out of the container
docker exec buildcontainer sh -c 'tar -czvf /tmp/build.tar.gz /tmp/trusty-daemon-stage' &&
docker cp buildcontainer:/tmp/build.tar.gz . &&

# copy target docker file into this folder, dockerfile needs to be in current folder due to how docker build scope
cp ./../docker/${TARGET_DOCKERFILE} . && 

# build trusty-daemon container
docker build -t shukriadams/trusty-daemon -f $TARGET_DOCKERFILE . &&
docker tag shukriadams/trusty-daemon:latest shukriadams/trusty-daemon:$TAG &&

# if docker user + password defined as env vars, log in to docker hub and push tagged
# image. Dont't push "latest", it is bad practice to use this.
if [ ! -z "${DOCKER_USER}" ]; then

    if [ ${#DOCKER_PASS} -eq 0 ]; then
        echo "DOCKER_PASS not set, push failed"
        exit 1;
    fi

    docker login -u $DOCKER_USER -p $DOCKER_PASS &&
    docker push shukriadams/trusty-daemon:$TAG 

fi

cd -

echo "Build done";
