#!/bin/sh
echo "copying new site files"
cp -r /chalkboard/* /site
echo "serving the site"
bundle exec jekyll serve --host 0.0.0.0
