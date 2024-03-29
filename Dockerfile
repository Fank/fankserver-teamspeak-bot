FROM node:6

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
RUN npm install --unsafe-perm && npm cache clean && rm ~/.npm -rf

CMD [ "npm", "start" ]
