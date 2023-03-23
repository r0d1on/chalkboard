'use strict';

import {deepcopy, sizeof, has, is_instance_of} from '../base/objects.js';

import {Stroke, ErasureStroke} from '../util/Strokes.js';
import {db_get, db_set} from '../util/db.js';

import {UI} from '../ui/UI.js';
import {BOARD} from '../ui/BOARD.js';

// SAVE ITEMS
let SAVE = {
    PERSISTENCE_VERSION : 4

    ,icon : [null,[8,7],[8,11],[8,13],[7,17],[8,19],[7,23],[8,25],[7,28],[8,30],[7,34],[8,36],[7,40],[8,42],[7,45],[8,47],[7,51],[8,53],[10,54],[14,53],[16,54],[19,53],[21,54],[25,53],[27,54],[31,53],[33,54],[36,53],[38,54],[42,53],[44,54],[48,53],[50,54],[53,53],[53,51],[53,48],[53,45],[54,42],[53,39],[53,36],[53,34],[53,30],[53,26],[53,22],[53,18],null,[44,8],[40,8],[36,7],[33,8],[30,8],[27,8],[25,8],[22,8],[19,7],[16,8],[13,8],[10,8],[8,7],null,[53,18],[44,8],[53,18],null,[15,10],[15,21],[37,21],[37,9],[37,21],[15,21],[15,10],null,[14,51],[14,31],[14,51],null,[14,31],[42,30],[42,51],[42,30],[14,31],null,[20,36],[35,36],null,[21,45],[35,45],null,[19,12],[33,12],null,[17,17],[33,16]]
    ,icon_save : [null,[16,12],[16,15],[16,19],[16,24],null,[16,34],[16,36],[16,41],[16,45],[18,47],[20,46],[25,46],[29,46],[33,47],[37,47],[41,47],[46,47],[49,46],[49,43],[50,40],[50,38],[49,36],[49,32],[49,29],[49,26],[49,23],[49,20],null,[43,13],[40,13],[37,12],[35,12],[31,13],[27,13],[24,12],[22,12],[16,12],null,[49,20],[43,13],[49,20],null,[22,12],[21,20],[37,20],[37,12],[37,20],[21,20],[22,12],null,[35,15],[24,15],[35,15],null,[25,35],[30,30],[25,25],null,[4,30],[30,30],[25,35],null,[25,25],[30,30],[4,30]]
    ,icon_load : [null,[19,15],[19,18],[19,22],[19,26],null,[19,36],[18,39],[18,43],[18,48],[20,50],[23,49],[27,49],[31,49],[36,49],[40,49],[44,49],[48,49],[52,49],[52,46],[52,43],[52,41],[52,38],[52,35],[52,32],[52,29],[52,26],[52,23],null,[45,15],[43,15],[40,15],[37,15],[33,16],[29,15],[27,15],[25,15],[19,15],null,[52,23],[45,15],[52,23],null,[25,15],[24,23],[39,23],[40,15],[39,23],[24,23],[25,15],null,[37,18],[26,18],[37,18],null,[10,27],[5,32],[10,37],null,[31,32],[5,32],[10,27],null,[10,37],[5,32],[31,32]]
    ,icon_sync : [null,[45,25],[50,29],[54,25],null,[50,24],[50,29],null,[13,33],[8,31],[5,35],null,[9,36],[8,31],null,[45,25],[50,29],[54,25],null,[13,33],[8,31],[5,35],null,[23,50],[20,49],[17,47],[14,45],[12,42],[10,39],[9,36],null,[8,23],[10,20],[11,18],[14,15],[16,13],[19,11],[23,10],[26,9],[30,8],[33,9],[36,9],[40,11],[42,13],[45,15],[48,18],[49,21],[50,24],null,[51,37],[49,40],[48,43],[45,46],[43,47],[40,49],[36,50],[33,51],[29,51],[26,51],[23,50]]
    ,icon_download_group : [null,[20,51],[40,51],null,[52,39],[52,20],null,[8,20],[8,39],null,[40,8],[20,8],null,[42,30],[30,42],[18,30],null,[30,18],[30,42],[42,30],null,[18,30],[30,42],[30,18],null,[11,16],[16,11],null,[44,11],[50,16],null,[10,43],[16,49],null,[49,43],[44,48]]
    ,icon_download : [null,[9,50],[9,10],[51,10],null,[9,50],[30,50],null,[51,30],[51,10],[9,10],null,[51,10],[51,30],null,[9,10],[9,50],[30,50],null,[40,35],[48,35],null,[53,40],[53,48],null,[35,48],[35,40],null,[48,53],[40,53],null,[37,52],[37,52],null,[37,36],[37,36],null,[51,37],[51,37],null,[51,52],[51,52],null,[39,44],[44,49],[49,44],null,[44,39],[44,49],[39,44],null,[49,44],[44,49],[44,39],null,[17,19],[25,19],null,[33,19],[43,19],null,[17,27],[43,27],null,[27,34],[27,43],null,[18,34],[18,43]]
    ,icon_download_png : [null,[8,49],[8,9],[50,9],null,[8,49],[29,49],null,[50,29],[50,9],[8,9],null,[50,9],[50,29],null,[8,9],[8,49],[29,49],null,[47,52],[39,52],null,[34,47],[34,39],null,[52,39],[52,47],null,[39,34],[47,34],null,[50,35],[50,35],null,[50,51],[50,51],null,[36,50],[36,50],null,[36,35],[36,35],null,[38,43],[43,48],[48,43],null,[43,38],[43,48],[38,43],null,[48,43],[43,48],[43,38],null,[14,21],[14,21],[14,21],[14,21],[14,21],[14,21],[14,21],[14,24],[14,24],null,[18,15],[18,15],[18,15],[18,15],[18,15],[18,15],[18,15],[21,17],[21,17],[21,17],[21,17],[21,17],[21,17],[21,21],[21,21],[21,21],[18,21],[18,21],[14,21],[14,21],[14,21],null,[43,16],[43,16],[43,16],[43,16],[43,16],[43,16],[39,17],[39,17],[39,17],[37,19],[37,19],[37,19],[37,19],[37,19],[36,22],[36,22],[36,22],[36,22],[36,22],[36,22],[39,25],[39,25],[39,25],[39,25],[39,25],[43,25],[43,25],[43,25],[43,25],[43,25],[43,25],[43,25],[45,22],[45,22],[45,22],[45,22],[45,22],[42,21],[42,21],null,[14,16],[14,16],[14,16],[14,16],[14,16],[14,16],[14,21],null,[14,16],[14,16],[14,16],[14,16],[14,16],[18,15],null,[25,16],[25,16],[25,16],[25,16],[25,16],[25,20],[25,20],[25,20],[25,20],[25,20],[25,24],[25,24],[25,24],null,[25,16],[25,16],[25,16],[25,16],[25,16],[25,16],[25,20],[25,20],[25,20],null,[32,21],[32,21],[32,21],[32,21],[32,21],[32,21],null,[32,24],[32,24],[32,24],[32,24],[32,24],[32,24],[32,24],[32,21],[32,16],[32,16],[32,16],[32,16],null,[25,20],[28,22],[28,22],[28,22],[28,22],[32,24]]
    ,icon_upload : [null,[8,49],[8,9],[50,9],null,[8,49],[29,49],null,[50,29],[50,9],[8,9],null,[50,9],[50,29],null,[8,9],[8,49],[29,49],null,[39,34],[47,34],null,[52,39],[52,47],null,[34,47],[34,39],null,[47,52],[39,52],null,[36,51],[36,51],null,[36,35],[36,35],null,[50,36],[50,36],null,[50,51],[50,51],null,[16,18],[24,18],null,[32,18],[42,18],null,[16,26],[42,26],null,[26,33],[26,42],null,[17,33],[17,42],null,[48,43],[43,38],[38,43],null,[43,48],[43,38],[48,43],null,[38,43],[43,38],[43,48]]

    ,autosync : false
    ,sent_version : null
    ,is_syncing : false
    ,canvas_sync : null

    ,_strokes_to_save : function(from_version) {
        let out_strokes = {};

        for(let commit_id in BOARD.strokes) {
            for(let stroke_idx in BOARD.strokes[commit_id]) {
                let stroke = BOARD.strokes[commit_id][stroke_idx];

                if (from_version === undefined) {
                    if (stroke.is_hidden())
                        continue;
                    if (is_instance_of(stroke, ErasureStroke))
                        continue;
                    if (has(stroke, 'erased'))
                        delete stroke.erased;
                } else {
                    if (stroke.version < from_version)
                        continue;
                }

                stroke.commit_id = commit_id;
                stroke.stroke_idx = stroke_idx;
                if (stroke.version===undefined)
                    stroke.version = BOARD.version;

                out_strokes[commit_id] = out_strokes[commit_id] || {};

                out_strokes[commit_id][sizeof(out_strokes[commit_id])] = stroke.to_json();
            }
        }

        return out_strokes;
    }

    ,_persist : function() {
        let out_strokes = SAVE._strokes_to_save();

        let json = {
            strokes : out_strokes
            ,modules : {}
            ,PERSISTENCE_VERSION : SAVE.PERSISTENCE_VERSION
        };
        UI.on_persist(json);

        return [JSON.stringify(json), sizeof(out_strokes)];
    }

    ,save : function() {
        db_get('local_board_' + BOARD.board_name)
            .then((old)=>{
                old = JSON.parse(old);
                let [board_data, new_size] = SAVE._persist();

                if (old!=null) {
                    if (!confirm('overwrite board old board [' + sizeof(old.strokes) + '] with [' + new_size + '] ?'))
                        return;
                }

                UI.log(0, 'version', BOARD.version, ',saving', new_size, 'commits out of', sizeof(BOARD.strokes));

                db_set('local_board_' + BOARD.board_name, board_data)
                    .then(()=>{
                        SAVE.sent_version = null; // reset remote watermark to update the whole board
                        UI.is_dirty = false;
                    }).catch((error)=>{
                        UI.log(-2, 'Error saving board to local storage:', error);
                        UI.toast('local.saving', 'Error saving board to local storage:' + error, 2000);
                    });

            }).catch((error)=>{
                UI.log(-2, 'Error accessing local storage:', error);
                UI.toast('local.saving', 'error:' + error, 2000);
            });
        SAVE.MENU_main.hide('save_group');
    }

    ,_unpersist_message : function(msg) {

        if (msg.PERSISTENCE_VERSION===undefined) {
            let commit_id = BOARD.id_next('0');
            let id = BOARD.id_next('0', 5);
            let tmp_msg = deepcopy(msg);
            tmp_msg.strokes = {};
            tmp_msg.strokes[commit_id] = {};
            for(let i in msg.strokes) {
                let stroke = msg.strokes[i];
                stroke.commit_id = commit_id;
                stroke.stroke_idx = sizeof(tmp_msg.strokes[commit_id]);
                stroke.stroke_id = id;
                tmp_msg.strokes[stroke.commit_id][stroke.stroke_idx] = stroke;
                id = BOARD.id_next(id, 5);
            }
            msg = tmp_msg;
            msg.PERSISTENCE_VERSION = 2;

        } else if (msg.PERSISTENCE_VERSION === 1) {
            let commit_id = BOARD.id_next('0');
            let id = BOARD.id_next('0', 5);
            let tmp_msg = deepcopy(msg);
            tmp_msg.strokes = {};
            for(let commit in msg.strokes) {
                tmp_msg.strokes[commit_id] = {};
                for(let i in msg.strokes[commit]) {
                    let stroke = deepcopy(msg.strokes[commit][i]);
                    if (stroke!==undefined) {
                        stroke.commit_id = commit_id;
                        stroke.stroke_id = id;
                        stroke.stroke_idx = sizeof(tmp_msg.strokes[commit_id]);
                        tmp_msg.strokes[commit_id][stroke.stroke_idx] = stroke;
                        id = BOARD.id_next(id, 5);
                    }
                }
                commit_id = BOARD.id_next(commit_id);
            }
            msg = tmp_msg;
            msg.PERSISTENCE_VERSION = 2;
        }

        if (msg.PERSISTENCE_VERSION === 2) {
            for(let commit in msg.strokes) {
                for(let i in msg.strokes[commit]) {
                    let stroke = msg.strokes[commit][i];
                    stroke.c = stroke.color;
                    delete stroke.color;

                    stroke.w = stroke.width;
                    delete stroke.width;

                    if ((stroke.gp===undefined)||(stroke.gp==null)) {
                        console.warn('invalid stroke: ', stroke);
                    } else if ((stroke.gp[0]==null)&&(stroke.gp[1]=='erase')) {
                        delete stroke.gp;
                        stroke['@'] = 'd';
                    } else {
                        stroke.p = stroke.gp.map((p)=>{return {x:p.X, y:p.Y};});
                        delete stroke.gp;
                        stroke['@'] = 'l';
                    }

                    msg.strokes[commit][i] = stroke;
                }
            }
            msg.PERSISTENCE_VERSION = 3;
        }


        if (msg.PERSISTENCE_VERSION === 3) {
            msg.modules = {'slider' : {}};

            if (msg.slides) {
                msg.modules['slider'].slides = msg.slides;
                delete msg.slides;
            }

            if (msg.view_rect) {
                msg.modules['slider'].view_rect = msg.view_rect;
                delete msg.view_rect;
            }

            msg.PERSISTENCE_VERSION = 4;
        }

        if (msg.PERSISTENCE_VERSION === 4) {
            for(let commit in msg.strokes) {
                for(let i in msg.strokes[commit]) {
                    msg.strokes[commit][i] = Stroke.from_json(msg.strokes[commit][i]);
                }
            }
        }

        if (msg.modules===undefined)
            msg.modules = {};

        return msg;
    }

    ,_unpersist_board : function(json) {
        let msg = SAVE._unpersist_message(JSON.parse(json));
        UI.on_unpersist(msg);

        BOARD.strokes = msg.strokes;

        for(let commit_id in BOARD.strokes) {
            BOARD.commit_id = (BOARD.commit_id > commit_id) ? BOARD.commit_id : commit_id;
            for(let idx in BOARD.strokes[commit_id]) {
                let stroke = BOARD.strokes[commit_id][idx];
                stroke.stroke_idx = idx;
                BOARD.stroke_id = (stroke.stroke_id===undefined)||(BOARD.stroke_id > stroke.stroke_id) ? BOARD.stroke_id : stroke.stroke_id;
                let version = (stroke.version===undefined) ? 0 : stroke.version;
                BOARD.version = (BOARD.version > version) ? BOARD.version : version;
            }
        }
        BOARD.max_commit_id = BOARD.commit_id;
    }

    ,load : function() {
        db_get('local_board_' + BOARD.board_name)
            .then((board_data)=>{
                if (board_data==null) {
                    UI.toast('local.loading', 'board is not in local storage', 2000);
                    return;
                }
                SAVE._unpersist_board(board_data);
                SAVE.sent_version = null; // reset remote watermark to update the whole board
                UI.redraw();
                UI.toast('local.loading', 'loaded from local storage', 2000);
                UI.is_dirty = false;
            }).catch((error)=>{
                UI.log(-2, 'Error loading board from local storage:', error);
                UI.toast('local.loading', 'Error loading board from local storage:' + error, 2000);
            });
        SAVE.MENU_main.hide('save_group');
    }

    ,download : function() {
        let [board_data, ] = SAVE._persist();

        UI.IO.compress(board_data).then((chunks)=>{
            let blob = new Blob(chunks, {'type': 'application/octet-stream'});
            let exportUrl = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = exportUrl;
            a.download = BOARD.board_name + '.board.json.gzip';
            a.click();
            URL.revokeObjectURL(exportUrl);
            SAVE.sent_version = null; // reset remote watermark to update the whole board
        });

        SAVE.MENU_main.hide('save_group');
    }

    ,download_png : function(e, id, long) {
        UI.log(1, 'saver.download_png: ', id, long, e);
        let a = document.createElement('a');
        a.download = BOARD.board_name + '.png';
        if (long) {
            a.href = UI.layers[UI.LAYERS.indexOf('board')].toDataURL();
        } else {
            let overlay = UI.layers[UI.LAYERS.indexOf('overlay')];
            let ctx = overlay.getContext('2d');
            ctx.fillStyle = UI.layers[UI.LAYERS.indexOf('background')].style['background-color'];
            ctx.fillRect(0, 0, overlay.width, overlay.height);
            UI.redraw(ctx, true);
            a.href = overlay.toDataURL();
            let canvas = UI.reset_layer('overlay');
            canvas.style['background-color'] = '';
        }
        a.click();

        SAVE.MENU_main.hide('save_group');
    }

    ,handleFiles : function(e) {
        if (e.target.files.length != 1) {
            UI.log(-1, 'loading more than one file at a time is not supported:', e.target.files);
            UI.toast('backend.loading', 'loading more than one file at a time is not supported', 2000);
            e.target.value = null;
            return;
        }

        UI.on_file(e.target.files[0]);
        e.target.value = null;
    }

    ,upload : function() {
        document.getElementById('file-input').click();

        SAVE.MENU_main.hide('save_group');
    }

    ,sync_message : function(msg, is_sync) {
        let max_commit = '';
        let max_stroke_id = '';
        let loaded = false;

        if ((msg.PERSISTENCE_VERSION===undefined)||(msg.PERSISTENCE_VERSION===null))
            msg.PERSISTENCE_VERSION = 2;

        msg = SAVE._unpersist_message(msg);
        UI.on_unpersist(msg, is_sync);

        for(let in_commit in msg.strokes) {
            let in_strokes = msg.strokes[in_commit];
            BOARD.strokes[in_commit] = BOARD.strokes[in_commit] || {};

            for(let in_idx in in_strokes) {
                let in_stroke = in_strokes[in_idx];
                let own_stroke = BOARD.strokes[in_commit][in_idx];

                if ((own_stroke===undefined)||(in_stroke['version'] > own_stroke['version']))
                    BOARD.strokes[in_commit][in_idx] = in_stroke;

                BOARD.version = (BOARD.version > in_stroke.version) ? BOARD.version : in_stroke.version;
                max_commit = (max_commit > in_stroke.commit_id) ? max_commit : in_stroke.commit_id;
                max_stroke_id = (max_stroke_id > in_stroke.stroke_id) ? max_stroke_id : in_stroke.stroke_id;
            }
        }

        if (sizeof(msg.strokes) > 0) {
            BOARD.drop_redo();

            max_commit = max_commit.split('-')[0];
            max_commit = (BOARD.commit_id.split('-')[0] > max_commit)?BOARD.commit_id.split('-')[0]:max_commit;

            max_stroke_id = max_stroke_id.split('-')[0];
            max_stroke_id = (BOARD.stroke_id.split('-')[0] > max_stroke_id)?BOARD.stroke_id.split('-')[0]:max_stroke_id;

            BOARD.commit_id = BOARD.id_next(max_commit);
            BOARD.stroke_id = BOARD.id_next(max_stroke_id, 5);

            UI.redraw();

            loaded = true;
        }

        return loaded;
    }

    ,_consume_message : function(str_json, is_sync) {
        let message_in = JSON.parse(str_json);
        if ((message_in.resync)||(BOARD.locked)) {
            UI.log(-1, 'will resync:', message_in);
            return false;
        } else {
            SAVE.sent_version = message_in.received_version;
            return SAVE.sync_message(message_in, is_sync);
        }
    }

    ,sync_begin : function() {
        SAVE.is_syncing = true;
        UI.set_busy('SAVER', true);
    }

    ,sync_end : function() {
        SAVE.is_syncing = false;
        UI.set_busy('SAVER', false);
    }

    ,sync : function(full) {
        if (SAVE.is_syncing) {
            UI.log(0, 'skipping sync() - already syncing');
            return;
        }

        if (BOARD.locked) {
            UI.log(0, 'skipping sync() - board is locked');
            return;
        }

        if (full)
            SAVE.sent_version = null;

        let from_version = (SAVE.sent_version == null)? 0 : SAVE.sent_version + 1;

        let out_strokes = SAVE._strokes_to_save(from_version);

        let json = {
            name : BOARD.board_name

            ,version : BOARD.version
            ,strokes : out_strokes
            ,modules : {}

            ,PERSISTENCE_VERSION : SAVE.PERSISTENCE_VERSION
            ,refresh : (SAVE.sent_version == null) ? 1 : 0
        };
        UI.on_persist(json, true);

        let message_out = deepcopy(json);

        //console.log("sending: ", message_out.version, "L=", message_out.strokes.length, message_out);

        SAVE.sync_begin();

        UI.IO.request('/sync', message_out, {})
            .then(({xhr})=>{
                SAVE._consume_message(xhr.responseText, true);
                if (full)
                    UI.toast('backend.saving', 'board saved on the backend', 2000);
            })
            .catch(({xhr, error, message})=>{
                UI.log(-1, 'could not send the data:', error, xhr);
                UI.log(1, 'message:', message);
                UI.toast('backend.saving', 'connection to backend is broken, could not sync the board', 2000);
                if (SAVE.autosync) {
                    SAVE.sync_switch();
                }
            })
            .finally(()=>{
                SAVE.sync_end();
            });

        //console.log("=> |msg|:", sizeof(message_out.strokes), " ver:", message_out.version);
    }

    ,sync_switch : function(e, id, long) {
        function _sync() {
            if (SAVE.is_syncing) {
                UI.log(0, 'skipping sync: already syncing');
            } else {
                SAVE.sync();
            }
            if (SAVE.autosync) {
                setTimeout(_sync, 1000);
            }
        }

        if (long) {
            SAVE.sync(true);
            return;
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

    ,on_file : function(file) {
        function load_json_data(json_data) {
            SAVE._unpersist_board(json_data);
            UI.on_key_down('Escape'); // force cancel active tool if any
            UI.redraw();
        }

        const reader = new FileReader();

        reader.addEventListener('load', ((file)=>{
            return (event)=>{
                let board_data = event.target.result;
                if (Object.prototype.toString.apply(board_data).split(' ')[1]=='ArrayBuffer]') {
                    UI.IO.decompress(new Uint8Array(board_data)).then((json_data)=>{
                        load_json_data(json_data);
                    });
                } else {
                    UI.log(0, 'loaded file:', file.name);
                    load_json_data(board_data);
                }
            };
        })(file), false);

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else if (file.name.endsWith('.gzip')) {
            reader.readAsArrayBuffer(file);
        } else {
            UI.log(-1, 'can\'t load file: ', file);
            UI.toast('local.loading', 'can\'t load file : ' + file.name, 2000);
            return false;
        }

        return true;
    }

    ,init : function(MENU_main) {
        SAVE.MENU_main = MENU_main;

        let ctx = MENU_main.add('root', 'save_group', null, 'canvas', '')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon, ctx);

        ctx = MENU_main.add('save_group', 'save', SAVE.save, 'canvas', 'save locally')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_save, ctx);

        ctx = MENU_main.add('save_group', 'load', SAVE.load, 'canvas', 'load locally')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_load, ctx);


        ctx = MENU_main.add('save_group', 'download_group', null, 'canvas', 'download...')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_download_group, ctx);

        ctx = MENU_main.add('download_group', 'download', SAVE.download, 'canvas', 'download board')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_download, ctx);

        ctx = MENU_main.add('download_group', 'download_png', SAVE.download_png, 'canvas', 'download as png')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_download_png, ctx);


        ctx = MENU_main.add('save_group', 'upload', SAVE.upload, 'canvas', 'upload board / image')[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_upload, ctx);

        //SAVE.sync_switch();

        UI.addEventListener('on_file', SAVE.on_file);

        document.getElementById('file-input').addEventListener('change', SAVE.handleFiles);

        let message_out = {
            name : BOARD.board_name
            ,version : -1
            ,strokes : {}
            ,PERSISTENCE_VERSION : SAVE.PERSISTENCE_VERSION
        };

        let loaded = false;
        SAVE.sync_begin();

        UI.IO.request('/sync', message_out, {})
            .then(({xhr})=>{
                UI.log(0, 'backend available: ', xhr);
                SAVE.canvas_sync = MENU_main.add('save_group', 'sync', SAVE.sync_switch, 'canvas', 'auto-sync to server')[1];
                let ctx = SAVE.canvas_sync.getContext('2d');
                UI.draw_glyph(SAVE.icon_sync, ctx, undefined, '#555');

                loaded = SAVE._consume_message(xhr.responseText, false);
                UI.toast('backend.loading', 'loaded from backend', 2000);
            })
            .catch(({xhr, error})=>{
                UI.log(-1, 'backend unavailable: ', error, xhr);
                UI.toast('backend.loading', 'backend is not available : ' + error, 2000);
            })
            .finally(()=>{
                SAVE.sync_end();
                if (!loaded)
                    SAVE.load();
            });

    }

};

export {SAVE};
