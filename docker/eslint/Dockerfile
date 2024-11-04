FROM alpine:latest
RUN apk add --no-cache nodejs-current npm
WORKDIR /chalkboard
RUN npm install -g --production --remove-dev eslint@8
RUN npm install -g --production --remove-dev @eslint/create-config
RUN ln -sf /usr/local/lib/node_modules/eslint/bin/eslint.js /usr/bin/eslint
ENTRYPOINT ["eslint"]
CMD ["--help"]
