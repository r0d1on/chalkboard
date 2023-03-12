'use strict';

import {_class} from '../base/objects.js';

let IO = {
    type : 'direct.proxy'

    ,stats : null
    ,handlers : null

    ,IO : function() {
        this.stats = {};
        this.handlers = {};
    }

    ,_fetch_stream : function(stream) {
        const reader = stream.getReader();
        let result = [];
        function get_some({done, value}) {
            if (done)
                return result;
            result.push(value);
            return reader.read().then(get_some);
        }
        return reader.read().then(get_some);
    }

    ,compress : function(data_str) {
        return this._fetch_stream(
            new Blob([data_str]).stream().pipeThrough(new CompressionStream('gzip')) // eslint-disable-line no-undef
        );
    }

    ,_bytes_to_chars : function(chunk) {
        return chunk.reduce((a, v)=>{
            a.push(String.fromCharCode(v));
            return a;
        }, []).join('');
    }

    ,decompress : function(data_bytes) {
        return this._fetch_stream(
            (new Blob([data_bytes]))
                .stream()
                .pipeThrough(new DecompressionStream('gzip')) // eslint-disable-line no-undef
        ).then((chunks)=>{
            let data_str = chunks.reduce((r, chunk)=>{
                return r + this._bytes_to_chars(chunk);
            }, '');
            return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
                resolve(data_str);
            });
        });
    }

    ,log : function(level, ...args) {
        console.log(...args);
    }

    ,request : function(api_endpoint, message, {timeout, compress}) {
        timeout = (timeout===undefined) ? 10*1000 : timeout;
        let that = this;

        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.overrideMimeType('application/octet-stream');
            xhr.responseType = 'arraybuffer';

            xhr.onreadystatechange = ((xhr, message)=>{
                return ()=>{
                    if (xhr.readyState == 4) {
                        if (xhr.status != 200) {
                            IO.log(0, 'rejected', xhr);
                            reject({'xhr': xhr, 'error': 'rejected', 'message': message});
                            return;
                        }

                        const bytes = new Uint8Array(xhr.response);

                        if ((bytes.length>10)&&(bytes[0]==31)&&(bytes[1]==139)&&(bytes[2]==8)) {
                            // gzipped response
                            that.decompress(bytes).then((responseText)=>{
                                resolve({
                                    'xhr': {
                                        'responseText' : responseText
                                    },
                                    'message': message
                                });
                            });
                        } else {
                            // plain text
                            resolve({
                                'xhr': {
                                    'responseText' : that._bytes_to_chars(bytes)
                                },
                                'message': message
                            });
                        }
                    } else {
                        //console.log("xhr:", xhr, "rs:", xhr.readyState);
                    }
                };
            })(xhr, message);

            xhr.timeout = timeout;
            xhr.ontimeout = ((xhr, message)=>{
                return ()=>{
                    IO.log(0, 'timeout', xhr);
                    reject({'xhr': xhr, 'error': 'timeout', 'message': message});
                };
            })(xhr, message);

            xhr.onerror = ((xhr, message)=>{
                return ()=>{
                    IO.log(0, 'error', xhr);
                    reject({'xhr': xhr, 'error': 'error', 'message': message});
                };
            })(xhr, message);

            if (compress) {
                that.compress(JSON.stringify(message)).then((chunks)=>{
                    xhr.open('POST', api_endpoint, true);
                    xhr.send(new Blob(chunks, {'type': 'application/octet-stream'}));
                });
            } else {
                xhr.open('POST', api_endpoint, true);
                xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                xhr.send(JSON.stringify(message));
            }
        });
    }

    ,handler_proxy : function(target, event_type, event_handler) {
        let that = this;
        function proxy(...args) {
            that.stats[event_type] = ((that.stats[event_type])||0) + 1;
            event_handler(...args);
        }
        return proxy;
    }

    ,add_event : function(target, event_type, event_handler) {
        let target_name = (target.tagName||(typeof(target)+':'+target)) + '.' + (target.id||'');
        this.log(2, '+listener:', target_name, ' :: ', event_type);
        const proxy = this.handler_proxy(target, event_type, event_handler);

        let target_type = (typeof(target)=='object')?target.constructor.name:typeof(target);
        let target_id = ((target.id===undefined)?('+' + target_type):target.id);

        this.handlers[target_id] = this.handlers[target_id]||{};
        this.handlers[target_id][event_type] = event_handler;

        target.addEventListener(event_type, proxy);
    }
};

IO = _class('IO', IO);

export {IO};
