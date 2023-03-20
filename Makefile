.DEFAULT_GOAL := help

.PHONY: help jekyll_image lint_image selenium_image backend_image lint lintfix start_backend build run test quicktest

help:
	@echo ''
	@echo 'Usage: make run'
	@echo 'Targets:'
	@echo '  run		build chalkboard docker image and run it'
	@echo '  run_jekyll	start local jekyll server (github-pages)'
	@echo '  lintfix	run eslint on js source files, fix whatever can be fixed automatically'
	@echo '  lint		run eslint on js source files'
	@echo '  test		run tests'

jekyll_image:
	docker build -t jekyll ./docker/jekyll

lint_image:
	docker build -t eslint ./docker/eslint

selenium_image:
	docker build -t selenium ./docker/selenium

backend_image:
	docker build -t backend ./docker/backend

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

start_backend: backend_image
	scripts/start_backend.sh $(CURDIR)
	scripts/waitfor.sh "$(CURDIR)/tmp/.backend.id"
	scripts/redirect_logs.sh $(CURDIR)

test: lint selenium_image start_backend
	scripts/start_selenium_tests.sh $(CURDIR)
	scripts/stop_backend.sh $(CURDIR)

quicktest: lint selenium_image start_backend
	scripts/start_selenium_tests.sh $(CURDIR) 1
	scripts/stop_backend.sh $(CURDIR)

