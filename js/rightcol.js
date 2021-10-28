/*
Name: David Chang, Edmond Niu, Alex Postovskiy, Andrew Somers
Course: CSE
Assignment: CSE Capstone Project
Purpose: Creates collapsibles in right col div
*/

//jQuery for reading collapsibles 
$(document).ready(function(){
  $('.collapsible').collapsible();
});


$(document).ready(function(){
  $('.tooltipped').tooltip();
});

// Lens collapsible buttons
const bcx = document.getElementById("biconvex");
const bcv = document.getElementById("biconcave");
const cc = document.getElementById("cc");

bcx.addEventListener("click", function() {
  createConicCollection(0, 50, 0.03, "biconvex", {transmit: 1, reflect: 0, absorb: 0}, `0.05`, 0, `1.5`);
})
bcv.addEventListener("click", function(){
  createConicCollection(0, 50, 0.06, "biconcave", {transmit: 1, reflect: 0, absorb: 0}, `0.05`, 0, `1.5`);
})
cc.addEventListener("click", function(){
  createConicCollection(0, 20, 0.03, "mixed", {transmit: 1, reflect: 0, absorb: 0}, `0.15`, 0, `1.5`);
})

// mirror collapsible buttons
const para = document.getElementById("parabolic");
const circ = document.getElementById("circular");
const square = document.getElementById("square");

para.addEventListener("click", function(){
  createConicCollection(1, 20, 0, "mixed", {transmit: 0, reflect: 1, absorb: 0}, `0.15`, 0, `1`);
})
circ.addEventListener("click", function(){
  createConicCollection(0, 20, 0, "mixed", {transmit: 0, reflect: 1, absorb: 0}, `0.15`, 0, `1`);
})
square.addEventListener("click", function(){
  createPolyCollection(4, 2, {transmit: 0, reflect: 1, absorb: 0}, 0, `1`);
}) 
 


// Polygonal Collections
// Create MQ fields
const polys = "rightPoly";
dataUI[polys] = {optics: {transmit: 0, reflect: 1, absorb: 0}};
createMQField(polys, 'sides', {}, document.getElementById('Sides'));
createMQField(polys, 'apothem', {}, document.getElementById('Apothem'));
createMQField(polys, 'rotation', {text: '0'}, document.getElementById('rotation'));
createMQField(polys, 'n', {text: '1'}, document.getElementById('pn'));

// Add appropriate functionality to T/A/R buttons
const polyT = document.getElementById("poly-transmit");
const polyR = document.getElementById("poly-reflect");
const polyA = document.getElementById("poly-absorb");

polyT.addEventListener("click", function() { 
  dataUI[polys].optics = {transmit: 1, reflect: 0, absorb: 0}; 
  polyT.classList.remove("grey");
  polyT.classList.add("blue-grey");
  polyR.classList.remove("blue-grey");
  polyR.classList.add("grey");
  polyA.classList.remove("blue-grey");
  polyA.classList.add("grey");
});

polyR.addEventListener("click", function() { 
  dataUI[polys].optics = {transmit: 0, reflect: 1, absorb: 0}; 
  polyR.classList.remove("grey");
  polyR.classList.add("blue-grey");
  polyT.classList.remove("blue-grey");
  polyT.classList.add("grey");
  polyA.classList.remove("blue-grey");
  polyA.classList.add("grey");
});

polyA.addEventListener("click", function() { 
  dataUI[polys].optics = {transmit: 0, reflect: 0, absorb: 1}; 
  polyA.classList.remove("grey");
  polyA.classList.add("blue-grey");
  polyR.classList.remove("blue-grey");
  polyR.classList.add("grey");
  polyT.classList.remove("blue-grey");
  polyT.classList.add("grey");
});

// Generate button function
function polyGenerator() {
  const sides = latexToNum(dataUI[polys].sides.latex());
  const apothem = latexToNum(dataUI[polys].apothem.latex());
  const rotation = latexToNum(dataUI[polys].rotation.latex());
  const n = dataUI[polys].n.latex();
  const optics = dataUI[polys].optics;

  createPolyCollection(sides, apothem, optics, rotation, n);
}

// Conic Collections
// Create MQ fields
const conics = "rightConic";
dataUI[conics] = {optics: {transmit: 0, reflect: 1, absorb: 0}, type: "biconcave"};
createMQField(conics, 'e', {}, document.getElementById("eccentricity"));
createMQField(conics, 'directrix', {}, document.getElementById("directrix"));
createMQField(conics, 'thickness', {}, document.getElementById("thick"));
createMQField(conics, 'bound', {text: '\\frac{\\pi}{2}'}, document.getElementById("bound"))
createMQField(conics, 'rotation', {text: '0'}, document.getElementById("crotation"));
createMQField(conics, 'n', {text: '1'}, document.getElementById("cn"));

// Add appropriate functionality to T/A/R buttons
const conicT = document.getElementById("conic-transmit");
const conicR = document.getElementById("conic-reflect");
const conicA = document.getElementById("conic-absorb");

conicT.addEventListener("click", function() { 
  dataUI[conics].optics = {transmit: 1, reflect: 0, absorb: 0}; 
  conicT.classList.remove("grey");
  conicT.classList.add("blue-grey");
  conicR.classList.remove("blue-grey");
  conicR.classList.add("grey");
  conicA.classList.remove("blue-grey");
  conicA.classList.add("grey");
});

conicR.addEventListener("click", function() { 
  dataUI[conics].optics = {transmit: 0, reflect: 1, absorb: 0}; 
  conicR.classList.remove("grey");
  conicR.classList.add("blue-grey");
  conicT.classList.remove("blue-grey");
  conicT.classList.add("grey");
  conicA.classList.remove("blue-grey");
  conicA.classList.add("grey");
});

conicA.addEventListener("click", function() { 
  dataUI[conics].optics = {transmit: 0, reflect: 0, absorb: 1}; 
  conicA.classList.remove("grey");
  conicA.classList.add("blue-grey");
  conicR.classList.remove("blue-grey");
  conicR.classList.add("grey");
  conicT.classList.remove("blue-grey");
  conicT.classList.add("grey");
});

// Add appropriate functionality to BCX/BCV/C-C buttons
// Add appropriate functionality to T/A/R buttons
const conicBX = document.getElementById("conic-biconvex");
const conicBV = document.getElementById("conic-biconcave");
const conicCC = document.getElementById("conic-convex-concave");

conicBX.addEventListener("click", function() { 
  dataUI[conics].type = "biconvex";
  conicBX.classList.remove("grey");
  conicBX.classList.add("blue-grey");
  conicBV.classList.remove("blue-grey");
  conicB.classList.add("grey");
  conicCC.classList.remove("blue-grey");
  conicCC.classList.add("grey");
});

conicBV.addEventListener("click", function() { 
  dataUI[conics].type = "biconcave";
  conicBV.classList.remove("grey");
  conicBV.classList.add("blue-grey");
  conicBX.classList.remove("blue-grey");
  conicBX.classList.add("grey");
  conicCC.classList.remove("blue-grey");
  conicCC.classList.add("grey");
});

conicCC.addEventListener("click", function() { 
  dataUI[conics].type = "mixed";
  conicCC.classList.remove("grey");
  conicCC.classList.add("blue-grey");
  conicBV.classList.remove("blue-grey");
  conicBV.classList.add("grey");
  conicBX.classList.remove("blue-grey");
  conicBX.classList.add("grey");
});

// Generator button function
function conicGenerator() {
  const e = latexToNum(dataUI[conics].e.latex());
  const directrix = latexToNum(dataUI[conics].directrix.latex());
  const thickness = latexToNum(dataUI[conics].thickness.latex());
  const rotation = latexToNum(dataUI[conics].rotation.latex());
  const bound = dataUI[conics].bound.latex();
  const n = dataUI[conics].n.latex();
  const optics = dataUI[conics].optics;
  const type = dataUI[conics].type;

  createConicCollection(e, directrix, thickness, type, optics, bound, rotation, n);
}

var elem = document.querySelector('.collapsible.expandable');
var instance = M.Collapsible.init(elem, {
  accordion: false
});
            



