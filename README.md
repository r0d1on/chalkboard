# chalkboard

Multiplayer touch-friendly lightweight chalkboard.
Should work just fine in both desktop and mobile Chrome..

## functionality:

* shared drawing (refreshed with server polling, so not instant)
* text typing, alphanumeric latin only and not working on mobile yet
* named boards
* read-only (write protected) boards

### running locally:

**you'll need to have docker installed.**

* `make run` (if you have **make**) 

**or**

* `docker build -t chalkboard .` 
* `docker run -p 5000:5000 chalkboard`.
* navigate to *http://127.0.0.1:5000*

### on the net:

* https://kiryukhin.info/board.html#about

