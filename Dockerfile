FROM node:6

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install && npm cache clean && rm ~/.npm -rf

# Bundle app source
COPY dist /usr/src/app

CMD [ "node", "app.js" ]
