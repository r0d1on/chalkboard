'use strict';

import {deploy_info} from './deploy_info.js';

import {UI} from '../ui/UI.js';


let ABOUT = {

    icon : [null,[40,26],[41,17],[34,11],[25,11],[20,16],[27,12],null,[40,26],[41,17],[34,11],[25,11],[20,16],null,[27,12],[34,11],[41,17],[38,25],null,[31,34],[30,40],[31,34],[30,40],null,[40,26],[31,34],[40,26],null,[31,34],[38,25],null,[30,48],[33,51],[30,53],[27,50],[30,48]]

    ,update_menu : function() {
        let div = ABOUT.MENU_main.items['about_version'].dom;
        div.innerHTML = deploy_info.version;
        div.title = deploy_info.time;
        div.style['font-size'] = '32px';
        div.style['font-family'] = 'monospace';

        div = ABOUT.MENU_main.items['about_git_link'].dom;
        div.innerHTML = '<a id=\'a_git_link\' target=\'blank\' href=\'https://github.com/r0d1on/chalkboard\'>GitHub</a>';
        div.style['font-size'] = '32px';
        div.style['font-family'] = 'monospace';
    }

    ,init : function(MENU_main) {
        ABOUT.MENU_main = MENU_main;

        MENU_main.add_icon('root', 'about_group', ABOUT.icon);

        MENU_main.add('about_group', 'about_version', null, 'div', 'version', 140, 40);
        MENU_main.add('about_group', 'about_git_link', ()=>{
            document.getElementById('a_git_link').click();
        }, 'div', 'github project link', 140, 40);

        UI.addEventListener('on_resize', ()=>{
            ABOUT.update_menu();
        });

        ABOUT.update_menu();
    }

};

export {ABOUT};
