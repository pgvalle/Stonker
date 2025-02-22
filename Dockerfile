# base image
FROM node:18

# envivonment variables. TELEGRAM_BOT_TOKEN must be passed through command-line
ENV NODE_ENV=production

WORKDIR /stonker

# add files to docker image and install node modules
COPY package*.json ./
COPY src ./src
RUN npm install

# run the application
CMD ["node", "src/main.js"]
