help:
	@echo ''
	@echo 'Usage: make run'
	@echo 'Targets:'
	@echo '  run    	build docker image and run it'
	@echo ''
build:
	# build
	docker build -t chalkboard .

run: build
	# build and run
	docker run -p 5000:5000 chalkboard
