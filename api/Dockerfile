FROM node:20-alpine AS base
WORKDIR /app

COPY api/package.json api/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY api/ .
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start:prod"]
