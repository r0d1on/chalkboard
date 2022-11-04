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

    ,log : function(...args) {
        console.log(...args);
    }

    ,request : function(api_endpoint, message, cb, timeout) {
        timeout = (timeout===undefined) ? 10*1000 : timeout;

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = ((xhr, message)=>{
            return ()=>{
                if (xhr.readyState == 4) {
                    cb(xhr, message);
                } else {
                    //console.log("xhr:", xhr, "rs:", xhr.readyState);
                }
            };
        })(xhr, message);

        xhr.timeout = timeout;
        xhr.ontimeout = ((xhr)=>{
            return ()=>{
                IO.log('timeout',xhr);
            };
        })(xhr);
        xhr.open('POST', api_endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

        xhr.send(JSON.stringify((message)));
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
        this.log('listener registered:', event_type, 'for', target);
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
