/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: This file creates, validates (evaluateX), and displays the ui elements (mainly quill fields) 
*/

/*
dataUI
keys: object IDs and ray IDs
(collections) vals: {
    pos: [x position field, y position field],
    n: n field,
    curves: {curve id: {
        valid: BOOL -- this isn't an MQ field,
        optics: {transmit: 0, reflect: 1, absorb: 0},
        parameter: parameter field,
        eq: [x eq field, y eq field],
        pos: [x pos field, y pos field],
        bounds: [x bounds field, y bounds field]
    }}
    vars: {
        var div id: 
    }
}
(rays) vals: {
    pos: [x position field, y position field],
    directionType: (one of 'transmit', 'rad', 'deg'),
    direction: (either [x field, y field] or angle field depending on directionType), 
}
*/
var dataUI = {};
var index = 0;
var varindex = 0;
var colIndex = 0;
var MQ = MathQuill.getInterface(2);
var suspendValidity = false;

function checkCollectionValidity(cid) {
    if (suspendValidity) {
        return;
    }

    // Check 1: positions are numbers/math
    var check1 = function () {
        var positionx = dataUI[cid]['pos'][0].latex();
        var positiony = dataUI[cid]['pos'][1].latex();
        return (checkFieldValidity(cid, positionx, true) && checkFieldValidity(cid, positiony, true));
    }

    // Check 2: index of refraction is number >= 1
    var check2= function () {
        var n = dataUI[cid]['n'].latex();
        n = n.replaceAll('\\pi', 'pi');
        try {
            var fn = evaluatex(n, constants = {pi: Math.PI, e: Math.E}, options = {latex: true});
            result = fn();
            if (result >= 1) {
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }

    // Check 3: all curves are valid
    var check3 = function () {
        for (const curve in dataUI[cid]['curves']) {
            if(!dataUI[cid]['curves'][curve]['valid']) {
                return false;
            }
        }
        return true;
    }

    var overallCheck = check1() && check2() && check3();
    if (overallCheck) {
        updateCollection(dataUI[cid], cid);
    }
    console.log('overall', overallCheck)
    return overallCheck;
}

function checkValidity(cid, id) {
    if (suspendValidity) {
        return;
    }

    // Check 1: x and y make sense mathematically
    var check1 = function () {
        var latex1 = dataUI[cid]['curves'][id]['eq'][0].latex();
        var latex2 = dataUI[cid]['curves'][id]['eq'][1].latex();

        //const fn = evaluatex(latex, {latex: true});
        try {
            var fn = evaluatex(latex1, {latex: true});
            var fn = evaluatex(latex2, {latex: true});
            return true;
        }
        catch {
            return false;
        }
    };

    // Check 2: parameter is a letter
    var check2 = function () {
        var parameter = dataUI[cid]['curves'][id]['parameter'].latex();
        return (/[a-zA-Z]/).test(parameter);
    };

    // Check 3: no undefined variables in x and y
    var check3 = function () {
        var latex1 = dataUI[cid]['curves'][id]['eq'][0].latex();
        var latex2 = dataUI[cid]['curves'][id]['eq'][1].latex();
        var parameter = dataUI[cid]['curves'][id]['parameter'].latex();
        var good = ['frac', 'left', 'right', 'sqrt', 'sum', 'pi', 'sin', 'cos', 'tan', 'csc', 'cot', 'cos', 'log', 'ln', 'arc', 'e'];
        var letters = [];
        var variables = [];

        if (checkVarValidity(cid)) {
            for (const id in dataUI[cid]['vars']) {
                variables.push(dataUI[cid]['vars'][id]['name'].latex());
            }
        }
        for (const e of good) {
            latex1 = latex1.replaceAll(e, '');
            latex2 = latex2.replaceAll(e, '');
        }
        for(x = 0, length = latex1.length; x < length; x++) {
            var l = latex1.charAt(x);
            if ((/[a-zA-Z]/).test(l)) {
                letters.push(l);
            }
        }
        for(x = 0, length = latex2.length; x < length; x++) {
            var l = latex2.charAt(x);
            if ((/[a-zA-Z]/).test(l)) {
                letters.push(l);
            }
        }
        for (const e of letters) {
            if (e != parameter && variables.indexOf(e) == -1) {
                return false;
            }
        }
        return true;
    };

    // Check 4: bounds and positions are numbers/math
    var check4 = function () {
        var lowerBound = dataUI[cid]['curves'][id]['bounds'][0].latex();
        var upperBound = dataUI[cid]['curves'][id]['bounds'][1].latex();
        var positionx = dataUI[cid]['curves'][id]['pos'][0].latex();
        var positiony = dataUI[cid]['curves'][id]['pos'][1].latex();
        return (checkFieldValidity(cid, lowerBound, true) && checkFieldValidity(cid, upperBound, true) 
                && checkFieldValidity(cid, positionx, true) && checkFieldValidity(cid, positiony, true));
    };

    // Update results in dataUI
    dataUI[cid]['curves'][id]['valid'] = check1() && check2() && check3() && check4();
}

function checkRayValidity(rid) {
    if (suspendValidity) {
        return;
    }

    // Check ray starting position
    var check1 = function() {
        var rayposx = dataUI[rid]['pos'][0].latex();
        var rayposy = dataUI[rid]['pos'][1].latex();
        return (checkFieldValidity(rid, rayposx, false) && checkFieldValidity(rid, rayposy, false));
    }
    // Check ray direction
    var check2 = function() {
        if (dataUI[rid]['directionType'] == 'vector') {
            var raydirx = dataUI[rid]['direction'][0].latex();
            var raydiry = dataUI[rid]['direction'][1].latex();
            return (checkFieldValidity(rid, raydirx, false) && checkFieldValidity(rid, raydiry, false));
        }
        else if (dataUI[rid]['directionType'] == 'rad' || dataUI[rid]['directionType'] == 'deg') {
            var direction = dataUI[rid]['direction'].latex();
            return (checkFieldValidity(rid, direction, false));
        }
        return false;
    }

    if (check1() && check2()) {
        updateRays(dataUI[rid], rid);
    }
}

function checkVarValidity(cid) {
    if (suspendValidity) {
        return;
    }

    var check1 = function () {
        for (const id in dataUI[cid]['vars']) {
            var name = dataUI[cid]['vars'][id]['name'].latex();
            var value = dataUI[cid]['vars'][id]['val'].latex();
            if (!(/[a-zA-Z]/).test(name)) {
                return false;
            }
            if (!checkFieldValidity(cid, value, false) || !checkFieldValidity(cid, value, false)) {
                return false;
            }
        }
        return true;
    }
    return check1();
}

function checkFieldValidity(cid, value, includeVars) {
    if (suspendValidity) {
        return;
    }

    var variables = [];
    if (includeVars && checkVarValidity(cid)) {
        for (const id in dataUI[cid]['vars']) {
            variables.push(dataUI[cid]['vars'][id]['name'].latex());
        }
    }

    try {
        var fn = evaluatex(value, options = {latex: true});

        var good = ['frac', 'left', 'right', 'sqrt', 'sum', 'pi', 'sin', 'cos', 'tan', 'csc', 'cot', 'cos', 'log', 'ln', 'arc', 'e'];
        var letters = [];

        for (const e of good) {
            value = value.replaceAll(e, '');
        }
        for(x = 0, length = value.length; x < length; x++) {
            var l = value.charAt(x);
            if ((/[a-zA-Z]/).test(l)) {
                letters.push(l);
            }
        }
        if (includeVars) {
            for (const e of letters) {
                if (variables.indexOf(e) == -1) {
                    return false;
                }
            }
        }
        else if (letters.length > 0) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
 
/*
Creates a Quill field.
cid         -- parent collection
key         -- key of dataUI within collection/curve
dict: {
    id          -- optional, parent curve
    rid         -- optional, parent id
    index       -- optional, 0/1 for xy elements
    text        -- default text (in latex), optional
}, optional
attributes: {} for the span, optional
classList: [] for the span, optional
root: element to append to, optional
the span created w/ the field in it is returned
*/
function createMQField(cid, key, dict={}, root, attributes={}, classList=["maxwrap"]) {
    const config = {
        autoCommands: 'pi sqrt sum abs',
        autoOperatorNames: 'sin cos tan csc cot cos log ln arcsin arccos arctan arccsc arcsec arccot',
        spaceBehavesLikeTab: true,
        restrictMismatchedBrackets: true,
        supSubsRequireOperand: true,
        handlers: {
            edit: function () { // useful event handlers
                if (cid.slice(0,5) == 'right') {
                    return;
                }
                if (cid.slice(0, 3) == 'ray' && dataUI[cid]['created']) {
                    checkRayValidity(cid);
                } else if ("vid" in dict && dataUI[cid]['vars'][dict.vid]['created']) {
                    checkVarValidity(cid);
                    for (const c in dataUI[cid]['curves']) {
                        checkValidity(cid, c);
                    }
                    checkCollectionValidity(cid);
                } else if ("id" in dict && dataUI[cid]['curves'][dict.id]['created']) {
                    checkValidity(cid, dict.id);
                    checkCollectionValidity(cid);
                } else if (!("vid" in dict) && dataUI[cid]['created']) {
                    checkCollectionValidity(cid);
                }
            }
        }
    };

    // Make span
    const span = document.createElement("SPAN");
    // Create MQ field & add default text
    const field = MQ.MathField(span, config);
    if ("text" in dict) {
        field.latex(dict.text);
    }

    // Append field to appropriate location
    if ("id" in dict) {
        if ("index" in dict) {
            dataUI[cid]['curves'][dict.id][key][dict.index] = field;
        } else {
            dataUI[cid]['curves'][dict.id][key] = field;
        }
    } else if ("vid" in dict) {
        if ("index" in dict) {
            dataUI[cid]['vars'][dict.vid][key][dict.index] = field;
        } else {
            dataUI[cid]['vars'][dict.vid][key] = field;
        }
    } else {
        if ("index" in dict) {
            dataUI[cid][key][dict.index] = field;
        } else {
            dataUI[cid][key] = field;
        }
    }

    // HTML stuff
    for (const a in attributes) {
        span.setAttribute(a, attributes[a]);
    }
    for (const c of classList) {
        span.classList.add(c);
    }

    root.append(span);
    return span;
}

function makeNewCollection(curves=1) {
    // Create a new collection div with unique ID
    const cid = `collection${colIndex}`;
    dataUI[cid] = {curves: {}, vars: {}, pos: new Array(2)};

    let collectionul = document.getElementById("collapsibleul");
    let collectionli = createElement("li", collectionul, {id: cid}, []);
    let collectionHeaderdiv = createElement("div", collectionli, {}, ["grey", "darken-1", "darkgreyborder", "everythingzero"]);
    let collectionHeaderdivRow  = createElement("div", collectionHeaderdiv, {}, ["width100", "everythingzero", "row"]);
    let namefieldcol = createElement("div", collectionHeaderdivRow, {}, ["col", "s5", "margins10"]);
    let addButtoncol = createElement("div", collectionHeaderdivRow, {}, ["col", "s2", "everythingzero"]);
    let minButtoncol = createElement("div", collectionHeaderdivRow, {}, ["collapsible-header", "col", "s5", "everythingzero", "grey", "darken-1"]);
    let deleteButtoncol = createElement("div", collectionHeaderdivRow, {}, ["col", "s6", "everythingzero"]);
    let varcol = createElement("div", collectionHeaderdivRow, {}, ["col", "s6", "everythingzero"]);
    let collectionBodydiv = createElement("div", collectionli, {}, ["collapsible-body", "grey", "darkgreyborder", "everythingzero"]);
    let collectionBodydivRow  = createElement("div", collectionBodydiv, {}, ["width100", "everythingzero", "row"]);
    let positiondiv = createElement("div", collectionBodydivRow, {}, ["col", "s6"]);
    let indexdiv = createElement("div", collectionBodydivRow, {}, ["col", "s6"]);
    let curvecol = createElement("div", collectionBodydivRow, {}, ["col", "s12", "everythingzero"]);
    let curveul = createElement("ul", curvecol, {}, ["collapsible", "expandable", "darkgreyborder", "everythingzero"]);
    let varcol2 = createElement("div", collectionBodydivRow, {}, ["col", "s12", "everythingzero"]);
    let varul = createElement("ul", varcol2, {}, ["collapsible", "expandable", "darkgreyborder", "everythingzero"]);

    // Object name text
    createElement("P", namefieldcol, {innerText: "Collection: ", contentEditable: "true"}, ["namefield", "everythingzero"]);

    // Append '+' button under collection div
    let addButton = createElement("button", addButtoncol, {textContent: "+"}, ["addcurvebutton", "btn-small", "blue-grey", "waves-effect", "waves-purple", "width100"]);
    addButton.addEventListener("click", function() {
        addCurveToCollection(curveul, cid);
    });

    // Append 'Delete Object' button under collection  div
    let deleteButton = createElement("button", deleteButtoncol, {textContent: "Delete Collection"}, ["deletebutton", "btn-small", "blue-grey", "waves-effect", "waves-purple", "width100"]);
    deleteButton.addEventListener("click", function() {
        collectionli.remove();
        removeCollection(cid);
        delete dataUI[cid];
    });

    // Append 'Add new variable' button under collection  div
    let varButton = createElement("button", varcol, {textContent: "Add New Variable"}, ["addnewvarbutton", "btn-small", "blue-grey", "waves-effect", "waves-purple", "width100"]);
    varButton.addEventListener("click", function() {
        addNewVariable(varul, cid);
    });

    let minButton = createElement("button", minButtoncol, {innerHTML:  '<i class="material-icons">arrow_downward</i>'}, ["btn-small", "blue-grey", "waves-effect", "waves-purple", "width100", "center-align"]);

    // Create collection position field
    createElement("P", positiondiv, {innerText: "Position: "});
    createMQField(cid, 'pos', {index: 0, text: "0"}, positiondiv, {}, ["maxwrap"]);
    createMQField(cid, 'pos', {index: 1, text: "0"}, positiondiv, {}, ["maxwrap"]);

    // Create index of refraction 'n' field
    createElement("P", indexdiv, {innerText: "Index of Refraction: "});
    createMQField(cid, 'n', {text: "1"}, indexdiv, {}, ["maxwrap"]);

    // Append parametric equations
    for (let i = 0; i < curves; i++) {
        addCurveToCollection(curveul, cid);
    }

    dataUI[cid]['created'] = true;
    colIndex += 1;

    //jQuery for reading collapsibles 
     $(document).ready(function(){
        $('.collapsible').collapsible();
    });

    $(document).ready(function(){
        $('.tooltipped').tooltip();
      });

    var elem = document.querySelector('.collapsible.expandable');
    var instance = M.Collapsible.init(elem, {
        accordion: false
    });

    return [cid, curveul];
}

function addCurveToCollection(div, cid) {

    // Create overarching div container
    const id = `curve${index}`;
    //let container = createElement("div", div, {id: id, style: "border: thin solid #00FF00"});

    let curveli = createElement("li", div, {}, [])
    let curveHeader = createElement("div", curveli, {}, ["grey", "darken-1", "darkgreyborder", "everythingzero"])
    let curveHeaderRow = createElement("div", curveHeader, {}, ["width100", "everythingzero", "row", "valign-wrapper"])
    let curveBody = createElement("div", curveli, {}, ["collapsible-body", "grey", "darkgreyborder", "everythingzero"])
    let curveBodyRow = createElement("div", curveBody, {}, ["width100", "everythingzero", "row", "valign-wrapper"])
    let xycol = createElement("div",curveHeaderRow, {}, ["col", "s6", "everythingzero"])
    let paramcol = createElement("div", curveHeaderRow, {}, ["col", "s3", "everythingzero"])
    let xbuttoncol = createElement("div", curveHeaderRow, {}, ["col", "s2", "everythingzero"])
    let minButtoncol = createElement("div", curveHeaderRow, {}, ["collapsible-header", "col", "s1", "everythingzero", "grey", "darken-1"]);
    let poistioncol = createElement("div",curveBodyRow, {}, ["col", "s4", "everythingzero"])
    let boundscol = createElement("div",curveBodyRow, {}, ["col", "s3", "everythingzero"])
    let tarcol = createElement("div",curveBodyRow, {}, ["col", "s5", "right-align", "everythingzero"])

    // Add container to dataUI
    dataUI[cid]['curves'][id] = {pos: new Array(2), eq: new Array(2), bounds: new Array(2), 
                    valid: false, optics: {transmit: 0, reflect: 1, absorb: 0}};
    
    // Parametric equations
    createElement("P", xycol, {innerText: " x = "});
    createMQField(cid, 'eq', {id: id, index: 0}, xycol, {}, ["maxwrap"]);
    createElement("P", xycol, {innerText: " y = "});
    createMQField(cid, 'eq', {id: id, index: 1}, xycol, {}, ["maxwrap"]);
    
    // Make X button
    let xButton = createElement("button", xbuttoncol, {textContent: "x"}, [ "btn-small", "blue-grey", "waves-effect", "waves-purple"]);
    xButton.addEventListener("click", function() {
        delete dataUI[cid]['curves'][id];
        checkCollectionValidity(cid);
        curveli.remove();
    });

    let minButton = createElement("button", minButtoncol, {innerHTML:  '<i class="material-icons tiny everythingzero">arrow_downward</i>'}, ["everythingzero", "btn-small", "blue-grey", "waves-effect", "waves-purple", "width100", "center-align"]);

    // Create parameter field
    createElement("P", paramcol, {innerText: "Parameter: "});
    createMQField(cid, 'parameter', {id: id, text: "t"}, paramcol, {}, ["maxwrap"]);

    // Create position field
    createElement("P", poistioncol, {innerText: "Position: "});
    createMQField(cid, 'pos', {id: id, index: 0, text: "0"}, poistioncol, {}, ["maxwrap"]);
    createMQField(cid, 'pos', {id: id, index: 1, text: "0"}, poistioncol, {}, ["maxwrap"]);

    // Create bounds field
    createElement("P", boundscol, {innerText: "Bounds: "});
    createMQField(cid, 'bounds', {id: id, index: 0, text: "0"}, boundscol, {}, ["maxwrap"]);
    createMQField(cid, 'bounds', {id: id, index: 1, text: "1"}, boundscol, {}, ["maxwrap"]);


    // Create optical field
    let buttonT = createElement("button", tarcol, {innerText: "T"}, ["btn-small", "grey", "waves-effect", "waves-purple", "tooltipped"]);

    //have to do these here as doing in create Element doesn't work 
    buttonT.setAttribute("data-position",  "bottom")
    buttonT.setAttribute("data-tooltip", "Transmit")

    buttonT.addEventListener("click", function() {
        dataUI[cid]['curves'][id]['optics'] = {transmit: 1, reflect: 0, absorb: 0};
        checkCollectionValidity(cid);
        buttonT.classList.remove("grey")
        buttonT.classList.add("blue-grey")
        buttonR.classList.remove("blue-grey")
        buttonR.classList.add("grey")
        buttonA.classList.remove("blue-grey")
        buttonA.classList.add("grey")

    });
    let buttonR = createElement("button", tarcol, {innerText: "R"}, ["btn-small", "blue-grey", "waves-effect", "waves-purple", "tooltipped"]);

    //have to do these here as doing in create Element doesn't work 
    buttonR.setAttribute("data-position",  "bottom")
    buttonR.setAttribute("data-tooltip", "Reflect")
    
    buttonR.addEventListener("click", function() {
        dataUI[cid]['curves'][id]['optics'] = {transmit: 0, reflect: 1, absorb: 0};
        checkCollectionValidity(cid);
        buttonR.classList.remove("grey")
        buttonR.classList.add("blue-grey")
        buttonT.classList.remove("blue-grey")
        buttonT.classList.add("grey")
        buttonA.classList.remove("blue-grey")
        buttonA.classList.add("grey")
    });
    let buttonA = createElement("button", tarcol, {innerText: "A"}, ["btn-small", "grey", "waves-effect", "waves-purple", "tooltipped"]);

    //have to do these here as doing in create Element doesn't work 
    buttonA.setAttribute("data-position",  "bottom")
    buttonA.setAttribute("data-tooltip", "Absorb")
    
    buttonA.addEventListener("click", function() {
        dataUI[cid]['curves'][id]['optics'] = {transmit: 0, reflect: 0, absorb: 1};
        checkCollectionValidity(cid);
        buttonA.classList.remove("grey")
        buttonA.classList.add("blue-grey")
        buttonR.classList.remove("blue-grey")
        buttonR.classList.add("grey")
        buttonT.classList.remove("blue-grey")
        buttonT.classList.add("grey")
    });

    //jQuery for reading collapsibles 
    $(document).ready(function(){
        $('.collapsible').collapsible();
    });

    $(document).ready(function(){
        $('.tooltipped').tooltip();
      });

    var elem = document.querySelector('.collapsible.expandable');
    var instance = M.Collapsible.init(elem, {
        accordion: false
    });
            
    dataUI[cid]['curves'][id]['created'] = true;
    index++;

    return id;
}

/*
dict contains default {name: XXX, val: XXX}
do not send dict for no defaults
*/
function addNewVariable(div, cid, dict={}) {
    // Create overarching div container
    const vid = `var${varindex}`;
    let container = createElement("div", div, {id: vid}, ["grey", "darken-1", "darkgreyborder", "everythingzero"]);


    dataUI[cid]['vars'][vid] = {};

    // Parametric equations
    if ("name" in dict) {
        createElement("P", container, {innerText: "Variable Expression: "});
        createMQField(cid, 'name', {vid: vid, text: dict.name}, container);
        createElement("P", container, {innerText: " = "});
        createMQField(cid, 'val', {vid: vid, text: dict.val}, container);
    } else {
        createElement("P", container, {innerText: "Variable Expression: "});
        createMQField(cid, 'name', {vid: vid}, container);
        createElement("P", container, {innerText: " = "});
        createMQField(cid, 'val', {vid: vid}, container);
    }

    let deleteButton = createElement("button", container, {textContent: "Delete Var"}, ["deletebutton", "btn-small", "blue-grey", "waves-effect", "waves-purple", "width20", "right-align"]);
    deleteButton.addEventListener("click", function() {
        container.remove();
        delete dataUI[cid]['vars'][vid];
        checkCollectionValidity(cid);
    });

    dataUI[cid]['vars'][vid]['created'] = true;
    varindex++;
}

function makeNewRay() {
    // Create a new ray with unique ID
    const rid = `ray${index}`;
    let div = createElement("div", document.getElementById("leftdiv"), {id: rid}, ["width100", "darkgreyborder", "grey", "darken-1"]);
    let collectionul = document.getElementById("collapsibleul")
    let rayli = createElement("li", collectionul, {}, [])
    let rayHeaderdiv = createElement("div", rayli, {}, ["grey", "darken-1", "darkgreyborder", "everythingzero"])
    let rayHeaderdivRow  = createElement("div", rayHeaderdiv, {}, ["width100", "everythingzero", "row", "valign-wrapper"])
    let rayBodydiv = createElement("div", rayli, {}, ["collapsible-body", "grey", "darkgreyborder", "everythingzero"])
    let rayBodydivRow  = createElement("div", rayBodydiv, {}, ["width100", "everythingzero", "row" , "valign-wrapper"])
    let namecol = createElement("div", rayHeaderdivRow, {}, ["col","s4", "margin10"])
    let locationcol = createElement("div", rayHeaderdivRow, {}, ["col","s4", "everythingzero"])
    let deletecol = createElement("div", rayHeaderdivRow, {}, ["col","s4"])
    let minButtoncol = createElement("div", rayHeaderdivRow, {}, ["collapsible-header", "col", "s3", "everythingzero", "grey", "darken-1"]);
    let smalldivcol = createElement("div", rayBodydivRow, {}, ["col","s7", "everythingzero"])
    let vrdcol = createElement("div", rayBodydivRow, {}, ["col","s5", "everythingzero"])

    // Create New dataUI entry
    dataUI[rid] = {pos: new Array(2), directionType: 'vector'};

    // Object name text
    createElement("P", namecol, {innerText: "Ray: ", contentEditable: "true"}, ["namefield", "margins10"]);

    // Append 'Delete Object' button under collection  div
    let deleteButton = createElement("button", deletecol, {textContent: "Delete Ray"}, ["deletebutton", "btn", "blue-grey", "waves-effect", "waves-purple"]);
    deleteButton.addEventListener("click", function() {
        rayli.remove();
        removeRay(rid);
        delete dataUI[rid];
    });

    let minButton = createElement("button", minButtoncol, {innerHTML:  '<i class="material-icons">arrow_downward</i>'}, ["btn-small", "blue-grey", "waves-effect", "waves-purple", "width100", "center-align"]);

    // Make location fields
    createElement("P", locationcol, {innerText: "Location: ["}, ["everythingzero"]);
    createMQField(rid, 'pos', {index: 0, text: "0"}, locationcol);
    createMQField(rid, 'pos', {index: 1, text: "0"}, locationcol);
    createElement("P", locationcol, {innerText: "]"}, ["everythingzero"]);

    // Make direction selecting buttons
    dataUI[rid]['directionType'] = 'vector';
    let button1 = createElement("button", vrdcol, {innerText: "V"}, ["btn-small", "blue-grey", "waves-effect", "waves-purple", "tooltipped"]);
    button1.setAttribute("data-position",  "bottom")
    button1.setAttribute("data-tooltip", "Vector")
    button1.addEventListener("click", function() {
        dataUI[rid]['directionType'] = 'vector';
        smalldiv.remove();
        smalldiv = createElement("div", smalldivcol);
        delete dataUI[rid]['direction'];
        makeNewRayDirection(smalldiv, rid);
        button1.classList.remove("grey");
        button1.classList.add("blue-grey");
        button2.classList.remove("blue-grey");
        button2.classList.add("grey");
        button3.classList.remove("blue-grey");
        button3.classList.add("grey");
    });
    let button2 = createElement("button", vrdcol, {innerText: "R"}, ["btn-small", "grey", "waves-effect", "waves-purple", "tooltipped"]);
    button2.setAttribute("data-position",  "bottom");
    button2.setAttribute("data-tooltip", "Radians");
    button2.addEventListener("click", function() {
        dataUI[rid]['directionType'] = 'rad';
        smalldiv.remove();
        smalldiv = createElement("div", smalldivcol);
        delete dataUI[rid]['direction'];
        makeNewRayDirection(smalldiv, rid);
        button2.classList.remove("grey");
        button2.classList.add("blue-grey");
        button1.classList.remove("blue-grey");
        button1.classList.add("grey");
        button3.classList.remove("blue-grey");
        button3.classList.add("grey");
    });
    let button3 = createElement("button", vrdcol, {innerText: "D"}, ["btn-small", "grey", "waves-effect", "waves-purple", "tooltipped"]);
    button3.setAttribute("data-position",  "bottom");
    button3.setAttribute("data-tooltip", "Degrees");
    button3.addEventListener("click", function() {
        dataUI[rid]['directionType'] = 'deg';
        smalldiv.remove();
        smalldiv = createElement("div", smalldivcol);
        delete dataUI[rid]['direction'];
        makeNewRayDirection(smalldiv, rid);
        button3.classList.remove("grey");
        button3.classList.add("blue-grey");
        button1.classList.remove("blue-grey");
        button1.classList.add("grey");
        button2.classList.remove("blue-grey");
        button2.classList.add("grey");
    });
    var smalldiv = createElement("div", smalldivcol);
    makeNewRayDirection(smalldiv, rid);

    var elem = document.querySelector('.collapsible.expandable');
    var instance = M.Collapsible.init(elem, {
      accordion: false
    });
      
    dataUI[rid]['created'] = true;
    index++;
}

function makeNewRayDirection(smalldiv, rid) {
    if (dataUI[rid]['directionType'] == 'vector') 
    {
        dataUI[rid]['direction'] = new Array(2);
        createElement("P", smalldiv, {innerText: "Direction: ["});
        createMQField(rid, 'direction', {index: 0}, smalldiv);
        createMQField(rid, 'direction', {index: 1}, smalldiv);
        createElement("P", smalldiv, {innerText: "]"});
    }
    else if (dataUI[rid]['directionType'] == 'rad')
    {
        createElement("P", smalldiv, {innerText: "Direction: "});
        createMQField(rid, 'direction', {}, smalldiv);
        createElement("P", smalldiv, {innerText: " Radians"});
    } 
    else if (dataUI[rid]['directionType'] == 'deg')
    {
        createElement("P", smalldiv, {innerText: "Direction: "});
        createMQField(rid, 'direction', {}, smalldiv);
        createElement("P", smalldiv, {innerText: " Degrees"});
    }
}