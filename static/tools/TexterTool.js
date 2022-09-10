'use strict';

import {_class} from '../base/objects.js';

import {DrawToolBase} from './Base.js';

import {Menu} from '../ui/Menu.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';


let ALPHABET = {'0':{'A':[null,[9,-54],[8,-53],[6,-50],[5,-47],[4,-44],[3,-42],[2,-39],[1,-37],[1,-34],[0,-33],[0,-30],[0,-27],[0,-24],[0,-22],[0,-18],[0,-15],[1,-14],[2,-12],[3,-11],[5,-10],[7,-9],[11,-9],[15,-11],[17,-12],[19,-13],[21,-15],[22,-17],[23,-20],[24,-23],[25,-26],[26,-31],[25,-32],[25,-35],[25,-37],[25,-40],[24,-43],[23,-44],[22,-46],[21,-47],[20,-48],[17,-51],[15,-52],[13,-52],[11,-53]],'dx':26},'1':{'A':[null,[2,-36],[5,-38],[6,-39],[8,-41],[9,-42],[10,-43],[11,-44],[12,-45],[13,-46],[14,-47],[15,-48],[15,-46],[15,-44],[14,-42],[14,-40],[14,-37],[13,-35],[13,-33],[13,-31],[12,-27],[11,-24],[11,-21],[11,-18],[11,-16],[11,-14],null,[0,-8],[2,-9],[4,-9],[6,-10],[7,-11],[9,-12],[11,-12],[13,-12],[16,-13]],'dx':16},'2':{'A':[null,[3,-40],[3,-43],[4,-45],[6,-47],[8,-48],[9,-49],[12,-50],[14,-50],[16,-49],[17,-48],[18,-47],[18,-45],[19,-42],[19,-39],[19,-36],[19,-34],[19,-31],[18,-29],[17,-28],[15,-27],[13,-25],[12,-24],[11,-23],[9,-21],[7,-20],[6,-19],[5,-18],[4,-16],[3,-15],[2,-14],[1,-13],[0,-12],[1,-13],[2,-14],[3,-15],[4,-16],[5,-18],[8,-19],[10,-19],[12,-18],[15,-17],[16,-16],[17,-15],[18,-14],[19,-13],[20,-12],[21,-11]],'dx':21},'3':{'A':[null,[3,-52],[5,-53],[7,-54],[9,-54],[10,-53],[12,-53],[13,-52],[14,-51],[17,-47],[17,-45],[17,-42],[17,-40],[17,-37],[16,-36],[15,-35],[14,-34],[13,-33],[12,-32],[8,-31],[7,-32],[5,-32],[7,-32],[8,-31],[9,-32],[12,-32],[13,-33],[14,-32],[15,-31],[16,-28],[17,-25],[17,-22],[16,-19],[16,-17],[15,-15],[13,-14],[11,-13],[9,-13],[7,-13],[5,-13],[2,-13],[0,-13]],'dx':17},'4':{'A':[null,[1,-47],[1,-44],[1,-42],[1,-40],[1,-38],[1,-36],[1,-34],[1,-32],[1,-29],[1,-27],[0,-25],[2,-23],[4,-24],[7,-25],[10,-25],[12,-26],[14,-27],[16,-28],null,[20,-49],[19,-47],[19,-45],[19,-43],[19,-41],[19,-38],[19,-36],[19,-33],[19,-29],[19,-26],[18,-25],[18,-23],[19,-22],[18,-20],[18,-17],[18,-14],[19,-13],[19,-11]],'dx':20},'5':{'A':[null,[11,-51],[10,-49],[8,-46],[7,-44],[6,-42],[5,-38],[5,-35],[4,-34],[4,-31],[3,-29],[3,-27],[2,-26],[3,-27],[4,-28],[6,-29],[8,-30],[10,-30],[13,-30],[16,-29],[17,-28],[19,-27],[20,-24],[21,-23],[22,-20],[22,-18],[22,-15],[21,-12],[20,-11],[19,-10],[17,-10],[14,-9],[12,-9],[8,-8],[7,-9],[4,-9],[2,-9],[0,-9],null,[11,-51],[13,-51],[16,-51],[19,-51],[21,-52],[24,-52],[26,-52]],'dx':26},'6':{'A':[null,[19,-53],[17,-53],[16,-52],[14,-50],[13,-49],[9,-47],[8,-45],[7,-44],[6,-42],[4,-40],[3,-38],[2,-37],[1,-35],[1,-33],[0,-29],[0,-27],[0,-25],[0,-23],[0,-21],[1,-20],[2,-17],[3,-15],[5,-14],[6,-13],[8,-12],[10,-12],[13,-12],[15,-12],[17,-13],[18,-14],[19,-15],[21,-16],[22,-18],[24,-20],[25,-22],[25,-24],[25,-26],[24,-27],[23,-30],[22,-31],[21,-32],[19,-33],[15,-33],[13,-34],[11,-34],[9,-33],[7,-33],[4,-32]],'dx':25},'7':{'A':[null,[0,-48],[2,-48],[4,-49],[8,-49],[10,-50],[14,-50],[18,-51],[20,-51],[22,-52],[25,-52],[28,-53],[27,-50],[25,-48],[24,-45],[22,-44],[21,-40],[15,-31],[14,-28],[13,-25],[12,-24],[10,-22],[9,-20],[8,-18],[7,-16],[7,-13],[6,-11],[6,-9],null,[1,-24],[3,-25],[8,-26],[11,-27],[14,-28],[16,-28],[18,-29],[20,-30],[22,-30],[23,-31]],'dx':28},'8':{'A':[null,[10,-47],[12,-49],[13,-50],[16,-50],[17,-49],[18,-47],[19,-46],[19,-43],[19,-41],[18,-38],[17,-37],[16,-36],[15,-34],[14,-31],[13,-30],[12,-28],[10,-26],[9,-25],[7,-23],[5,-22],[3,-21],[2,-19],[1,-18],[0,-15],[1,-13],[2,-10],[4,-9],[5,-8],[8,-8],[10,-7],[14,-7],[17,-8],[19,-8],[20,-9],[21,-11],[22,-12],[22,-14],[22,-16],[22,-18],[21,-20],[20,-22],[18,-24],[17,-25],[16,-27],[13,-30],[11,-32],[8,-34],[7,-35],[6,-36],[5,-38],[4,-42],[3,-44],[3,-47],[3,-49]],'dx':22},'9':{'A':[null,[17,-50],[15,-50],[13,-51],[10,-50],[7,-49],[5,-48],[3,-47],[2,-45],[1,-43],[0,-40],[0,-38],[0,-35],[1,-34],[2,-32],[5,-31],[7,-31],[10,-32],[11,-33],[14,-34],[15,-36],[17,-37],[18,-38],[19,-41],[20,-43],[20,-45],[21,-44],[21,-42],[21,-39],[21,-37],[21,-35],[21,-32],[21,-30],[21,-28],[20,-25],[20,-23],[19,-20],[18,-19],[17,-18],[14,-17],[13,-16],[9,-15],[6,-15],[4,-14],[2,-14],[0,-15]],'dx':21},'-':{'A':[null,[0,-32],[2,-32],[5,-32],[9,-32],[11,-32],[14,-32],[17,-32],[19,-33],[22,-33],[24,-33],[27,-33]],'dx':27},'=':{'A':[null,[0,-38],[2,-38],[4,-38],[6,-39],[8,-39],[10,-39],[13,-39],[16,-39],[18,-39],[20,-39],[22,-38],[25,-39],[26,-38],null,[1,-20],[4,-20],[7,-20],[9,-20],[12,-20],[14,-20],[16,-20],[18,-20],[21,-20],[23,-20],[26,-20],[28,-20]],'dx':28},'q':{'A':[null,[16,-29],[14,-29],[10,-29],[7,-29],[6,-28],[4,-26],[2,-23],[1,-22],[0,-19],[0,-17],[0,-15],[1,-13],[2,-11],[5,-9],[7,-9],[9,-9],[10,-10],[13,-11],[15,-13],[17,-15],[18,-17],[19,-19],[19,-21],[19,-19],[19,-16],[18,-13],[17,-9],[16,-7],[16,-5],[15,-2],[15,0],[15,2],[14,4],[14,6],[13,8],[13,10],[12,13],[12,16],[14,15],[16,12],[18,8],[19,7],[20,6],[22,4],[24,3],[26,2],[27,0]],'dx':27},'w':{'A':[null,[0,-31],[1,-29],[1,-26],[1,-23],[1,-20],[2,-19],[3,-15],[4,-13],[5,-12],[7,-11],[9,-11],[11,-11],[13,-12],[16,-14],[17,-17],[18,-18],[19,-20],[20,-23],[21,-24],[21,-26],[21,-28],[21,-26],[21,-24],[21,-21],[21,-19],[22,-16],[22,-14],[22,-12],[23,-11],[24,-10],[26,-9],[28,-9],[30,-11],[32,-12],[33,-16],[34,-19],[35,-21],[36,-24],[37,-27],[37,-30],[38,-33]],'dx':38},'e':{'A':[null,[1,-20],[4,-20],[6,-20],[8,-21],[10,-21],[12,-22],[14,-23],[15,-24],[16,-26],[16,-28],[16,-31],[15,-33],[13,-34],[12,-35],[9,-35],[7,-34],[5,-34],[4,-33],[2,-29],[0,-27],[0,-25],[0,-23],[1,-20],[2,-16],[4,-12],[6,-11],[8,-10],[11,-9],[13,-8],[17,-8],[18,-7],[21,-7],[23,-7]],'dx':23},'r':{'A':[null,[0,-7],[0,-10],[0,-12],[0,-15],[0,-17],[0,-20],[0,-24],[1,-25],[2,-27],[3,-29],[4,-30],[6,-30],[10,-29],[11,-27],[12,-26],[13,-25],[15,-24],[18,-25],[20,-26],[21,-28]],'dx':21},'t':{'A':[null,[12,-50],[11,-48],[10,-45],[10,-43],[9,-40],[8,-37],[8,-35],[8,-32],[8,-29],[8,-26],[9,-22],[9,-20],[9,-16],[9,-14],[10,-13],[11,-11],[14,-11],[16,-11],[20,-11],[23,-12],[26,-12],[29,-13],[32,-13],null,[0,-34],[5,-35],[8,-35],[10,-34],[14,-34],[15,-33],[18,-33],[21,-33],[23,-33]],'dx':32},'y':{'A':[null,[2,-26],[1,-23],[1,-19],[1,-16],[2,-12],[2,-10],[4,-8],[6,-6],[12,-5],[14,-6],[17,-8],[20,-10],[21,-11],[22,-12],[23,-15],[24,-18],[25,-22],[25,-25],[25,-22],[25,-20],[25,-16],[26,-13],[26,-11],[26,-7],[26,-3],[25,0],[25,5],[24,10],[24,12],[22,16],[20,20],[19,23],[18,26],[16,29],[13,31],[11,31],[8,30],[5,29],[3,27],[1,24],[0,20],[1,16],[4,13],[8,11],[11,9],[15,7],[18,5],[22,2],[25,0]],'dx':26},'u':{'A':[null,[1,-37],[1,-34],[1,-30],[0,-26],[0,-23],[0,-19],[0,-17],[0,-15],[1,-14],[2,-13],[6,-13],[8,-13],[11,-15],[13,-17],[15,-18],[16,-20],[17,-21],[18,-24],[19,-26],[20,-27],[20,-30],[21,-31],[22,-32],[22,-34],[22,-32],[23,-30],[24,-26],[24,-23],[24,-19],[24,-17],[24,-14],[25,-12]],'dx':25},'i':{'A':[null,[0,-26],[1,-27],[3,-29],[5,-31],[6,-32],[7,-33],[8,-35],[9,-37],[9,-39],null,[10,-38],[9,-37],[10,-34],[10,-32],[10,-30],[10,-26],[9,-25],[9,-23],[9,-21],[9,-19],[9,-17],[9,-15],[9,-13],[8,-12],[10,-11],[13,-12],[15,-13],null,[10,-53],[10,-53],[10,-53],[10,-53],[10,-53],[10,-53],[10,-53]],'dx':15},'o':{'A':[null,[8,-30],[6,-29],[5,-28],[3,-26],[2,-24],[1,-23],[0,-21],[0,-19],[0,-16],[1,-14],[2,-12],[4,-10],[7,-9],[10,-9],[12,-10],[15,-11],[16,-12],[17,-14],[18,-15],[19,-18],[20,-21],[19,-23],[18,-26],[17,-27],[16,-28],[13,-29],[12,-30],[10,-30]],'dx':20},'p':{'A':[null,[6,-25],[6,-22],[5,-19],[4,-17],[3,-13],[3,-10],[2,-5],[2,-3],[2,1],[1,5],[1,9],[1,12],[1,16],[0,18],[0,21],null,[7,-27],[10,-29],[12,-30],[14,-30],[17,-30],[19,-30],[20,-29],[22,-28],[23,-27],[24,-24],[25,-23],[25,-20],[25,-17],[25,-15],[25,-13],[24,-12],[22,-9],[20,-8],[18,-7],[16,-7],[14,-7],[11,-7]],'dx':25},'a':{'A':[null,[18,-36],[17,-37],[14,-38],[12,-38],[10,-37],[8,-37],[6,-35],[5,-34],[3,-32],[2,-29],[1,-26],[1,-24],[0,-21],[0,-17],[1,-16],[1,-14],[3,-12],[4,-11],[8,-11],[10,-11],[12,-12],[14,-13],[15,-14],null,[26,-38],[25,-36],[24,-34],[23,-33],[23,-30],[22,-29],[22,-27],[22,-24],[22,-20],[22,-18],[23,-15],[24,-13],[25,-11],[28,-10]],'dx':28},'s':{'A':[null,[16,-34],[15,-35],[13,-36],[11,-36],[9,-36],[7,-35],[5,-34],[4,-33],[4,-30],[4,-28],[5,-26],[6,-24],[7,-22],[8,-21],[10,-19],[11,-18],[13,-17],[15,-16],[16,-15],[17,-14],[17,-12],[15,-11],[12,-10],[9,-9],[7,-9],[3,-8],[2,-9],[0,-9]],'dx':17},'d':{'A':[null,[15,-27],[13,-28],[9,-28],[6,-27],[4,-25],[2,-23],[0,-17],[0,-14],[1,-12],[2,-11],[5,-10],[8,-10],[10,-10],[12,-10],[14,-11],null,[24,-54],[24,-50],[24,-48],[24,-46],[23,-44],[23,-41],[23,-38],[22,-37],[22,-34],[22,-31],[21,-30],[21,-27],[21,-24],[21,-22],[21,-18],[22,-17],[22,-15],[23,-13],[23,-11],[24,-10]],'dx':24},'f':{'A':[null,[20,-48],[18,-48],[16,-48],[14,-48],[13,-47],[12,-46],[9,-44],[9,-42],[8,-41],[8,-39],[8,-37],[9,-35],[10,-32],[11,-30],[12,-27],[13,-23],[14,-20],[15,-19],[15,-15],[15,-13],[14,-11],[13,-8],[10,-7],[8,-7],[7,-6],[4,-6],[0,-6],null,[2,-25],[4,-26],[8,-27],[12,-27],[15,-27],[17,-28],[19,-28],[21,-28]],'dx':21},'g':{'A':[null,[19,-27],[17,-28],[16,-29],[13,-29],[11,-28],[10,-27],[8,-26],[6,-24],[4,-21],[3,-18],[3,-15],[4,-12],[8,-10],[9,-9],[11,-9],[13,-9],[15,-9],[18,-10],[19,-11],null,[19,-27],[20,-25],[21,-23],[21,-20],[21,-17],[21,-13],[21,-8],[21,-6],[20,-1],[20,4],[20,6],[20,11],[20,16],[20,19],[19,24],[19,28],[18,29],[17,32],[15,33],[13,34],[11,35],[9,35],[5,34],[4,33],[2,29],[1,26],[0,22],[1,19],[1,17],[4,13],[6,11],[10,6],[14,0],[16,-2]],'dx':21},'h':{'A':[null,[2,-50],[1,-48],[1,-46],[1,-42],[0,-40],[0,-37],[0,-33],[0,-29],[0,-27],[0,-23],[0,-20],[0,-16],[0,-12],[0,-10],null,[3,-30],[4,-31],[7,-33],[11,-33],[14,-33],[16,-32],[17,-31],[18,-29],[19,-27],[19,-23],[19,-21],[19,-19],[19,-16],[19,-14]],'dx':19},'j':{'A':[null,[14,-39],[14,-36],[14,-34],[14,-32],[14,-30],[14,-28],[14,-26],[14,-23],[15,-20],[15,-17],[15,-15],[16,-13],[15,-11],[15,-9],[14,-8],[13,-6],[12,-5],[10,-5],[8,-5],[6,-5],[5,-6],[4,-7],[3,-8],[1,-11],[0,-13],null,[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53]],'dx':16},'k':{'A':[null,[1,-33],[1,-30],[0,-28],[1,-25],[1,-21],[1,-19],[1,-16],[1,-14],[1,-12],[0,-10],[0,-8],null,[16,-34],[15,-32],[13,-29],[12,-26],[11,-24],[10,-22],[8,-20],[8,-18],[7,-17],[8,-15],[11,-14],[13,-14],[14,-13],[15,-12],[16,-11],[18,-10],[19,-8],[20,-7]],'dx':20},'l':{'A':[null,[2,-25],[2,-27],[5,-29],[6,-30],[7,-31],[10,-34],[11,-35],[14,-39],[15,-41],[17,-44],[18,-48],[18,-50],[18,-52],[16,-55],[14,-55],[12,-55],[10,-54],[9,-52],[8,-51],[7,-48],[5,-45],[4,-43],[3,-38],[2,-36],[2,-34],[1,-31],[0,-27],[0,-25],[0,-21],[0,-19],[1,-17],[1,-14],[2,-12],[3,-10],[5,-8],[7,-8],[10,-8],[14,-10],[16,-11]],'dx':18},'z':{'A':[null,[0,-29],[2,-30],[4,-30],[8,-30],[11,-29],[13,-29],[15,-29],[16,-28],[15,-27],[14,-26],[12,-24],[10,-22],[8,-20],[7,-18],[6,-17],[4,-15],[3,-13],[2,-11],[1,-10],[0,-9],[1,-8],[5,-8],[9,-8],[13,-8],[15,-8],[18,-8],[21,-9]],'dx':21},'x':{'A':[null,[1,-32],[2,-30],[3,-27],[5,-25],[6,-22],[9,-19],[10,-18],[11,-15],[13,-13],[14,-11],null,[18,-33],[17,-32],[15,-29],[13,-26],[11,-24],[10,-22],[9,-19],[7,-17],[6,-16],[4,-14],[3,-12],[1,-11],[0,-10]],'dx':18},'c':{'A':[null,[21,-35],[18,-36],[16,-36],[13,-36],[10,-35],[9,-34],[7,-33],[6,-32],[5,-31],[3,-28],[1,-25],[0,-22],[0,-20],[0,-17],[0,-14],[2,-11],[3,-10],[4,-9],[6,-8],[11,-8],[15,-9],[18,-10],[20,-10]],'dx':21},'v':{'A':[null,[0,-26],[1,-25],[3,-22],[4,-20],[5,-17],[6,-14],[7,-12],[8,-10],[9,-9],[10,-8],[12,-9],[14,-13],[15,-17],[17,-20],[18,-22],[19,-25],[20,-27],[22,-28],[23,-29]],'dx':23},'b':{'A':[null,[9,-24],[10,-26],[12,-29],[13,-30],[14,-33],[15,-35],[17,-38],[18,-41],[19,-44],[19,-46],[18,-48],[17,-49],[16,-50],[14,-50],[12,-49],[10,-48],[9,-47],[8,-46],[6,-43],[5,-40],[4,-38],[3,-37],[2,-34],[2,-32],[1,-29],[1,-26],[0,-24],[0,-21],[0,-19],[0,-17],[1,-14],[1,-12],[2,-11],[3,-9],[5,-8],[8,-7],[11,-8],[13,-9],[14,-10],[16,-11],[17,-12],[18,-14],[19,-15],[18,-18],[17,-19],[15,-22],[13,-23],[12,-24]],'dx':19},'n':{'A':[null,[6,-37],[6,-35],[5,-33],[5,-30],[3,-27],[2,-24],[2,-21],[1,-19],[1,-16],[1,-14],[0,-12],[0,-10],null,[7,-30],[9,-31],[10,-32],[11,-33],[13,-33],[15,-34],[17,-34],[19,-34],[21,-32],[22,-31],[23,-29],[24,-28],[24,-26],[25,-24],[25,-22],[25,-19],[24,-17],[24,-15],[23,-14],[22,-12],[21,-10]],'dx':25},'m':{'A':[null,[2,-24],[1,-20],[0,-17],[0,-14],[0,-10],[0,-8],[0,-6],null,[4,-21],[7,-24],[9,-25],[11,-26],[13,-26],[14,-27],[15,-26],[16,-25],[17,-23],[18,-22],[19,-18],[19,-16],[19,-14],[19,-12],[19,-10],[18,-9],[19,-10],[19,-12],[19,-14],[20,-15],[21,-17],[22,-20],[23,-22],[24,-23],[26,-24],[28,-24],[30,-24],[32,-24],[33,-21],[34,-19],[34,-16],[34,-14],[34,-12],[34,-10],[34,-8]],'dx':34},',':{'A':[null,[6,-15],[4,-15],[2,-14],[0,-13],[1,-11],[4,-11],[6,-12],[7,-13],[8,-10],[9,-9],[9,-6],[8,-4],[8,-2],[6,0],[2,3],[0,4]],'dx':9},'.':{'A':[null,[0,-14],[0,-11],[0,-9],[0,-7],[1,-5],[3,-5],[5,-6],[6,-7],[7,-8],[7,-10],[6,-11],[5,-12],[4,-13],[2,-13],[0,-11]],'dx':7},'/':{'A':[null,[19,-50],[18,-47],[17,-44],[16,-43],[15,-40],[13,-38],[12,-36],[11,-32],[10,-30],[9,-28],[7,-25],[6,-22],[5,-17],[4,-15],[3,-14],[2,-12],[2,-10],[1,-9],[0,-7]],'dx':19},';':{'A':[null,[6,-12],[4,-12],[1,-11],[1,-9],[2,-8],[4,-8],[5,-9],[7,-10],[8,-9],[9,-8],[10,-5],[10,-3],[10,-1],[9,2],[7,5],[5,7],[2,8],[0,8],null,[3,-41],[3,-39],[3,-37],[5,-37],[7,-38],[8,-39],[7,-41],[5,-42],[3,-41]],'dx':10},'\'':{'A':[null,[0,-48],[1,-46],[2,-47],[4,-46],[5,-45],[6,-43],[6,-39]],'dx':6},'[':{'A':[null,[12,-53],[10,-54],[8,-54],[6,-54],[4,-53],[2,-53],[0,-51],[0,-49],[1,-47],[1,-45],[1,-43],[1,-41],[1,-38],[1,-36],[1,-32],[1,-30],[1,-28],[1,-25],[1,-23],[0,-22],[0,-20],[0,-17],[0,-15],[0,-12],[0,-10],[2,-9],[4,-9],[6,-10],[9,-10]],'dx':12},']':{'A':[null,[0,-54],[2,-54],[5,-54],[8,-55],[10,-55],[11,-54],[12,-53],[12,-51],[12,-49],[12,-47],[13,-45],[13,-43],[13,-40],[13,-38],[13,-35],[13,-33],[13,-31],[13,-29],[13,-27],[14,-25],[14,-23],[14,-21],[14,-19],[14,-17],[14,-15],[14,-13],[14,-11],[15,-10],[14,-9],[13,-8],[11,-8],[9,-8],[6,-8],[4,-8]],'dx':15},'\\\\':{'A':[null,[0,-51],[1,-49],[1,-47],[2,-46],[3,-43],[4,-41],[5,-38],[5,-35],[6,-34],[7,-32],[8,-29],[9,-27],[10,-25],[11,-22],[13,-19],[14,-17],[15,-14],[16,-11]],'dx':16},'`':{'A':[null,[0,-49],[2,-46],[3,-45],[5,-43]],'dx':5},'!':{'A':[null,[4,-48],[3,-43],[3,-40],[3,-38],[3,-36],[3,-34],[3,-32],[2,-29],null,[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-7],[0,-7],[1,-7],[1,-7],[1,-7],[1,-7],[1,-8],[1,-8],[1,-8],[1,-8]],'dx':4},'@':{'A':[null,[22,-41],[20,-42],[19,-41],[17,-41],[15,-39],[14,-36],[13,-34],[13,-31],[13,-29],[14,-28],[14,-26],[16,-23],[17,-20],[20,-18],[22,-18],[24,-18],[26,-19],[27,-20],[29,-23],[30,-27],[31,-28],[31,-30],[31,-32],[31,-34],[31,-36],[31,-34],[31,-32],[33,-30],[34,-28],[34,-26],[35,-24],[36,-22],[37,-20],[39,-21],[40,-23],[41,-24],[42,-25],[43,-27],[44,-30],[44,-33],[44,-36],[43,-38],[42,-41],[41,-42],[40,-44],[39,-46],[38,-47],[37,-49],[35,-50],[33,-51],[29,-52],[27,-53],[24,-53],[21,-53],[18,-53],[14,-52],[11,-50],[10,-49],[7,-47],[6,-46],[5,-44],[4,-43],[3,-40],[2,-38],[1,-37],[1,-35],[0,-33],[0,-30],[0,-28],[0,-26],[1,-23],[2,-21],[3,-19],[3,-17],[4,-15],[5,-14],[7,-12],[8,-11],[10,-9],[11,-8],[14,-7],[16,-6],[20,-5],[23,-5],[25,-5],[28,-5],[31,-6],[33,-6],[37,-6],[39,-7]],'dx':44},'#':{'A':[null,[13,-48],[13,-45],[13,-42],[13,-38],[13,-35],[13,-33],[13,-30],[14,-27],[14,-25],[14,-23],[14,-20],[14,-17],null,[27,-49],[27,-46],[27,-43],[28,-36],[28,-31],[28,-28],[29,-27],[29,-24],[29,-21],[30,-20],[31,-18],null,[0,-38],[2,-38],[4,-38],[6,-39],[10,-40],[14,-40],[16,-40],[18,-40],[19,-41],[22,-41],[24,-41],[26,-41],[27,-43],[30,-41],[32,-41],[34,-41],[37,-42],null,[0,-24],[1,-25],[2,-26],[4,-26],[6,-27],[8,-27],[11,-28],[13,-28],[15,-29],[17,-29],[20,-29],[23,-29],[26,-29],[28,-28],[29,-29],[31,-29],[33,-29],[35,-29],[37,-29],[39,-29]],'dx':39},'$':{'A':[null,[15,-53],[15,-51],[14,-46],[14,-44],[14,-42],[14,-39],[14,-36],[14,-32],[14,-30],[14,-27],[14,-25],[15,-21],[15,-18],[15,-15],[15,-13],[15,-11],[15,-9],null,[24,-47],[21,-48],[19,-49],[16,-49],[13,-48],[11,-48],[10,-47],[8,-46],[5,-45],[4,-43],[2,-41],[1,-40],[0,-37],[1,-35],[4,-32],[6,-31],[10,-30],[14,-30],[18,-30],[20,-30],[22,-30],[24,-29],[25,-28],[27,-27],[28,-26],[28,-24],[27,-22],[26,-20],[25,-19],[24,-18],[23,-17],[20,-16],[19,-15],[16,-14],[14,-14],[12,-13],[8,-13],[6,-13],[4,-13],[1,-13]],'dx':28},'%':{'A':[null,[8,-50],[6,-50],[4,-50],[3,-49],[1,-47],[0,-43],[0,-41],[0,-39],[1,-38],[3,-36],[5,-35],[7,-34],[9,-34],[11,-34],[13,-35],[15,-37],[16,-38],[17,-41],[18,-43],[18,-45],[17,-46],[15,-48],[14,-49],[12,-49],[10,-49],[9,-48],null,[32,-49],[31,-48],[29,-44],[28,-43],[27,-41],[25,-39],[24,-38],[23,-36],[22,-34],[20,-32],[19,-31],[17,-28],[16,-25],[14,-23],[13,-22],[11,-20],[10,-18],[9,-17],[8,-15],[7,-14],[5,-12],null,[31,-28],[29,-27],[27,-25],[26,-24],[25,-23],[24,-21],[23,-20],[23,-18],[22,-16],[23,-14],[24,-13],[26,-12],[29,-11],[33,-11],[35,-11],[37,-12],[38,-13],[40,-14],[41,-16],[41,-19],[38,-22],[37,-23],[33,-26],[31,-28],[29,-27]],'dx':41},'^':{'A':[null,[0,-40],[2,-41],[3,-43],[4,-44],[5,-46],[6,-48],[7,-49],[8,-51],[9,-52],[10,-53],[11,-54],[12,-55],[13,-54],[15,-52],[16,-51],[18,-49],[19,-46],[20,-45],[21,-44],[22,-43],[23,-42],[24,-41]],'dx':24},'&':{'A':[null,[34,-25],[32,-21],[30,-19],[29,-17],[26,-15],[24,-13],[23,-12],[22,-10],[19,-8],[16,-6],[14,-5],[11,-4],[8,-3],[6,-3],[4,-4],[2,-5],[1,-8],[0,-11],[0,-13],[0,-16],[0,-19],[0,-21],[1,-23],[2,-24],[5,-26],[6,-27],[8,-28],[11,-29],[13,-31],[16,-32],[18,-34],[20,-36],[22,-38],[23,-39],[23,-42],[23,-44],[22,-47],[21,-51],[19,-53],[17,-55],[15,-56],[12,-58],[10,-58],[8,-58],[6,-58],[3,-56],[2,-53],[1,-50],[2,-49],[2,-46],[4,-43],[5,-42],[7,-39],[9,-37],[10,-34],[12,-33],[13,-31],[15,-28],[16,-26],[18,-23],[19,-21],[20,-20],[22,-19],[24,-17],[26,-15],[28,-14],[30,-13],[31,-11],[32,-10],[33,-8],[34,-7],[35,-6]],'dx':35},'*':{'A':[null,[8,-40],[10,-37],[11,-36],[13,-32],[14,-31],[16,-30],[18,-27],[20,-25],[22,-23],[24,-20],[25,-19],[27,-17],null,[28,-40],[27,-39],[26,-37],[22,-31],[20,-29],[19,-28],[17,-25],[16,-24],[15,-22],[14,-21],[12,-19],[11,-17],[10,-15],[9,-14],null,[19,-42],[18,-40],[18,-38],[18,-35],[18,-32],[18,-29],[18,-27],[19,-26],[19,-24],[19,-21],[18,-17],[18,-15],[19,-12],null,[0,-27],[2,-27],[4,-27],[7,-27],[10,-26],[12,-26],[14,-26],[16,-26],[18,-27],[19,-26],[20,-25],[22,-26],[25,-26],[28,-26],[30,-26],[32,-26]],'dx':32},'(':{'A':[null,[10,-53],[9,-51],[8,-50],[6,-48],[5,-46],[4,-43],[3,-41],[2,-37],[1,-35],[1,-30],[0,-29],[0,-26],[0,-24],[1,-20],[1,-18],[2,-16],[4,-14],[5,-11],[7,-10],[8,-9]],'dx':10},')':{'A':[null,[0,-53],[2,-52],[3,-51],[4,-50],[6,-49],[8,-47],[9,-46],[10,-44],[11,-43],[12,-40],[12,-38],[12,-36],[13,-34],[14,-32],[13,-30],[13,-28],[12,-24],[11,-21],[10,-19],[9,-18],[7,-16],[6,-14],[4,-13],[2,-12],[0,-11]],'dx':14},'_':{'A':[null,[0,-6],[3,-7],[5,-7],[7,-8],[10,-8],[12,-8],[15,-8],[18,-8],[20,-8],[23,-8],[25,-8],[27,-8],[30,-7],[32,-7],[34,-7],[36,-7],[37,-6],[39,-6]],'dx':39},'+':{'A':[null,[0,-30],[3,-30],[8,-31],[10,-31],[12,-31],[15,-31],[18,-31],[21,-32],[23,-32],[25,-32],[28,-32],[29,-33],null,[12,-45],[12,-42],[12,-39],[12,-34],[12,-31],[13,-28],[13,-26],[13,-24],[13,-21],[13,-19],[14,-17]],'dx':29},'Q':{'A':[null,[14,-48],[10,-46],[8,-45],[6,-42],[5,-41],[2,-36],[1,-34],[1,-32],[0,-29],[0,-25],[0,-23],[1,-20],[3,-17],[5,-15],[8,-14],[11,-13],[15,-13],[18,-14],[20,-15],[22,-16],[25,-18],[27,-19],[28,-20],[30,-23],[31,-26],[32,-28],[32,-33],[32,-36],[31,-38],[30,-40],[28,-43],[26,-46],[23,-48],[21,-49],[18,-49],[15,-50],[14,-48],[11,-49],null,[21,-26],[23,-25],[24,-24],[25,-23],[27,-22],[28,-20],[30,-18],[31,-16],[32,-15],[33,-13]],'dx':33},'W':{'A':[null,[0,-50],[0,-48],[1,-46],[1,-43],[2,-40],[3,-38],[4,-34],[5,-32],[6,-30],[7,-26],[7,-23],[8,-21],[9,-20],[9,-18],[10,-17],[11,-16],[12,-15],[13,-14],[14,-16],[16,-17],[17,-18],[18,-20],[19,-22],[20,-25],[21,-22],[22,-21],[23,-19],[24,-18],[25,-17],[26,-16],[27,-15],[29,-16],[30,-17],[31,-19],[32,-21],[32,-23],[33,-25],[33,-27],[34,-30],[35,-32],[36,-34],[37,-38],[37,-40],[38,-43],[38,-45],[38,-47],[39,-48]],'dx':39},'E':{'A':[null,[3,-49],[2,-47],[2,-42],[2,-39],[1,-36],[1,-34],[1,-31],[1,-29],[1,-25],[1,-22],[0,-21],[0,-19],[0,-17],[0,-15],[1,-14],[1,-12],[3,-11],[5,-11],[7,-12],[9,-12],[11,-12],[13,-12],[15,-12],[18,-13],[21,-13],null,[5,-33],[6,-32],[9,-31],[11,-31],[14,-30],null,[3,-49],[6,-49],[8,-49],[10,-49],[13,-49],[15,-49],[17,-49]],'dx':21},'R':{'A':[null,[4,-46],[3,-42],[2,-39],[2,-34],[1,-33],[1,-30],[1,-28],[1,-26],[1,-24],[0,-22],[0,-20],[0,-18],[0,-15],[0,-13],[0,-11],null,[6,-48],[7,-49],[9,-49],[12,-49],[14,-49],[16,-49],[17,-48],[18,-46],[18,-44],[18,-42],[19,-40],[18,-38],[18,-35],[17,-33],[16,-32],[13,-31],[11,-30],[8,-30],[8,-28],[9,-27],[10,-26],[11,-24],[13,-22],[16,-20],[17,-17],[18,-16],[19,-15],[20,-14],[21,-13]],'dx':21},'T':{'A':[null,[20,-52],[20,-49],[21,-46],[21,-42],[21,-40],[21,-38],[21,-36],[21,-34],[21,-32],[21,-28],[21,-26],[21,-24],[21,-21],[21,-18],[21,-15],[22,-12],[22,-10],null,[0,-53],[2,-53],[5,-53],[8,-53],[10,-53],[12,-52],[14,-51],[17,-51],[20,-52],[23,-52],[25,-52],[27,-52],[30,-52],[32,-52],[34,-52],[36,-52],[38,-52]],'dx':38},'Y':{'A':[null,[0,-49],[0,-47],[0,-43],[1,-39],[1,-36],[3,-34],[4,-32],[5,-31],[6,-29],[8,-27],[11,-26],[13,-26],[16,-26],[18,-26],[20,-27],[24,-28],[26,-29],[27,-30],null,[29,-53],[29,-49],[30,-44],[30,-41],[30,-37],[30,-35],[31,-32],[31,-30],[31,-27],[31,-24],[31,-22],[31,-20],[31,-18],[30,-17],[30,-15],[29,-14],[28,-12],[26,-11],[23,-10],[22,-9],[19,-8],[17,-8],[13,-8],[11,-7]],'dx':31},'U':{'A':[null,[5,-52],[4,-50],[4,-48],[4,-46],[4,-44],[3,-41],[3,-39],[3,-36],[2,-33],[1,-30],[1,-28],[1,-24],[0,-21],[0,-17],[0,-15],[1,-13],[2,-12],[3,-10],[4,-9],[7,-8],[10,-8],[12,-8],[15,-9],[19,-9],[22,-10],[24,-11],[25,-12],[27,-13],null,[32,-49],[31,-45],[31,-42],[30,-41],[30,-37],[30,-35],[29,-33],[29,-30],[28,-29],[28,-27],[28,-24],[28,-21],[28,-19],[27,-18],[27,-16],[27,-13],[27,-11],[28,-9]],'dx':32},'I':{'A':[null,[0,-52],[3,-52],[6,-53],[9,-53],[12,-53],[14,-53],[16,-53],[20,-53],[23,-53],[25,-53],[28,-52],null,[14,-51],[15,-48],[15,-46],[15,-44],[15,-42],[15,-40],[15,-38],[16,-36],[16,-32],[16,-30],[16,-27],[16,-23],[16,-21],[16,-18],[15,-16],[15,-13],null,[0,-10],[3,-10],[5,-10],[7,-10],[9,-10],[13,-11],[15,-11],[18,-11],[21,-11],[24,-11],[27,-11],[29,-12],[31,-12]],'dx':31},'O':{'A':[null,[10,-50],[8,-49],[7,-47],[6,-46],[4,-44],[3,-41],[2,-39],[1,-36],[1,-33],[0,-31],[0,-28],[0,-25],[1,-22],[2,-19],[4,-16],[8,-14],[10,-13],[13,-13],[16,-14],[18,-14],[20,-16],[23,-19],[25,-23],[26,-28],[26,-30],[26,-35],[26,-38],[26,-40],[24,-43],[23,-46],[22,-47],[20,-48],[18,-50],[14,-50],[13,-49]],'dx':26},'P':{'A':[null,[4,-49],[4,-47],[4,-44],[3,-41],[3,-39],[2,-36],[2,-32],[2,-30],[2,-28],[2,-26],[2,-24],[1,-22],[1,-19],[1,-16],[0,-14],null,[6,-51],[8,-52],[10,-53],[12,-53],[15,-54],[17,-54],[19,-54],[21,-53],[24,-52],[26,-51],[27,-50],[28,-49],[28,-47],[29,-45],[30,-41],[29,-39],[29,-37],[28,-34],[26,-31],[22,-29],[21,-28],[17,-28],[13,-29],[10,-30],[9,-31],[7,-31]],'dx':30},'A':{'A':[null,[10,-51],[8,-48],[8,-46],[7,-43],[6,-40],[6,-38],[4,-35],[3,-32],[3,-30],[3,-27],[2,-23],[2,-20],[2,-18],[1,-14],[1,-12],[0,-9],null,[12,-51],[13,-49],[15,-47],[16,-45],[17,-42],[18,-39],[19,-38],[20,-35],[21,-31],[22,-29],[23,-24],[24,-23],[25,-22],[26,-19],[27,-16],[28,-13],[29,-12],[30,-10],null,[6,-25],[9,-25],[12,-25],[14,-26],[17,-25],[19,-25],[20,-26]],'dx':30},'S':{'A':[null,[31,-46],[31,-49],[30,-50],[29,-51],[26,-52],[24,-53],[21,-53],[19,-53],[17,-53],[14,-52],[12,-51],[10,-50],[8,-49],[6,-47],[5,-46],[3,-44],[2,-41],[2,-39],[1,-38],[2,-35],[4,-33],[6,-31],[7,-30],[9,-29],[12,-28],[14,-28],[16,-28],[18,-27],[21,-26],[24,-25],[25,-24],[28,-22],[29,-21],[31,-19],[31,-16],[31,-14],[30,-13],[29,-11],[27,-10],[21,-8],[19,-7],[17,-7],[15,-7],[12,-7],[9,-7],[7,-7],[5,-8],[3,-9],[1,-11],[0,-12]],'dx':31},'D':{'A':[null,[2,-52],[2,-49],[1,-46],[1,-43],[1,-40],[1,-37],[1,-33],[0,-32],[0,-28],[0,-25],[0,-23],[0,-20],[0,-17],[0,-15],null,[4,-52],[5,-53],[7,-53],[9,-53],[10,-54],[12,-54],[14,-53],[16,-53],[17,-52],[18,-51],[21,-48],[22,-47],[23,-44],[24,-42],[25,-39],[26,-38],[26,-36],[26,-34],[26,-32],[26,-30],[26,-28],[25,-27],[24,-24],[24,-21],[23,-19],[21,-17],[20,-16],[18,-15],[15,-13],[10,-12],[8,-13]],'dx':26},'F':{'A':[null,[4,-53],[3,-52],[2,-51],[1,-47],[1,-43],[1,-40],[1,-36],[1,-33],[1,-30],[0,-29],[0,-26],[0,-24],[0,-22],[0,-19],[0,-16],[0,-14],[0,-11],null,[5,-54],[8,-54],[12,-54],[15,-54],[19,-54],[21,-55],[23,-55],[26,-55],[29,-55],null,[4,-28],[6,-28],[8,-29],[11,-29],[13,-29],[16,-30],[18,-30]],'dx':29},'G':{'A':[null,[26,-51],[23,-51],[20,-51],[18,-50],[15,-49],[14,-48],[11,-46],[8,-44],[7,-43],[4,-40],[3,-38],[1,-34],[0,-30],[0,-28],[0,-25],[0,-22],[2,-20],[4,-17],[5,-16],[8,-14],[10,-13],[14,-12],[17,-12],[19,-12],[23,-12],[27,-13],[29,-14],[31,-17],[32,-18],[33,-20],[34,-21],[34,-23],[34,-25],[32,-28],[29,-29],[27,-30],[24,-31],[22,-31],[20,-32]],'dx':34},'H':{'A':[null,[0,-54],[0,-52],[1,-51],[1,-49],[0,-46],[0,-42],[0,-37],[0,-34],[0,-32],[0,-29],[1,-26],[1,-23],[2,-20],[2,-18],[2,-15],[2,-13],[2,-11],null,[2,-29],[5,-30],[7,-31],[9,-31],[11,-31],[14,-32],[16,-32],[18,-33],[19,-34],null,[22,-53],[22,-51],[22,-47],[23,-45],[24,-41],[24,-38],[25,-35],[24,-32],[24,-29],[24,-25],[24,-23],[25,-22],[25,-20],[26,-17],[26,-15]],'dx':26},'J':{'A':[null,[25,-52],[26,-51],[26,-49],[27,-47],[27,-45],[28,-43],[28,-41],[28,-36],[29,-33],[29,-31],[29,-28],[29,-26],[29,-22],[29,-20],[29,-18],[29,-16],[28,-14],[27,-11],[26,-10],[24,-9],[22,-8],[19,-8],[16,-9],[13,-9],[11,-10],[8,-11],[5,-12],[3,-14],[1,-15],[0,-17],[0,-19],[1,-21],[1,-23],null,[14,-53],[16,-53],[20,-53],[22,-53],[24,-53],[26,-53],[29,-54],[32,-54],[34,-54],[35,-55]],'dx':35},'K':{'A':[null,[5,-51],[5,-49],[5,-45],[5,-42],[4,-40],[4,-35],[2,-30],[1,-25],[1,-20],[1,-16],[1,-13],[0,-10],[0,-8],null,[28,-53],[25,-51],[24,-50],[22,-48],[19,-45],[16,-42],[15,-40],[12,-37],[11,-35],[8,-32],[7,-29],[6,-27],[9,-25],[11,-24],[12,-23],[14,-22],[16,-21],[17,-20],[18,-18],[20,-16],[21,-14],[21,-11],[22,-10]],'dx':28},'L':{'A':[null,[6,-51],[5,-49],[5,-46],[4,-42],[4,-37],[3,-34],[3,-32],[2,-29],[1,-25],[1,-21],[0,-18],[0,-16],[0,-14],[0,-12],[0,-10],[2,-8],[5,-9],[8,-9],[10,-10],[12,-10],[14,-10],[16,-11],[19,-11],[20,-12],[23,-12],[25,-13],[25,-15]],'dx':25},'Z':{'A':[null,[3,-51],[4,-50],[6,-50],[10,-49],[14,-49],[16,-49],[20,-48],[23,-48],[25,-48],[27,-48],[28,-47],[27,-45],[26,-44],[25,-43],[24,-41],[23,-39],[22,-38],[20,-35],[19,-33],[16,-30],[15,-29],[13,-27],[12,-25],[10,-23],[8,-20],[7,-18],[6,-17],[5,-15],[4,-13],[2,-11],[0,-10],[2,-11],[3,-10],[6,-10],[10,-11],[13,-11],[16,-11],[20,-11],[24,-12],[28,-12],[30,-13]],'dx':30},'X':{'A':[null,[0,-53],[1,-51],[2,-49],[5,-44],[7,-39],[10,-35],[11,-33],[14,-30],[18,-26],[19,-24],[22,-20],[25,-17],[26,-15],[27,-14],[28,-13],null,[28,-53],[28,-51],[26,-49],[24,-47],[24,-45],[23,-44],[21,-40],[19,-37],[17,-34],[16,-32],[14,-30],[13,-26],[12,-22],[11,-20],[9,-18],[8,-16],[6,-13],[5,-11],[4,-10]],'dx':28},'C':{'A':[null,[25,-53],[23,-54],[21,-53],[19,-53],[17,-52],[15,-50],[12,-49],[10,-47],[8,-45],[5,-42],[4,-40],[2,-37],[1,-34],[0,-30],[0,-28],[0,-24],[0,-20],[1,-18],[3,-15],[5,-13],[8,-11],[10,-11],[12,-11],[16,-11],[21,-13],[23,-13]],'dx':25},'V':{'A':[null,[0,-50],[1,-49],[1,-45],[2,-44],[3,-40],[4,-39],[5,-35],[6,-32],[8,-24],[9,-22],[10,-19],[11,-16],[12,-14],[13,-11],[13,-9],[14,-8],[13,-9],[14,-10],[15,-12],[15,-14],[16,-17],[17,-21],[19,-26],[20,-28],[21,-33],[23,-38],[25,-42],[27,-45],[27,-47],[28,-48],[29,-50]],'dx':29},'B':{'A':[null,[1,-51],[1,-48],[1,-44],[1,-40],[1,-36],[1,-33],[0,-29],[0,-26],[0,-22],[1,-20],[1,-18],[1,-15],[1,-12],[1,-9],null,[3,-54],[6,-54],[8,-55],[11,-55],[14,-54],[18,-53],[20,-52],[22,-50],[23,-48],[25,-47],[26,-44],[26,-41],[25,-39],[24,-38],[23,-36],[20,-34],[17,-32],[15,-32],[10,-31],[7,-31],[10,-31],[15,-32],[19,-30],[21,-29],[23,-28],[24,-27],[26,-25],[27,-22],[27,-19],[27,-17],[26,-16],[25,-14],[24,-13],[23,-12],[21,-11],[20,-10],[18,-9],[16,-8],[12,-8],[8,-8]],'dx':27},'N':{'A':[null,[2,-48],[2,-46],[2,-43],[2,-39],[2,-34],[2,-30],[2,-28],[1,-24],[1,-21],[1,-18],[1,-14],[1,-12],[0,-10],null,[4,-51],[5,-50],[6,-47],[8,-44],[8,-42],[10,-39],[11,-36],[12,-34],[13,-31],[14,-29],[18,-20],[19,-17],[20,-16],[21,-14],[22,-12],[24,-14],[24,-16],[25,-18],[25,-20],[26,-23],[28,-26],[29,-30],[29,-32],[29,-34],[30,-37],[30,-40],[30,-42],[31,-43],[31,-46],[31,-48]],'dx':31},'M':{'A':[null,[6,-49],[6,-46],[6,-44],[5,-42],[5,-40],[4,-37],[4,-35],[4,-30],[3,-26],[3,-22],[2,-19],[1,-16],[1,-14],[0,-11],[0,-8],null,[10,-50],[11,-46],[12,-43],[13,-40],[14,-37],[15,-36],[16,-33],[17,-31],[18,-29],[19,-26],[20,-25],[21,-24],[22,-22],[22,-20],[22,-22],[24,-24],[25,-28],[26,-30],[27,-32],[27,-35],[28,-36],[29,-40],[29,-42],[30,-44],[31,-46],[32,-47],[33,-46],[34,-43],[35,-42],[36,-40],[37,-38],[37,-35],[38,-32],[38,-30],[38,-27],[38,-25],[39,-23],[41,-20],[42,-18],[42,-16],[43,-14],[43,-12],[43,-10],[43,-7]],'dx':43},'<':{'A':[null,[17,-43],[15,-42],[13,-40],[11,-38],[9,-35],[8,-33],[6,-30],[4,-29],[3,-28],[2,-27],[1,-26],[0,-25],[1,-23],[2,-22],[5,-19],[7,-17],[8,-16],[11,-13],[13,-12],[15,-11]],'dx':17},'>':{'A':[null,[0,-43],[3,-41],[4,-39],[6,-37],[7,-36],[8,-34],[10,-32],[12,-30],[13,-29],[15,-27],[16,-25],[17,-24],[18,-23],[18,-21],[18,-19],[16,-18],[14,-16],[9,-13],[6,-12],[4,-11],[2,-10],[0,-9]],'dx':18},'?':{'A':[null,[0,-48],[2,-50],[4,-51],[5,-52],[9,-53],[11,-54],[13,-54],[14,-53],[17,-51],[17,-49],[17,-45],[17,-43],[16,-42],[15,-40],[14,-38],[13,-37],[10,-32],[9,-30],[8,-28],[7,-27],[7,-25],[8,-23],null,[7,-5],[7,-5],[7,-5],null,[7,-5],[7,-5]],'dx':17},':':{'A':[null,[1,-14],[0,-13],[0,-10],[2,-10],[3,-9],[5,-10],[6,-11],[5,-13],[4,-15],[3,-16],[1,-14],null,[3,-43],[2,-42],[1,-40],[1,-37],[2,-35],[5,-35],[6,-36],[7,-37],[8,-38],[8,-41],[7,-43],[5,-44],[3,-43]],'dx':8},'"':{'A':[null,[4,-48],[3,-46],[3,-44],[2,-41],[1,-38],[0,-36],null,[19,-48],[18,-46],[17,-43],[15,-40],[15,-38],[14,-37]],'dx':19},'{':{'A':[null,[15,-54],[13,-53],[12,-51],[10,-50],[9,-47],[9,-44],[9,-42],[9,-40],[9,-38],[9,-35],[9,-32],[9,-28],[8,-27],[7,-26],[5,-25],[3,-25],[1,-25],[0,-28],[2,-29],[3,-28],[4,-27],[5,-25],[7,-26],[7,-24],[8,-22],[8,-20],[9,-19],[9,-16],[9,-13],[10,-12],[13,-12],[15,-11],[17,-12]],'dx':17},'}':{'A':[null,[4,-54],[6,-54],[4,-54],null,[6,-54],[9,-53],[11,-52],[12,-51],[12,-48],[11,-45],[10,-43],[9,-40],[9,-38],[9,-36],[8,-33],[8,-31],[9,-28],[10,-26],[12,-25],[15,-25],[17,-25],[18,-26],[18,-29],[17,-30],[15,-30],[14,-29],[13,-28],[12,-27],[10,-26],[12,-25],[11,-24],[10,-21],[10,-18],[11,-15],[10,-13],[9,-10],[8,-9],[6,-9],[4,-8],[2,-8],[0,-9]],'dx':18},'|':{'A':[null,[0,-53],[1,-50],[1,-48],[0,-47],[0,-45],[0,-43],[0,-41],[0,-39],[0,-37],[0,-35],[0,-32],[0,-29],[0,-27],[0,-25],[1,-24],[1,-22],[1,-20],[1,-18],[1,-15],[1,-13],[1,-11],[1,-9],[1,-7]],'dx':1},'~':{'A':[null,[0,-28],[0,-30],[1,-31],[2,-32],[3,-33],[4,-34],[5,-35],[7,-36],[10,-36],[11,-35],[12,-33],[13,-32],[14,-30],[15,-28],[16,-27],[18,-27],[20,-27],[21,-29],[22,-30],[23,-31],[24,-33]],'dx':24}};

let TexterTool = _class('TexterTool', {
    super : DrawToolBase

    ,icon : [null,[52,21],[53,8],[8,8],[9,21],null,[44,15],[16,15],[9,21],null,[52,21],[44,15],null,[36,53],[36,15],null,[25,15],[24,53],[36,53],null,[9,8],[10,19],null,[10,18],[16,13],[44,14],[50,18],[50,9],[10,9],null,[12,10],[12,15],[14,13],[45,13],[49,15],null,[49,16],[49,10],[12,10],[12,13],null,[28,15],[26,51],[34,52],[33,16],null,[34,18],[28,17],[28,50],[32,49],[32,16],[30,16],null,[31,17],[31,50],[31,15]]

    ,cursor : null // global cursor position
    ,paragraph : null // global paragraph position

    ,MENU_main : null

    ,TexterTool : function(MENU_main) {
        DrawToolBase.init.call(this, 'texter', false, ['Control', 'i']);
        this.MENU_main = MENU_main;
    }

    ,put_char : function(key, bx, by, scale, draw_fun) {
        scale = (scale===undefined)?(BRUSH.get_local_width()/10) : scale;
        draw_fun = (draw_fun===undefined)?BOARD.add_buffer_stroke:draw_fun;

        let A = ALPHABET[key].A;
        let a,b,p = null;

        for(let i=0; i<A.length; i++) {
            a = p;
            b = A[i];

            if ((p==null)&&(A[i]!=null)&&((i==A.length-1)||((i<A.length-1)&&(A[i+1]==null))))
                a = b;

            if ((a!=null)&&(b!=null)) {
                draw_fun(
                    {'X':a[0] * scale + bx, 'Y':a[1] * scale + by}
                    ,{'X':b[0] * scale + bx, 'Y':b[1] * scale + by}
                );
            }

            p = A[i];
        }
        return ALPHABET[key].dx * scale;
    }

    ,draw_cursor : function(lp, params) {
        if (params==undefined)
            UI.reset_layer('overlay');

        if (lp==null)
            return;

        let w = 2.2 * BRUSH.get_local_width();

        let figure = [
            {'X':lp.X  , 'Y':lp.Y}
            ,{'X':lp.X+w, 'Y':lp.Y-2.6*w}
            ,{'X':lp.X  , 'Y':lp.Y-2.6*w}
            ,{'X':lp.X+w, 'Y':lp.Y}
        ];

        figure.map((p, pi)=>{
            UI.add_overlay_stroke(p, figure[(pi+1)%figure.length], params);
        });
    }

    ,on_start : function(lp) {
        this.cursor = UI.local_to_global({X:lp.X, Y:lp.Y});
        this.paragraph = UI.local_to_global({X:lp.X, Y:lp.Y});
        this.draw_cursor(lp);
    }

    ,on_move : function(lp) {
        this.draw_cursor(UI.global_to_local(this.cursor));
        this.draw_cursor(lp, {color:BRUSH.get_color('2')});
    }

    ,on_stop : function(lp) { // eslint-disable-line no-unused-vars
    }

    ,on_key_down : function(key) {
        if (this.cursor==null)
            return;

        let lcursor = UI.global_to_local(this.cursor);

        if (key==' ') {
            lcursor.X += 3.0 * BRUSH.get_local_width();

        } else if (key=='Control') {
            return false;

        } else if (key=='Shift') {
            return false;

        } else if ((key=='+')&&(UI.keys['Control'])) {
            return false;

        } else if ((key=='-')&&(UI.keys['Control'])) {
            return false;

        } else if (UI.keys['Control']) {
            return false;

        } else if (key=='Backspace') {
            let rect = BOARD.rollback(); // returns global rect of cancelled strokes
            rect = rect.map((p)=>{
                return UI.global_to_local(p);
            });
            let mx = 3 * 2 * BRUSH.get_local_width();
            lcursor.X = rect[0].X;
            lcursor.Y-= (Math.floor( (lcursor.Y - rect[1].Y) / mx )) * mx;

        } else if (key=='Enter') {
            let lparagraph = UI.global_to_local(this.paragraph);
            lcursor.X = lparagraph.X;
            lcursor.Y += 3 * 2 * BRUSH.get_local_width();

        } else if (key in ALPHABET) {
            lcursor.X += this.put_char(key, lcursor.X, lcursor.Y);
            lcursor.X += BRUSH.get_local_width();

        } else {
            lcursor.X += 3 * BRUSH.get_local_width();

        }

        this.cursor = UI.local_to_global(lcursor);

        BOARD.flush_commit();

        this.draw_cursor(lcursor);
        return true;
    }

    ,on_key_up : function(key) {
        if (key=='Control') {
            return false;
        }
        return true;
    }

    ,on_activated : function() {
        if (!UI.is_mobile)
            return;

        let inp = this.MENU_main.add('root', 'input', null, 'input')[1];

        inp.style['width'] = (Menu.SIZE-9) + 'px';
        inp.style['height'] = (Menu.SIZE-8) + 'px';
        inp.addEventListener('keydown',(e)=>{
            if ((e.key in {'Enter':1, 'Backspace':1})) {
                this.on_key_down(e.key);
            } else if (('01234567890'.includes(e.key))) {
                this.on_key_down(e.key);
            }
            e.preventDefault();
            e.stopPropagation();
        });

        inp.addEventListener('input', (e)=>{
            this.on_key_down(e.data);
            e.target.value = '';
            e.preventDefault();
            e.stopPropagation();
        });

        inp.focus();
    }

    ,on_deactivated : function() {
        UI.reset_layer('overlay');

        if (!UI.is_mobile)
            return;

        this.MENU_main.drop('input');
    }

    ,after_redraw : function() {
        this.draw_cursor(UI.global_to_local(this.cursor));
    }

});

export {TexterTool};
