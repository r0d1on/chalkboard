'use strict';

import {Point} from '../util/Point.js';
import {Toast} from '../util/Toast.js';
import {ImageStroke} from '../util/Strokes.js';

import {BOARD} from './BOARD.js';
import {BRUSH} from './BRUSH.js';
import {GRID_MODE} from './GRID_MODE.js';
import {TOOLS} from './TOOLS.js';


let LOG=[];
function log(level, ...args) {
    if (level > UI.log_level)
        return;
    console.log(...args);
    if (BOARD.board_name=='debug') {
        LOG.splice(0, 0, args.join(' '));
        LOG.slice(0, 40);

        UI.reset_layer('debug');

        let ctx = UI.contexts[UI.LAYERS.indexOf('debug')];

        for(let i=0; i < LOG.length; i++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(10, (i+2)*25, 20*LOG[i].length, 20);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            ctx.font='20px courier';
            ctx.strokeText(''+(i)+'::'+LOG[i], 10, 20+(i+2)*25);
        }
    }
}


let UI = {
    IO : null

    ,CANVAS_MARGIN : 20
    ,GRID : 30.0
    ,LAYERS : ['background', 'debug', 'board', 'buffer', 'overlay']

    ,log_level : 0

    ,_last_point : null
    ,_under_focus : false
    ,_last_button : 0

    ,is_mobile : false
    ,view_id : 'xx'
    ,view_mode : undefined

    ,window_width : null
    ,window_height : null

    ,layers : null
    ,contexts : null
    ,viewpoint : {
        dx : 0.0
        ,dy : 0.0
        ,scale : 1.0
    }


    ,keys : {
        'Control' : false
        , 'Shift' : false
        , 'Alt' : false
        , 'Meta' : false
        , null : true
    }
    ,keys_special : 0

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

    ,_setup_event_listeners : function() {
        // window size change listener
        UI.IO.add_event(window, 'resize', ()=>{
            UI.update_layers();
            UI.redraw();
        });

        // tool usage start events
        let buffer_canvas = UI.layers[UI.LAYERS.indexOf('buffer')];

        UI.IO.add_event(buffer_canvas, 'mousedown', e => {
            UI.log(2, 'ui.mousedown', e);
            let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
            UI._last_point = lp;
            if (UI.on_start(lp, e.button)) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        UI.IO.add_event(buffer_canvas, 'touchstart', e => {
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
            UI.log(2, 'ui.mouseup', e);
            let lp = Point.new(e.offsetX*1.0, e.offsetY*1.0);
            UI._last_point = lp;
            if (UI.on_stop(lp)) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        UI.IO.add_event(buffer_canvas, 'touchend', e => {
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
            UI.on_wheel(e.deltaY, e.deltaX);
            e.preventDefault();
        });

        // keyboard listener
        UI.IO.add_event(document, 'keydown', e => {
            const handled = UI.on_key_down(e.key);
            if ((handled)||(((e.key=='+')||(e.key=='-'))&&(UI.keys['Control'])))
                e.preventDefault();
        });
        UI.IO.add_event(document, 'keyup', e => {
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

    }

    ,_sel_loglevel : function(level) {
        if (level!==undefined) {
            UI.log_level = level;
            return;
        }

        UI.log_level = 0;

        if (BOARD.board_name.startsWith('test'))
            UI.log_level = 1;

        if (BOARD.board_name=='debug')
            UI.log_level = 2;

        if (UI.view_mode=='debug')
            UI.log_level += 2;

        UI.log(1, 'log_level:', UI.log_level);
    }

    ,_hash_board_mode : function() {
        let hash = window.location.hash.slice(1,);
        // index.html#tablename$viewmode
        return [
            hash.split('$')[0] // table name
            ,hash.split('$')[1] // view mode
        ];
    }

    ,_parse_hash : function() {
        let old_name = BOARD.board_name;
        let old_view_mode = UI.view_mode;

        [BOARD.board_name, UI.view_mode] = UI._hash_board_mode();

        return (old_name!=BOARD.board_name)||(old_view_mode!=UI.view_mode);
    }

    ,init : function(IO) {
        UI.IO = IO;

        IO.log = UI.log;
        IO.UI = UI;

        // parse out board name and view mode from location hash
        UI._parse_hash();

        // generate view id
        UI.view_id = Number(Math.ceil(Math.random()*1000)).toString(36);

        try {
            UI.is_mobile = navigator.userAgentData.mobile;
        } catch(e) {
            UI.is_mobile = true;
        }


        UI.layers = (UI.LAYERS).map((id)=>{
            return document.getElementById('canvas_' + id);
        });

        UI.contexts = UI.layers.map((canvas)=>{
            return canvas.getContext('2d');
        });

        UI.update_layers();

        UI._setup_event_listeners();

        UI._on_focus_change(true);

        UI.addEventListener('on_file', UI._on_file);

        UI._last_point = Point.new(UI.window_width/2, UI.window_height/2);
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
    }

    ,addEventListener : function(event_type, event_handler) {
        if (event_type in UI._event_handlers) {
            UI._event_handlers[event_type].push(event_handler);
        } else {
            throw ('Unknown event type: '+event_type);
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
            BRUSH.attach_color((BRUSH.color_id + 1) % BRUSH.COLORS.length, UI._last_button);
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


    ,on_start : function(lp, button) {
        UI._event_handlers['on_start'].reduce((handled, handler)=>{
            return handled||handler(lp.copy(), button);
        }, false);
        UI._last_button = button;
    }

    ,on_move : function(lp) {
        UI._event_handlers['on_move'].reduce((handled, handler)=>{
            return handled||handler(lp.copy());
        }, false);
    }

    ,on_stop : function(lp) {
        UI._event_handlers['on_stop'].reduce((handled, handler)=>{
            return handled||handler(lp.copy());
        }, false);
    }

    ,_update_special : function() {
        UI.keys_special = 0;
        for (const key in UI.keys)
            UI.keys_special += (key!=null)?UI.keys[key]*1:0;
        UI.keys[null] = UI.keys_special==0;
    }

    ,on_key_down : function(key) {
        UI.log(1, 'ui.key_down:', key);

        if (key in UI.keys) {
            UI.keys[key] = true;
            UI._update_special();
        }

        let handled = UI._event_handlers['on_key_down'].reduce((handled, handler)=>{
            return handled||handler(key);
        }, false);

        if (!handled)
            handled = UI.on_key_down_default(key);

        return handled;
    }

    ,on_key_up : function(key) {
        UI.log(1, 'ui.key_up:', key);

        let handled = UI._event_handlers['on_key_up'].reduce((handled, handler)=>{
            return handled||handler(key);
        }, false);

        if (!handled)
            UI.on_key_up_default(key);

        if (key in UI.keys) {
            UI.keys[key] = false;
            UI._update_special();
        }
    }

    ,on_wheel : function(delta, deltaX) {
        UI.log(1, 'ui.on_wheel:', delta, deltaX);

        let handled = UI._event_handlers['on_wheel'].reduce((handled, handler)=>{
            return handled||handler(delta, deltaX);
        }, false);

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
                UI.log(0, 'Unknown data transfer kind received:', data_item.kind);
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
            UI.log(0, 'pasted text is not parseable:', ex);
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
        let handled = UI._event_handlers['on_paste_text'].reduce((handled, handler)=>{
            return handled||handler(text);
        }, false);

        if (!handled)
            UI.on_paste_text_default(text);
    }

    ,on_paste_strokes : function(strokes) {
        let handled = UI._event_handlers['on_paste_strokes'].reduce((handled, handler)=>{
            return handled||handler(strokes);
        }, false);

        if (!handled)
            UI.on_paste_strokes_default(strokes);
    }

    ,_on_file : function(file) {
        if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                const image = new Image();
                image.title = file.name;
                image.src = reader.result;
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
            }, false);
            reader.readAsDataURL(file);
            return true;
        }
        return false;
    }

    ,on_file : function(file) {
        let handled = UI._event_handlers['on_file'].reduce((handled, handler)=>{
            return handled||handler(file);
        }, false);

        if (!handled)
            UI.log(0, 'unhandled file transfer:', file);
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
        UI._event_handlers['on_focus'].reduce((handled, handler)=>{
            return handled||handler();
        }, false);
    }

    ,on_blur : function() {
        UI._on_focus_change(false);
        UI._event_handlers['on_blur'].reduce((handled, handler)=>{
            return handled||handler();
        }, false);
    }

    ,on_hash_change : function() {
        if (UI._parse_hash()) {
            UI.log(1, 'new hash: ', window.location.hash.slice(1,));
            window.location.reload();
        }
    }


    ,on_before_redraw : function() {
        UI._event_handlers['on_before_redraw'].reduce((handled, handler)=>{
            return handled||handler();
        }, false);
    }

    ,on_after_redraw : function() {
        UI._event_handlers['on_after_redraw'].reduce((handled, handler)=>{
            return handled||handler();
        }, false);
    }


    // Stroke handling
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
    }

    ,draw_overlay_stroke : function(lp0, lp1, params) { // temporary strokes in overlay layer
        const ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];
        const {
            color:color = BRUSH.get_color()
            ,width:width = BRUSH.get_local_width()
        } = params||{};
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


    ,redraw : function(target_ctx) {
        let ctx = null;
        let ctx_back = null;

        if (target_ctx === undefined) {
            UI.update_layers(true);
            ctx = UI.contexts[UI.LAYERS.indexOf('board')];
            ctx_back = UI.contexts[UI.LAYERS.indexOf('background')];
        } else {
            ctx = target_ctx;
            ctx_back = target_ctx;
        }

        if (GRID_MODE.grid_active)
            UI.redraw_grid(ctx_back);

        UI.on_before_redraw();

        for(let commit_id in BOARD.strokes) {
            if (commit_id > BOARD.commit_id)
                break;

            for(let i in BOARD.strokes[commit_id]) {
                let stroke = BOARD.strokes[commit_id][i];
                stroke.draw(ctx);
            }
        }

        UI.on_after_redraw();

        BRUSH.update_size();
    }

    ,redraw_grid : function(ctx) {
        //h
        let y = - (UI.viewpoint.dy % UI.GRID) * UI.viewpoint.scale;
        while (y < UI.window_height) {
            UI.draw_line(
                Point.new(0, y)
                ,Point.new(UI.window_width, y)
                ,(Math.abs(y / UI.viewpoint.scale + UI.viewpoint.dy)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            y += UI.GRID * UI.viewpoint.scale;
        }

        //w
        let x = - (UI.viewpoint.dx % UI.GRID) * UI.viewpoint.scale;
        while (x < UI.window_width) {
            UI.draw_line(
                Point.new(x, 0)
                ,Point.new(x, UI.window_height)
                ,(Math.abs(x / UI.viewpoint.scale + UI.viewpoint.dx)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            x += UI.GRID * UI.viewpoint.scale;
        }

    }

    ,toast : function(topic, text, lifespan, align, reset) {
        return Toast.new(topic, text, lifespan, align, reset);
    }

    ,log : function(...args) {
        log(...args);
    }

};


export {UI};
