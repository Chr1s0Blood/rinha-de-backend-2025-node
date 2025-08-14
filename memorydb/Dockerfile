FROM node:22.18.0-bookworm

RUN apt-get update && apt-get install -y git
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm approve-builds

RUN pnpm install --force

COPY . .

EXPOSE 3000

CMD ["node", "index.ts"]
