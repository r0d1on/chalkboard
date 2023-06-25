'use strict';

import {deepcopy, obj_type} from '../base/objects.js';

import {Point} from '../util/Point.js';
import {Toast} from '../util/Toast.js';
import {ImageStroke} from '../util/Strokes.js';
import {Logger} from '../util/Logger.js';

import {Settings} from '../actions/Settings.js';

import {BOARD} from './BOARD.js';
import {BRUSH} from './BRUSH.js';
import {TOOLS} from './TOOLS.js';


let UI = {
    IO : null

    ,CANVAS_MARGIN : 20
    ,GRID : 30.0
    ,LAYERS : ['background', 'debug', 'board', 'buffer', 'overlay']

    ,GRID_MODE : Settings.new('grid_mode', 1
        , [[],[null,[30,5],[30,55],[30,5],null,[55,30],[5,30],[55,30],null,[19,13],[40,13],null,[20,48],[41,48],null,[11,18],[12,44],null,[48,17],[48,42]]]
        ,()=>{UI.redraw();}
    )

    ,THEME : Settings.new('board_theme', 0
        ,[[null,[8,11],[52,11],[52,50],[8,50],[8,11],[8,47],null,[8,50],[49,50],null,[52,47],[52,11],[52,47],null,[52,50],[8,50],null,[8,47],[8,11],null,[30,13],[30,48],null,[41,13],[41,48],null,[11,25],[49,25],null,[10,39],[49,39],null,[49,11],[11,11],[49,11],null,[19,13],[19,48]]
            ,[null,[8,10],[52,10],[52,49],null,[8,49],[8,10],null,[30,12],[30,47],null,[41,12],[41,47],null,[11,24],[49,24],null,[10,38],[49,38],null,[8,49],[52,49],null,[19,12],[19,47],null,[11,21],[11,12],[11,21],null,[15,21],[15,12],[15,21],[15,12],null,[11,12],[11,21],null,[22,21],[22,12],[22,21],null,[26,21],[26,12],[26,21],[26,12],null,[22,12],[22,21],null,[34,21],[34,12],[34,21],null,[38,21],[38,12],[38,21],[38,12],null,[34,12],[34,21],null,[45,21],[45,12],[45,21],null,[49,21],[49,12],[49,21],[49,12],null,[45,12],[45,21],null,[12,35],[12,27],[12,35],null,[15,35],[15,27],[15,35],[15,27],null,[12,27],[12,35],null,[23,35],[23,27],[23,35],null,[26,35],[26,27],[26,35],[26,27],null,[23,27],[23,35],null,[34,35],[34,27],[34,35],null,[37,35],[37,27],[37,35],[37,27],null,[34,27],[34,35],null,[45,35],[45,27],[45,35],null,[48,35],[48,27],[48,35],[48,27],null,[45,27],[45,35],null,[12,48],[12,41],[12,48],null,[15,48],[15,41],[15,48],[15,41],null,[12,41],[12,48],null,[23,48],[23,41],[23,48],null,[26,48],[26,41],[26,48],[26,41],null,[23,41],[23,48],null,[34,48],[34,41],[34,48],null,[37,48],[37,41],[37,48],[37,41],null,[34,41],[34,48],null,[45,48],[45,41],[45,48],null,[48,48],[48,41],[48,48],[48,41],null,[45,41],[45,48]]
            ,[null,[8,11],[52,11],[52,50],[8,50],[8,11],[8,47],null,[8,50],[49,50],null,[52,47],[52,11],[52,47],null,[52,50],[8,50],null,[8,47],[8,11],null,[49,11],[11,11],[49,11],null,[11,15],[49,15],[49,47],[11,47],[11,15],null,[15,18],[45,18],[45,43],[15,43],[15,18],null,[19,22],[41,22],[41,39],[19,39],[19,22],null,[22,26],[37,26],[37,35],[22,35],[22,26],null,[25,30],[34,30]]
        ]
        ,()=>{UI.redraw();}
    )

    ,logger : Logger.new(null, 0)

    ,_last_point : null
    ,_under_focus : false
    ,_last_button : 0

    ,is_mobile : false
    ,is_dirty : false
    ,view_id : 'xx'
    ,view_mode : undefined
    ,view_params : undefined

    ,window_width : null
    ,window_height : null

    ,layers : null
    ,contexts : null
    ,viewpoint : {
        dx : 0.0
        ,dy : 0.0
        ,scale : 1.0
    }


    ,special_keys : {
        'Control' : 'ctrlKey'
        , 'Shift' : 'shiftKey'
        , 'Alt' : 'altKey'
        , 'Meta' : 'metaKey'
    }
    ,keys : {
        'Control' : false
        , 'Shift' : false
        , 'Alt' : false
        , 'Meta' : false
        , null : true
    }
    ,special_active : 0

    ,busy_modules : {}

    ,viewpoint_set : function(dx, dy, scale, maketoast) {
        maketoast = (maketoast===undefined)?true:maketoast;
        UI.viewpoint.dx = dx;
        UI.viewpoint.dy = dy;
        UI.viewpoint.scale = scale;
        UI.redraw();

        if (maketoast) {
            const zoom_prc = Math.round(1000*((UI.viewpoint.scale>=1)?UI.viewpoint.scale:-1/UI.viewpoint.scale))/10;
            UI.toast('viewpoint', '( '+Math.round(UI.viewpoint.dx)+' , '+Math.round(UI.viewpoint.dy)+') :: <b>'+zoom_prc+'%</b>', 700);
        }
    }

    ,viewpoint_shift : function(dx, dy, maketoast) {
        maketoast = (maketoast===undefined)?true:maketoast;
        UI.viewpoint_set(UI.viewpoint.dx + dx, UI.viewpoint.dy + dy, UI.viewpoint.scale, maketoast);
    }

    ,viewpoint_zoom: function(scale, center) {
        let p0 = UI.local_to_global(center);

        UI.viewpoint.scale *= scale;

        const zoom_prc = Math.round(1000*((UI.viewpoint.scale>=1)?UI.viewpoint.scale:-1/UI.viewpoint.scale))/10;
        UI.toast('viewpoint', 'ZOOM: <b>' + zoom_prc + '%</b>', 700);

        let p1 = UI.local_to_global(center);

        let dx = (p0.x - p1.x);
        let dy = (p0.y - p1.y);

        UI.viewpoint_shift(dx, dy, false);
    }


    ,reset_layer : function(layer_name) {
        let canvas = UI.layers[UI.LAYERS.indexOf(layer_name)];
        canvas.style['margin'] = UI.CANVAS_MARGIN + 'px';
        canvas.width = UI.window_width - 2 * UI.CANVAS_MARGIN;
        canvas.height = UI.window_height - 2 * UI.CANVAS_MARGIN;
        return canvas;
    }

    ,update_layers : function(for_redraw) {
        for_redraw = (for_redraw===undefined)?false:for_redraw;
        UI.window_width = window.innerWidth;
        UI.window_height = window.innerHeight;
        UI.LAYERS.map((layer_name)=>{
            if (for_redraw&&(layer_name=='debug'))
                return;
            else
                UI.reset_layer(layer_name);
        });
    }

    ,_check_specials : function(e) {
        if (UI.is_mobile)
            return;
        for(let key in UI.special_keys) {
            let key_field = UI.special_keys[key];
            if ((key_field in e)&&(e[key_field]!=UI.keys[key])) {
                if (e[key_field])
                    UI.on_key_down(key);
                else
                    UI.on_key_up(key);
            }
        }
    }

    ,_setup_event_listeners : function() {
        // window size change listener
        UI.IO.add_event(window, 'resize', ()=>{
            UI.update_layers();
            UI.redraw();
        });

        // tool usage start events
        let buffer_canvas = UI.layers[UI.LAYERS.indexOf('buffer')];

        UI.IO.add_event(buffer_canvas, 'mousedown', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.mousedown', e);
            let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
            UI._last_point = lp;
            if (UI.on_start(lp, e.button)) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        UI.IO.add_event(buffer_canvas, 'touchstart', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.touchstart', e);
            UI.is_mobile = true;
            let lp = UI.get_touch(UI.layers[UI.LAYERS.indexOf('buffer')], e);

            /*
            if (false) { // &&(UI.check_mobile_keys(lp,UI._last_point!=null))
                UI._last_point = null;
                e.preventDefault();
                return;
            }
            */

            UI._last_point = lp;

            if (e.touches.length==2) {
                UI.on_key_down('Escape'); // cancel single touch start + maybe moves
                UI.on_key_down('Control'); // activate zoom / pan
            }

            UI.on_start(lp.copy(), 0);
            e.preventDefault();
        });
        UI.IO.add_event(buffer_canvas, 'pointerdown', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.pointerdown', e, e.pointerId, '=>', e.pointerType,' | ',e.altitudeAngle,' | ',e.pressure,' | ',e.tangentialPressure,' | ', e.button);
            if (e.pointerType=='pen') { // only process start events from pen here
                let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
                lp.pressure = e.pressure;

                UI._last_point = lp;
                if (UI.on_start(lp, e.button)) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
        });

        UI.IO.add_event(buffer_canvas, 'contextmenu', e => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });

        // tool move events
        UI.IO.add_event(buffer_canvas, 'pointermove', e => { // mousemove
            UI._check_specials(e);
            //UI.log(3, 'ui.mousemove', e);
            UI.log(3, 'ui.pointermove', e, e.pointerId, '=>', e.pointerType,' | ',e.altitudeAngle,' | ',e.pressure,' | ',e.tangentialPressure,' | ', e.button);

            if (!((e.pointerType=='pen')||(e.pointerType=='mouse')))
                return false; // ignore touch events here (handled in touchmove())

            let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
            lp.pressure = e.pressure;

            if ((UI._last_point!=null)&&((e.pointerType=='pen'))) {
                let S = BRUSH.get_local_width();
                let dst2 = lp.dst2(UI._last_point);
                if ((dst2 <= 1)||(dst2 <= S*S/10))
                    return;
            }
            UI.on_move(lp);
            UI._last_point = lp;
        });
        UI.IO.add_event(buffer_canvas, 'touchmove', e => {
            UI._check_specials(e);
            UI.log(3, 'ui.touchmove', e, e.pointerId, '=>', e.pointerType,' | ',e.bubbles,' | ',e.cancelable);
            UI.is_mobile = true;
            let lp = UI.get_touch(UI.layers[UI.LAYERS.indexOf('buffer')], e);

            /*
            if (false) { // UI.check_mobile_keys(lp,UI._last_point!=null)
                UI._last_point = null;
                e.preventDefault();
                return;
            }
            */

            UI._last_point = lp;
            UI.on_move(lp.copy());
            e.preventDefault();
        });

        // tool usage stop events
        UI.IO.add_event(buffer_canvas, 'mouseup', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.mouseup', e);
            let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
            UI._last_point = lp;
            if (UI.on_stop(lp)) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        UI.IO.add_event(buffer_canvas, 'touchend', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.touchend', e);
            UI.is_mobile = true;
            let lp = UI._last_point;

            /*
            if (false) { // (lp==null)||(UI.check_mobile_keys(lp))
                UI._last_point = null;
                e.preventDefault();
                return;
            }
            */

            if (lp!=null) {
                UI.on_stop(lp.copy());
                if (lp.d!=undefined)
                    UI.on_key_up('Control');
                UI._last_point = null;
            }
            e.preventDefault();
        });
        UI.IO.add_event(buffer_canvas, 'pointerup', e => {
            UI._check_specials(e);
            UI.log(2, 'ui.pointerup', e, e.pointerId, '=>', e.pointerType,' | ',e.altitudeAngle,' | ',e.pressure,' | ',e.tangentialPressure,' | ', e.button);
            if (e.pointerType=='pen') {
                let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
                UI._last_point = lp;
                if (UI.on_stop(lp)) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                }
            }
        });

        // mouse wheel listener
        UI.IO.add_event(buffer_canvas, 'wheel', e => {
            UI._check_specials(e);
            if ((Math.abs(e.deltaY) > 500) || (Math.abs(e.deltaX) > 500))
                return;
            UI.on_wheel(e.deltaY, e.deltaX);
            e.preventDefault();
        });

        // keyboard listener
        UI.IO.add_event(document, 'keydown', e => {
            if (!(e.key in UI.special_keys))
                UI._check_specials(e);
            const handled = UI.on_key_down(e.key);
            if ((handled)||(((e.key=='+')||(e.key=='-'))&&(UI.keys['Control'])))
                e.preventDefault();
        });
        UI.IO.add_event(document, 'keyup', e => {
            if (!(e.key in UI.special_keys))
                UI._check_specials(e);
            UI.on_key_up(e.key);
            if (((e.key=='+')||(e.key=='-'))&&(UI.keys['Control']))
                e.preventDefault();
        });

        // paste listener
        UI.IO.add_event(document, 'paste', e => {
            UI.log(1, 'ui.paste: ', e);
            UI._handle_data(e.clipboardData);
        });

        // window focus listener
        UI.IO.add_event(window, 'focus', ()=>{
            UI.on_focus();
        });

        // window blur listener
        UI.IO.add_event(window, 'blur', ()=>{
            UI.on_blur();
        });

        // hash change listener
        UI.IO.add_event(window, 'hashchange', ()=>{
            UI.on_hash_change();
        });

        // drag'n'drop handlers
        UI.IO.add_event(window, 'dragenter', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change('#ACA');
        });
        UI.IO.add_event(window, 'dragover', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change('#ACA');
        });
        UI.IO.add_event(window, 'dragleave', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change(UI._under_focus);
        });
        UI.IO.add_event(window, 'drop', e =>{
            UI.log(1, 'ui.drop:', e);
            e.stopPropagation();
            e.preventDefault();
            UI._handle_data(e.dataTransfer);
            UI._on_focus_change(true);
        });

        // window unload handler
        UI.IO.add_event(window, 'beforeunload', e => {
            if (!UI.is_dirty)
                return undefined;
            let message = 'Board was changed, these will be lost if you navigate away';
            e.returnValue = message;
            return message;
        });
    }

    ,_sel_loglevel : function(level) {
        if (level!==undefined) {
            UI.logger.log_level = level;
            return;
        }

        UI.logger.log_level = 0;
        UI.logger.ctx = null;

        if (BOARD.board_name.startsWith('test'))
            UI.logger.log_level = 1;

        if (BOARD.board_name=='debug') {
            UI.logger.log_level = 2;
            UI.logger.ctx = UI.contexts[UI.LAYERS.indexOf('debug')];
        }

        if (UI.view_mode=='debug')
            UI.logger.log_level += 2;

        UI.log(1, 'log_level:', UI.logger.log_level);
    }

    ,_hash_board_mode : function() {
        let hash = window.location.hash.slice(1,);
        let tokens = hash.split('$');
        if (tokens.length > 1) {
            tokens[1].split('?').map((v, i)=>{
                tokens[1 + i] = v;
            });
        } else {
            tokens[1] = '';
        }

        if (tokens.length > 2) {
            tokens[2] = tokens[2].split('&').reduce((d, p)=>{
                p = p.split('=');
                d[p[0]] = p[1];
                return d;
            }, {});
        } else {
            tokens[2] = {};
        }

        // index.html#tablename$viewmode$param1=value1&param2=value2
        return [
            tokens[0] // table name
            ,tokens[1] // view mode
            ,tokens[2] // extraparameters
        ];
    }

    ,_parse_hash : function() {
        let old_name = BOARD.board_name;
        let old_view_mode = UI.view_mode;

        [BOARD.board_name, UI.view_mode, UI.view_params] = UI._hash_board_mode();

        return (old_name!=BOARD.board_name)||(old_view_mode!=UI.view_mode);
    }

    ,_is_mobile_browser : function() {
        try {
            return navigator.userAgentData.mobile;
        } catch(e) {
            return /ip(hone|ad|od)|android/i.test((navigator.userAgent+'').toLowerCase());
        }
    }

    ,init : function(IO) {
        UI.IO = IO;
        IO.UI = UI;

        // parse out board name and view mode from location hash
        UI._parse_hash();

        // generate view id
        UI.view_id = Number(Math.ceil(Math.random()*1000)).toString(36);

        UI.is_mobile = UI._is_mobile_browser();

        UI.layers = (UI.LAYERS).map((id)=>{
            return document.getElementById('canvas_' + id);
        });

        UI.contexts = UI.layers.map((canvas)=>{
            return canvas.getContext('2d');
        });

        UI.update_layers();

        UI._setup_event_listeners();

        UI._on_focus_change(true);

        UI.addEventListener('on_file', UI.on_file_default);

        UI._last_point = Point.new(UI.window_width/2, UI.window_height/2);

        Toast.init();
    }


    // Events
    ,_event_handlers : {
        'on_start' : []
        ,'on_move' : []
        ,'on_stop' : []

        ,'on_key_down' : []
        ,'on_key_up' : []
        ,'on_wheel' : []

        ,'on_paste_strokes' : []
        ,'on_paste_text' : []

        ,'on_focus' : []
        ,'on_blur' : []

        ,'on_file' : []

        ,'on_after_redraw' : []
        ,'on_before_redraw' : []

        ,'on_persist' : []
        ,'on_unpersist' : []

        ,'on_color' : []
        ,'on_setting_changed' : []
        ,'on_stale' : []
    }

    ,addEventListener : function(event_type, event_handler) {
        if (event_type in UI._event_handlers) {
            UI._event_handlers[event_type].push(event_handler);
        } else {
            throw ('Unknown event type: ' + event_type);
        }
    }

    ,dropEventListener : function(event_type, event_handler) {
        if ((event_type === undefined)||(event_handler === undefined)) {
            if ( (UI.__handling_event === undefined) || (UI.__handling_handler === undefined) ) {
                throw 'dropEventListener() called outside event handler';
            }
            UI.dropEventListener(UI.__handling_event, UI.__handling_handler);
        } else {
            if (event_type in UI._event_handlers) {
                let index = UI._event_handlers[event_type].indexOf(event_handler);
                if (index < 0)
                    throw ('Trying to drop unexistent handler');
                UI._event_handlers[event_type].splice(index, 1);
            } else {
                throw ('Unknown event type: ' + event_type);
            }
        }
    }

    ,get_touch : function(canvasDom, e) {
        const rect = canvasDom.getBoundingClientRect();
        let client_origin = Point.new(rect.left, rect.top);
        let p0 = Point.new(e.touches[0].clientX, e.touches[0].clientY).sub(client_origin);

        if (e.touches.length>1) {
            let p1 = Point.new(e.touches[1].clientX, e.touches[1].clientY).sub(client_origin);

            p0 = Point.new(
                (p0.x + p1.x) / 2
                ,(p0.y + p1.y) / 2
                ,Math.sqrt(p0.dst2(p1))
                ,[p0, p1]
            );
        }
        return p0;
    }


    ,on_key_down_default : function(key) {
        UI.log(1, 'key_down:', key);

        if (key == '+') {
            BRUSH.update_size(+5);
        } else if (key == '-') {
            BRUSH.update_size(-5);
        } else if (key == 'Tab') {
            BRUSH.attach_color((BRUSH.color_id + 1) % BRUSH.COLORS[BRUSH.current_palette].length, UI._last_button);
            return true;
        }
    }

    ,on_key_up_default : function(key) {
        UI.log(1, 'key_up:', key);
    }

    ,on_paste_strokes_default : function(strokes) {
        UI.log(0, 'received strokes:', strokes);
    }

    ,on_wheel_default : function(delta, deltaX) {
        deltaX = deltaX || 0;
        if (UI.keys['Shift']) {
            UI.viewpoint_shift(delta / UI.viewpoint.scale, 0);
            UI.viewpoint_shift(0, deltaX / UI.viewpoint.scale);
        } else {
            UI.viewpoint_shift(0, delta / UI.viewpoint.scale);
            UI.viewpoint_shift(deltaX / UI.viewpoint.scale, 0);
        }
    }

    ,on_file_default : function(file) {
        if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
            UI.IO.read_file(file, 'image').then((data_url)=>{
                const image = new Image();
                image.title = file.name;
                image.src = data_url;
                setTimeout(((image, p0)=>{
                    return ()=>{
                        BOARD.op_start();
                        BOARD.commit_stroke(ImageStroke.new(
                            image
                            ,UI.local_to_global(p0)
                            ,UI.local_to_global(p0.add(Point.new(image.width, image.height)))
                        ));
                        BOARD.op_commit();
                        UI.redraw();
                    };
                })(image, UI._last_point), 10);
            });
            return true;
        }
        return false;
    }


    ,_handle_event : function(event, data) {
        UI.__handling_event = event;
        let handled = UI._event_handlers[event].reduce((handled, handler)=>{
            UI.__handling_handler = handler;
            return handled||handler.apply(null, data);
        }, false);
        UI.__handling_event = null;
        UI.__handling_handler = null;
        return handled;
    }

    ,on_start : function(lp, button) {
        let handled = UI._handle_event('on_start', [lp.copy(), button]);
        UI._last_button = button;
        return handled;
    }

    ,on_move : function(lp) {
        return UI._handle_event('on_move', [lp.copy()]);
    }

    ,on_stop : function(lp) {
        return UI._handle_event('on_stop', [lp.copy()]);
    }

    ,_update_special : function() {
        UI.special_active = 0;
        let text = '';
        for (const key in UI.keys) if ( ((key + '')!='null') && (UI.keys[key]) ) {
            text += ' ' + key;
            UI.special_active += 1;
        }
        UI.keys[null] = UI.special_active==0;

        text = text.trim();

        if (UI.special_active == 0) {
            let toast = UI.toast('special.keys', undefined, -1, 3, false);
            toast.lifespan = 500;
            toast._blur()();
        } else {
            UI.toast('special.keys', text, -1, 3);
        }
    }

    ,on_key_down : function(key) {
        UI.log(1, 'ui.key_down:', key);

        if (key in UI.keys) {
            UI.keys[key] = true;
            UI._update_special();
        }

        let handled = UI._handle_event('on_key_down', [key]);
        if (!handled)
            handled = UI.on_key_down_default(key);

        return handled;
    }

    ,on_key_up : function(key) {
        UI.log(1, 'ui.key_up:', key);

        let handled = UI._handle_event('on_key_up', [key]);
        if (!handled)
            UI.on_key_up_default(key);

        if (key in UI.keys) {
            UI.keys[key] = false;
            UI._update_special();
        }
    }

    ,on_wheel : function(delta, deltaX) {
        UI.log(1, 'ui.on_wheel:', delta, deltaX);

        let handled = UI._handle_event('on_wheel', [delta, deltaX]);
        if (!handled)
            UI.on_wheel_default(delta, deltaX);
    }


    ,_handle_data : function(data_transfer) {
        for(let i=0; i<data_transfer.types.length; i++) {
            let data_item = data_transfer.items[i];
            let data_type = data_transfer.types[i];
            console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
            console.log('type:', data_type);
            console.log('kind:', data_item.kind);

            if (data_item.kind=='string') {
                if (data_type=='text/plain') {
                    data_item.getAsString(
                        (data)=>{
                            UI._on_paste_string(data);
                        }
                    );

                } else if (data_type=='text/html') {
                    UI.toast('copy/paste', 'can\'t paste html yet', 2000);
                }

            } else if (data_item.kind=='file') {
                let file = data_item.getAsFile();
                UI.on_file(file);

            } else {
                UI.log(-1, 'Unknown data transfer kind received:', data_item.kind);
            }
        }
    }

    ,_on_paste_string : function(text) {
        try {
            let js = JSON.parse(text);
            if (js.strokes===undefined)
                throw 'not a figure';
            UI.on_paste_strokes(js.strokes);
            return;
        } catch (ex) {
            UI.log(-1, 'pasted text is not parseable:', ex);
        }
        UI.on_paste_text(text);
    }

    ,on_paste_text_default : function(text) {
        if ('texter' in TOOLS.tools) {
            TOOLS.deactivate_backtool();
            TOOLS.activate('texter', false, 0);
            TOOLS.on_start(UI._last_point, 0);
            TOOLS.on_paste_text(text);
        }
    }

    ,on_paste_text : function(text) {
        let handled = UI._handle_event('on_paste_text', [text]);
        if (!handled)
            UI.on_paste_text_default(text);
    }

    ,on_paste_strokes : function(strokes) {
        let handled = UI._handle_event('on_paste_strokes', [strokes]);
        if (!handled)
            UI.on_paste_strokes_default(strokes);
    }

    ,on_file : function(file) {
        let handled = UI._handle_event('on_file', [file]);
        if (!handled) {
            UI.log(-1, 'can\'t load file: ', file);
            UI.toast('ui.files_load', 'can\'t load file : ' + file.name, 2000);
        }
    }


    ,_on_focus_change : function(under_focus) {
        if (under_focus==true) {
            UI.under_focus = under_focus;
            document.body.style['background-color'] = '#AAA';
        } else if (under_focus==false) {
            UI.under_focus = under_focus;
            document.body.style['background-color'] = '#DDD';
        } else {
            document.body.style['background-color'] = under_focus;
        }
    }

    ,on_focus : function() {
        UI._on_focus_change(true);
        return UI._handle_event('on_focus', []);
    }

    ,on_blur : function() {
        UI._on_focus_change(false);
        return UI._handle_event('on_blur', []);
    }

    ,on_hash_change : function() {
        if (UI._parse_hash()) {
            UI.log(1, 'new hash: ', window.location.hash.slice(1,));
            window.location.reload();
        }
    }


    ,on_before_redraw : function() {
        return UI._handle_event('on_before_redraw', []);
    }

    ,on_after_redraw : function() {
        return UI._handle_event('on_after_redraw', []);
    }


    ,on_persist : function(json, partial) {
        return UI._handle_event('on_persist', [json, partial]);
    }

    ,on_unpersist : function(json, partial) {
        let handled = UI._handle_event('on_unpersist', [json, partial]);
        return handled;
    }

    ,on_color : function(color) {
        return UI._handle_event('on_color', [color]);
    }

    ,on_setting_changed : function(name, value) {
        return UI._handle_event('on_setting_changed', [name, value]);
    }


    ,_get_image_data : function(rect, scale, transparent, draw_grid) {

        /*
        let canvas = document.createElement('canvas');
        canvas.width = (rect[1].x - rect[0].x) * scale;
        canvas.height = (rect[1].y - rect[0].y) * scale;
        canvas.convertToBlob = ()=>{
            return new Promise((resolve, reject) => {
                try {
                    canvas.toBlob(resolve)
                } catch(ex) {
                    reject(ex)
                }
            });
        }
        /**/

        /**/
        let canvas = new OffscreenCanvas(
            (rect[1].x - rect[0].x) * scale,
            (rect[1].y - rect[0].y) * scale
        );
        /**/

        let ctx = canvas.getContext('2d');

        if (!transparent) {
            ctx.fillStyle = UI.layers[UI.LAYERS.indexOf('background')].style['background-color'];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0,0, canvas.width, canvas.height);
        }

        let vp = deepcopy(UI.viewpoint);
        UI.viewpoint.dx = rect[0].x;
        UI.viewpoint.dy = rect[0].y;
        UI.viewpoint.scale = scale;
        UI.redraw(ctx, true, [], transparent, draw_grid);
        UI.viewpoint = vp;

        return canvas;
    }

    ,on_stale : function() {
        UI.log(1, 'ui.on_stale');
        return UI._handle_event('on_stale', []);
    }


    // state tracking
    ,set_busy : function(owner, flag) {
        UI.busy_modules[owner] = flag;
        let total_busy = 0;
        for (const key in UI.busy_modules)
            total_busy += (UI.busy_modules[key])*1;
        if (total_busy==0)
            UI.on_stale();
    }

    // stroke handling
    ,global_to_local : function(point, viewpoint) {
        if (point==null) return null;
        let vp = (viewpoint===undefined)?UI.viewpoint:viewpoint;
        return Point.new(
            (point.x - vp.dx) * vp.scale
            ,(point.y - vp.dy) * vp.scale
        );
    }

    ,local_to_global : function(point) {
        if (point==null) return null;
        let vp = UI.viewpoint;
        return Point.new(
            (point.x / vp.scale) + vp.dx
            ,(point.y / vp.scale) + vp.dy
        );
    }

    ,figure_split : function(figure, cyclic, max_length) {
        cyclic = (cyclic===undefined)?true:cyclic;
        let ret = [];
        let p0, p1;

        let i =0;
        while (i < figure.length) {
            p0 = figure[i].copy();
            p1 = figure[(i+1)%figure.length];

            ret.push(p0.copy());

            if ((!cyclic)&&(i==figure.length-1))
                break;

            let max_length2 = max_length * max_length;
            let dst = p0.dst2(p1);

            if (max_length===undefined) { // ||(p0.dst2(p1)*2 <= max_length2)
                ret.push(Point.new(
                    (p0.x + p1.x) / 2
                    ,(p0.y + p1.y) / 2
                ));
            } else {
                let dv = p1.sub(p0);
                let dx = dv.x * max_length / Math.sqrt(dst);
                let dy = dv.y * max_length / Math.sqrt(dst);

                while(dst > max_length2) {
                    p0.x += dx;
                    p0.y += dy;
                    dst = p0.dst2(p1);
                    ret.push(p0.copy());
                }

            }

            i++;
        }

        return ret;
    }

    ,draw_glyph : function(glyph, ctx, viewpoint, color) {
        let a,b,p = null;
        color = (color===undefined) ? '#0095' : color;
        viewpoint = (viewpoint===undefined) ? {dx:0, dy:0, scale:1.0} : viewpoint;

        for(let i=0; i<glyph.length; i++) {
            a = p;
            b = glyph[i];
            if ((p==null)&&(glyph[i]!=null)&&((i==glyph.length-1)||((i<glyph.length-1)&&(glyph[i+1]==null))))
                a = b;

            if ((a!=null)&&(b!=null)) {
                let pa = Point.new(a[0], a[1]);
                let pb = Point.new(b[0], b[1]);
                UI.draw_gstroke(pa, pb, color, 4, ctx, viewpoint);
            }

            p = glyph[i];
        }
    }

    ,draw_gstroke : function(gp0, gp1, color, width, ctx, viewpoint) {
        let lp0 = UI.global_to_local(gp0, viewpoint);
        let lp1 = UI.global_to_local(gp1, viewpoint);
        UI.draw_line(
            lp0
            ,lp1
            ,color
            ,width * viewpoint.scale
            ,ctx
        );
    }

    ,draw_line : function(lp0, lp1, color, width, ctx) {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.moveTo(lp0.x, lp0.y);
        ctx.lineTo(lp1.x, lp1.y);
        ctx.stroke();
        ctx.closePath();
        UI._canvas_changed();
    }

    ,draw_overlay_stroke : function(lp0, lp1, params) { // temporary strokes in overlay layer
        const ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];
        const {
            color : color = BRUSH.get_color()
            ,width : width = BRUSH.get_local_width()
        } = params || {};
        UI.draw_line(lp0, lp1, color, width, ctx);
    }


    ,get_rect : function(points) {
        const rect = [
            Point.new(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
            Point.new(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
        ];
        points.map((point)=>{
            if (point!=null) {
                rect[0].x = Math.min(rect[0].x, point.x);
                rect[1].x = Math.max(rect[1].x, point.x);

                rect[0].y = Math.min(rect[0].y, point.y);
                rect[1].y = Math.max(rect[1].y, point.y);
            }
        });
        return rect;
    }


    ,_set_redraw_hook : function(callback) {
        UI._redraw_hook = callback;
    }

    ,_canvas_changed : function(stamp, retry) {
        retry = (retry===undefined)? 3 : retry;
        if (UI._redraw_hook) {
            UI._redraw_hook((stamp||1)*((new Date()).valueOf()));
            UI._redraw_hook = undefined;
        } else {
            if (stamp!==undefined) {
                if (retry) {
                    UI.log(-1, 'retrying canvas change ' + stamp);
                    setTimeout(((stamp, retry)=>{
                        return ()=>{
                            UI._canvas_changed(stamp, retry-1);
                        };
                    })(stamp, retry), 50);
                } else {
                    UI.log(-1, 'missed canvas change ' + stamp);
                }
            }
        }
    }

    ,_redraw : function(target_ctx, extra_strokes, transparent, draw_grid) {
        let ctx = null;
        let ctx_back = null;

        extra_strokes = (extra_strokes===undefined)?[]:extra_strokes;
        draw_grid = (draw_grid===undefined)?UI.GRID_MODE.value:draw_grid;
        transparent = (transparent===undefined)?false:transparent;

        if (target_ctx === undefined) {
            UI.update_layers(true);
            ctx = UI.contexts[UI.LAYERS.indexOf('board')];
            ctx_back = UI.contexts[UI.LAYERS.indexOf('background')];
        } else {
            ctx = target_ctx;
            ctx_back = target_ctx;
        }

        UI.redraw_background(ctx_back, transparent, draw_grid);

        UI.on_before_redraw();

        let global_viewrect = [
            UI.local_to_global(Point.new(0, 0)),
            UI.local_to_global(Point.new(ctx.canvas.width, ctx.canvas.height))
        ];

        // last_cached_image.draw(ctx)

        {
            for(let commit_id in BOARD.strokes) { // !!!
                if (commit_id > BOARD.commit_id)
                    break;

                // if commit_id < last_cached_image.commit_id
                //     continue;

                for(let i in BOARD.strokes[commit_id]) {
                    let stroke = BOARD.strokes[commit_id][i];
                    stroke.draw(ctx, global_viewrect);
                }
            }
        }

        extra_strokes.map((stroke)=>{
            stroke.draw(ctx, global_viewrect);
        });

        UI.on_after_redraw();

        BRUSH.update_size();

        UI._canvas_changed();
    }

    ,redraw : function(target_ctx, immediate, extra_strokes, transparent, draw_grid) {
        if (immediate) {
            UI._redraw(target_ctx, extra_strokes, transparent, draw_grid);
        } else {
            if (!UI._redrawing) {
                UI._redrawing = true;
                window.requestAnimationFrame(()=>{
                    UI._redraw(target_ctx, extra_strokes, transparent, draw_grid);
                    UI._redrawing = false;
                });
            }
        }

        if (UI.view_mode=='debug') {
            let now = (new Date()).valueOf();
            UI.__tl = (UI.__tl===undefined)?[]:UI.__tl;
            UI.__tl.push(now - UI.__ts);
            let fps = 1000 * UI.__tl.length / (UI.__tl.reduce((a,v)=>{return a + (v||1);}, 0));
            UI.toast('fps', 'FPS: ' + Math.ceil(fps*10)/10, -1, 1);
            UI.__ts = now;
            if (UI.__tl.length > 20)
                UI.__tl = UI.__tl.slice(1);
        }
    }

    ,redraw_background : function(ctx, transparent, draw_grid) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        let background_colors = ['#FFF','#111','#030'];
        let grid_colors = [
            ['#333', '#CCC'],
            ['#CCC', '#333'],
            ['#CCC', '#222']
        ];

        let ctx_type = obj_type(ctx);

        if (!transparent) {
            if (ctx_type == 'OffscreenCanvasRenderingContext2D') {
                ctx.fillStyle = UI.layers[UI.LAYERS.indexOf('background')].style['background-color'];
                ctx.fillRect(0, 0, width, height);
            } else if (ctx_type == 'CanvasRenderingContext2D') {
                ctx.canvas.style['background-color'] = background_colors[UI.THEME.value];
            }
        }

        if (!draw_grid)
            return;

        //h
        let y = - (UI.viewpoint.dy % UI.GRID) * UI.viewpoint.scale;
        while (y < height) {
            UI.draw_line(
                Point.new(0, y)
                ,Point.new(width, y)
                ,grid_colors[UI.THEME.value][(Math.abs(y / UI.viewpoint.scale + UI.viewpoint.dy)>0.1)*1]
                ,1
                ,ctx
            );
            y += UI.GRID * UI.viewpoint.scale;
        }

        //w
        let x = - (UI.viewpoint.dx % UI.GRID) * UI.viewpoint.scale;
        while (x < width) {
            UI.draw_line(
                Point.new(x, 0)
                ,Point.new(x, height)
                ,grid_colors[UI.THEME.value][(Math.abs(x / UI.viewpoint.scale + UI.viewpoint.dx)>0.1)*1]
                ,1
                ,ctx
            );
            x += UI.GRID * UI.viewpoint.scale;
        }

    }


    // logging , alerting
    ,toast : function(topic, text, lifespan, align, reset) {
        return Toast.new(topic, text, lifespan, align, reset);
    }

    ,log : function(...args) {
        UI.logger.log(...args);
    }

    ,timeit : function(callable, rounds) {
        rounds = (rounds===undefined)?10:rounds;

        let times = [];
        for(let i=0; i<rounds; i++) {
            times.push((new(Date)).valueOf());
            callable();
            times[i] = (new(Date)).valueOf() - times[i];
        }

        UI.log(0, 'times:', times);
        UI.log(0, 'avg:', times.reduce((a, v)=>a + v, 0) / rounds);
    }

    /*
    times: (10) [1366, 1080, 1079, 1131, 1076, 1134, 1076, 1147, 1136, 1076]
    Logger.js:20 avg: 1130.1

    times: (10) [580, 463, 471, 467, 492, 470, 462, 461, 466, 446]
    Logger.js:20 avg: 477.8
    */


};


export {UI};
