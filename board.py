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
    for in_commit, in_strokes in msg['strokes'].items():
        loc['strokes'][in_commit] = loc['strokes'].get(in_commit, {})
        for in_idx, in_stroke in in_strokes.items():
            own_stroke = loc['strokes'][in_commit].get(in_idx, None)
            if (own_stroke is None)or(in_stroke['version'] > own_stroke['version']):
                loc['strokes'][in_commit][in_idx] = in_stroke

    return

@app.route("/board.php", methods=['POST'])
def http_php():
    msg = flask.request.get_json(force=True)

    print("<= brd=", msg['name'], ' ver=', msg['version'], ' |msg|=', len(msg['strokes']))

    bname = msg['name'].split('!',1)
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

    auth = ((bpass=="") or (loc['p']==bpass))

    # process the request (ingest remote updates)
    if (msg.get("lead", 0)) and (auth):
        loc["view_rect"] = msg["view_rect"]
        changed = True

    if (loc["version"] < msg["version"]) and (auth):
        loc["version"] = msg["version"]
        loc["view_rect"] = msg["view_rect"]
        loc["slides"] = msg["slides"]
        loc["p"] = bpass
        changed = True

    if (len(msg["strokes"]) > 0) and (auth):
        if (msg["refresh"] == 1):
            loc["version"] = 0
            loc["strokes"] = {}

        sync_message(loc, msg)
        changed = True

    if changed:
        with open(bfile, 'wt') as f:
            f.write(json.dumps(loc))
        print("updated board:", bfile)

    # prepare response with local
    upd = {}
    for loc_commit, loc_strokes in loc['strokes'].items():
        for loc_idx, loc_stroke in loc_strokes.items():
            if (loc_stroke['version'] > msg['version']):
                upd[loc_commit] = upd.get(loc_commit, {})
                upd[loc_commit][loc_idx] = loc_stroke

    print("=> brd=", msg['name'], ' |upd|=', len(upd))


    return json.dumps({
          "strokes" : upd
         ,"received_version" : msg["version"]
         ,"view_rect" : loc.get("view_rect", None)
         ,"slides" : loc.get("slides", [])
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

    if debug:
        app.run(host=bind_ip, port=port, threaded=False, debug=True)
    else:
        app.run(host=bind_ip, port=port, threaded=False)

