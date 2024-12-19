FROM oven/bun:1

WORKDIR /app

COPY package*.json ./
COPY bun.lockb ./
COPY .env ./
RUN bun install

COPY . .

EXPOSE 3222

CMD ["node", "src/index.js"]