#!/usr/bin/env bash
sudo apt-get update

sudo apt-get install git -y
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install nodejs -y

# docker
sudo apt install docker.io -y
sudo apt install docker-compose -y
sudo usermod -aG docker vagrant

# force github into known hosts so build script can clone without prompt. yes, this is 
# insecure because it opens for MITM attack, but I don't have anything better right now.
ssh-keyscan github.com >> ~/.ssh/known_hosts

# force startup folder to vagrant project
echo "cd /vagrant/src" >> /home/vagrant/.bashrc

# set hostname, makes console easier to identify
sudo echo "postgres-plus" > /etc/hostname
sudo echo "127.0.0.1 postgres-plus" >> /etc/hosts

sudo chmod 700 -R /home/vagrant/.ssh