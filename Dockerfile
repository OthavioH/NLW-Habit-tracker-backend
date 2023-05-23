FROM node:alpine

WORKDIR /docker/app

COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY . .

RUN npm ci

RUN npx prisma migrate deploy
RUN npx prisma db pull
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "run", "dev"]