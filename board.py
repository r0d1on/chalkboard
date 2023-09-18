import flask
import re
import os
import sys
import json
import gzip
from io import BytesIO, StringIO


app = flask.Flask(__name__
                ,static_url_path = ''
                ,static_folder   = 'static'
                #,template_folder=''
                )

@app.route('/', methods=['GET'])
def http_root():
    return flask.redirect(flask.url_for('static',filename='index.html#about').replace('%23','#'))


def _compress(s):
    out = BytesIO()
    with gzip.GzipFile(fileobj=out, mode="w") as f:
      f.write(s.encode())
    return out.getvalue()


@app.route("/record.load", methods=['POST'])
def http_record_load():
    msg = flask.request.get_json(force=True)
    print(">= rec:", msg['name'])

    bname = msg['name'].split('!', 1)[0]
    bfile = "records/brd_" + (re.sub("\\\|/|%|\.", "_", bname)) + ".json"

    if (os.path.isfile(bfile + '.gzip')):
        with open(bfile + '.gzip', 'rb') as f:
            content = f.read()
        print('sending gzipped record:', len(content))
    else:
        if (os.path.isfile(bfile)):
            with open(bfile, 'rt') as f:
                log = json.loads(f.read())
        else:
            log = []
        content = _compress(json.dumps({
            "name": msg['name']
            ,"log": log
        }))
        print('sending json record:', len(content))

    return flask.Response(content, headers={
        'Content-Type': 'application/octet-stream'
    })


@app.route("/record.save", methods=['POST'])
def http_record_save():
    content_type = flask.request.headers['Content-Type'].split(";")[0]
    content = None

    if (content_type == 'application/json'):
        msg = flask.request.get_json(force=True)
        content = _compress(json.dumps(msg))
    elif (content_type == 'application/octet-stream'):
        content = flask.request.data
        msg = json.loads(gzip.GzipFile(fileobj=BytesIO(content)).read().decode())
    else:
        print("Unsupported content type: ", content_type)
        raise(Exception("unsupported content type: " + content_type))
        
    print("<= rec:", msg['name'], len(msg['log']))
    print("content:", type(content), len(content))

    bname = msg['name'].split('!', 1)[0]
    bfile = "records/brd_" + (re.sub("\\\|/|%|\.", "_", bname)) + ".json.gzip"

    with open(bfile, 'wb') as f:
        f.write(content)
    
    return json.dumps([])

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

