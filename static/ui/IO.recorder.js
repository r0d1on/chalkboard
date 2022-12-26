'use strict';

import {_class} from '../base/objects.js';

import {IO as BaseIO} from './IO.js';


let IO = {
    super: BaseIO

    ,type : 'recorder.proxy'
    ,EVENTS: {
        'MouseEvent' : ['offsetX', 'offsetY', 'button']
        ,'WheelEvent' : ['deltaY', 'deltaX']
        ,'KeyboardEvent' : ['key']
        ,'Event' : []
        ,'PointerEvent' : ['offsetX', 'offsetY', 'button', 'pressure', 'pointerType']
        ,'ClipboardEvent' : []
        ,'HashChangeEvent' : []
        ,'TouchEvent' : ['touches']
    }
    ,STATUSES : {
        PASS : 0
        ,PLAYING : 1
        ,PLAYED : 2
        ,RECORDING : 3
    }

    ,UI : null

    ,ts : null
    ,events_log : null

    ,status : 0
    ,timer : null
    ,position : null

    ,IO : function() {
        BaseIO.__init__.call(this);
        this.ts = (+new Date());
        this.events_log = [];
        this.status = IO.STATUSES.PASS;
        this.timer = null;
        this.position = null;
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
        this.status = IO.STATUSES.PLAYING;
        speedup = (speedup===undefined)?1:speedup;
        let that = this;
        function replay(index) {
            if (index < that.events_log.length) {
                let event = that.events_log[index];
                that.timer = setTimeout(()=>{
                    const handler = that.handlers[event['t']][event['k']];
                    handler(that.unmap_event(event['c'], event['k'], event['p']));
                    that.position = index + 1;
                    replay(index + 1);
                }, event['-'] / speedup);
            } else {
                that.position = 0;
                that.stop_playing();
                that.status = IO.STATUSES.PLAYED;
            }
        }
        replay(this.position||0);
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

    ,start_recording : function() {
        this.status = IO.STATUSES.RECORDING;
        this.ts = (+new Date());
        this.events_log = [];
        let toast = this.UI.toast('recorder', '◉', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#F333');
    }

    ,stop_recording : function() {
        this.status = IO.STATUSES.PASS;
        let toast = this.UI.toast('recorder', '⏸', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3333');
    }

    ,start_playing : function() {
        let toast = this.UI.toast('recorder', '▶', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3F33');
        this.status = IO.STATUSES.PLAYING;
        this.replay_events();
    }

    ,stop_playing : function() {
        clearTimeout(this.timer);
        this.status = IO.STATUSES.PASS;
        let toast = this.UI.toast('recorder', '⏸', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3333');
    }


    ,load_recording : function() {
        let toast = this.UI.toast('recorder', '💾', -1, 1);
        toast.set_bg_color('#33F3');
        let message = {
            'name' : this.UI._hash_board_mode()[0]
        };

        this.request('/record.load', JSON.stringify(message), (xhr)=>{
            if (xhr.status == 200) {
                this.events_log = JSON.parse(xhr.responseText);
                this.stop_playing();
            } else {
                let toast = this.UI.toast('recorder', '💾', -1, 1);
                toast.set_bg_color('#F333');
            }
        }, 1000);
    }

    ,save_recording : function () {
        let toast = this.UI.toast('recorder', '💾', -1, 1);
        toast.set_bg_color('#33F3');

        let message = {
            'name' : this.UI._hash_board_mode()[0]
            ,'log' : this.events_log
        };

        this.request('/record.save', JSON.stringify(message), (xhr)=>{
            if (xhr.status == 200) {
                this.stop_playing();
            } else {
                let toast = this.UI.toast('recorder', '💾', -1, 1);
                toast.set_bg_color('#F333');
            }
        }, 1000);
    }


    ,handle_event : function(e, event_type) {
        let handled = false;

        if (event_type === 'keydown') {
            if (e.key == 'F9') { // play / pause
                handled = true;
            } else if (e.key == 'CapsLock') { // record on / off
                handled = true;
            } else if (e.key == 'F1') { // load record
                if (this.status in [IO.STATUSES.PASS, IO.STATUSES.PLAYED])
                    this.load_recording();
                handled = true;
            } else if (e.key == 'F2') { // save record
                if (this.status in [IO.STATUSES.PASS, IO.STATUSES.PLAYED])
                    this.save_recording();
                handled = true;
            }
        }

        if (event_type == 'keyup') {
            if (e.key == 'F9') {
                if (this.status == IO.STATUSES.RECORDING)
                    this.stop_recording();
                if (this.status == IO.STATUSES.PLAYING)
                    this.stop_playing();
                else
                    this.start_playing();
                handled = true;
            } else if (e.key == 'CapsLock') {
                if (this.status == IO.STATUSES.PLAYING)
                    this.stop_playing();
                if (this.status == IO.STATUSES.RECORDING)
                    this.stop_recording();
                else
                    this.start_recording();
                handled = true;
            } else if (e.key == 'F1') {
                handled = true;
            } else if (e.key == 'F2') {
                handled = true;
            }
        }

        return handled;
    }

    ,filter_event : function(target, event_type, ...args) {
        let e = args[0];
        let handled = this.handle_event(e, event_type);

        if (handled) {
            e.stopPropagation();
            e.preventDefault();
            return true;
        }

        if (this.status == IO.STATUSES.RECORDING)
            this.record_event(target, event_type, ...args);

        return false;
    }

    ,handler_proxy : function(target, event_type, event_handler) {
        let that = this;
        function proxy(...args) {
            if (!that.filter_event(target, event_type, ...args))
                event_handler(...args);
        }
        return proxy;
    }

};

IO = _class('IO', IO);

export {IO};
