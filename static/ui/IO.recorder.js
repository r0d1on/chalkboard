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
    ,icon : [null,[8,49],[8,9],[50,9],null,[8,49],[29,49],null,[50,29],[50,9],[8,9],null,[50,9],[50,29],null,[8,9],[8,49],[29,49],null,[47,52],[39,52],null,[34,47],[34,39],null,[52,39],[52,47],null,[39,34],[47,34],null,[50,35],[50,35],null,[50,51],[50,51],null,[36,50],[36,50],null,[36,35],[36,35],null,[38,43],[43,48],[48,43],null,[43,38],[43,48],[38,43],null,[48,43],[43,48],[43,38],null,[15,28],[15,15],[15,28],null,[21,15],[15,15],[21,15],null,[26,28],[26,15],[26,28],null,[31,15],[26,15],[31,15],null,[30,21],[26,21],[30,21],null,[31,28],[26,28],[31,28],null,[36,28],[36,15],[36,28],[42,28],[36,28],null,[22,21],[21,15],[22,21],[15,21],[22,21],null,[21,28],[15,21],[21,28],null,[42,15],[36,15],[42,15]]

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

    ,init : function(MENU_main) {
        IO.super.init.call(this, MENU_main);
        let ctx = MENU_main.add('download_group', 'download_rec', ()=>{
            this.download_rec();
        }, 'canvas', 'download recording')[1].getContext('2d');
        this.UI.draw_glyph(IO.icon, ctx);
        this.UI.addEventListener('on_file', (file)=>{
            this.on_file(file);
        });
    }

    ,on_file : function(file) {
        let that = this;

        if (file.name.endsWith('.record.gzip')) {
            this.read_file(file, 'gzip').then((json_data)=>{
                that.events_log = JSON.parse(json_data);
                that.stop_playing();
                that.UI.log(0, 'record loaded');
                that.UI.toast('recorder_msg', 'record loaded', 2000);

                that.UI.on_key_down('Escape'); // force cancel active tool if any
                that.UI.redraw();

                that.start_playing();
            });
        } else {
            return false;
        }

        return true;
    }

    ,download_rec : function() {
        let record = JSON.stringify(this.events_log);
        let that = this;
        this.compress(record).then((chunks)=>{
            let blob = new Blob(chunks, {'type': 'application/octet-stream'});
            let exportUrl = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = exportUrl;
            a.download = that.UI._hash_board_mode()[0] + '.record.gzip';
            a.click();
            URL.revokeObjectURL(exportUrl);
        });

        this.MENU_main.hide('save_group');
    }

    ,unmap_event : function(cls, type, props) {
        let event = {
            preventDefault : function(){}
            ,stopPropagation : function(){}
            ,stopImmediatePropagation : function(){}
        };
        for(let key in props)
            event[key] = props[key];
        return event;
    }

    ,replay_events : function(speedup=1) {
        this.status = IO.STATUSES.PLAYING;
        let that = this;
        function replay(index) {
            if (index < that.events_log.length) {
                let event = that.events_log[index];
                that.timer = setTimeout(()=>{
                    const handler = that.handlers[event['t']][event['k']];
                    try {
                        handler(that.unmap_event(event['c'], event['k'], event['p']));
                    } catch (error) {
                        that.UI.log(-2, 'Caught error while playing:', error.message);
                        that.UI.log(-2, 'Stacktrace', error.stack);
                        throw error;
                    }
                    that.position = index + 1;
                    replay(index + 1);
                }, event['-'] / speedup);
            } else {
                that.UI.log(0, 'recording ended');
                that.position = 0;
                that.stop_playing();
                that.status = IO.STATUSES.PLAYED;
                that.UI._canvas_changed(-1);
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

    ,start_recording : function() { // `
        this.status = IO.STATUSES.RECORDING;
        this.ts = (+new Date());
        this.events_log = [];
        let toast = this.UI.toast('recorder', '◉', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#F333');
        this.UI.log(0, 'recording started');
    }

    ,stop_recording : function() { // `
        this.status = IO.STATUSES.PASS;
        let toast = this.UI.toast('recorder', '⏸', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3333');
        this.UI.log(0, 'recording stopped');
    }

    ,start_playing : function(speedup) { // F9
        let toast = this.UI.toast('recorder', '▶', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3F33');
        this.UI.log(0, 'playing record, speedup: ' + speedup);
        this.status = IO.STATUSES.PLAYING;
        this.replay_events(speedup);
    }

    ,stop_playing : function() { // F9
        clearTimeout(this.timer);
        this.status = IO.STATUSES.PASS;
        let toast = this.UI.toast('recorder', '⏸', -1, 1); // TOP_RIGHT
        toast.set_bg_color('#3333');
        this.UI.log(0, 'record playing stopped');
    }


    ,load_recording : function() { // F1
        this.UI.toast('recorder', '💾', -1, 1).set_bg_color('#33F3');

        let message = {
            'name' : this.UI._hash_board_mode()[0]
        };

        const that = this;

        return this.request('/record.load', message, {})
            .then(({xhr})=>{
                that.events_log = JSON.parse(xhr.responseText)['log'];
                that.stop_playing();
                that.UI.log(0, 'record loaded');
                that.UI.toast('recorder_msg', 'record loaded', 2000);
            })
            .catch(({xhr, error})=>{
                that.UI.toast('recorder', '💾', -1, 1).set_bg_color('#F333');
                that.UI.log(-2, 'could not load recording:', error, xhr);
                that.UI.toast('recorder_msg', 'could not load recording: ' + error, 2000);
            });
    }

    ,save_recording : function () { // F2
        this.UI.toast('recorder', '💾', -1, 1).set_bg_color('#33F3');

        let message = {
            'name' : this.UI._hash_board_mode()[0]
            ,'log' : this.events_log
        };

        const that = this;

        return this.request('/record.save', message, {compress: true})
            .then(()=>{
                that.stop_playing();
                that.UI.log(0, 'record saved');
                that.UI.toast('recorder_msg', 'record saved', 2000);
            })
            .catch(({error, xhr})=>{
                that.UI.toast('recorder', '💾', -1, 1).set_bg_color('#F333');
                that.UI.log(-2, 'could not save recording:', error, xhr);
                that.UI.toast('recorder_msg', 'could not save recording:' + error, 2000);
            });
    }


    ,handle_event : function(e, event_type) {
        let handled = false;

        if (event_type === 'keydown') {
            if (e.key == 'F9') { // play / pause
                handled = true;
            } else if (e.key == '`') { // record on / off
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
            } else if (e.key == '`') {
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
