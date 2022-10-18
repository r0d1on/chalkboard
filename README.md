# chalkboard

Mobile touch friendly lightweight chalkboard.
Should work just fine in both desktop and mobile Chrome..

![ChalkBoard Demo](demo/demo.gif)


## functionality:

* basic figures available: lines, arrows, boxes, ellipses..
* drawing modes: solid, dashed, dotted, "distorted" (supposed to mimic real world whiteboard drawings)
* basic text typing (latin alphanumeric, all glyphs vector-rendered as you type them)
* selecting, copypasting (works with system clipboard)
* basic presenting: slides / viewpoint list handling and navigation
* virtually infinite zoom
* rudimentary online shared drawing sessions (refreshed with server polling, so not instant)
* named boards
* read-only (write protected) boards
* saving / loading board from / to browser local storage
* downloading / uploading board from / to machine local storage

### hosted on github pages:

 * https://r0d1on.github.io/chalkboard/

### running locally:

**you'll need to have docker installed.**

* `make run` (if you have **make**) 

**or**

* `docker build -t chalkboard .` 
* `docker run -p 5000:5000 chalkboard`.
* navigate to *http://127.0.0.1:5000*


