'use strict';

import {UI} from './UI.js';
import {Menu} from './Menu.js';


let BRUSH = {
    icon_size_inc :  [null,[41,20],[40,17],[42,15],[45,16],[44,19],[41,20],null,[40,24],[36,21],[35,17],[36,13],[40,11],[45,11],[48,13],[50,17],[49,20],[47,23],[40,24],null,[39,27],[36,26],[34,23],[32,20],[32,17],[32,14],[34,11],[36,9],[39,7],[42,7],[45,7],[48,9],[51,11],[52,14],[50,17],[52,20],[51,23],[48,26],[45,27],[42,28],[39,27],null,[12,50],[10,48],[12,45],[15,46],[15,49],[12,50],null,[32,35],[32,28],[25,28],null,[17,44],[32,28]]
    ,icon_size_dec : [null,[19,40],[20,41],[20,43],[19,45],[17,45],[16,44],[15,43],[16,41],[17,40],[19,40],null,[20,36],[22,37],[24,40],[25,41],[25,44],[25,46],[23,48],[21,48],[19,49],[17,50],[14,49],[12,48],[11,47],[11,45],[10,43],[11,40],[12,39],[13,37],[15,36],[18,36],[20,36],null,[21,33],[24,35],[26,38],[28,41],[28,44],[28,47],[25,50],[23,52],[20,53],[17,53],[14,53],[11,51],[8,49],[8,46],[8,43],[8,40],[9,37],[12,34],[15,33],[18,32],[21,33],null,[49,11],[50,12],[51,13],[50,14],[49,15],[48,16],[46,16],[45,15],[45,13],[46,12],[47,11],[48,10],[49,11],null,[43,25],[43,18],[35,18],null,[27,34],[43,18]]

    ,COLORS : [
        ['#000A', 'black'],
        ['#FFFA', 'white'],
        ['#F00A', 'red'],
        ['#FD0A', 'gold'],
        ['#080A', 'green'],
        ['#93EA', 'blueviolet'],
        ['#00FA', 'blue'],
        ['#469A', '#469'] // pale blue
    ]

    ,color_id : 0
    ,binding : {}
    ,size : 5

    ,div : null
    ,wdiv: null
    ,MENU_main : null
    ,MENU_options : null

    ,activate_color : function(button) {
        button = (button===undefined)?0:button;
        UI.log(1, 'activate color :', button);
        if (button in BRUSH.binding)
            BRUSH.select_color(BRUSH.binding[button]);
    }

    ,select_color : function(color_id) {
        BRUSH.color_id = color_id;
        BRUSH.div.style['background-color'] = BRUSH.get_color('E');
    }

    ,attach_color : function(color_id, button) {
        button = (button===undefined)?0:button;
        UI.log(1, 'attached color :', color_id, button);
        BRUSH.binding[button] = color_id;

        if (button>0) {
            let toast = UI.toast(
                'binding_' + button
                ,button + ' :: ' + ' - '
                ,-1 // permanent
                ,2 // bottom right
                ,false // do not reset
            );
            toast.set_bg_color(BRUSH.get_color('5', color_id));
        }

        if (button==UI._last_button)
            BRUSH.select_color(color_id);
    }

    ,oncolor : function(e, id, long) { // eslint-disable-line no-unused-vars
        UI.log(1, 'brush.oncolor :', id, long, e);
        const color_id = id.split('_')[1]*1;
        let button = (long)?1:e.button;
        BRUSH.attach_color(color_id, button);
        BRUSH.MENU_main.hide('colors');
    }

    ,update_size : function (delta) {
        if (delta==undefined) delta = 0;
        BRUSH.size += delta;
        if (BRUSH.size>40) BRUSH.size=5;
        if (BRUSH.size<5)  BRUSH.size=40;

        let wdiv = BRUSH.wdiv;
        let size = BRUSH.get_local_width();
        wdiv.style['left']   = ((Menu.SIZE-size)>>1)+'px';
        wdiv.style['top']    = ((Menu.SIZE-size)>>1)+'px';
        wdiv.style['width']  = ((size)>>0)+'px';
        wdiv.style['height'] = ((size)>>0)+'px';
        wdiv.style['borderRadius'] = ((size)>>0)+'px';
        wdiv.style['borderColor'] = 'red';
        //if (document.getElementById('palette').children[0].dataset['color']=='red') {
        //    wdiv.style.borderColor='black';
        //} else {
        //    wdiv.style.borderColor='red';
        //};
        if (delta!=0)
            UI.redraw();
    }

    ,get_local_width : function() {
        return BRUSH.MODE.scaled ? BRUSH.size * UI.viewpoint.scale : BRUSH.size;
    }

    ,get_color : function(alpha, color_id) {
        color_id = (color_id===undefined)?BRUSH.color_id:color_id;
        let color = BRUSH.COLORS[color_id][0];

        if (alpha===undefined) {
            // 0123456789ABCDEF
            // -----+----+----+
            color = color.slice(0,-1) + ['5','A','F'][BRUSH.OPACITY.level];
        } else {
            color = color.slice(0,-1) + alpha;
        }

        return color;
    }

    ,init : function(MENU_main, MENU_options) {
        this.MENU_main = MENU_main;
        this.MENU_options = MENU_options;

        // color picker menu item, shows current color, size.
        let [par,div] = this.MENU_main.add('root', 'colors', null, 'div');
        par.style['overflow'] = 'hidden';

        div.style['background-color'] = 'black';
        div.style['border-radius'] = '40px';
        div.style['width'] = '100%';
        div.style['height'] = '100%';
        BRUSH.div = div;

        let wdiv = document.createElement('div');
        wdiv.id = div.id + '_s';
        wdiv.style['position'] = 'relative';
        wdiv.style['border'] = '1px solid';
        div.appendChild(wdiv);
        BRUSH.wdiv = wdiv;

        BRUSH.COLORS.map((color, i)=>{
            let [g,v] = this.MENU_main.add('colors', 'color_' + i, BRUSH.oncolor, 'div');
            v.style['background-color'] = BRUSH.get_color('E', i);
            v.style['border-radius'] = '40px';
            v.style['width'] = '100%';
            v.style['height'] = '100%';
            g.style['background-color'] = '#666D';
        });

        BRUSH.attach_color(0 ,0);
        BRUSH.update_size();

        // brush size changer options menu items
        let ctx = this.MENU_options.add('root'
            , 'brush_size_inc'
            , ()=>{
                BRUSH.update_size(+5);
            }
            , 'canvas'
            , 'increase brush size')[1].getContext('2d');
        UI.draw_glyph(BRUSH.icon_size_inc, ctx, undefined, undefined);

        ctx = this.MENU_options.add('root'
            , 'brush_size_dec'
            , ()=>{
                BRUSH.update_size(-5);
            }
            , 'canvas'
            , 'decrease brush size')[1].getContext('2d');
        UI.draw_glyph(BRUSH.icon_size_dec, ctx, undefined, undefined);
    }

    ,MODE : {
        icons : {
            true : [null,[22,36],[27,31],[22,26],null,[11,26],[6,31],[11,36],null,[6,31],[27,31],null,[48,36],[53,31],[48,26],null,[37,26],[31,31],[36,36],null,[31,31],[53,31]]
            ,false : [null,[28,37],[28,31],[28,25],null,[6,25],[6,31],[6,37],null,[6,31],[28,31],null,[53,37],[53,31],[53,25],null,[32,25],[32,31],[32,37],null,[32,31],[53,31]]
        }
        ,name : 'brush_mode'

        ,canvas : null

        ,scaled : false

        ,click : function() {
            BRUSH.MODE.scaled = !BRUSH.MODE.scaled;
            BRUSH.MODE.canvas.width = BRUSH.MODE.canvas.width+1-1;
            let ctx = BRUSH.MODE.canvas.getContext('2d');
            UI.draw_glyph(BRUSH.MODE.icons[BRUSH.MODE.scaled], ctx);
            BRUSH.update_size();
        }

        ,init : function(canvas) {
            BRUSH.MODE.canvas = canvas;
            BRUSH.MODE.click();
        }
    }

    ,OPACITY : {
        icons : {
            0 : [null,[54,14],[47,6],[15,38],[23,45],[54,14],null,[19,49],[10,42],[7,53],[19,49],null,[47,6],[54,14],[23,45],null,[47,6],[15,38],[23,45],null,[19,49],[10,42],[7,53],[19,49],null,[15,46],[7,53],null,[18,41],[27,32],null,[21,43],[29,34]]
            ,1 : [null,[54,15],[47,7],[15,39],[23,46],[54,15],null,[19,50],[10,43],[7,54],[19,50],null,[47,7],[54,15],[23,46],null,[47,7],[15,39],[23,46],null,[19,50],[10,43],[7,54],[19,50],null,[15,47],[7,54],null,[19,40],[35,23],null,[21,43],[38,25]]
            ,2 : [null,[54,15],[47,7],[15,39],[23,46],[54,15],null,[19,50],[10,43],[7,54],[19,50],null,[47,7],[54,15],[23,46],null,[47,7],[15,39],[23,46],null,[19,50],[10,43],[7,54],[19,50],null,[15,47],[7,54],null,[18,40],[46,12],null,[21,42],[50,13]]
        }
        ,name : 'brush_opacity'

        ,canvas : null

        ,level : 0

        ,click : function() {
            BRUSH.OPACITY.level = (BRUSH.OPACITY.level+1)%3;
            BRUSH.OPACITY.canvas.width = BRUSH.OPACITY.canvas.width+1-1;
            let ctx = BRUSH.OPACITY.canvas.getContext('2d');
            UI.draw_glyph(BRUSH.OPACITY.icons[BRUSH.OPACITY.level], ctx);
            //BRUSH.update_size();
        }

        ,init : function(canvas) {
            BRUSH.OPACITY.canvas = canvas;
            BRUSH.OPACITY.click();
        }
    }

};


export {BRUSH};
