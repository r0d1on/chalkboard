.DEFAULT_GOAL := help

.PHONY: help lint_image lint build run

help:
	@echo ''
	@echo 'Usage: make run'
	@echo 'Targets:'
	@echo '  run		build chalkboard docker image and run it'
	@echo '  lintfix	run eslint on js source files, fix whatever can be fixed automatically'
	@echo '  lint		run eslint on js source files'


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
