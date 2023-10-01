/*
Things to do
 - fix normalization so the end creases will extend to border
 - fix normalization so vertically tall cps won't get clipped
 - fix so the a2 will click together if it's close enough, otherwise will separate. but b0 and a1 are correct
 - redesign cps (and canvas) to allow for non-square cps, better fit the construction

Start building main input ui
 - end goal of input: two lists of coordinates and theta
 - both numerical input and mouse input
 - integer grid lines with snapping

Instead of passing in so many parameters, clump a,b,av,bv,creases,extraV,startmv into a state dictionary?
then pack and unpack in every function

Start thinking about how to generalize for full dense bouncing solving
 - How will crease data be represented as?


=========
make a and be be lists of ordered pairs. x coord is position along the ridge. 
y coord is distance from ridge along axial. then use sin/cos to get coord
*/

function extend(state,buffer = 1){
    `
    Inputs a bunch of vertices and turns it into a normalized cp object
    `
    console.log("extend",state)

    av = state.av
    bv = state.bv
    const theta = state.theta
    creases = state.creases
    extraV = state.extraV
    const startmv = state.startmv

    newVertices = []
    newCreases = []
    //find the max and mins (bounding box)
    const minx = Math.min(av[0].x,bv[0].x) - buffer
    const maxx = Math.max(av[av.length-1].x,bv[bv.length-1].x) + buffer
    var miny = 0
    var maxy = 0
    const othermv = startmv=="M"?"V":"M"
    for(const vertex of av){
        maxy = Math.max(maxy,vertex.y)
    }
    for(const vertex of bv){
        miny = Math.min(miny,vertex.y)
    }
    maxy = Math.max(maxy,-1*miny) + buffer
    miny = -1*maxy
    // console.log("minx,maxx,miny,maxy",minx,maxx,miny,maxy)


    //horizontal lines at beginning and end of transition
    rightEnd = new Vertex(maxx,0)
    // newCreases.push(new Crease(leftEnd, av[0].y==0? av[0]:bv[0] ,startmv))
    newCreases.push(new Crease(rightEnd, av[av.length-1].y==0? av[av.length-1]:bv[bv.length-1], av.length%2==1?othermv:startmv))    
    newVertices.push(rightEnd)
    
    //extend pleat lines for each vertex of a and b
    var currentmv = startmv
    for(const vertex of av){
        currentmv = currentmv == 'M'?'V':'M'
        newVertex = new Vertex(vertex.x-(maxy-vertex.y)/Math.tan(theta),maxy)
        newCreases.push(new Crease(newVertex,vertex,currentmv))
        newVertices.push(newVertex)
    }
    currentmv = startmv
    for(const vertex of bv){
        currentmv = currentmv == 'M'?'V':'M'
        newVertex = new Vertex(vertex.x - (vertex.y-miny)/Math.tan(theta),miny)
        newCreases.push(new Crease(newVertex,vertex,currentmv))
        newVertices.push(newVertex)
    }
    //merge and cleanup
    allVertices = av.concat(newVertices).concat(bv).concat(extraV)

    allCreases = creases.concat(newCreases)
    for(const crease of allCreases){
        for(const vertex of crease.vertices){
            vertex.creases.push(crease)
        }
    }

    for(i=0;i<allVertices.length;i++){
        for(j=i+1;j<allVertices.length;j++){
            if (allVertices[i] === allVertices[j]){
                console.log('removed')
                allVertices.splice(j,1)
                break
            }
        }
    }

    cp = new CP(allVertices,allCreases)
    //normalize to the unit square, with the horizontal line centered along y=0.5
    //watch out for cases that are taller than they are wide (may need to change html dimensions)
    //minx goes to 0, maxx goes to 1
    
    var scale = 1/(maxx-minx)
    for(const vertex of cp.vertices){
        // console.log(vertex.x-minx,vertex)
        vertex.x = 0 + (vertex.x-minx)*scale
        // vertex.y += 0.5
        // vertex.y = vertex.y - (vertex.y-0.5)* scale
        vertex.y = (vertex.y*scale) + 0.5
    }
    return cp
}
function pythagorean(a,b){
    return (a**2 + b**2)**0.5
}

//=======================================
function start(a,b){
    `
    Main function to solve the transition.
    Inputs (fed in from html): a,b,theta,startmv
    output: cp file, display and/or download
    `
    console.log('=====STARTING=====')
    //setup
    paper.project.clear()
    var state = {
        theta:parseFloat(angle.value) * (2*Math.PI)/360,
        ainput:a,//JSON.parse(topInput.value).sort() ,
        binput:b,//JSON.parse(bottomInput.value).sort(),
        startmv:mvInput.value,
        mv:mvInput.value,
        othermv:mvInput.value =="M"?"V":"M",
        creases:[],
        extraV:[],
        av:[],
        bv:[],
    }
    state.a = structuredClone(state.ainput)
    state.b = structuredClone(state.binput)

    state.root = new Vertex(Math.min(state.a[0],state.b[0])-1,0)
    state.extraV.push(state.root)

    // const theta = parseFloat(angle.value) * (2*Math.PI)/360
    // const ainput = JSON.parse(topInput.value).sort() //SWAPPED
    // const binput = JSON.parse(bottomInput.value).sort()
    // var a = structuredClone(ainput)
    // var b = structuredClone(binput)
    // const startmv = mvInput.value
    // const othermv = mvInput.value == "M"?"V":"M"
    // var creases = [] //list of crease objects, except for the boundary ones
    // var extraV = []

    // var av = [] //list of vertex objects for a
    // var bv = [] //list of vertex objects for b
    
    state = step1(state)
    console.log("done", state)
    // console.log(av,bv)
    //step1
        //within step1, call step2
            //within step2, call step3. recursion 
    //finishes when all of a and b have been addressed, and transition is finished

    //by now, the data structure should be:
        // av and bv contain positions of all vertices
        // creases contains internal creases

    // av = [
    //     new Vertex(0,0),
    //     new Vertex(0.5,0.5),
    //     new Vertex(2,0)
    // ]
    // bv = [
    //     new Vertex(0,-1)
    // ]
    // creases = [
    //     new Crease(av[0],av[1],"M"),
    //     new Crease(av[1],av[2],"V"),
    //     new Crease(av[0],bv[0],"M"),
    //     new Crease(bv[0],av[2],"M"),
    //     new Crease(av[1],bv[0],"V")
    // ]

    cp = extend(state)
    displaycp = displayCp(cp,10,10,490,490)
    console.log('=====FINISHED=====')
}

function step1(state){
    `
    two creases approaching the ridge. 
    root is the previous vertex, if applicable
    `
    a = state.a
    b = state.b
    av = state.av
    bv = state.bv
    theta = state.theta
    creases = state.creases
    extraV = state.extraV
    mv = state.mv
    root = state.root
    othermv = state.othermv

    // othermv = mv=="M"?"V":"M"
    if(a.length == 0 | b.length ==0){console.log('DONE');return state} //base case
    if(eq(a[0],b[0])){
        console.log("step1 equal case")
        vertex = new Vertex(a[0],0)
        av.push(vertex)
        bv.push(vertex)
        a.splice(0,1)
        b.splice(0,1)
        creases.push(new Crease(vertex,root,mv))
        state.a = a
        state.b = b
        state.av = av
        state.bv = bv
        state.creases = creases
        state.mv = othermv
        state.root = vertex
        state.othermv = mv
        return step1(state)
        
    } else if (a[0]<b[0]){
        console.log("step1 a is closer")
        vertex = new Vertex(a[0],0)
        av.push(vertex)
        a.splice(0,1)
        creases.push(new Crease(vertex,root,mv))
        // step2(a,b,av,bv,theta,creases,extraV,vertex,othermv)
    } else if (a[0]>=b[0]){
        console.log("step1 b is closer")
        vertex = new Vertex(b[0],0)
        bv.push(vertex)
        b.splice(0,1)
        creases.push(new Crease(vertex,root,mv))
        // step2(a,b,av,bv,theta,creases,extraV,vertex,othermv)
    }
    state.a = a
    state.b = b
    state.av = av
    state.bv = bv
    state.creases = creases
    state.root = vertex
    state.mv = mv
    state.othermv = othermv
    return step2(state)
}

function step2(state){
    `
    passed in: after step 1 ridge has just hit one crease, now split and make two creases, one that hits a0 and one that hits b0

    return the new vertices that result from hitting a0 and b0, and all of the old stuff

    test case: [-1,0,1,2] and [-1,1]
    `
    a = state.a
    b = state.b
    av = state.av
    bv = state.bv
    theta = state.theta
    root = state.root
    creases = state.creases
    extraV = state.extraV
    mv = state.mv
    othermv = state.othermv

    if(a.length == 0 | b.length ==0){return state}
    if(a[0]<b[0]){
        console.log('step 2 a is closer')
        //send perpendicular line to b. vertical line to a
        newb = new Vertex(root.x,-Math.tan(theta)*(b[0]-root.x))
        newa = new Vertex(a[0]-(a[0]-root.x)*(Math.cos(theta))**2 , Math.cos(theta)*Math.sin(theta)*(a[0]-root.x))
    } else{
        console.log('step 2 b is closer')
        //send perpendicular line to a, vertical line to b
        newa = new Vertex(root.x,Math.tan(theta)*(a[0]-root.x))
        newb = new Vertex(b[0]-(b[0]-root.x)*(Math.cos(theta))**2 , -Math.cos(theta)*Math.sin(theta)*(b[0]-root.x))
    }
    // console.log(a,b)
    // console.log(root,a[0],b[0],newa,newb)
    bv.push(newb)
    b.splice(0,1)
    av.push(newa)
    a.splice(0,1)

    othermv = mv=="M"?"V":"M"
    creases.push(new Crease(root,newa,othermv))
    creases.push(new Crease(root,newb,othermv))
    creases.push(new Crease(newa,newb,mv))

    state.a = a
    state.b = b
    state.av = av
    state.bv = bv
    state.creases = creases
    state.subroots = [newa,newb]
    state.mv = othermv
    state.othermv = mv
    return step3(state)
}
function step3(state){
    `
    send out tentative creases from each subroot to make them flat foldable.
    Splits off into 3a,3b,3c depending where a[0] and b[0] hit the tentative creases.
    `
    a = state.a
    b = state.b
    suba = state.subroots[0]
    subb = state.subroots[1]

    // if(a.length == 0 | b.length ==0){return state}

    if (suba.x > subb.x){
        console.log("step3: a is further")
        tentative = new Vertex(
            suba.y * (suba.y - subb.y)/(suba.x-subb.x),// suba.x + (suba.y - subb.y),
            0// suba.y - (suba.x - subb.x)
        )
    } else if (subb.x > suba.x){
        console.log("step3: b is further")
        tentative = new Vertex(
            subb.y * (subb.y - suba.y)/(subb.x-suba.x),// subb.x - (subb.y - suba.y),
            0// subb.y + (subb.x - suba.x)
        )
    } else{console.log("step 3: Something went wrong"); return state}

    const x = tentative.x

    // console.log(a,b,tentative)
    if((a[0]>x & b[0]>x) | (eq(a[0],x)&eq(b[0],x))){
        state.creases.push(new Crease(tentative,suba,mv))
        state.creases.push(new Crease(tentative,subb,mv))
        state.extraV.push(tentative)
        return step3a(state,tentative)
    }
    if((eq(a[0],x) & b[0]>x) | (eq(b[0],x) & a[0]>x)){
        state.creases.push(new Crease(tentative,suba,mv))
        state.creases.push(new Crease(tentative,subb,mv))
        return step3b(state,tentative)
    }
    if(b[0]<x & a[0]<x){
        step3d()
        return state
    }
    else{
        step3c()
        return state
    }
    

    // creases.push(new Crease(tentative,suba,mv))
    // creases.push(new Crease(tentative,subb,mv))

}
function step3a(state,tentative){
    `
    test case: [-1,0,1,3] and [-1,1,3,4]

    [-1,1,3,4,5,6] and [-1,0,1,3,4,5,6]
    `
    console.log("step 3a")
    x = tentative.x
    if(eq(a[0],x)&eq(b[0],x)){
        state.mv = mv=="M"?"V":"M"
        state.av.push(tentative)
        state.bv.push(tentative)
        state.av.splice(0,1)
        state.bv.splice(0,1)
    }
    state.root = tentative
    return step2(state)
}

function step3b(state,tentative){
    `
    test case: [0,1,2,3,4] and [0,2,4]
    `
    console.log("step 3b")
    if (eq(a[0],tentative.x)){
        av.push(tentative)
        a.splice(0,1)
    } else{
        bv.push(tentative)
        b.splice(0,1)
    }
    state.root = tentative
    return step1(state)
}

function step3c(){
    console.log("step 3c")
}
function step3d(){
    console.log("step 3d")
}
