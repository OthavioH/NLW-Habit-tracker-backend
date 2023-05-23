FROM node:alpine

WORKDIR /docker/app

COPY package*.json ./
RUN yarn install --production

FROM base as build

RUN export NODE_ENV=production
RUN yarn

COPY . .

COPY prisma prisma
RUN yarn run prisma:generate
RUN yarn build

EXPOSE 8080

CMD ["npm", "run", "dev"]