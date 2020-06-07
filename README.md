# chalkboard

Multiplayer touch-friendly lightweight chalkboard.
Should work just fine in both desktop and mobile Chrome. 

--

To run the app locally you will need **docker** installed.
To start playing with it do 
* `make run` (if you have **make**) **or** 
* `docker build -t chalkboard .` , `docker run -p 5000:5000 chalkboard` 

and navigate you browser to *http://127.0.0.1:5000*
