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

    ,log : function(level, ...args) {
        console.log(...args);
    }

    ,request : function(api_endpoint, message, callback, timeout) {
        timeout = (timeout===undefined) ? 10*1000 : timeout;
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onreadystatechange = ((xhr, message)=>{
                return ()=>{
                    if (xhr.readyState == 4) {
                        callback && callback(xhr, message);
                        if (xhr.status == 200) {
                            resolve({'xhr': xhr, 'message': message});
                        } else {
                            IO.log(0, 'rejected', xhr);
                            reject({'xhr': xhr, 'error': 'rejected', 'message': message});
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

            xhr.open('POST', api_endpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            xhr.send(JSON.stringify((message)));
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
