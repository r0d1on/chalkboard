FROM alpine:latest
RUN apk add --no-cache nodejs-current npm
WORKDIR /chalkboard
RUN npm install --global --omit=dev eslint
RUN npm install --global --omit=dev @eslint/create-config
RUN ln -sf /usr/local/lib/node_modules/eslint/bin/eslint.js /usr/bin/eslint
ENTRYPOINT ["eslint"]
CMD ["--help"]
