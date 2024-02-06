'use strict';

import {Point} from '../util/Point.js';

import {UI} from '../ui/UI.js';

import {TexterTool} from '../tools/TexterTool.js';


// SLIDER ITEMS
let SLIDER = {
    LABEL_DX : 80

    ,icon_prev :  [null,[26,48],[14,30],[26,13],null,[28,47],[17,30],[28,13],null,[40,47],[28,30],[40,13],null,[42,47],[30,30],[42,13]]
    ,icon_next :  [null,[35,13],[46,30],[35,47],null,[33,13],[44,30],[33,47],null,[21,13],[33,30],[21,47],null,[19,13],[31,30],[19,47]]
    ,icon_del :   [null,[8,43],[8,48],[20,48],[20,43],[8,43],null,[8,12],[8,16],[20,16],[20,12],[8,12],null,[8,27],[8,32],[20,32],[20,27],[8,27],null,[36,35],[41,30],[36,25],null,[27,30],[41,30]]
    ,icon_add :   [null,[40,42],[40,47],[52,47],[52,42],[40,42],null,[40,14],[40,18],[52,18],[52,14],[40,14],null,[8,27],[8,32],[20,32],[20,27],[8,27],null,[36,35],[41,30],[36,25],null,[27,30],[41,30]]
    ,icon_focus : [null,[24,28],[24,32],[36,32],[36,28],[24,28],null,[25,17],[30,22],[35,17],null,[30,8],[30,22],null,[35,44],[30,39],[25,44],null,[30,54],[30,39],null,[12,35],[17,30],[12,25],null,[5,30],[17,30],null,[48,25],[43,30],[48,35],null,[55,30],[43,30]]
    ,icon_home :  [null,[25,16],[30,21],[35,16],null,[30,7],[30,21],null,[35,43],[30,38],[25,43],null,[30,53],[30,38],null,[12,34],[17,29],[12,24],null,[5,29],[17,29],null,[48,24],[43,29],[48,34],null,[55,29],[43,29]]


    ,canvas_current : null

    ,slides : []
    ,current_ix : null

    ,get_current_frame : function() {
        return [
            UI.local_to_global(Point.new(0, 0))
            ,UI.local_to_global(Point.new(
                UI.window_width - UI.CANVAS_MARGIN * 2
                ,UI.window_height - UI.CANVAS_MARGIN * 2
            ))
        ];
    }

    ,update : function(refocus=true) {
        const w = SLIDER.canvas_current.width;
        const h = SLIDER.canvas_current.height;

        SLIDER.canvas_current.width = w;
        if (SLIDER.current_ix==null)
            return;

        let current_slide = SLIDER.slides[SLIDER.current_ix];
        let ctx = SLIDER.canvas_current.getContext('2d');

        let label = current_slide[0];

        if (label) {
            let len = 0;
            for(let ci=0; ci<label.length; ci++)
                len += TexterTool.put_char(label[ci], 0, 0, 0.6, ()=>{}) + 5;

            let bx = (w - len) / 2 + 3;
            let by = (h +  36) / 2 - 3;
            for(let ci=0; ci<label.length; ci++) {
                TexterTool.put_char(label[ci], bx, by, 0.6, (p0, p1)=>{
                    UI.draw_line(p0, p1, 'black', 7, ctx);
                });
                bx += TexterTool.put_char(label[ci], bx, by, 0.6, (p0, p1)=>{
                    UI.draw_line(p0, p1, 'green', 5, ctx);
                }) + 5;
            }
        }

        if (refocus)
            SLIDER.move_to(SLIDER.slides[SLIDER.current_ix][1]);
    }

    ,_timer : null
    ,move_to : function(rect) {
        let rect0 = SLIDER.get_current_frame();

        if ((rect===undefined)||(rect==null))
            return;

        if (rect[1].x - rect[0].x <= 0) {
            console.error('SLIDER, erroneous rect: ', rect);
            return;
        }

        if ((rect0[0].x==rect[0].x)&&(rect0[0].y==rect[0].y)
        //&&(rect0[1].X==rect[1].X)&&(rect0[1].Y==rect[1].Y)
        )
            return;

        let LDX = (UI.window_width - UI.CANVAS_MARGIN*2);
        //let LDY = (UI.window_width - UI.CANVAS_MARGIN*2);

        if (SLIDER._timer!=null)
            clearTimeout(SLIDER._timer);

        function interpolate(p0, p1, step, steps, time) {
            const d = [
                p1[0].x - p0[0].x, p1[0].y - p0[0].y
                ,p1[1].x - p0[1].x, p1[1].y - p0[1].y
            ];
            const k = step / steps;

            UI.viewpoint_set(
                p0[0].x + d[0] * k
                ,p0[0].y + d[1] * k
                ,LDX / ((p0[1].x + d[2] * k) - UI.viewpoint.dx)
            );

            if (step==steps) {
                SLIDER._timer = null;
                UI.viewpoint_set(p1[0].x, p1[0].y, LDX / (p1[1].x - p1[0].x));

            } else {
                SLIDER._timer = setTimeout(((p0, p1, step, steps, time)=>{
                    return ()=>{interpolate(p0, p1, step+1, steps, time);};
                })(p0, p1, step, steps, time), time/steps);

            }
        }

        interpolate(rect0, rect, 0, 15, 500);
    }

    ,slide_next : function() {
        if (SLIDER.current_ix==null)
            return;

        SLIDER.current_ix = (SLIDER.current_ix + 1) % SLIDER.slides.length;
        SLIDER.update();
    }

    ,slide_curr : function() {
        return true;
    }

    ,slide_prev : function() {
        if (SLIDER.current_ix==null)
            return;

        SLIDER.current_ix = (SLIDER.current_ix - 1);
        if (SLIDER.current_ix==-1)
            SLIDER.current_ix = SLIDER.slides.length-1;

        SLIDER.update();
    }

    ,slide_add : function() {
        let frame_rect = SLIDER.get_current_frame();

        let code = UI.prompt('Slide name:');
        if ((code!='')&&(code!=null)) {
            if (SLIDER.current_ix==null) {
                SLIDER.slides.push([code, frame_rect]);
                SLIDER.current_ix = 0;
            } else {
                SLIDER.slides.splice(SLIDER.current_ix + 1, 0, [code, frame_rect]);
                SLIDER.current_ix = SLIDER.current_ix + 1;
            }
        }

        SLIDER.update();

        return true;
    }

    ,slide_del : function() {
        if (SLIDER.slides.length==0) {
            UI.toast('slider','no slides to delete', 2000);
            return;
        }

        if (!confirm('Delete slide: ' + SLIDER.slides[SLIDER.current_ix][0] + '?'))
            return;

        SLIDER.slides.splice(SLIDER.current_ix, 1);
        SLIDER.current_ix = Math.max(SLIDER.current_ix - 1, 0);
        if (SLIDER.slides.length==0)
            SLIDER.current_ix = null;

        SLIDER.update(false);
        return true;
    }

    ,slide_focus : function() {
        if (SLIDER.current_ix!=null)
            SLIDER.update();
        return true;
    }

    ,slide_home : function() {
        SLIDER.move_to([Point.new(0, 0)
            ,Point.new(
                UI.window_width  - UI.CANVAS_MARGIN*2
                ,UI.window_height - UI.CANVAS_MARGIN*2
            )
        ]);

        if (SLIDER.current_ix!=null)
            SLIDER.current_ix = 0;
        SLIDER.update(false);

        return true;
    }

    ,on_key_down : function(key) {
        if (key=='Home') {
            SLIDER.slide_home();
        } else if (key=='PageDown') {
            SLIDER.slide_next();
        } else if (key=='PageUp') {
            SLIDER.slide_prev();
        } else if (key=='End') {
            SLIDER.slide_focus();
        }
    }

    ,on_persist : function(json, is_sync) {
        json.modules['slider'] = {
            slides : SLIDER.slides
            ,view_rect : SLIDER.get_current_frame()
        };
        if (is_sync) {
            if (UI.view_mode=='follow') {
                json.modules['slider'].slides = null;
                json.modules['slider'].view_rect = null;
            }
            //json.modules['slider'].lead = (UI.view_mode == 'lead')*1;
        }
    }

    ,on_unpersist : function(json, is_sync) {
        function convert_point(p) {
            if ('X' in p)
                return Point.new(p.X, p.Y);
            else
                return Point.new(p.x, p.y);
        }

        let msg = json.modules['slider'];
        if (msg===undefined)
            return;

        if (msg.slides) {
            msg.slides = msg.slides.map((slide)=>{
                return [slide[0], slide[1].map(convert_point)];
            });

            SLIDER.slides = msg.slides;
            if (SLIDER.slides.length > 0) {
                if ((!is_sync)||(SLIDER.current_ix==null))
                    SLIDER.current_ix = 0;
            } else {
                SLIDER.current_ix = null;
            }
            SLIDER.update(!is_sync); // refocus
        }

        if (((UI.view_mode=='follow')||(!is_sync))&&(msg.view_rect)) {
            msg.view_rect = msg.view_rect.map(convert_point);
            SLIDER.move_to(msg.view_rect);
        }
    }

    ,on_resize : function() {
        SLIDER.canvas_current = SLIDER.MENU_main.items['slide_curr'].dom.children[0];
        SLIDER.update(false);
    }

    ,init : function(MENU_main) {
        SLIDER.MENU_main = MENU_main;

        (
            MENU_main.add('root', 'slide_separator_0', null, 'div', '', 5)[0]
                .style['background-color'] = '#555'
        );
        MENU_main.add_icon('root', 'slide_prev', SLIDER.icon_prev, 'goto previous slide', SLIDER.slide_prev);
        MENU_main.add('root', 'slide_curr', SLIDER.slide_curr, 'canvas', 'current slide / slide operations', Math.max(SLIDER.LABEL_DX, MENU_main.dx));
        MENU_main.add_icon('root', 'slide_next', SLIDER.icon_next, 'goto next slide', SLIDER.slide_next);
        (
            MENU_main.add('root', 'slide_separator_1', null, 'div', '', 5)[0]
                .style['background-color'] = '#555'
        );
        SLIDER.on_resize();

        MENU_main.add_icon('slide_curr', 'slide_add', SLIDER.icon_add, 'insert new slide after current', SLIDER.slide_add);
        MENU_main.add_icon('slide_curr', 'slide_del', SLIDER.icon_del, 'delete current slide', SLIDER.slide_del);
        MENU_main.add_icon('slide_curr', 'slide_focus', SLIDER.icon_focus, 'focus on current slide', SLIDER.slide_focus);
        MENU_main.add_icon('slide_curr', 'slide_home', SLIDER.icon_home, 'focus on default viewpoint', SLIDER.slide_home);

        UI.addEventListener('on_key_down', SLIDER.on_key_down);
        UI.addEventListener('on_persist', SLIDER.on_persist);
        UI.addEventListener('on_unpersist', SLIDER.on_unpersist);
        UI.addEventListener('on_resize', SLIDER.on_resize);
    }

};

export {SLIDER};
