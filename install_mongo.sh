#!/bin/bash
set -e

echo "Importing MongoDB public GPG Key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg --yes --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

echo "Adding MongoDB repository..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

echo "Updating apt..."
sudo apt-get update

echo "Installing MongoDB..."
sudo apt-get install -y mongodb-org

echo "Starting MongoDB service..."
sudo systemctl enable mongod
sudo systemctl start mongod

echo "MongoDB Installation Complete!"
