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

def sync_message(loc, msg):
    id2idx = {}
    for idx, stroke in enumerate(loc['strokes']):
        id2idx[stroke['stroke_id']] = idx

    for in_stroke in msg['strokes']:
        if in_stroke['stroke_id'] in id2idx:
            sid = id2idx[in_stroke['stroke_id']]
            own_stroke = loc['strokes'][sid]
            if in_stroke['version'] > own_stroke['version']:
                loc['strokes'][sid] = in_stroke
        else:
            loc['strokes'].append(in_stroke)

    return

@app.route("/board.php", methods=['POST'])
def http_php():
    msg = flask.request.get_json(force=True)
    
    print("brd=",msg['name'],' ver=', msg['version'],' msg=',len(msg['strokes']))

    bname = msg['name'].split('!',1)
    if len(bname)==1:
        bpass = ""
    else:
        bpass = bname[1]
    bname = bname[0]

    bfile = "boards/brd_"+(re.sub("\\\|/|%|\.","_",bname))+".json"

    """
        var message = JSON.stringify({
             name : BOARD.board_name

            ,version : BOARD.version
            ,strokes : new_strokes
            ,view_rect : (UI.view_mode=="follow") ? null : SLIDER.get_current_frame()
            ,slides : (UI.view_mode=="follow") ? null : SLIDER.slides

            ,refresh : (SAVE.sent_version == null) ? 1 : 0
        });    
    """

    changed = False

    if (os.path.isfile(bfile)):
        try:
            with open(bfile,'rt') as f:
                loc = json.loads(f.read())
        except Exception as ex:
            print("ex: ",ex)
            return json.dumps({
                "resync" : 1
            })
    else:
        print("new board:",bfile)
        loc = {
             "version" : 0
            ,"strokes" : []
            ,"view_rect" : None
            ,"slides" : []
            
            ,"p" : bpass
        }
        changed = True

    auth = ((bpass=="") or (loc['p']==bpass))

    if (msg.get("lead",0))and(auth):
        loc["view_rect"] = msg["view_rect"]
        changed = True

    if (loc["version"] < msg["version"])and(auth):
        loc["version"] = msg["version"]
        loc["view_rect"] = msg["view_rect"]
        loc["slides"] = msg["slides"]
        loc["p"] = bpass
        changed = True

    if (len(msg["strokes"])>0)and(auth):
        if (msg["refresh"]==1):
            loc["version"] = 0
            loc["strokes"] = []
        
        sync_message(loc, msg)
        changed = True

    if changed:
        with open(bfile,'wt') as f:
            f.write(json.dumps(loc))
        print("updated board:",bfile)

    upd = []
    for s in loc['strokes']:
        if (s['version'] > msg['version']):
            upd.append(s)

    return json.dumps({
          "strokes" : upd
         ,"received_version" : msg["version"]
         ,"view_rect" : loc.get("view_rect",None)
         ,"slides" : loc.get("slides",[])
    })


if __name__ == '__main__':
    debug = False
    port = 5000
    bind_ip = '0.0.0.0'
    
    if len(sys.argv)>1:
        debug = ('--debug' in sys.argv)
        if '--port' in sys.argv:
            port = sys.argv[sys.argv.index('--port')+1]
        if '--bind' in sys.argv:
            bind_ip = sys.argv[sys.argv.index('--bind')+1]

    if debug:
        app.run(debug = True)
    else:
        app.run(host=bind_ip, port=port)

