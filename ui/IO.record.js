'use strict';

import {_class} from '../base/objects.js';

import {IO as BaseIO} from './IO.js';

/*
localStorage.setItem('record', JSON.stringify(UI.IO.events_log));
UI.IO.events_log = JSON.parse(localStorage.getItem('record'));
UI.IO.replay_events();
*/

let IO = {
    super: BaseIO

    ,type : 'recording.proxy'
    ,EVENTS: {
        'MouseEvent' : ['offsetX', 'offsetY', 'button']
        ,'WheelEvent' : ['deltaY', 'deltaX']
        ,'KeyboardEvent' : ['key']
        ,'Event' : []
        ,'PointerEvent' : []
        ,'ClipboardEvent' : []
        ,'HashChangeEvent' : []
        ,'TouchEvent' : ['touches']
    }

    ,ts : null
    ,events_log : null

    ,IO : function() {
        BaseIO.init.call(this);
        this.ts = (+new Date());
        this.events_log = [];
    }

    ,unmap_event : function(cls, type, props) {
        let event = {
            preventDefault : function(){}
            ,stopPropagation : function(){}
        };
        for(let key in props)
            event[key] = props[key];
        return event;
    }

    ,replay_events : function(speedup) {
        speedup = (speedup===undefined)?1:speedup;
        let that = this;
        function replay(index) {
            if (index < that.events_log.length) {
                let event = that.events_log[index];
                setTimeout(()=>{
                    const handler = that.handlers[event['t']][event['k']];
                    handler(that.unmap_event(event['c'], event['k'], event['p']));
                    replay(index + 1);
                }, event['-'] / speedup);
            }
        }
        replay(0);
    }

    ,map_event : function(e, event_type, target_type, target, args) {
        const type = typeof(e);
        let cls, props;
        if (type=='object') {
            cls = e.constructor.name;
            if (cls in IO.EVENTS) {
                props = {};
                IO.EVENTS[cls].map((key)=>{
                    props[key] = e[key];
                });
            } else {
                console.error('cls>', cls, ' e:', event_type, ' t:', target, target_type, target.id, args);
                throw 'IO.recorder : unknown param class';
            }
        } else {
            console.error('typ>', type, ' e:', event_type, ' t:', target, target_type, target.id, args);
            throw 'IO.recorder : unknown param type';
        }
        return [cls, props];
    }

    ,record_event : function(target, event_type, ...args) {
        let target_type = (typeof(target)=='object')?target.constructor.name:typeof(target);
        let target_id = ((target.id===undefined)?('+' + target_type):target.id);

        if (args.length>1) {
            console.error(args);
            throw 'IO.recorder : args.length > 1';
        }

        let [c, p] = this.map_event(args[0], event_type, target_type, target, args);

        const ts = (+new Date());
        this.events_log.push({
            't' : target_id
            ,'k' : event_type
            ,'c' : c
            ,'p' : p
            ,'-' : ts - this.ts
        });
        this.ts = ts;
    }

    ,handler_proxy : function(target, event_type, event_handler) {
        let that = this;
        function proxy(...args) {
            that.record_event(target, event_type, ...args);
            event_handler(...args);
        }
        return proxy;
    }

};

IO = _class('IO', IO);

export {IO};
