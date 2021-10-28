/*
Creates a regular polygon.

sides       -- number of sides
apothem     -- length of the apothem
optics      -- the {transmit, reflect, absorb} dict
rotation    -- angle (rad) to rotate polygon by
n           -- index of refraction, 1.5 for lenses
*/
function createPolyCollection(sides, apothem, optics, rotation=0, n='1') {
    suspendValidity = true;
    const [cid, div] = makeNewCollection(0);
    dataUI[cid]['n'].latex(n);

    // Create collection vars
    addNewVariable(div, cid, {name: "A", val: `${apothem}`});
    addNewVariable(div, cid, {name: "R", val: `${rotation}`});

    const bound = `\\arctan (A\\tan (\\frac{\\pi}{${sides}}))`;
    for (let i = 0; i < sides; i++) {
        const id = addCurveToCollection(div, cid);
        const rot = (i==0) ? '' : ` + \\frac{${Math.round(2*i)}\\pi}{${sides}}`;
        dataUI[cid]['curves'][id]['eq'][0].latex(`A\\cos (R${rot}) - \\sin (R${rot})\\tan(t)`);
        dataUI[cid]['curves'][id]['eq'][1].latex(`A\\sin (R${rot}) + \\cos (R${rot})\\tan(t)`);
        dataUI[cid]['curves'][id]['bounds'].map((f, i) => f.latex(`${(i==0) ? `-` : ''}${bound}`));
        dataUI[cid]['curves'][id]['optics'] = optics;
        dataUI[cid]['curves'][id]['valid'] = true;
    }
    suspendValidity = false;
    updateCollection(dataUI[cid], cid);
}

/*
Creates a collection with two identical conic sides
and two connecting flat sides, a standard lens/mirror

eccentricity-- determines the shape of the conic, >= 0
e = 0       -- circle
0 < e < 1   -- ellipse
e = 1       -- parabola
e > 1       -- hyperbola

directrix   -- the size of the mirror
thickness   -- half the minor thickness
type        -- "biconvex", "biconcave", or "mixed"
optics      -- the {transmit, reflect, absorb} dictionary
bound       -- -bound <= t <= bound, 0 < bound <= pi/2 are valid, give as string
rot         -- angle (rad) of normal vector at the vertex pointing away from center
n           -- index of refraction, 1.5 for lenses
*/
function createConicCollection(eccentricity, directrix, thickness, type, optics, bound='\\frac{\\pi}{2}', rotation=0, n='1') {
    suspendValidity = true;
    const [cid, div] = makeNewCollection(0);
    dataUI[cid]['n'].latex(n);

    // Create collection vars
    addNewVariable(div, cid, {name: "E", val: `${eccentricity}`});
    addNewVariable(div, cid, {name: "D", val: `${directrix}`});
    addNewVariable(div, cid, {name: "R", val: `${rotation}`});
    addNewVariable(div, cid, {name: "B", val: `${bound}`});
    addNewVariable(div, cid, {name: "T", val: `${thickness}`});

    let eq, vf_dist, bf_dist;
    if (eccentricity != 0) {
        eq = [
            'ED\\frac{\\cos (R)\\cos (t)-\\sin (R)\\sin (t)}{1+E\\cos (t)}',
            'ED\\frac{\\sin (R)\\cos (t)+\\cos (R)\\sin (t)}{1+E\\cos (t)}'
        ];
        // distance from vertex to focus
        vf_dist = `\\frac{ED}{1+E}`;
        // dist from endpoint to focus
        bf_dist = [
            `\\frac{ED\\cos (B)}{1+E\\cos (B)}`,
            `\\frac{ED\\sin (B)}{1+E\\cos (B)}`
        ];
    } else {
        eq = [
            'D(\\cos (R)\\cos (t)-\\sin (R)\\sin (t))',
            'D(\\sin (R)\\cos (t)+\\cos (R)\\sin (t))'
        ];
        // distance from vertex to focus
        vf_dist = `D`;
        // dist from endpoint to focus
        bf_dist = [
            `D\\cos (B)`,
            `D\\sin (B)`
        ];
    }
    // Useful things
    const rot = [
        '\\cos (R)',
        '\\sin (R)'
    ];
    
    // make conic sides
    const id1 = addCurveToCollection(div, cid);
    dataUI[cid]['curves'][id1]['eq'].map((f, i) => f.latex(eq[i]));
    const id2 = addCurveToCollection(div, cid);
    dataUI[cid]['curves'][id2]['eq'].map((f, i) => f.latex(`${type=="mixed" ? "" : "-"}${eq[i]}`));

    // make flat sides
    const id3 = addCurveToCollection(div, cid);
    dataUI[cid]['curves'][id3]['eq'].map((f, i) => f.latex(`${rot[i]}t`));
    const id4 = addCurveToCollection(div, cid);
    dataUI[cid]['curves'][id4]['eq'].map((f, i) => f.latex(`${rot[i]}t`));

    // Positioning, Bounds & stuff
    if (type == "biconvex") {
        dataUI[cid]['curves'][id1]['pos'].map((f, i) => f.latex(`(T - ${bf_dist[0]})${rot[i]}`));
        dataUI[cid]['curves'][id2]['pos'].map((f, i) => f.latex(`-(T - ${bf_dist[0]})${rot[i]}`));
        dataUI[cid]['curves'][id3]['bounds'].map((f, i) => f.latex(`${(i==0) ? '-' : ''}T`));
        dataUI[cid]['curves'][id4]['bounds'].map((f, i) => f.latex(`${(i==0) ? '-' : ''}T`));
    } else if (type == "biconcave") {
        dataUI[cid]['curves'][id1]['pos'].map((f, i) => f.latex(`-(T + ${vf_dist})${rot[i]}`));
        dataUI[cid]['curves'][id2]['pos'].map((f, i) => f.latex(`(T + ${vf_dist})${rot[i]}`));
        dataUI[cid]['curves'][id3]['bounds'].map((f, i) => f.latex(`${(i==0) ? '-' : ''}(T + ${vf_dist} - ${bf_dist[0]})`));
        dataUI[cid]['curves'][id4]['bounds'].map((f, i) => f.latex(`${(i==0) ? '-' : ''}(T + ${vf_dist} - ${bf_dist[0]})`));
    } else {
        dataUI[cid]['curves'][id1]['pos'].map((f, i) => f.latex(`(T - ${bf_dist[0]})${rot[i]}`));
        dataUI[cid]['curves'][id2]['pos'].map((f, i) => f.latex(`-(T + ${vf_dist})${rot[i]}`));
        dataUI[cid]['curves'][id3]['bounds'].map((f, i) => f.latex((i==0) ? `-(T + ${vf_dist} - ${bf_dist[0]})` : 'T'));
        dataUI[cid]['curves'][id4]['bounds'].map((f, i) => f.latex((i==0) ? `-(T + ${vf_dist} - ${bf_dist[0]})` : 'T'));
    }
    
    dataUI[cid]['curves'][id1]['bounds'].map((f, i) => f.latex(`${(i==0) ? `-` : ''}B`));
    dataUI[cid]['curves'][id2]['bounds'].map((f, i) => f.latex(`${(i==0) ? `-` : ''}B`));
    dataUI[cid]['curves'][id3]['pos'].map((f, i) => f.latex(`${(i==0) ? '-' : ''}${bf_dist[1]}${rot[sgn3(i)]}`));
    dataUI[cid]['curves'][id4]['pos'].map((f, i) => f.latex(`${(i==0) ? '' : '-'}${bf_dist[1]}${rot[sgn3(i)]}`));

    // Optics & Validity
    for (const id of [id1, id2, id3, id4]) {
        dataUI[cid]['curves'][id]['optics'] = optics;
        dataUI[cid]['curves'][id]['valid'] = true;
    }
    suspendValidity = false;    
    updateCollection(dataUI[cid], cid);
}