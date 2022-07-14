'use strict';

import {deepcopy} from '../base/objects.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';
import {SLIDER} from './SLIDER.js';


// SAVE ITEMS
let SAVE = {
    icon : [null,[8,7],[8,11],[8,13],[7,17],[8,19],[7,23],[8,25],[7,28],[8,30],[7,34],[8,36],[7,40],[8,42],[7,45],[8,47],[7,51],[8,53],[10,54],[14,53],[16,54],[19,53],[21,54],[25,53],[27,54],[31,53],[33,54],[36,53],[38,54],[42,53],[44,54],[48,53],[50,54],[53,53],[53,51],[53,48],[53,45],[54,42],[53,39],[53,36],[53,34],[53,30],[53,26],[53,22],[53,18],null,[44,8],[40,8],[36,7],[33,8],[30,8],[27,8],[25,8],[22,8],[19,7],[16,8],[13,8],[10,8],[8,7],null,[53,18],[44,8],[53,18],null,[15,10],[15,21],[37,21],[37,9],[37,21],[15,21],[15,10],null,[14,51],[14,31],[14,51],null,[14,31],[42,30],[42,51],[42,30],[14,31],null,[20,36],[35,36],null,[21,45],[35,45],null,[19,12],[33,12],null,[17,17],[33,16]]
    ,icon_save : [null,[16,12],[16,15],[16,19],[16,24],null,[16,34],[16,36],[16,41],[16,45],[18,47],[20,46],[25,46],[29,46],[33,47],[37,47],[41,47],[46,47],[49,46],[49,43],[50,40],[50,38],[49,36],[49,32],[49,29],[49,26],[49,23],[49,20],null,[43,13],[40,13],[37,12],[35,12],[31,13],[27,13],[24,12],[22,12],[16,12],null,[49,20],[43,13],[49,20],null,[22,12],[21,20],[37,20],[37,12],[37,20],[21,20],[22,12],null,[35,15],[24,15],[35,15],null,[25,35],[30,30],[25,25],null,[4,30],[30,30],[25,35],null,[25,25],[30,30],[4,30]]
    ,icon_load : [null,[19,15],[19,18],[19,22],[19,26],null,[19,36],[18,39],[18,43],[18,48],[20,50],[23,49],[27,49],[31,49],[36,49],[40,49],[44,49],[48,49],[52,49],[52,46],[52,43],[52,41],[52,38],[52,35],[52,32],[52,29],[52,26],[52,23],null,[45,15],[43,15],[40,15],[37,15],[33,16],[29,15],[27,15],[25,15],[19,15],null,[52,23],[45,15],[52,23],null,[25,15],[24,23],[39,23],[40,15],[39,23],[24,23],[25,15],null,[37,18],[26,18],[37,18],null,[10,27],[5,32],[10,37],null,[31,32],[5,32],[10,27],null,[10,37],[5,32],[31,32]]
    ,icon_sync : [null,[45,25],[50,29],[54,25],null,[50,24],[50,29],null,[13,33],[8,31],[5,35],null,[9,36],[8,31],null,[45,25],[50,29],[54,25],null,[13,33],[8,31],[5,35],null,[23,50],[20,49],[17,47],[14,45],[12,42],[10,39],[9,36],null,[8,23],[10,20],[11,18],[14,15],[16,13],[19,11],[23,10],[26,9],[30,8],[33,9],[36,9],[40,11],[42,13],[45,15],[48,18],[49,21],[50,24],null,[51,37],[49,40],[48,43],[45,46],[43,47],[40,49],[36,50],[33,51],[29,51],[26,51],[23,50]]
    
    ,autosync : false
    ,sent_version : null
    ,is_syncing : false
    ,canvas_sync : null
    
    ,serialize : function(o) {
        return JSON.stringify(o);
    }
    
    ,deserialize : function(json) {
        return JSON.parse(json);
    }
    
    ,update_ids : function() {
        BOARD.strokes.map((stroke)=>{
            BOARD.commit_id = Math.max(BOARD.commit_id, stroke.commit_id+1);
            BOARD.stroke_id = Math.max(BOARD.stroke_id, stroke.stroke_id+1);
            let version = (stroke.version===undefined)?0:stroke.version;
            BOARD.version = Math.max(BOARD.version, version);
        });
    }
    
    ,save : function() {
        let old = JSON.parse(localStorage.getItem('local_board_' + BOARD.board_name));

        let new_strokes = BOARD.strokes.reduce((a, stroke)=>{ // drop deleted strokes
            let min_version =  BOARD.strokes.reduce((a, stroke)=>{
                return (stroke.version < a) ? stroke.version : a;
            }, BOARD.version);
            
            if (stroke.version===undefined)
                stroke.version = min_version;

            stroke = deepcopy(stroke);
            
            if (stroke.erased>=0) {
                return a; // ignore erased
            } else if (stroke.erased<0) {
                delete stroke.erased;
            }
            if (stroke.gp[0]==null) { // erase, undo action
                return a;
            }
            
            a.push(stroke);
            return a;
        }, []);        
        
        if (old!=null) {
            if (prompt('overwrite ' + old.strokes.length + ' with ' + new_strokes.length + ' ?', 'no')!='yes')
                return;
        }

        console.log('version', BOARD.version, ',saving', new_strokes.length, 'strokes out of', BOARD.strokes.length);
        
        let json = SAVE.serialize({
            strokes : new_strokes
            ,slides : SLIDER.slides
            ,view_rect : SLIDER.get_current_frame()
        });
        
        localStorage.setItem('local_board_' + BOARD.board_name, json);
        
        SAVE.sent_version = null; // reset remote watermark to update the whole board
        
        SAVE.MENU_main.hide('save_group');
    }

    ,load : function() {
        let json = localStorage.getItem('local_board_'+BOARD.board_name);
        if (json==null)
            return;
            
        let o = SAVE.deserialize(json);

        BOARD.strokes = o.strokes;
        SAVE.update_ids();

        SLIDER.slides = o.slides;
        if (o.slides.length==0) {
            SLIDER.current_ix = null;
        } else {
            SLIDER.current_ix = 0;
        }
        SLIDER.update();
        SLIDER.move_to(o.view_rect);
        
        SAVE.MENU_main.hide('save_group');
        UI.redraw();
    }

    
    ,sync_message : function(msg) {
        let in_strokes = msg['strokes'];
        //var in_version = msg["version"];
        
        let id2idx = BOARD.strokes.reduce( (a, stroke, idx)=>{
            a[stroke.stroke_id] = idx;
            return a;
        }, {});
        
        for(let i=0; i<in_strokes.length; i++) {
            let in_stroke = in_strokes[i];
            if (in_stroke.stroke_id in id2idx) {
                // updated stroke
                let sid = id2idx[in_stroke.stroke_id];
                let own_stroke = BOARD.strokes[sid];
                if (in_stroke.version > own_stroke.version) {
                    BOARD.strokes[sid] = in_stroke;
                } else {
                    // received stroke with outdated version, collision?
                }
            } else {
                // new stroke
                BOARD.strokes.push(in_stroke);
            }
            BOARD.commit_id = Math.max(BOARD.commit_id, in_stroke.commit_id+1);
            BOARD.stroke_id = Math.max(BOARD.stroke_id, in_stroke.stroke_id+1);
            BOARD.version = Math.max(BOARD.version, in_stroke.version||0);
        }
        
        if (in_strokes.length) {
            UI.redraw();
        }
        
        if (UI.view_mode=='follow') {
            if ((msg['view_rect']!=undefined)&&(msg['view_rect']!=null))
                SLIDER.move_to(msg['view_rect']);
        }
        
    }

    ,sync : function() {
        let from_version = (SAVE.sent_version == null)? 0 : SAVE.sent_version + 1;
        let new_strokes = BOARD.strokes.reduce((a, stroke)=>{
            if (stroke.version >= from_version)
                a.push(stroke); 
            return a;
        }, []);
        
        if (SAVE.is_syncing) {
            console.log('skipping sync() - already syncing');
            return;
        }

        if (BOARD.locked) {
            console.log('skipping sync() - board is locked');
            return;
        }


        let message_out = deepcopy({
            name : BOARD.board_name

            ,version : BOARD.version
            ,strokes : new_strokes
            ,view_rect : (UI.view_mode=='follow') ? null : SLIDER.get_current_frame()
            ,slides : (UI.view_mode=='follow') ? null : SLIDER.slides

            ,refresh : (SAVE.sent_version == null) ? 1 : 0
            ,lead : (UI.view_mode == 'lead')? 1 : 0
        });
        
        //console.log("sending: ", message_out.version, "L=", message_out.strokes.length, message_out);

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = ((xhr, message_out)=>{
            return ()=>{
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        let message_in = JSON.parse(xhr.responseText);
                        //console.log("sent: ", message_out.version, "L=", message_out.strokes.length, message_out);
                        if ((message_in.resync)||(BOARD.locked)) {
                            console.log('will resync:', message_in);
                        } else {
                            //console.log("received:", message_in);
                            SAVE.sent_version = message_in.received_version;
                            SAVE.sync_message(message_in);
                        }
                        
                    } else {
                        console.log('could not send the data:', xhr);
                        console.log('message:', message_out);
                        if (SAVE.autosync) {
                            SAVE.sync_switch();
                        }
                    }
                    SAVE.is_syncing = false;
                } else {
                    //console.log("xhr:", xhr, "rs:", xhr.readyState);
                }
            };
        })(xhr, message_out);
        
        xhr.timeout = 10*1000;
        xhr.ontimeout = ((xhr)=>{return ()=>{console.log('timeout',xhr);};})(xhr);
        xhr.open('POST', '/board.php', true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        
        SAVE.is_syncing = true;
        xhr.send(JSON.stringify((message_out)));
    }

    ,sync_switch : function() {
        function _sync() {
            if (SAVE.is_syncing) {
                console.log('skipping sync: already syncing');
            } else {
                SAVE.sync();
            }
            if (SAVE.autosync) {
                setTimeout(_sync, 1000);
            }
        }
        
        if (SAVE.autosync) {
            SAVE.autosync = false;
        } else {
            SAVE.autosync = true;
            _sync();
        }
        
        SAVE.canvas_sync.width = SAVE.canvas_sync.width+1-1;
        let ctx = SAVE.canvas_sync.getContext('2d');
        UI.draw_glyph(SAVE.icon_sync, ctx, undefined, (SAVE.autosync?undefined:'#555'));
    }
    
    ,init : function(MENU_main) {
        SAVE.MENU_main = MENU_main;
        
        let ctx = MENU_main.add('root', 'save_group', null, 'canvas', '')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon, ctx);

        ctx = MENU_main.add('save_group', 'save', SAVE.save, 'canvas', 'save locally')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_save, ctx);

        ctx = MENU_main.add('save_group', 'load', SAVE.load, 'canvas', 'load locally')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_load, ctx);

        SAVE.canvas_sync = MENU_main.add('save_group', 'sync', SAVE.sync_switch, 'canvas', 'auto-sync to server')[1];
        ctx = SAVE.canvas_sync.getContext('2d');
        UI.draw_glyph(SAVE.icon_sync, ctx, undefined, '#555');
        
        //SAVE.sync_switch();
    }
    
};

export {SAVE};
