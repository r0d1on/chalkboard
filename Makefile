.DEFAULT_GOAL := help

.PHONY: help jekyll_image lint_image lint lintfix build run

help:
	@echo ''
	@echo 'Usage: make run'
	@echo 'Targets:'
	@echo '  run		build chalkboard docker image and run it'
	@echo '  run_jekyll	execute local jekyll server (github-pages)'
	@echo '  lintfix	run eslint on js source files, fix whatever can be fixed automatically'
	@echo '  lint		run eslint on js source files'

jekyll_image:
	docker build -t jekyll ./docker/jekyll

lint_image:
	docker build -t eslint ./docker/eslint

lint: lint_image
	docker run -it --rm -v $(CURDIR):/chalkboard eslint ./static/*.js ./static/**/*.js

lintfix: lint_image
	docker run -it --rm -v $(CURDIR):/chalkboard eslint --fix ./static/*.js ./static/**/*.js

build: lint
	docker build -t chalkboard .

run: build
	docker run -p 5000:5000 chalkboard

run_jekyll: build jekyll_image
	docker run -t -i -p 4000:4000 -v $(CURDIR)/static:/chalkboard jekyll
