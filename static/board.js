var isDrawing = false;
var isMoving  = false;
var isZooming = false;
var gridOn = true;
var needRedraw = false;
var isSyncing = false;

var LTE = 0;
var LTS = 0;
var LLN = 0;
var LNN = 0;

var BOARD = null;
var CTX = null;
var WW = null;
var WH = null;

var G = rand5();
var VP = [-170,-170,0.5];
var LP = null;
var GS = 60;
var D0 = null;
var S0 = null;

var chalkWidth = 10;
var chalkColor = '-';

//
var NAME = "";

var SVER = -1;
var SDATA = [];

var LVER  = -1;
var LDATA = [];
//

function dst2(a, b) { return (a.X - b.X)*(a.X - b.X) + (a.Y - b.Y)*(a.Y - b.Y) };
function dst2seg2(p, a, b) {
  var len2 = dst2(a, b);
  if (len2 == 0) return dst2(p, a);
  var t = ((p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return dst2(p, { X: a.X + t * (b.X - a.X),
                   Y: a.Y + t * (b.Y - a.Y) });
};
function dst2seg(p, a, b) { return Math.sqrt(dst2seg2(p, a, b)); }
function rand5() {
    return (Math.round(Math.random()*(1e5)));
};
function round(x) {
    return Math.round(x*1000)/1000;
};

function getTouchPos(canvasDom, e) {
    var rect = canvasDom.getBoundingClientRect();

    p0 = {
        X: e.touches[0].clientX - rect.left,
        Y: e.touches[0].clientY - rect.top
    };
    if (e.touches.length>1) {
        p1 = {
            X: e.touches[1].clientX - rect.left,
            Y: e.touches[1].clientY - rect.top
        };
        return {
             "X" : (p0.X+p1.X)/2
            ,"Y" : (p0.Y+p1.Y)/2
            ,"D" : Math.sqrt(dst2(p0,p1))
        };
    } else {
        return p0;
    };

    return ;
};

function cmap(point) {
    return {
        "X" : ((point.X)/VP[2])+VP[0]
       ,"Y" : ((point.Y)/VP[2])+VP[1]
    }
};

function cunmap(point) {
    return {
        "X" : (point.X-VP[0])*VP[2]
       ,"Y" : (point.Y-VP[1])*VP[2]
    }
};

var DT=[];
function debug(t) {
    if (NAME=='debug') {
        console.log(t);
        DT.splice(0,0,t);
        DT.slice(0,40);

        for(var i=0;i<DT.length;i++) {
            CTX.fillStyle = "white";
            CTX.fillRect(10, i*45, 40*DT[i].length, 40);
            CTX.lineWidth = 2;
            CTX.strokeStyle = "black";
            CTX.font="40px courier";
            CTX.strokeText(DT[i],10,40+i*45);
        };
    };
};

function deser(D) {
    var a = [];
    var l = D.length;
    for(var i=0;i<l;i++) {
        a.push({
            'p':[{"X":D[i][0][0],"Y":D[i][0][1]},{"X":D[i][1][0],"Y":D[i][1][1]}],
            's':D[i][2],
            'G':D[i][3],
            'I':D[i][4],
            'D':D[i][5],
            'v':D[i][6],
            'DL':D[i][7]
        });
    };
    return a;
};
function ser(D) {
    var a = [];
    var l = D.length;
    for(var i=0;i<l;i++) {
        a.push([
            [round(D[i]['p'][0].X),round(D[i]['p'][0].Y)],
            [round(D[i]['p'][1].X),round(D[i]['p'][1].Y)],
            D[i]['s'],
            D[i]['G'],
            D[i]['I'],
            D[i]['D'],
            D[i]['v'],
            D[i]['DL']
        ]);
    };
    return a;
}

function mergein(loc,msg) {
    var mc = 0;
    var ic = 0

    var idx = {};
    for(var i=0;i<loc.length;i++) {
        var key = loc[i]['G']+'|'+loc[i]['I'];
        idx[key] = i;
    };

    for(var i=0;i<msg.length;i++) {
        var vec = msg[i];
        var key = vec['G']+'|'+vec['I'];
        if (key in idx) {
            loc[idx[key]] = vec;
            mc +=1;
        } else {
            loc.push(vec);
            ic +=1;
        };
    };
    debug('MRG: '+mc+' / '+ic);
};

function ping() {
    if (NAME=="") {
        //console.log('cannot sync unnamed board');
        return;
    };

    var msg = JSON.stringify({
         "a" : ser(LDATA)
        ,"i" : NAME
        ,"v" : SVER
    });

    var xhr = new XMLHttpRequest();

    function onstate(xhr,sSVER,sLVER) {
        return (()=>{
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var msg = JSON.parse(xhr.responseText);
                    SVER = msg.v;
                    if (msg.a.length) {
                        debug('Got ['+msg.a.length+'] from server V:'+SVER);
                        mergein(SDATA,deser(msg.a));
                        for(var i=0;i<LDATA.length;i++) {
                            if (LDATA[i]['v']>=sLVER) {
                                LDATA.splice(i,1);
                                i--;
                            };
                        };
                        if (isDrawing) {
                            needRedraw = true;
                        } else {
                            redraw();
                        };
                    } else {
                        debug('Got emtpy message from server V:'+SVER);
                    };
                } else {
                    console.log('Something is broken');
                    console.log(xhr);
                    if (AUTOSYNC) {
                        switchAuto();
                    };
                };
                isSyncing = false;
                if (NAME=="debug") {
                    LPANEL.style['background'] = '#3335';
                    TPANEL.style['background'] = '#3335';
                };
            };
        });
    };

    function ontime(xhr) {
        return (()=>{
            console.log('timed out');
            console.log(xhr);
        });
    };

    xhr.onreadystatechange = onstate(xhr,SVER,LVER);
    xhr.timeout = 10*1000;
    xhr.ontimeout = ontime(xhr);
    xhr.open('POST', '/board.php', true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    isSyncing = true;
    if (NAME=="debug") {
        LPANEL.style['background'] = '#333';
        TPANEL.style['background'] = '#333';
    };

    xhr.send(msg);
    if (LDATA.length) {
        LVER--;
    };
};

function init_dims() {
    WW = window.innerWidth;
    WH = window.innerHeight;
    NAME = window.location.hash.slice(1,);

    LPHeight = LPANEL.offsetHeight;

    BOARD.width  = WW-40-4;
    BOARD.height = WH-40-4;

    function check_dims(){
        /*
        var n = document.getElementsByClassName('kitten')[0].src.split('_')[1];
        if (n == undefined) {
            document.getElementsByClassName('kitten')[0].src = "/i/kitten.png?board_"+NAME+'='+rand5();
        } else if (n.split('=')[0]!=NAME) {
            document.getElementsByClassName('kitten')[0].src = "/i/kitten.png?board_"+NAME+'='+rand5();
        };
        */
        if ((Math.abs(WW-window.innerWidth)>10)||(Math.abs(WH-window.innerHeight)>10)) {
            debug('Changed WW :'+WW+' -> '+window.innerWidth);
            debug('Changed WH :'+WH+' -> '+window.innerHeight);

            WW = window.innerWidth;
            WH = window.innerHeight;

            BOARD.width  = WW-40-4;
            BOARD.height = WH-40-4;
            if (isDrawing) {
                needRedraw = true;
            } else {
                redraw();
            };
        };
        if (NAME!=window.location.hash.slice(1,)) {
            NAME = window.location.hash.slice(1,);
            SVER = -1;
            SDATA = [];
            LVER  = -1;
            LDATA = [];

            if (isDrawing) {
                needRedraw = true;
            } else {
                redraw();
            };
            ping();
        };

        setTimeout(check_dims,1000);
    };
    check_dims();
};


function updatePenWidth() {
    PENWIDTH.style['left']   = (101-chalkWidth*VP[2])>>1;
    PENWIDTH.style['top']    = (98-chalkWidth*VP[2])>>1;
    PENWIDTH.style['width']  = (chalkWidth*VP[2])>>0;
    PENWIDTH.style['height'] = (chalkWidth*VP[2])>>0;
    PENWIDTH.style['borderRadius'] = ((chalkWidth*VP[2])>>0)+'px';
    if (document.getElementById('palette').children[0].dataset['color']=='red') {
        PENWIDTH.style.borderColor='black';
    } else {
        PENWIDTH.style.borderColor='red';
    };
};

function setPen(delta) {
    if (delta==undefined) delta = 5;

    chalkWidth += delta;

    if (chalkWidth>40) chalkWidth=5;
    if (chalkWidth<5)  chalkWidth=40;

    updatePenWidth();
};

function init_controls() {
    var colors,el;

    // penwidth
    PENWIDTH.addEventListener('mousedown', e => {
        setColor(document.getElementById('palette').children[0].dataset['color']);
    });
    PENWIDTH.addEventListener('touchstart', e => {
        setColor(document.getElementById('palette').children[0].dataset['color']);
    });
    document.getElementById('setpen').addEventListener('mousedown', e => {
        setPen();
    });
    document.getElementById('setpen').addEventListener('touchstart', e => {
        setPen();
    });
    updatePenWidth();


    // colors
    colors = document.getElementsByClassName('color');
    for(var i=0;i<colors.length;i++){
        colors[i].addEventListener('mousedown', e => {
            setColor(e.target.dataset["color"]);
        });
        colors[i].addEventListener('touchstart', e => {
            setColor(e.target.dataset["color"]);
        });
    };


    // text entry mode
    el = document.getElementById('texting');
    el.addEventListener('click'     , e => {switchTexting();});
    el.addEventListener('touchstart', e => {switchTexting();});

    // undo
    el = document.getElementsByClassName('undo')[0];
    el.addEventListener('click', e => {undo();});
    el.addEventListener('touchstart', e => {undo();});

    // grid
    el = document.getElementsByClassName('grid')[0];
    el.addEventListener('click', e => {switchGrid();});
    el.addEventListener('touchstart', e => {switchGrid();});

    // auto
    el = document.getElementsByClassName('auto')[0];
    el.addEventListener('click'     , e => {switchAuto();});
    el.addEventListener('touchstart', e => {switchAuto();});

    // clear
    el = document.getElementsByClassName('clear')[0];
    el.addEventListener('click'     , e => {clear();});
    el.addEventListener('touchstart', e => {clear();});

    // zoom in
    el = document.getElementsByClassName('zoomin')[0];
    el.addEventListener('click'     , e => {zoomin();});
    el.addEventListener('touchstart', e => {zoomin();});

    // zoom out
    el = document.getElementsByClassName('zoomout')[0];
    el.addEventListener('click'     , e => {zoomout();});
    el.addEventListener('touchstart', e => {zoomout();});

};

function init_events() {
    // starting events
    BOARD.addEventListener('mousedown', e => {
        //console.log('mouse.down');
        start({X:e.offsetX,Y:e.offsetY});
    });
    BOARD.addEventListener('touchstart', e => {
        //console.log('touch.down',e);
        debug('td:'+e.touches.length);
        if (e.touches.length==1) {
            start(getTouchPos(BOARD,e));
        } else if (e.touches.length==2) {
            isMoving = true;
            isZooming= true;
            if ((0<LNN)&&(LNN<3)&&(LLN<30)&&(Date.now()-LTS<200)) {
                stop({"X":null});
                undo();
                debug('*'+(LTE-LTS)+'|'+LLN+'|'+LNN);
            };
            var p = getTouchPos(BOARD,e)
            D0 = p.D;
            S0 = VP[2];
            start(p);
        } else if (e.touches.length==3) {
            switchColor();
        } else {
        };
        e.preventDefault();
    });

    // movements events
    BOARD.addEventListener('mousemove', e => {
        //console.log('mouse.move');
        move({X:e.offsetX,Y:e.offsetY});
    });
    BOARD.addEventListener('touchmove', e => {
        //console.log('mouse.move');
        debug('tm:'+e.touches.length);
        move(getTouchPos(BOARD,e));
        e.preventDefault();
    });

    // desktop wheel listener
    BOARD.addEventListener('wheel', e => {
        //console.log('mouse.wheel',e);
        if (isZooming) {
            _zoom((e.deltaY>0)?1/1.2:1.2,LP);
        } else {
            if (e.deltaY>0) {
                VP[1-isMoving] += GS/VP[2];
            } else {
                VP[1-isMoving] -= GS/VP[2];
            };
        };
        redraw();
        e.preventDefault();
    });

    // stopping events
    window.addEventListener('mouseup', e => {
        //console.log('mouse.up');
        stop({"X":e.offsetX,"Y":e.offsetY});
    });
    window.addEventListener('touchend', e => {
        //console.log('touch.up',e);
        debug('te:'+e.touches.length);
        stop({"X":null,"Y":null}); // getTouchPos(BOARD,e)
        isMoving = false;
        isZooming= false;
        D0 = null;
        e.preventDefault();
    });

    // desktop keyboard shortcuts
    document.body.onkeydown = function(e){
        //console.log(String.fromCharCode(e.keyCode)+" = "+e.keyCode);
        if (e.keyCode==16) { // shift
            isMoving = true;
            BOARD.style['cursor'] = 'grab';
        } else if (e.keyCode==17) { // ctrl
            isZooming = true;
            BOARD.style['cursor'] = 'zoom-in';
        } else {
            //console.log('key down: ',e);
        };
    };
    document.body.onkeyup = function(e){
        //console.log(String.fromCharCode(e.keyCode)+" = "+e.keyCode);
        if (e.keyCode==16) { // shift
            isMoving = false;
            BOARD.style['cursor'] = TEXTING?'text':'default';
        } else if (e.keyCode==17) { // ctrl
            isZooming = false;
            BOARD.style['cursor'] = TEXTING?'text':'default';
        } else if (e.key=='Backspace') {
            undo();
        } else {
            //console.log('key up: ',e);
            if ((TEXTING)&&(TEXTPOS!=null)) {
                createCharacter(e.key,TEXTPOS);
            } else if (e.key=='+' ) {
                setPen(+5);
            } else if (e.key=='-' ) {
                setPen(-5);
            };
        };
    };

};

function init() {
    BOARD = document.getElementById('board');
    CTX = board.getContext('2d');

    LPANEL = document.getElementById('lpanel');
    TPANEL = document.getElementById('tpanel');
    PENWIDTH = document.getElementById('penwidth');

    init_dims();
    init_controls();
    init_events();

    console.log("Init done");
    redraw();
    setColor('black');
    switchAuto();
    switchPanels();
};

function rotatePalette() {
    var palette = document.getElementById('palette');
    var color = palette.querySelectorAll('.color')[0];
    palette.removeChild(color);
    palette.appendChild(color);
};

function setColor(color,sw) {
    if (sw === undefined) sw = true;

    chalkColor = color;

    var cc = document.getElementById('palette').children[0].dataset['color'];
    while(document.getElementById('palette').children[0].dataset['color']!=chalkColor) {
        rotatePalette();
        if (document.getElementById('palette').children[0].dataset['color']==cc) break;
    };

    if (sw)
        switchPanels();

    updatePenWidth();
};

function switchColor() {
    rotatePalette();
    setColor(document.getElementById('palette').children[0].dataset['color'],sw = false);
};

var PANELSON = true;
function switchPanels() {
    if (PANELSON) {
        LPANEL.style.height = '80px';
        TPANEL.style.top = '-100px';
    } else {
        LPANEL.style.height = LPHeight + 'px';
        TPANEL.style.top = '0px';
    };
    PANELSON=!PANELSON;
};

var AUTOSYNC = false;
function switchAuto() {
    function autosync() {
        if (isSyncing) {
            debug('Skipping sync: already syncing');
        } else {
            ping();
        };
        if (AUTOSYNC) {
            setTimeout(autosync,1000);
        };
    };
    AUTOSYNC = !AUTOSYNC;
    if (AUTOSYNC) {
        debug('Auto sync: on');
        document.getElementsByClassName('auto')[0].style['background-color'] = 'gray';
        autosync();
    } else {
        debug('Auto sync: off');
        document.getElementsByClassName('auto')[0].style['background-color'] = 'buttonface';
    };
};

function switchGrid() {
    gridOn = !gridOn;
    redraw();
};

var TEXTING = false;
var TEXTPOS = null;
var TEXTPAR = null;
function switchTexting() {
    TEXTING = !TEXTING;
    isMoving = false;
    isZooming = false;
    if (TEXTING) {
        document.getElementById('texting').style['border'] = "2px solid red";
        BOARD.style['cursor'] = 'text';
    } else {
        document.getElementById('texting').style['border'] = "2px solid #555";
        BOARD.style['cursor'] = 'default';
        TEXTPOS = null;
        TEXTPAR = null;
    };
    redraw();
};


function clear(G) {
    function _clear(A){
        var l = A.length;
        for (var i=0;i<l;i++) {
            str = A[i];
            if (str['D']||str['DL'].length) {
            } else if ((G == undefined)||(str['G']==G)) {
                createStroke(
                         {"X":(str["p"][0].X+str["p"][1].X)/2.0,"Y":(str["p"][0].Y+str["p"][1].Y)/2}
                        ,{"X":(str["p"][0].X+str["p"][1].X)/2.0,"Y":(str["p"][0].Y+str["p"][1].Y)/2}
                );
            };
        };
    };

    var dpc,l;
    var ocolor = chalkColor;
    chalkColor = 'erase';
    start({"X":0,"Y":0});

    _clear(LDATA);
    _clear(SDATA);

    stop({"X":null});
    chalkColor = ocolor;
};

function undo() {
    function _undo(A) {
        var undoneSomething = false;
        var lastG;
        var i,str,sk;

        var minx=1e10,maxx=-1e10,miny=1e10,maxy=-1e10;

        if (A.length>0) {
            i = A.length-1;
            while((i>=0)&&(A[i]["D"]==2)) i--;
            if (i>=0) {
                lastG = A[i]["G"];
                debug("Undoing stroke G "+lastG);
                for(i=0;i<A.length;i++) {
                    if (A[i]["G"] == lastG) {
                        undoneSomething = true;
                        str = A[i];
                        str['D'] = 2;

                        minx = Math.min(str['p'][0].X,minx);
                        minx = Math.min(str['p'][1].X,minx);

                        maxx = Math.max(str['p'][0].X,maxx);
                        maxx = Math.max(str['p'][1].X,maxx);

                        miny = Math.min(str['p'][0].Y,miny);
                        miny = Math.min(str['p'][1].Y,miny);

                        maxy = Math.max(str['p'][0].Y,maxy);
                        maxy = Math.max(str['p'][1].Y,maxy);

                        if (A!=LDATA) {
                            str['v'] = LVER;
                            LDATA.push(str);
                        };
                        for(var j=0;j<str["DL"].length;j++) {
                            var key = str["DL"][j];
                            for(var k=0;k<A.length;k++) {
                                sk = A[k];
                                if ((sk["G"]+'|'+sk["I"])==key) {
                                    sk["D"] = 0;
                                    if (A!=LDATA) {
                                        sk["v"] = LVER;
                                        LDATA.push(sk);
                                    };
                                };
                            };
                        };
                    };
                };

                if ((lastG<0)&&(TEXTING)&&(TEXTPOS!=null)) {
                    TEXTPOS.X = minx;
                    TEXTPOS.Y-= (Math.floor((TEXTPOS.Y-maxy)/(chalkWidth*3*2)))*(chalkWidth*3*2);
                };
            };
        };
        return undoneSomething;
    };

    if (_undo(LDATA)) {
        var i = LDATA.length-1;
        while(i>=0) {
            if (LDATA[i]["D"]==2)
                LDATA.splice(i,1);
            i--;
        };
        redraw();
    } else if (_undo(SDATA)) {
        redraw();
    };
};


function zoomin() {
    _zoom(1.2,{"X":WW/2,"Y":WH/2});
    redraw();
};

function zoomout() {
    _zoom(1/1.2,{"X":WW/2,"Y":WH/2});
    redraw();
};


function setZoom(zoom) {
    VP[2] = zoom;
    if (Math.abs(VP[2]-1.0) < 1e-8) {
        VP[2] = 1.0;
    };
    updatePenWidth();
};

function _zoom(s,lp) {
    var p0 = cmap(lp);
    setZoom(VP[2]*s);
    var p1 = cmap(lp);
    VP[0] += (p0.X-p1.X);
    VP[1] += (p0.Y-p1.Y);
};

function drawGrid() {
    if (!gridOn) {
        return;
    };
    var x = VP[0]-(VP[0]%GS)-GS;
    var y = VP[1]-(VP[1]%GS)-GS;
    //h
    while (y<WH/VP[2]+VP[1]) {
        str = {
             "p"  : [{"X" : 0       + VP[0] , "Y" : y}
                    ,{"X" : WW/VP[2]+ VP[0] , "Y" : y}]
            ,"s"  : [1,(y!=0)?'#CCC':'#333']
            ,"D"  : 0
            ,"DL" : []
        };
        drawStroke(str);
        y += GS;
    };
    //w
    while (x<(WW/VP[2]+VP[0])) {
        str = {
             "p"  : [{"X": x ,"Y" : 0        +VP[1]}
                    ,{"X": x ,"Y" : WH/VP[2] +VP[1]}]
            ,"s"  : [1,(x!=0)?'#CCC':'#333']
            ,"D"  : 0
            ,"DL" : []
        };
        drawStroke(str);
        x += GS;
    };

};

function redraw() {
    BOARD.height = BOARD.height;
    drawGrid();
    var l = SDATA.length;
    for(var i=0;i<l;i++) {
        drawStroke(SDATA[i]);
    };
    l = LDATA.length;
    for(var i=0;i<l;i++) {
        drawStroke(LDATA[i]);
    };
    needRedraw = false;

    if ((TEXTING)&&(TEXTPOS!=null)) {
        var tp = cunmap(TEXTPOS);
        var w = chalkWidth*2*VP[2];
        drawStroke({
                 "p"  : [cmap({"X":tp.X,"Y":tp.Y})
                        ,cmap({"X":tp.X+w,"Y":tp.Y})]
                ,"s"  : [chalkWidth,'red']
                ,"D"  : 0
                ,"DL" : []
        });
    };
    debug('redraw');
};

function start(e) {
    cp = {"X":e.X,"Y":e.Y};
    if ((TEXTING)&&(!isMoving)&&(!isZooming)) {
        TEXTPOS = cmap(cp);
        TEXTPAR = cmap(cp);
        redraw();
    } else {
        isDrawing = true;
        G = rand5();
        LP = cp
        LLN = 0;
        LTS = Date.now();
    };
};

function shiftVP(dx,dy) {
    VP[0]+= dx;
    VP[1]+= dy;
    redraw();
};

function move(cp) {
    //cp = {"X":e.X,"Y":e.Y}
    if (isDrawing === true) {
        if (isMoving) {
            shiftVP((LP.X-cp.X)/VP[2], (LP.Y-cp.Y)/VP[2]);
        };

        if (isZooming & (cp.D!=undefined)) {
            _zoom((S0*cp.D)/(D0*VP[2]),cp);
        };

        if ((!isMoving)&&(!isZooming)) {
            createStroke(cmap(LP), cmap(cp));

            if (chalkColor=='erase') {
                redraw();
            } else {
                LLN+= Math.sqrt(dst2(LP,cp));
                LNN+= 1;
            };
        };
    };
    LP = cp;
};

function stop(e) {
    if (isDrawing === true) {
        if ((e.X != null)&&(!isMoving)&&(!isZooming)) {
            cp = {"X":e.X,"Y":e.Y};
            createStroke(cmap(LP), cmap(cp));
            if (AUTOSYNC) {
                ping();
            };
        } else {
            cp = {"X":0,"Y":0};
        };
        LP = cp;
        isDrawing = false;
        G = rand5();
        if ((chalkColor=='erase')||(needRedraw))
            redraw();
        LTE = Date.now();
        debug("stop: "+(LTE-LTS)+'|'+LLN+'|'+LNN);
        LNN = 0;
    };
};

function erasing(p,str) {
    if (str["D"]||(str["DL"].length)) {
        return false;
    };
    var dst = dst2seg(p
                      ,str['p'][0]
                      ,str['p'][1]
                     );
    return (dst<((chalkWidth+str["s"][0])/2.0));
};

function createCharacter(char,pos) {
    function _plotChar(char,bx,by) {
        var A = ALPHABET[char].A;
        var a,b,p = null;
        var cscale = (chalkWidth/10);
        for(var i=0;i<A.length;i++) {
            a = p;
            b = A[i];
            if ((p==null)&&(A[i]!=null)&&((i==A.length-1)||((i<A.length-1)&&(A[i+1]==null))))
                a = b;

            if ((a!=null)&&(b!=null)) {
                createStroke({"X":round(a[0]*cscale+bx) , "Y":round(a[1]*cscale+by)}
                            ,{"X":round(b[0]*cscale+bx) , "Y":round(b[1]*cscale+by)});
            };
            p = A[i];
        };
        return ALPHABET[char].dx*cscale;
    };

    if (char==" ") {
        pos.X += chalkWidth*3;
    } else if (char=="Enter") {
        pos.X = TEXTPAR.X;
        pos.Y += chalkWidth*3*2;
    } else if (char in ALPHABET) {
        G = -rand5();
        w = _plotChar(char,pos.X,pos.Y);
        pos.X += w + chalkWidth;
    } else {
        pos.X += chalkWidth*3;
    };
    redraw();
}

function createStroke(p0,p1) {
    stroke = {
         "p"  : [p0,p1]
        ,"s"  : [chalkWidth,chalkColor]
        ,"G"  : G
        ,"I"  : rand5()
        ,"D"  : 0
        ,"v"  : LVER
        ,"DL" : []
    };
    if (chalkColor!='erase') { // drawing stroke
        drawStroke(stroke);
        LDATA.push(stroke);
    } else { // erasing stroke
        var L = LDATA.length;
        for (var i=0;i<L;i++) {
            var str = LDATA[i];
            if (erasing(p0,str)||erasing(p1,str)) {
                stroke["DL"].push(str["G"]+"|"+str["I"]);
                str["D"] = 1;
            };
        };
        L = SDATA.length;
        for (var i=0;i<L;i++) {
            var str = SDATA[i];
            if (erasing(p0,str)||erasing(p1,str)) {
                stroke["DL"].push(str["G"]+"|"+str["I"]);
                str["D"] = 1;
                str['v'] = LVER;
                LDATA.push(str);
            };
        };
        if (stroke["DL"].length>0) {
            LDATA.push(stroke);
        };
    };
};

function drawStroke(str,noZoom) { // draw stroke on the canvas
    if (str["D"]||(str["DL"].length)) {
        // erasure stroke
        // or erased thing
    } else {
        CTX.beginPath();
        if (noZoom===undefined) {
            CTX.lineWidth   = str['s'][0]*VP[2];
        } else {
            CTX.lineWidth   = str['s'][0];
        };
        CTX.strokeStyle = str['s'][1];
        CTX.lineCap = "round";

        // get canvas coordinates from global coordinates
        p0 = cunmap(str['p'][0]);
        p1 = cunmap(str['p'][1]);

        CTX.moveTo(p0.X,p0.Y);
        CTX.lineTo(p1.X,p1.Y);
        CTX.stroke();
        CTX.closePath();
    };
};




