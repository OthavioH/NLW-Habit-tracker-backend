FROM node:alpine

WORKDIR /docker/app

COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY . .

RUN npm ci

RUN npx prisma generate
RUN prisma db pull

EXPOSE 8080

CMD ["npm", "run", "dev"]