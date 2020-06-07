import flask
import re
import os
import sys
import json

app = flask.Flask(__name__
                ,static_url_path = ''
                ,static_folder   = 'static'
                #,template_folder=''
                )

@app.route('/', methods=['GET'])
def http_root():
    return flask.redirect(flask.url_for('static',filename='board.html#about').replace('%23','#'))

VECTOR_GROUP   = 3
VECTOR_ID      = 4
VECTOR_VERSION = 6

def mergein(loc,msg):
    idx = {}
    for i,vec in enumerate(loc['a']):
        key = str(vec[VECTOR_GROUP])+'|'+str(vec[VECTOR_ID])
        idx[key] = i

    for vec in msg['a']:
        vec[VECTOR_VERSION] = loc['v']
        key = str(vec[VECTOR_GROUP])+'|'+str(vec[VECTOR_ID])
        if (key in idx):
            loc['a'][idx[key]] = vec
        else:
            loc['a'].append(vec)
    return

@app.route("/board.php", methods=['POST'])
def http_php():
    msg = flask.request.get_json(force=True)
    #print("board=",msg['i'],' size=',len(msg['a']),' ver=',msg['v'])

    bname = msg['i'].split('!',1)
    if len(bname)==1:
        bpass = None
    else:
        bpass = bname[1]
    bname = bname[0]

    bfile = "boards/brd_"+(re.sub("\\\|/|%|\.","_",bname))+".json"

    if (os.path.isfile(bfile)):
        with open(bfile,'rt') as f:
            loc = json.loads(f.read())
    else:
        loc = {"a":[],"v":0,"p":bpass}

    if (len(msg['a'])>0):
        if (loc['p'] is None)or(loc['p']==bpass):
            loc['v'] += 1
            mergein(loc,msg)
            with open(bfile,'wt') as f:
                f.write(json.dumps(loc))

    upd = []
    for vec in loc['a']:
        if (vec[VECTOR_VERSION]>msg['v']):
            upd.append(vec)

    return json.dumps({
         "a" : upd
        ,"v" : loc['v']
    })


if __name__ == '__main__':
    debug = False
    if len(sys.argv)>1:
        debug = ('--debug' in sys.argv)or('--test' in sys.argv)

    if debug:
        app.run(debug = True)
    else:
        app.run(host='0.0.0.0')

