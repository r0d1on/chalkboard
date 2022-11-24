import flask
import re
import os
import sys
import json

CONFIG = {
    "dry" : False
}

app = flask.Flask(__name__
                ,static_url_path = ''
                ,static_folder   = 'static'
                #,template_folder=''
                )

@app.route('/', methods=['GET'])
def http_root():
    return flask.redirect(flask.url_for('static',filename='index.html#about').replace('%23','#'))

def sync_message(loc, msg):
    for in_commit, in_strokes in msg['strokes'].items():
        loc['strokes'][in_commit] = loc['strokes'].get(in_commit, {})
        for in_idx, in_stroke in in_strokes.items():
            own_stroke = loc['strokes'][in_commit].get(in_idx, None)
            if (own_stroke is None)or(in_stroke['version'] > own_stroke['version']):
                loc['strokes'][in_commit][in_idx] = in_stroke

    return

@app.route("/record.load", methods=['POST'])
def http_record_load():
    msg = flask.request.get_json(force=True)
    msg = json.loads(msg);
    print(">= rec:", msg['name'])

    bname = msg['name'].split('!', 1)[0]
    bfile = "records/brd_" + (re.sub("\\\|/|%|\.", "_", bname)) + ".json"

    if (os.path.isfile(bfile)):
        with open(bfile, 'rt') as f:
            log = json.loads(f.read())
    else:
        log = []

    return json.dumps(log)


@app.route("/record.save", methods=['POST'])
def http_record_save():
    msg = flask.request.get_json(force=True)
    msg = json.loads(msg);
    print("<= rec:", msg['name'], len(msg['log']))

    bname = msg['name'].split('!', 1)[0]
    bfile = "records/brd_" + (re.sub("\\\|/|%|\.", "_", bname)) + ".json"

    with open(bfile, 'wt') as f:
        f.write(json.dumps(msg['log']))
    
    return json.dumps([])


@app.route("/sync", methods=['POST'])
def http_sync():
    msg = flask.request.get_json(force=True)

    print("<= brd=", msg['name'], ' ver=', msg['version'], ' |msg|=', len(msg['strokes']))

    if (msg["version"] < 0) and (CONFIG['dry']):
        raise Exception("backend is not available")

    bname = msg['name'].split('!', 1)
    if len(bname)==1:
        bpass = ""
    else:
        bpass = bname[1]
    bname = bname[0]

    bfile = "boards/brd_" + (re.sub("\\\|/|%|\.", "_", bname)) + ".json"

    changed = False

    if (os.path.isfile(bfile)):
        try:
            with open(bfile, 'rt') as f:
                loc = json.loads(f.read())
        except Exception as ex:
            print("ex: ", ex)
            return json.dumps({
                "resync" : 1
            })
    else:
        print("new board:", bfile)
        loc = {
             "version" : 0
            ,"strokes" : {}
            ,"view_rect" : None
            ,"slides" : []

            ,"p" : bpass
        }
        changed = True
        
    if loc.get("PERSISTENCE_VERSION",None) is None:
        loc["PERSISTENCE_VERSION"] = 2

    auth = ((bpass=="") or (loc['p']==bpass))

    # process the request (ingest remote updates)
    
    if (msg.get("lead", 0)) and (auth): # someone's leading - update the view
        loc["view_rect"] = msg["view_rect"]
        changed = True

    if (loc["version"] < msg["version"]) and (auth): # new version incoming
        loc["version"] = msg["version"]
        loc["view_rect"] = msg["view_rect"]
        loc["slides"] = msg["slides"]
        loc["p"] = bpass
        changed = True

    if (len(msg["strokes"]) > 0) and (auth): # have some strokes incoming
        
        if (loc["PERSISTENCE_VERSION"] < msg["PERSISTENCE_VERSION"]): # format update
            msg["refresh"] = 1
        
        if (msg["refresh"] == 1): # full reset requested
            loc["version"] = 0
            loc["strokes"] = {} 
        
        sync_message(loc, msg) # sync in the data
        changed = True

    if changed:
        loc["PERSISTENCE_VERSION"] = max(loc["PERSISTENCE_VERSION"], msg["PERSISTENCE_VERSION"])
        with open(bfile, 'wt') as f:
            f.write(json.dumps(loc))
        print("updated board:", bfile)

    # prepare response with local updates
    upd = {}
    for loc_commit, loc_strokes in loc['strokes'].items():
        for loc_idx, loc_stroke in loc_strokes.items():
            if (loc_stroke.get('version', None) is None):
                print('loc: ',loc_stroke)
            if (msg.get('version', None) is None):
                print('msg: ',msg)
                
            if (loc_stroke['version'] > msg['version']):
                upd[loc_commit] = upd.get(loc_commit, {})
                upd[loc_commit][loc_idx] = loc_stroke

    print("=> brd=", msg['name'], ' |upd|=', len(upd))


    return json.dumps({
          "strokes" : upd
         ,"received_version" : msg["version"]
         ,"view_rect" : loc.get("view_rect", None)
         ,"slides" : loc.get("slides", [])
         ,"PERSISTENCE_VERSION" : loc["PERSISTENCE_VERSION"]
    })


if __name__ == '__main__':
    debug = False
    port = 5000
    bind_ip = '0.0.0.0'

    if len(sys.argv) > 1:
        debug = ('--debug' in sys.argv)
        if '--port' in sys.argv:
            port = sys.argv[sys.argv.index('--port') + 1]
        
        if '--bind' in sys.argv:
            bind_ip = sys.argv[sys.argv.index('--bind') + 1]

        if '--dry' in sys.argv:
            CONFIG['dry'] = sys.argv[sys.argv.index('--dry') + 1]
        else:
            CONFIG['dry'] = False
        print('dry mode:', CONFIG['dry'])

    if debug:
        app.run(host=bind_ip, port=port, threaded=False, debug=True)
    else:
        app.run(host=bind_ip, port=port, threaded=False)

