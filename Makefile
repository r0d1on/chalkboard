.DEFAULT_GOAL := run

.PHONY: help lint build run

help:
	@echo ''
	@echo 'Usage: make run'
	@echo 'Targets:'
	@echo '  run    	build docker image and run it'
	@echo ''

lint: 
	./dkr_build.sh eslint
	docker run -it --rm -v $(CURDIR):/chalkboard eslint ./static/*.js ./static/**/*.js

build: lint
	# build
	docker build -t chalkboard .

run: build
	# build and run
	docker run -p 5000:5000 chalkboard
