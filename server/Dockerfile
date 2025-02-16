FROM oven/bun:1

WORKDIR /app

COPY package*.json ./
COPY .env ./
RUN bun install

COPY . .

EXPOSE 3222

CMD ["bun", "src/index.js"]
