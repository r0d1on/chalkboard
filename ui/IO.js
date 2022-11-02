'use strict';

let IO = {
    add_event : function(target, event_type, event_handler) {
        //UI.log('listener registered: ', event_type, 'for', target);
        target.addEventListener(event_type, event_handler);
    }

    ,type : function() {
        return 'direct.proxy';
    }
};

export {IO};
