FROM node:alpine

WORKDIR /docker/app

COPY package*.json ./
RUN yarn install --production

RUN export NODE_ENV=production
RUN yarn

COPY . .

COPY prisma prisma
RUN yarn run prisma:generate
RUN yarn build
RUN cp -R node_modules prod_node_modules

EXPOSE 8080

CMD ["npm", "run", "dev"]