'use strict';

import {UI} from './UI.js';

import {Settings} from '../actions/Settings.js';

let BRUSH = {
    icon_size_inc :  [null,[41,20],[40,17],[42,15],[45,16],[44,19],[41,20],null,[40,24],[36,21],[35,17],[36,13],[40,11],[45,11],[48,13],[50,17],[49,20],[47,23],[40,24],null,[39,27],[36,26],[34,23],[32,20],[32,17],[32,14],[34,11],[36,9],[39,7],[42,7],[45,7],[48,9],[51,11],[52,14],[50,17],[52,20],[51,23],[48,26],[45,27],[42,28],[39,27],null,[12,50],[10,48],[12,45],[15,46],[15,49],[12,50],null,[32,35],[32,28],[25,28],null,[17,44],[32,28]]
    ,icon_size_dec : [null,[19,40],[20,41],[20,43],[19,45],[17,45],[16,44],[15,43],[16,41],[17,40],[19,40],null,[20,36],[22,37],[24,40],[25,41],[25,44],[25,46],[23,48],[21,48],[19,49],[17,50],[14,49],[12,48],[11,47],[11,45],[10,43],[11,40],[12,39],[13,37],[15,36],[18,36],[20,36],null,[21,33],[24,35],[26,38],[28,41],[28,44],[28,47],[25,50],[23,52],[20,53],[17,53],[14,53],[11,51],[8,49],[8,46],[8,43],[8,40],[9,37],[12,34],[15,33],[18,32],[21,33],null,[49,11],[50,12],[51,13],[50,14],[49,15],[48,16],[46,16],[45,15],[45,13],[46,12],[47,11],[48,10],[49,11],null,[43,25],[43,18],[35,18],null,[27,34],[43,18]]

    ,current_palette : 0
    ,COLORS : [
        [
            ['#000A', 'black'],
            ['#FFFA', 'white'],
            ['#F00A', 'red'],
            ['#FD0A', 'gold'],
            ['#080A', 'green'],
            ['#93EA', 'blueviolet'],
            ['#00FA', 'blue'],
            ['#469A', 'pale blue']
        ],

        [ // graffiti 1
            ['#000A', 'black'],
            ['#FFFA', 'white'],
            ['#d71201AA', 'red'],
            ['#fec449AA', 'gold'],
            ['#3cab06AA', 'green'],
            ['#dc4e7eAA', 'blueviolet'],
            ['#1356ebAA', 'blue'],
            ['#23a0a4AA', 'pale blue']
        ],

        [ // graffiti 2
            ['#000A', 'black'],
            ['#FFFA', 'white'],
            ['#b92e34AA', 'red'],
            ['#f6f16bAA', 'gold'],
            ['#39ff14AA', 'green'],
            ['#fb7cf5AA', 'blueviolet'],
            ['#99f0f2AA', 'blue'],
            ['#81a9ffAA', 'pale blue']
        ],


        [ // graffiti 3
            ['#000A', 'black'],
            ['#FFFA', 'white'],
            ['#dd855cAA', 'red'],
            ['#f1e8caAA', 'gold'],
            ['#9ebd9eAA', 'green'],
            ['#bbcbdbAA', 'blue'],
            ['#745151AA', 'brown'],
            ['#469A', 'pale blue']
        ],

        [ // greenish 1
            ['#000A', 'black'],
            ['#FFFA', 'white'],
            ['#4f151cAA', 'red'],
            ['#e9e0aaAA', 'gold'],
            ['#009f62AA', 'green'],
            ['#fb7cf5AA', 'blueviolet'],
            ['#a0d173AA', 'light green'],
            ['#63635cAA', 'pale brown']
        ]
    ]

    ,color_id : 0
    ,binding : {}
    ,size : 5

    ,div : null
    ,wdiv: null
    ,MENU_main : null
    ,MENU_options : null

    ,activate_color : function(button=0) {
        UI.log(1, 'activate color :', button);
        if (button in BRUSH.binding)
            BRUSH.select_color(BRUSH.binding[button]);
    }

    ,select_color : function(color_id) {
        BRUSH.color_id = color_id;
        BRUSH.div.style['background-color'] = BRUSH.get_color();
        BRUSH.update_size();
        UI.on_color(BRUSH.get_color());
    }

    ,attach_color : function(color_id, button=0) {
        UI.log(2, 'attached color :', color_id, button);
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
            BRUSH.update_size();
        }

        if (button==UI._last_button)
            BRUSH.select_color(color_id);
    }

    ,on_color : function(e, id, long) {
        UI.log(1, 'brush.on_color :', id, long, e);
        const color_id = id.split('_')[1]*1;
        let button = (long) ? 2 : e.button; // long press selects alternative color (same as right mouse button click)
        BRUSH.attach_color(color_id, button);
        BRUSH.MENU_main.hide('colors');
    }

    ,update_size : function (delta) {
        if (delta==undefined) delta = 0;

        if (((BRUSH.size + delta <= 5)||(BRUSH.size < 5)) && (delta!=0))
            delta = Math.sign(delta);

        BRUSH.size += delta;
        if (delta!=0) {
            if (BRUSH.size>40) BRUSH.size=5;
            if (BRUSH.size<=0)  BRUSH.size=40;
        }

        let wdiv = BRUSH.wdiv;
        let size = BRUSH.get_local_width() - 3;
        wdiv.style['left']   = ((BRUSH.MENU_main.dx - size)>>1) - 2 + 'px';
        wdiv.style['top']    = ((BRUSH.MENU_main.dy - size)>>1) - 2 + 'px';
        wdiv.style['width']  = ((size)>>0) + 'px';
        wdiv.style['height'] = ((size)>>0) + 'px';
        wdiv.style['borderRadius'] = ((size)>>0) + 'px';
        if (BRUSH.binding[2]!==undefined)
            wdiv.style['borderColor'] = BRUSH.get_color('A', BRUSH.binding[2]);
        else
            wdiv.style['borderColor'] = BRUSH.get_color('A', (BRUSH.color_id + 1) % BRUSH.COLORS[BRUSH.current_palette].length);
        //if (document.getElementById('palette').children[0].dataset['color']=='red') {
        //    wdiv.style.borderColor='black';
        //} else {
        //    wdiv.style.borderColor='red';
        //};
        if (delta!=0)
            UI.redraw();
    }

    ,set_local_width : function(size) {
        BRUSH.size = BRUSH.SCALED.value ? size / UI.viewpoint.scale : size;
        BRUSH.update_size();
    }

    ,get_local_width : function() {
        return BRUSH.SCALED.value ? BRUSH.size * UI.viewpoint.scale : BRUSH.size;
    }

    ,get_color : function(alpha, color_id) {
        color_id = (color_id===undefined) ? BRUSH.color_id : color_id;
        let color = BRUSH.COLORS[BRUSH.current_palette][color_id][0];
        let ctype = color.length / 4; // 1 for short 2 for long

        if (alpha===undefined) {
            // 0123456789ABCDEF
            // -----+----+----+
            color = color.slice(0, -ctype) + ['55', 'AA', 'FF'][BRUSH.OPACITY.value].slice(0, ctype);
        } else {
            color = color.slice(0, -ctype) + (alpha + alpha).slice(0, ctype);
        }

        return color;
    }

    ,_update_palette : function(selected_color=0) {
        BRUSH.MENU_main.items['colors'].sub.slice().map((color_id)=>{
            BRUSH.MENU_main.drop(color_id);
        });

        BRUSH.COLORS[BRUSH.current_palette].map((color, i)=>{
            let [g, v] = this.MENU_main.add('colors', 'color_' + i, BRUSH.on_color, 'div');
            v.style['background-color'] = BRUSH.get_color('E', i);
            v.style['border-radius'] = '40px';
            v.style['width'] = '100%';
            v.style['height'] = '100%';
            g.style['background-color'] = '#666D';
        });

        BRUSH.attach_color(selected_color, 0);
        BRUSH.update_size();
    }

    ,init : function(MENU_main, MENU_options) {
        BRUSH.MENU_main = MENU_main;
        BRUSH.MENU_options = MENU_options;

        // color picker menu item, shows current color, size.
        BRUSH.MENU_main.add('root', 'colors', null, 'div');
        BRUSH._setup_menu_item();

        BRUSH._update_palette();

        // brush size changer options menu items
        BRUSH.MENU_options.add_icon(
            'root', 'brush_size_inc', BRUSH.icon_size_inc, 'increase brush size',
            ()=>{
                BRUSH.update_size(+5);
            }
        );

        BRUSH.MENU_options.add_icon(
            'root', 'brush_size_dec', BRUSH.icon_size_dec, 'decrease brush size',
            ()=>{
                BRUSH.update_size(-5);
            }
        );
    }

    ,_setup_menu_item : function() {
        let par = BRUSH.MENU_main.items['colors'].dom;
        par.style['overflow'] = 'hidden';

        let div = par.children['colors_g'];
        div.style['background-color'] = 'black';
        div.style['border-radius'] = '40px';
        div.style['width'] = '100%';
        div.style['height'] = '100%';
        BRUSH.div = div;

        let wdiv = document.createElement('div');
        wdiv.id = div.id + '_s';
        wdiv.style['position'] = 'relative';
        wdiv.style['border'] = '3px solid';
        div.appendChild(wdiv);
        BRUSH.wdiv = wdiv;
    }

    ,post_init : function() {
        UI.addEventListener('on_key_down', (key)=>{
            if (key == '+') {
                BRUSH.update_size(+5);
                return true;
            } else if (key == '-') {
                BRUSH.update_size(-5);
                return true;
            } else if (key == 'Tab') {
                BRUSH.attach_color((BRUSH.color_id + 1) % BRUSH.COLORS[BRUSH.current_palette].length, UI._last_button);
                return true;
            }
        });

        UI.addEventListener('on_resize', ()=>{
            BRUSH._setup_menu_item();
            BRUSH._update_palette(BRUSH.color_id);
            BRUSH.update_size();
        });

        UI.addEventListener('on_after_zoom', ()=>{
            BRUSH.update_size();
        });
    }

    ,SCALED : Settings.new('brush_scaled', 1
        ,[
            [null,[28,37],[28,31],[28,25],null,[6,25],[6,31],[6,37],null,[6,31],[28,31],null,[53,37],[53,31],[53,25],null,[32,25],[32,31],[32,37],null,[32,31],[53,31]],
            [null,[22,36],[27,31],[22,26],null,[11,26],[6,31],[11,36],null,[6,31],[27,31],null,[48,36],[53,31],[48,26],null,[37,26],[31,31],[36,36],null,[31,31],[53,31]]
        ]
        ,()=>{BRUSH.update_size();}
    )

    ,OPACITY : Settings.new('brush_opacity', 1
        ,[
            [null,[54,14],[47,6],[15,38],[23,45],[54,14],null,[19,49],[10,42],[7,53],[19,49],null,[47,6],[54,14],[23,45],null,[47,6],[15,38],[23,45],null,[19,49],[10,42],[7,53],[19,49],null,[15,46],[7,53],null,[18,41],[27,32],null,[21,43],[29,34]],
            [null,[54,15],[47,7],[15,39],[23,46],[54,15],null,[19,50],[10,43],[7,54],[19,50],null,[47,7],[54,15],[23,46],null,[47,7],[15,39],[23,46],null,[19,50],[10,43],[7,54],[19,50],null,[15,47],[7,54],null,[19,40],[35,23],null,[21,43],[38,25]],
            [null,[54,15],[47,7],[15,39],[23,46],[54,15],null,[19,50],[10,43],[7,54],[19,50],null,[47,7],[54,15],[23,46],null,[47,7],[15,39],[23,46],null,[19,50],[10,43],[7,54],[19,50],null,[15,47],[7,54],null,[18,40],[46,12],null,[21,42],[50,13]]
        ]
        ,()=>{
            BRUSH.attach_color(BRUSH.color_id, 0);
            BRUSH.update_size();
        }
    )

    ,PRESSURE :  Settings.new('brush_pressure', 2
        ,[
            [null,[9,13],[15,17],[20,13],null,[15,4],[15,17],null,[19,25],[11,25],[4,22],null,[19,25],[26,22],null,[40,4],[40,44],[40,19],null,[40,44],[40,34],null,[49,5],[49,44],[49,20],null,[49,44],[49,34],null,[45,4],[45,44],[45,19],null,[45,44],[44,34],null,[50,51],[44,57],[39,51],[50,51],[39,51]],
            [null,[10,13],[15,17],[20,13],null,[15,4],[15,17],null,[19,25],[11,25],[4,22],null,[19,25],[26,22],null,[40,44],[40,4],null,[50,44],[50,5],null,[45,44],[45,4],null,[50,51],[45,57],[40,51],[50,51],[40,51],null,[45,44],[45,4],null,[50,5],[50,44],[50,5]],
            [null,[10,13],[15,17],[20,13],null,[15,4],[15,17],null,[19,25],[11,25],[4,22],null,[19,25],[26,22],null,[50,51],[45,57],[40,51],[50,51],[40,51],null,[41,4],[41,44],[41,19],null,[41,44],[41,34],null,[50,44],[50,5],null,[46,44],[46,4],null,[50,5],[50,44],[50,5],null,[46,4],[46,44],[46,20]]
        ]
        ,()=>{}
    )

    ,PALETTE : Settings.new('brush_palette', 0
        ,[
            [null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[52,23],null,[31,53],[24,52],null,[52,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[37,46],null,[31,53],[36,51],[37,46],null,[44,22],[44,22],null,[34,17],[34,17],null,[25,17],[25,17],null,[19,22],[19,22],null,[18,32],[18,32],null,[22,42],[22,42],null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[52,23],null,[31,53],[24,52],null,[52,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[37,46],null,[31,53],[36,51],[37,46]],
            [null,[24,52],[17,49],[12,43],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[52,23],null,[31,53],[24,52],null,[52,23],[50,30],null,[32,41],[34,34],[50,30],null,[32,41],[37,46],null,[31,53],[36,51],[37,46],null,[44,21],[44,21],null,[34,17],[34,17],null,[25,17],[25,17],null,[19,22],[19,22],null,[18,32],[18,32],null,[22,42],[22,42],null,[24,52],[17,49],[12,43],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[52,23],null,[31,53],[24,52],null,[52,23],[50,30],null,[32,41],[34,34],[50,30],null,[32,41],[37,46],null,[31,53],[36,51],[37,46],null,[44,24],[41,23],[44,21],[44,24]],
            [null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[53,23],null,[31,53],[24,52],null,[53,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[37,46],null,[31,53],[36,51],[37,46],null,[44,21],[44,21],null,[34,17],[34,17],null,[25,17],[25,17],null,[19,22],[19,22],null,[18,32],[18,32],null,[22,42],[22,42],null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[53,23],null,[31,53],[24,52],null,[53,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[37,46],null,[31,53],[36,51],[37,46],null,[34,17],[34,17],[37,17],null,[34,17],[35,20],[37,17]],
            [null,[23,52],[17,49],[12,44],[9,37],[7,30],[9,23],[12,17],[17,11],[23,8],[30,7],[37,8],[44,11],[49,17],[52,23],null,[30,53],[23,52],null,[52,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[36,46],null,[30,53],[36,52],[36,46],null,[43,22],[43,22],null,[34,17],[34,17],null,[24,17],[24,17],null,[19,22],[19,22],null,[17,32],[17,32],null,[22,42],[22,42],null,[23,52],[17,49],[12,44],[9,37],[7,30],[9,23],[12,17],[17,11],[23,8],[30,7],[37,8],[44,11],[49,17],[52,23],null,[30,53],[23,52],null,[52,23],[50,31],null,[32,42],[34,35],[50,31],null,[32,42],[36,46],null,[30,53],[36,52],[36,46],null,[27,16],[24,17],[27,16],[27,19],[24,17]],
            [null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[53,23],null,[31,53],[24,52],null,[53,23],[51,31],null,[32,41],[34,34],[51,31],null,[32,41],[37,46],null,[31,53],[36,51],[37,46],null,[44,21],[44,21],null,[34,17],[34,17],null,[25,17],[25,17],null,[19,22],[19,22],null,[18,32],[18,32],null,[22,42],[22,42],null,[24,52],[17,49],[12,44],[9,37],[8,30],[9,23],[12,16],[17,11],[24,8],[31,7],[38,8],[44,11],[49,16],[53,23],null,[31,53],[24,52],null,[53,23],[51,31],null,[32,41],[34,34],[51,31],null,[32,41],[37,46],null,[31,53],[36,51],[37,46],null,[19,22],[19,22],null,[22,23],[19,25],[19,22],[22,23]]
        ]
        ,(new_value)=>{
            BRUSH.current_palette = new_value;
            BRUSH._update_palette(BRUSH.color_id);
        }
    )
};


export {BRUSH};
