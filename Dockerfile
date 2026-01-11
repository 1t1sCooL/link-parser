FROM node:20

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chmod +x /app/run_parser.sh

RUN sed -i 's|node |/usr/local/bin/node |g' /app/run_parser.sh

RUN echo '0 4 * * * /app/run_parser.sh >> /proc/1/fd/1 2>&1' | crontab -

CMD ["cron", "-f"]
