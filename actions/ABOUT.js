'use strict';

import {_deploy_info} from './_deploy_info.js';

import {UI} from '../ui/UI.js';


let ABOUT = {

    icon : [null,[40,26],[41,17],[34,11],[25,11],[20,16],[27,12],null,[40,26],[41,17],[34,11],[25,11],[20,16],null,[27,12],[34,11],[41,17],[38,25],null,[31,34],[30,40],[31,34],[30,40],null,[40,26],[31,34],[40,26],null,[31,34],[38,25],null,[30,48],[33,51],[30,53],[27,50],[30,48]]

    ,init : function(MENU_main) {
        ABOUT.MENU_main = MENU_main;

        let ctx = MENU_main.add('root', 'about_group', null, 'canvas', '')[1].getContext('2d');
        UI.draw_glyph(ABOUT.icon, ctx);

        let div = MENU_main.add('about_group', 'about_version', null, 'div', 'version', 140, 40)[0];
        div.innerHTML = _deploy_info.version; // "0.0.12";
        div.title = _deploy_info.time; //"20230102-2250";
        div.style['font-size'] = '32px';
        div.style['font-family'] = 'monospace';

        div = MENU_main.add('about_group', 'about_git_link', ()=>{
            alert('+');
            let ancor = document.getElementById('a_git_link');
            ancor.click();
        }, 'div', 'version', 140, 40)[0];
        div.innerHTML = '<a id=\'a_git_link\' target=\'blank\' href=\'https://github.com/r0d1on/chalkboard\'>GitHub</a>';
        div.style['font-size'] = '32px';
        div.style['font-family'] = 'monospace';
    }

};

export {ABOUT};
