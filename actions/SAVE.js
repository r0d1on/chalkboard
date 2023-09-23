'use strict';

import {deepcopy, sizeof, has, is_instance_of} from '../base/objects.js';

import {Point} from '../util/Point.js';

import {Stroke, ErasureStroke} from '../util/Strokes.js';
import {db_get, db_set} from '../util/db.js';

import {UI} from '../ui/UI.js';
import {BOARD} from '../ui/BOARD.js';

// SAVE ITEMS
let SAVE = {
    PERSISTENCE_VERSION : 5

    ,icon : [null,[8,7],[8,11],[8,13],[7,17],[8,19],[7,23],[8,25],[7,28],[8,30],[7,34],[8,36],[7,40],[8,42],[7,45],[8,47],[7,51],[8,53],[10,54],[14,53],[16,54],[19,53],[21,54],[25,53],[27,54],[31,53],[33,54],[36,53],[38,54],[42,53],[44,54],[48,53],[50,54],[53,53],[53,51],[53,48],[53,45],[54,42],[53,39],[53,36],[53,34],[53,30],[53,26],[53,22],[53,18],null,[44,8],[40,8],[36,7],[33,8],[30,8],[27,8],[25,8],[22,8],[19,7],[16,8],[13,8],[10,8],[8,7],null,[53,18],[44,8],[53,18],null,[15,10],[15,21],[37,21],[37,9],[37,21],[15,21],[15,10],null,[14,51],[14,31],[14,51],null,[14,31],[42,30],[42,51],[42,30],[14,31],null,[20,36],[35,36],null,[21,45],[35,45],null,[19,12],[33,12],null,[17,17],[33,16]]
    ,icon_save : [null,[16,12],[16,15],[16,19],[16,24],null,[16,34],[16,36],[16,41],[16,45],[18,47],[20,46],[25,46],[29,46],[33,47],[37,47],[41,47],[46,47],[49,46],[49,43],[50,40],[50,38],[49,36],[49,32],[49,29],[49,26],[49,23],[49,20],null,[43,13],[40,13],[37,12],[35,12],[31,13],[27,13],[24,12],[22,12],[16,12],null,[49,20],[43,13],[49,20],null,[22,12],[21,20],[37,20],[37,12],[37,20],[21,20],[22,12],null,[35,15],[24,15],[35,15],null,[25,35],[30,30],[25,25],null,[4,30],[30,30],[25,35],null,[25,25],[30,30],[4,30]]
    ,icon_load : [null,[19,15],[19,18],[19,22],[19,26],null,[19,36],[18,39],[18,43],[18,48],[20,50],[23,49],[27,49],[31,49],[36,49],[40,49],[44,49],[48,49],[52,49],[52,46],[52,43],[52,41],[52,38],[52,35],[52,32],[52,29],[52,26],[52,23],null,[45,15],[43,15],[40,15],[37,15],[33,16],[29,15],[27,15],[25,15],[19,15],null,[52,23],[45,15],[52,23],null,[25,15],[24,23],[39,23],[40,15],[39,23],[24,23],[25,15],null,[37,18],[26,18],[37,18],null,[10,27],[5,32],[10,37],null,[31,32],[5,32],[10,27],null,[10,37],[5,32],[31,32]]
    ,icon_download_group : [null,[20,51],[40,51],null,[52,39],[52,20],null,[8,20],[8,39],null,[40,8],[20,8],null,[42,30],[30,42],[18,30],null,[30,18],[30,42],[42,30],null,[18,30],[30,42],[30,18],null,[11,16],[16,11],null,[44,11],[50,16],null,[10,43],[16,49],null,[49,43],[44,48]]
    ,icon_download : [null,[9,50],[9,10],[51,10],null,[9,50],[30,50],null,[51,30],[51,10],[9,10],null,[51,10],[51,30],null,[9,10],[9,50],[30,50],null,[40,35],[48,35],null,[53,40],[53,48],null,[35,48],[35,40],null,[48,53],[40,53],null,[37,52],[37,52],null,[37,36],[37,36],null,[51,37],[51,37],null,[51,52],[51,52],null,[39,44],[44,49],[49,44],null,[44,39],[44,49],[39,44],null,[49,44],[44,49],[44,39],null,[17,19],[25,19],null,[33,19],[43,19],null,[17,27],[43,27],null,[27,34],[27,43],null,[18,34],[18,43]]
    ,icon_download_png_board : [null,[8,49],[8,9],[50,9],null,[8,49],[29,49],null,[50,29],[50,9],[8,9],null,[50,9],[50,29],null,[8,9],[8,49],[29,49],null,[47,52],[39,52],null,[34,47],[34,39],null,[52,39],[52,47],null,[39,34],[47,34],null,[50,35],[50,35],null,[50,51],[50,51],null,[36,50],[36,50],null,[36,35],[36,35],null,[38,43],[43,48],[48,43],null,[43,38],[43,48],[38,43],null,[48,43],[43,48],[43,38],null,[14,21],[14,21],[14,21],[14,21],[14,21],[14,21],[14,21],[14,24],[14,24],null,[18,15],[18,15],[18,15],[18,15],[18,15],[18,15],[18,15],[21,17],[21,17],[21,17],[21,17],[21,17],[21,17],[21,21],[21,21],[21,21],[18,21],[18,21],[14,21],[14,21],[14,21],null,[43,16],[43,16],[43,16],[43,16],[43,16],[43,16],[39,17],[39,17],[39,17],[37,19],[37,19],[37,19],[37,19],[37,19],[36,22],[36,22],[36,22],[36,22],[36,22],[36,22],[39,25],[39,25],[39,25],[39,25],[39,25],[43,25],[43,25],[43,25],[43,25],[43,25],[43,25],[43,25],[45,22],[45,22],[45,22],[45,22],[45,22],[42,21],[42,21],null,[14,16],[14,16],[14,16],[14,16],[14,16],[14,16],[14,21],null,[14,16],[14,16],[14,16],[14,16],[14,16],[18,15],null,[25,16],[25,16],[25,16],[25,16],[25,16],[25,20],[25,20],[25,20],[25,20],[25,20],[25,24],[25,24],[25,24],null,[25,16],[25,16],[25,16],[25,16],[25,16],[25,16],[25,20],[25,20],[25,20],null,[32,21],[32,21],[32,21],[32,21],[32,21],[32,21],null,[32,24],[32,24],[32,24],[32,24],[32,24],[32,24],[32,24],[32,21],[32,16],[32,16],[32,16],[32,16],null,[25,20],[28,22],[28,22],[28,22],[28,22],[32,24]]
    ,icon_download_png_view : [null,[47,51],[39,51],null,[34,46],[34,38],null,[52,38],[52,46],null,[39,33],[47,33],null,[50,34],[50,34],null,[50,50],[50,50],null,[36,49],[36,49],null,[36,34],[36,34],null,[38,42],[43,47],[48,42],null,[43,37],[43,47],[38,42],null,[48,42],[43,47],[43,37],null,[14,20],[14,20],[14,20],[14,20],[14,20],[14,20],[14,20],[14,23],[14,23],null,[18,14],[18,14],[18,14],[18,14],[18,14],[18,14],[18,14],[21,16],[21,16],[21,16],[21,16],[21,16],[21,16],[21,20],[21,20],[21,20],[18,20],[18,20],[14,20],[14,20],[14,20],null,[43,15],[43,15],[43,15],[43,15],[43,15],[43,15],[39,16],[39,16],[39,16],[37,18],[37,18],[37,18],[37,18],[37,18],[36,21],[36,21],[36,21],[36,21],[36,21],[36,21],[39,24],[39,24],[39,24],[39,24],[39,24],[43,24],[43,24],[43,24],[43,24],[43,24],[43,24],[43,24],[45,21],[45,21],[45,21],[45,21],[45,21],[42,20],[42,20],null,[14,15],[14,15],[14,15],[14,15],[14,15],[14,15],[14,20],null,[14,15],[14,15],[14,15],[14,15],[14,15],[18,14],null,[25,15],[25,15],[25,15],[25,15],[25,15],[25,19],[25,19],[25,19],[25,19],[25,19],[25,23],[25,23],[25,23],null,[25,15],[25,15],[25,15],[25,15],[25,15],[25,15],[25,19],[25,19],[25,19],null,[32,20],[32,20],[32,20],[32,20],[32,20],[32,20],null,[32,23],[32,23],[32,23],[32,23],[32,23],[32,23],[32,23],[32,20],[32,15],[32,15],[32,15],[32,15],null,[25,19],[28,21],[28,21],[28,21],[28,21],[32,23],null,[8,8],[13,8],[8,8],null,[44,8],[50,8],[44,8],null,[50,14],[50,8],[50,14],null,[8,14],[8,8],[8,14],null,[14,48],[8,48],[14,48],null,[8,48],[8,42],[8,48],null,[24,8],[24,8],[24,8],null,[34,8],[34,8],[34,8],null,[50,24],[50,24],[50,24],null,[8,23],[8,23],[8,23],null,[8,33],[8,33],[8,33],null,[23,48],[23,48],[23,48]]
    ,icon_upload : [null,[40,9],[20,9],null,[8,21],[8,40],null,[52,40],[52,21],null,[20,52],[40,52],null,[18,30],[30,18],[42,30],null,[30,42],[30,18],[18,30],null,[42,30],[30,18],[30,42],null,[49,44],[44,49],null,[16,49],[10,44],null,[50,17],[44,11],null,[11,17],[16,12]]

    ,_strokes_to_save : function(from_version) {
        let out_strokes = {};

        BOARD.get_commits().map((commit)=>{
            for(let stroke_id in commit) {
                let stroke = commit[stroke_id];
                let commit_id = stroke.commit_id;

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

                if (stroke.version === undefined)
                    stroke.version = BOARD.version;

                out_strokes[commit_id] = out_strokes[commit_id] || {};

                out_strokes[commit_id][sizeof(out_strokes[commit_id])] = stroke.to_json();
            }

        });

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
                        UI.is_dirty = false;
                        UI.toast('local.saving', 'saved to local storage', 2000);
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

    ,_fix_collisions : function(strokes) {
        let seen_ids = {};
        for (const commit_id in strokes) {
            for(const stroke_id in strokes[commit_id]) {
                let s = strokes[commit_id][stroke_id];
                if (s.stroke_id in seen_ids) {
                    UI.log(-2, 'stroke id collision detected');
                    while (s.stroke_id in seen_ids)
                        s.stroke_id = BOARD.id_next(s.stroke_id);
                    delete strokes[commit_id][stroke_id];
                    strokes[commit_id][s.stroke_id] = s;
                }
                seen_ids[s.stroke_id] = true;
            }
        }
    }

    ,_unpersist_message : function(msg) {

        if (msg.PERSISTENCE_VERSION===undefined) {
            let commit_id = BOARD.id_next('0000');
            let id = BOARD.id_next('00000');
            let tmp_msg = deepcopy(msg);
            tmp_msg.strokes = {};
            tmp_msg.strokes[commit_id] = {};
            for(let i in msg.strokes) {
                let stroke = msg.strokes[i];
                stroke.commit_id = commit_id;
                stroke.stroke_idx = sizeof(tmp_msg.strokes[commit_id]);
                stroke.stroke_id = id;
                tmp_msg.strokes[stroke.commit_id][stroke.stroke_idx] = stroke;
                id = BOARD.id_next(id);
            }
            msg = tmp_msg;
            msg.PERSISTENCE_VERSION = 2;

        } else if (msg.PERSISTENCE_VERSION === 1) {
            let commit_id = BOARD.id_next('0000');
            let id = BOARD.id_next('00000');
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
                        id = BOARD.id_next(id);
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
            SAVE._fix_collisions(msg.strokes);

            for(let commit in msg.strokes) {
                Object.keys(msg.strokes[commit]).map((idx)=>{
                    let stroke = msg.strokes[commit][idx];
                    delete msg.strokes[commit][idx];
                    msg.strokes[commit][stroke.stroke_id] = stroke;
                    delete stroke.stroke_idx;
                });
            }

            msg.PERSISTENCE_VERSION = 5;
        }


        if (msg.PERSISTENCE_VERSION === 5) {
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

        SAVE._fix_collisions(msg.strokes);

        BOARD.register(msg.strokes, true);
        SAVE._update_ids();

        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        BOARD.stroke_id = BOARD.id_next(BOARD.stroke_id);
        UI.on_board_changed();
        UI.is_dirty = false;
    }

    ,_update_ids : function() {
        for(let commit_id in BOARD.strokes) {
            BOARD.commit_id = (BOARD.commit_id > commit_id) ? BOARD.commit_id : commit_id;
            for(let id in BOARD.strokes[commit_id]) {
                let stroke = BOARD.strokes[commit_id][id];
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
                UI.on_key_down('Escape'); // force cancel active tool if any
                UI.redraw();
                UI.toast('local.loading', 'loaded from local storage', 2000);
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
        });

        SAVE.MENU_main.hide('save_group');
    }

    ,download_png_view : function(e, id, long) {
        UI.log(1, 'saver.download_png_view: ', id, long, e);

        let c = UI.canvas['overlay'];
        let view_rect = [
            UI.local_to_global(Point.new(0, 0))
            ,UI.local_to_global(Point.new(c.width, c.height))
        ];

        let a = document.createElement('a');
        a.download = BOARD.board_name + '.view.png';

        let canvas = UI._get_image_data(view_rect, 2.0, long, !long);

        canvas.convertToBlob().then((blob)=>{
            a.href =  URL.createObjectURL(blob);
            UI.log(2, 'png url size', a.href.length);
            a.click();
        });

        SAVE.MENU_main.hide('save_group');
    }

    ,download_png_board : function(e, id, long) {
        UI.log(1, 'saver.download_png_board: ', id, long, e);

        let board_rect =  BOARD.get_global_rect();

        let a = document.createElement('a');
        a.download = BOARD.board_name + '.png';

        let canvas = UI._get_image_data(board_rect, 2.0, long, !long);

        canvas.convertToBlob().then((blob)=>{
            a.href =  URL.createObjectURL(blob);
            UI.log(2, 'png url size', a.href.length);
            a.click();
        });

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

    ,on_file : function(file) {
        function load_json_data(json_data) {
            UI.log(0, 'loaded board file:', file.name);
            SAVE._unpersist_board(json_data);
            UI.on_key_down('Escape'); // force cancel active tool if any
            UI.redraw();
        }

        if (file.name.endsWith('.json')) {
            UI.IO.read_file(file, 'text').then(load_json_data);
        } else if (file.name.endsWith('.board.json.gzip')) {
            UI.IO.read_file(file, 'gzip').then(load_json_data);
        } else {
            return false;
        }

        return true;
    }

    ,init : function(MENU_main) {
        SAVE.MENU_main = MENU_main;

        MENU_main.add_icon('root', 'save_group', SAVE.icon);
        MENU_main.add_icon('save_group', 'save', SAVE.icon_save, 'save locally', SAVE.save);
        MENU_main.add_icon('save_group', 'load', SAVE.icon_load, 'load locally', SAVE.load);

        MENU_main.add_icon('save_group', 'download_group'  , SAVE.icon_download_group, 'download...');
        MENU_main.add_icon('download_group', 'download'      , SAVE.icon_download, 'download board', SAVE.download);
        MENU_main.add_icon('download_group', 'download_png_view', SAVE.icon_download_png_view, 'download view as png', SAVE.download_png_view);
        MENU_main.add_icon('download_group', 'download_png_all', SAVE.icon_download_png_board, 'download board as png', SAVE.download_png_board);

        MENU_main.add_icon('save_group', 'upload', SAVE.icon_upload, 'upload board / image', SAVE.upload);

        UI.addEventListener('on_file', SAVE.on_file);

        document.getElementById('file-input').addEventListener('change', SAVE.handleFiles);

        SAVE.load();
    }

};

export {SAVE};
