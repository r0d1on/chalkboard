'use strict';

import {copy} from '../base/objects.js';

import {dst2 , sub, angle} from '../util/geometry.js';

import {BOARD} from './BOARD.js';
import {BRUSH} from './BRUSH.js';
import {GRID_MODE} from './GRID_MODE.js';
import {TOOLS} from './TOOLS.js';


let TOASTS = {};
function toast(topic, text, lifespan) {

    function drop(topic) {
        document.body.removeChild(TOASTS[topic]['div']);
        clearTimeout(TOASTS[topic]['timeout']);
        delete TOASTS[topic];
    }

    function blur(topic) {
        function handler() {
            const tst = TOASTS[topic];
            if (tst===undefined)
                return;

            if (tst['age'] >= tst['lifespan']) {
                drop(topic);
            } else {
                tst['age'] += lifespan/10;
                tst['div'].style.opacity = 1.0 - tst['age']/tst['lifespan'];
                tst['timeout'] = setTimeout(blur(topic),lifespan/10);
            }
        }
        return handler;
    }

    if (topic in TOASTS)
        drop(topic);

    const e = document.createElement('div');
    e.innerHTML = text;
    e.style.position = 'absolute';
    e.style['background-color'] = '#3333';
    e.style['padding'] = '10px';
    e.style['border'] = '1px solid black';
    e.style['border-radius'] = '15px';
    e.style['pointer-events'] = 'none';

    document.body.appendChild(e);
    e.style.top = '' + ((UI.window_height - e.clientHeight)>>1) + 'px';
    e.style.left = '' + ((UI.window_width - e.clientWidth)>>1) + 'px';

    TOASTS[topic] = {
        'div' : e
        ,'lifespan' : lifespan
        ,'age' : 0
        ,'timeout' : setTimeout(blur(topic),lifespan/10)
    };
}

let LOG=[];
function log(...args) {
    console.log(...args);
    if (BOARD.board_name=='debug') {
        LOG.splice(0,0,args.join(' '));
        LOG.slice(0,40);

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

    CANVAS_MARGIN : 20
    ,GRID : 30.0
    ,LAYERS : ['background', 'debug', 'board', 'buffer', 'overlay']

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
            toast('viewpoint', '( '+Math.round(UI.viewpoint.dx)+' , '+Math.round(UI.viewpoint.dy)+') :: <b>'+zoom_prc+'%</b>', 700);
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
        toast('viewpoint','ZOOM: <b>' + zoom_prc + '%</b>', 700);

        let p1 = UI.local_to_global(center);

        let dx = (p0.X - p1.X);
        let dy = (p0.Y - p1.Y);

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
        window.addEventListener('resize', ()=>{
            UI.update_layers();
            UI.redraw();
        });

        // tool usage start events
        let buffer_canvas = UI.layers[UI.LAYERS.indexOf('buffer')];

        buffer_canvas.addEventListener('mousedown', e => {
            UI.log('ui.mousedown', e);
            let lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_start(lp, e.button);
        });
        buffer_canvas.addEventListener('touchstart', e => {
            UI.log('ui.touchstart', e);
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

            UI.on_start({X:lp.X, Y:lp.Y, D:lp.D}, 0);
            e.preventDefault();
        });

        buffer_canvas.addEventListener('contextmenu', e => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });

        // tool move events
        buffer_canvas.addEventListener('mousemove', e => {
            let lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_move(lp);
        });
        buffer_canvas.addEventListener('touchmove', e => {
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
            UI.on_move({X:lp.X, Y:lp.Y, D:lp.D});
            e.preventDefault();
        });

        // tool usage stop events
        buffer_canvas.addEventListener('mouseup', e => {
            UI.log('ui.mouseup', e);
            let lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_stop(lp);
        });
        buffer_canvas.addEventListener('touchend', e => {
            UI.log('ui.touchend', e);
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
                UI.on_stop({X:lp.X, Y:lp.Y});
                if (lp.D!=undefined)
                    UI.on_key_up('Control');
                UI._last_point = null;
            }
            e.preventDefault();
        });

        // mouse wheel listener
        buffer_canvas.addEventListener('wheel', e => {
            UI.on_wheel(e.deltaY, e.deltaX);
            e.preventDefault();
        });

        // keyboard listener
        document.addEventListener('keydown', e => {
            const handled = UI.on_key_down(e.key);
            if ((handled)||(((e.key=='+')||(e.key=='-'))&&(UI.keys['Control'])))
                e.preventDefault();
        });
        document.addEventListener('keyup', e => {
            UI.on_key_up(e.key);
            if (((e.key=='+')||(e.key=='-'))&&(UI.keys['Control']))
                e.preventDefault();
        });

        // paste listener
        document.addEventListener('paste', e => {
            UI.log('ui.paste: ', e);
            UI._handle_data(e.clipboardData);
        });

        // window focus listener
        window.addEventListener('focus', ()=>{
            UI.on_focus();
        });

        // window blur listener
        window.addEventListener('blur', ()=>{
            UI.on_blur();
        });

        // hash change listener
        window.addEventListener('hashchange', ()=>{
            UI.on_hash_change();
        });

        // drag'n'drop handlers
        window.addEventListener('dragenter', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change('#ACA');
        });
        window.addEventListener('dragover', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change('#ACA');
        });
        window.addEventListener('dragleave', e =>{
            e.stopPropagation();
            e.preventDefault();
            UI._on_focus_change(UI._under_focus);
        });
        window.addEventListener('drop', e =>{
            UI.log('ui.drop:', e);
            e.stopPropagation();
            e.preventDefault();
            UI._handle_data(e.dataTransfer);
            UI._on_focus_change(true);
        });

    }

    ,_parse_uri : function(uri) {
        // board name
        let old_name = BOARD.board_name;
        BOARD.board_name = uri.split('$')[0];

        // UI view mode
        let old_view_mode = UI.view_mode;
        UI.view_mode = uri.split('$')[1];

        return (old_name!=BOARD.board_name)||(old_view_mode!=UI.view_mode);
    }

    ,init : function() {
        // parse out board name and view mode from location hash
        UI._parse_uri(window.location.hash.slice(1,));

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
        let p0 = {
            X: e.touches[0].clientX - rect.left
            ,Y: e.touches[0].clientY - rect.top
        };

        if (e.touches.length>1) {
            let p1 = {
                X: e.touches[1].clientX - rect.left
                ,Y: e.touches[1].clientY - rect.top
            };
            p0 = {
                X: (p0.X + p1.X) / 2
                ,Y: (p0.Y + p1.Y) / 2
                ,D: Math.sqrt(dst2(p0 , p1))
                ,P: [p0, p1]
            };
        }
        return p0;
    }


    ,on_key_down_default : function(key) {
        UI.log('key_down:', key);

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
        UI.log('key_up:', key);
    }

    ,on_paste_strokes_default : function(strokes) {
        UI.log('received strokes:', strokes);
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
            return handled||handler(copy(lp), button);
        }, false);
        UI._last_button = button;
    }

    ,on_move : function(lp) {
        UI._event_handlers['on_move'].reduce((handled, handler)=>{
            return handled||handler(copy(lp));
        }, false);
    }

    ,on_stop : function(lp) {
        UI._event_handlers['on_stop'].reduce((handled, handler)=>{
            return handled||handler(copy(lp));
        }, false);
    }

    ,_update_special : function() {
        UI.keys_special = 0;
        for (const key in UI.keys)
            UI.keys_special += (key!=null)?UI.keys[key]*1:0;
        UI.keys[null] = UI.keys_special==0;
    }

    ,on_key_down : function(key) {
        UI.log('ui.key_down:', key);

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
        UI.log('ui.key_up:', key);

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
        UI.log('ui.on_wheel:', delta, deltaX);

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
                UI.log('Unknown data transfer kind received:', data_item.kind);
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
            UI.log('pasted text is not parseable:', ex);
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

    ,on_file : function(file) {
        let handled = UI._event_handlers['on_file'].reduce((handled, handler)=>{
            return handled||handler(file);
        }, false);

        if (!handled)
            UI.log('unhandled file transfer:', file);
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
        if (UI._parse_uri(window.location.hash.slice(1,))) {
            UI.log(window.location.hash.slice(1,));
            window.location.reload();
        }
    }

    // Stroke handling
    ,global_to_local : function(point, viewpoint) {
        if (point==null) return null;
        let vp = (viewpoint===undefined)?UI.viewpoint:viewpoint;
        return {
            X : (point.X - vp.dx) * vp.scale
            ,Y : (point.Y - vp.dy) * vp.scale
        };
    }

    ,local_to_global : function(point) {
        if (point==null) return null;
        let vp = UI.viewpoint;
        return {
            X : (point.X / vp.scale) + vp.dx
            ,Y : (point.Y / vp.scale) + vp.dy
        };
    }

    ,figure_split : function(figure, cyclic, max_length) {
        cyclic = (cyclic===undefined)?true:cyclic;
        let ret = [];
        let p0, p1;

        let i =0;
        while (i < figure.length) {
            p0 = copy(figure[i]);
            p1 = figure[(i+1)%figure.length];

            ret.push(copy(p0));

            if ((!cyclic)&&(i==figure.length-1))
                break;

            if (max_length===undefined) {
                ret.push({X:(p0.X+p1.X)/2, Y:(p0.Y+p1.Y)/2});

            } else {
                let dv = sub(p1, p0);
                let dx = dv.X * max_length / Math.sqrt(dst2(p0, p1));
                let dy = dv.Y * max_length / Math.sqrt(dst2(p0, p1));

                while(dst2(p0, p1) > max_length*max_length) {
                    if (dst2(p0, p1) > 2*max_length*max_length) {
                        p0.X += dx;
                        p0.Y += dy;
                    } else {
                        p0.X += dx;
                        p0.Y += dy;
                    }
                    ret.push(copy(p0));
                }

            }

            i++;
        }

        return ret;
    }

    ,figure_distort : function(figure, mode, cyclic) { // eslint-disable-line no-unused-vars
        mode = (mode===undefined) ? 1 : mode;
        //cyclic = (cyclic===undefined) ? true : cyclic;

        let w = BRUSH.get_local_width();

        if (mode==1) {
            w *= 1.6;
        } else if (mode==2) {
            w *= 1.0;
        }

        let p0 = null;
        let t = 0;

        let distortion = (p, i)=>{
            if ((i==0)&&(t==0)) {
                p0 = copy(p);
                return p;
            }

            let v = sub(p0, p);

            let dx = angle({X:Math.abs(v.X), Y:0}, v);
            let dy = angle({X:0, Y:Math.abs(v.Y)}, v);

            let dphi = Math.sin((2 * Math.PI) * (t / (w * 80)));

            let phi = (2 * Math.PI) * (1 / (w * 60)) * (t + 10 * w * dphi);

            t += Math.sqrt(dst2(p, p0));

            p0 = copy(p);

            return {
                X : p.X + Math.sin(phi) * w * ((dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2)))
                ,Y : p.Y + Math.sin(phi) * w * ((dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2)))
            };

            /*
              X : p.X + Math.sin(phi+dphi*t) * w * ((dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2)))
             ,Y : p.Y + Math.sin(phi+dphi*t) * w * ((dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2)))
            */

        };

        figure = figure.map(distortion);

        if (mode==2) {
            // if not cyclic push invisible stroke to transit from p[-1] to p[0]
            figure.map(distortion).map((p)=>{
                figure.push(p);
            });
        }

        return figure;
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
                let pa = {'X':a[0], 'Y':a[1]};
                let pb = {'X':b[0], 'Y':b[1]};
                UI.draw_gstroke(pa, pb, color, 4, ctx, viewpoint);
            }

            p = glyph[i];
        }
    }

    ,draw_gstroke : function(gp0, gp1, color, width, ctx, viewpoint) {
        let lp0 = UI.global_to_local(gp0, viewpoint);
        let lp1 = UI.global_to_local(gp1, viewpoint);
        UI.draw_stroke(
            lp0
            ,lp1
            ,color
            ,width * viewpoint.scale
            ,ctx
        );
    }

    ,draw_stroke : function(lp0, lp1, color, width, ctx) {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.moveTo(lp0.X, lp0.Y);
        ctx.lineTo(lp1.X, lp1.Y);
        ctx.stroke();
        ctx.closePath();
    }

    ,add_overlay_stroke : function(lp0, lp1, params) { // temporary strokes in overlay layer
        const ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];
        const {
            color:color = BRUSH.get_color()
            ,width:width = BRUSH.get_local_width()
        } = params||{};
        UI.draw_stroke(lp0, lp1, color, width, ctx);
    }


    ,get_rect : function(points) {
        const rect = [{X:1e10,Y:1e10}, {X:-1e10,Y:-1e10}];
        points.map((point)=>{
            if (point!=null) {
                rect[0].X = Math.min(rect[0].X, point.X);
                rect[1].X = Math.max(rect[1].X, point.X);

                rect[0].Y = Math.min(rect[0].Y, point.Y);
                rect[1].Y = Math.max(rect[1].Y, point.Y);
            }
        });
        return rect;
    }


    ,redraw : function(target_ctx) {
        let ctx = null;
        let ctx_back = null;
        let lp0, lp1;

        if (target_ctx === undefined) {
            UI.update_layers(true);
            ctx = UI.contexts[UI.LAYERS.indexOf('board')];
            ctx_back = UI.contexts[UI.LAYERS.indexOf('background')];
        } else {
            ctx = target_ctx;
            ctx_back = target_ctx;
        };

        if (GRID_MODE.grid_active)
            UI.redraw_grid(ctx_back);

        for(let commit_id in BOARD.strokes) {
            if (commit_id > BOARD.commit_id)
                break;

            for(let i in BOARD.strokes[commit_id]) {
                let stroke = BOARD.strokes[commit_id][i];

                if (BOARD.is_hidden(stroke))
                    continue; // erased stroke

                if (stroke.gp[0]==null)
                    continue; // erasure stroke

                lp0 = UI.global_to_local(stroke.gp[0], UI.viewpoint);
                lp1 = UI.global_to_local(stroke.gp[1], UI.viewpoint);

                UI.draw_stroke(
                    lp0
                    ,lp1
                    ,stroke.color
                    ,stroke.width * UI.viewpoint.scale
                    ,ctx
                );
            }
        }

        if ((TOOLS.current!=null)&&(TOOLS.current.after_redraw!=undefined)) {
            TOOLS.current.after_redraw();
        }

        BRUSH.update_size();
    }

    ,redraw_grid : function(ctx) {
        //h
        let y = - (UI.viewpoint.dy % UI.GRID) * UI.viewpoint.scale;
        while (y < UI.window_height) {
            UI.draw_stroke(
                {'Y' : y, 'X' : 0}
                ,{'Y' : y, 'X' : UI.window_width}
                ,(Math.abs(y / UI.viewpoint.scale + UI.viewpoint.dy)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            y += UI.GRID * UI.viewpoint.scale;
        }

        //w
        let x = - (UI.viewpoint.dx % UI.GRID) * UI.viewpoint.scale;
        while (x < UI.window_width) {
            UI.draw_stroke(
                {'X' : x, 'Y' : 0}
                ,{'X' : x, 'Y' : UI.window_height}
                ,(Math.abs(x / UI.viewpoint.scale + UI.viewpoint.dx)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            x += UI.GRID * UI.viewpoint.scale;
        }

    }

    ,toast : function(topic, text, lifespan) {
        return toast(topic, text, lifespan);
    }

    ,log : function(...args) {
        log(...args);
    }

};

export {UI};
