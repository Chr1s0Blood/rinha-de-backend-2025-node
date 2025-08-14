FROM node:22.18.0-bookworm

RUN apt-get update && apt-get install -y git
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm install --prod

COPY . .

EXPOSE 8080

CMD ["node", "src/index.ts"]
