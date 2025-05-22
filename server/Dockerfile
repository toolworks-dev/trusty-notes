FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY .env ./
RUN bun install

COPY . .

EXPOSE 3222

CMD ["bun", "src/index.js"]
