'use strict';

let IO = {
    STATS : {}

    ,log : function(...args) {
        console.log(...args);
    }

    ,handler_proxy : function(target, event_type, event_handler) {
        function proxy(...args) {
            //IO.log('> ', target, ' :: ', event_type, ' :: ', ...args);
            IO.STATS[event_type] = ((IO.STATS[event_type])||0) + 1;
            event_handler(...args);
        }
        return proxy;
    }

    ,add_event : function(target, event_type, event_handler) {
        IO.log('listener registered: ', event_type, 'for', target);
        const proxy = IO.handler_proxy(target, event_type, event_handler);
        target.addEventListener(event_type, proxy);
    }

    ,type : function() {
        return 'direct.proxy';
    }
};

export {IO};
