FROM alpine:latest

COPY ./Gemfile /tmp/Gemfile
COPY ./jekyller.sh /tmp/jekyller.sh

RUN apk add --no-cache ruby-full ruby-dev build-base
RUN gem install jekyll bundler
RUN mkdir /site

WORKDIR /site
RUN jekyll new --force --skip-bundle .
RUN cp /tmp/Gemfile ./
RUN cp /tmp/jekyller.sh ./
RUN bundle install
RUN bundle add webrick

ENTRYPOINT ["/site/jekyller.sh"]
