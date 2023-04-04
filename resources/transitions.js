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

Start building general algorithm
 - 

Start thinking about how to generalize for full dense bouncing solving
 - How will crease data be represented as?


=========
make a and be be lists of ordered pairs. x coord is position along the ridge. 
y coord is distance from ridge along axial. then use sin/cos to get coord
*/

function extend(av,bv,creases,startmv,theta,buffer = 1){
    `
    Inputs a bunch of vertices and turns it into a normalized cp object
    `
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
    console.log("minx,maxx,miny,maxy",minx,maxx,miny,maxy)


    //horizontal lines at beginning and end of transition
    leftEnd = new Vertex(minx,0)
    rightEnd = new Vertex(maxx,0)
    newCreases.push(new Crease(leftEnd, av[0].y==0? av[0]:bv[0] ,startmv))
    newCreases.push(new Crease(rightEnd, av[av.length-1].y==0? av[av.length-1]:bv[bv.length-1], av.length%2==1?othermv:startmv))    
    newVertices.push(leftEnd,rightEnd)
    
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
    allVertices = av.concat(newVertices) 
    for(const vertex of bv){
        if(!av.includes(vertex)){av.push(vertex)}
    }
    console.log(5,allVertices)

    allCreases = creases.concat(newCreases)
    for(const crease of allCreases){
        for(const vertex of crease.vertices){
            vertex.creases.push(crease)
        }
    }
    cp = new CP(allVertices,allCreases)
    console.log(6,structuredClone(cp.vertices))
    //normalize to the unit square, with the horizontal line centered along y=0.5
    //watch out for cases that are taller than they are wide (may need to change html dimensions)
    //minx goes to 0, maxx goes to 1
    var scale = 1/(maxx-minx)
    for(const vertex of cp.vertices){
        console.log(vertex.x-minx,vertex)
        vertex.x = 0 + (vertex.x-minx)*scale
        vertex.y = (vertex.y*scale) + 0.5
    }
    console.log(7,structuredClone(cp.vertices))
    return cp
}
function pythagorean(a,b){
    return (a**2 + b**2)**0.5
}

//=======================================
function start(){
    `
    Main function to solve the transition.
    Inputs (fed in from html): a,b,theta,startmv
    output: cp file, display and/or download
    `
    //setup
    paper.project.clear()
    const theta = parseFloat(angle.value) * (2*Math.PI)/360
    const ainput = JSON.parse(topInput.value).sort()
    const binput = JSON.parse(bottomInput.value).sort()
    var a = structuredClone(ainput)
    var b = structuredClone(binput)
    const startmv = mvInput.value
    const othermv = mvInput.value == "M"?"V":"M"
    var creases = [] //list of crease objects, except for the boundary ones
    var av = [] //list of vertex objects for a
    var bv = [] //list of vertex objects for b

    step1(a,b,av,bv)
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

    cp = extend(av,bv,creases,startmv,theta)
    displaycp = displayCp(cp,10,10,490,490)
}

function step1(a,b,av,bv,theta){
    `
    two creases approaching the ridge. 
    `
    if(a.length == 0 | b.length ==0){console.log('DONE');return} //base case
    if(eq(a[0],b[0])){
        console.log("EQUAL case")
        vertex = new Vertex(a[0],0)
        av.push(vertex)
        bv.push(vertex)
        a.splice(0,1)
        b.splice(0,1)
        step1(a,b,av,bv)
    } else if (a[0]<b[0]){
        root = new Vertex(a[0],0)
        av.push(root)
        a.splice(0,1)
        step2(a,b,av,bv,root,theta)
    } else if (a[0]>b[0]){
        root = new Vertex(b[0],0)
        bv.push(root)
        b.splice(0,1)
        step2(a,b,av,bv,root,theta)
    }
}

function step2(a,b,av,bv,root,theta){
    `
    Takes a root and branches off
    `
    if(a.length == 0 | b.length ==0){return}
    console.log('step 2')
    if(a[0]<b[0]){

    } else{

    }

}
function step3(){
    `
    Splits off into 3a,3b,3c
    `
}

function simpleCase(){
    paper.project.clear()
    const theta = parseFloat(angle.value) * (2*Math.PI)/360
    const a = JSON.parse(topInput.value).sort()
    const b = JSON.parse(bottomInput.value).sort()
    const startmv = mvInput.value
    const othermv = mvInput.value == "M"?"V":"M"
    const minlength = (a[2]-a[0])/2
    console.log(a[0],a[1],a[2],b[0], b[0] == a[0] - a[1] + a[2])

    b0 = new Vertex(a[0],a[0]-b[0]*Math.tan(theta))
    a1 = new Vertex(a[0] + (a[1]-a[0])*Math.sin(theta)**2,(a[1]-a[0])*Math.sin(theta)*Math.cos(theta))
    alpha = theta - Math.atan2(a1.x-b0.x,a1.y-b0.y)
    above = a[0]+(b[0]-a[0])*Math.tan(theta)/Math.tan(alpha)
    below = a[0] + (a[1]-a[0])*Math.sin(theta)**2 + (a[1]-a[0])*Math.sin(theta)*Math.cos(theta)/Math.tan(theta-alpha)
    console.log(above,below)

    a0 = new Vertex(a[0],0)
    a2 = new Vertex(a[2],0)
    var creases = []
    var vertices = [a0,a2,b0,a1]
    creases.push(...[
        new Crease(a0,new Vertex(a[0]-minlength,0),startmv),
        new Crease(a0,new Vertex(a0.x - minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv),
        new Crease(a0,a1,othermv),
        new Crease(a0,b0,othermv),
        new Crease(b0,a1,startmv),
        new Crease(a1,new Vertex(a1.x-minlength*Math.cos(theta),a1.y+minlength*Math.sin(theta)),startmv),
        new Crease(b0,new Vertex(b0.x-minlength*Math.cos(theta),b0.y-minlength*Math.sin(theta)),othermv),
        new Crease(b0,a2,othermv),
        new Crease(a1,a2,startmv),
        new Crease(a2,new Vertex(a[2]+minlength,0),othermv),
        new Crease(a2,new Vertex(a2.x-minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv)
    ])
    for(const crease of creases){
        for(const vertex of crease.vertices){
            if(!vertices.includes(vertex)){
                vertices.push(vertex)
            }
            if(vertex.creases == []){
                vertex.creases = [crease]
            } else{
                vertex.creases.push(crease)
            }
        }
    }

    cp = new CP(vertices,creases)
    //console.log(cp)
    normalize(cp)
    //console.log(cp)
    displaycp = displayCp(cp,10,10,490,490)
}

function simpleCase2(){
    //setup
    paper.project.clear()
    const theta = parseFloat(angle.value) * (2*Math.PI)/360
    const a = JSON.parse(topInput.value).sort()
    const b = JSON.parse(bottomInput.value).sort()
    const startmv = mvInput.value
    const othermv = mvInput.value == "M"?"V":"M"
    var av = [] //coordinates for input points a
    var bv = []
    for(var i=0;i<b.length;i++){
        bv.push([b[i],0])
    }
    for(var i=0;i<a.length;i++){
        av.push([a[i],0])
    }

    av[0][1] = 0
    av[2][1] = 0
    bv[0][1] = pythagorean(b[0]-a[0],b[0]-a[0]*Math.tan(theta))
    av[1][1] = Math.cos(theta)*(av[1][0]-av[0][1])
    alpha = theta - Math.atan2(av[1][0]-bv[0][0],av[1][1]-bv[0][1])
    console.log(av,bv)
    console.log(alpha * 360/(2*Math.PI))


    above = a[1][1] * Math.sin(alpha)/Math.sin(theta-alpha)
    below = b[0][1] * Math.sin(theta-alpha)/Math.sin(alpha)
    console.log(above,below)

    //then convert a and b to actual vertices. establish their connections somehow

    var creases = []
    var vertices = [a0,a2,b0,a1]
    creases.push(...[
        new Crease(a0,new Vertex(a[0]-minlength,0),startmv),
        new Crease(a0,new Vertex(a0.x - minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv),
        new Crease(a0,a1,othermv),
        new Crease(a0,b0,othermv),
        new Crease(b0,a1,startmv),
        new Crease(a1,new Vertex(a1.x-minlength*Math.cos(theta),a1.y+minlength*Math.sin(theta)),startmv),
        new Crease(b0,new Vertex(b0.x-minlength*Math.cos(theta),b0.y-minlength*Math.sin(theta)),othermv),
        new Crease(b0,a2,othermv),
        new Crease(a1,a2,startmv),
        new Crease(a2,new Vertex(a[2]+minlength,0),othermv),
        new Crease(a2,new Vertex(a2.x-minlength*Math.cos(theta),minlength*Math.sin(theta)),othermv)
    ])
    for(const crease of creases){
        for(const vertex of crease.vertices){
            if(!vertices.includes(vertex)){
                vertices.push(vertex)
            }
            if(vertex.creases == []){
                vertex.creases = [crease]
            } else{
                vertex.creases.push(crease)
            }
        }
    }

    cp = new CP(vertices,creases)
    //console.log(cp)
    normalize(cp)
    //console.log(cp)
    displaycp = displayCp(cp,10,10,490,490)
}
function normalize(cp){
    `
    Map the minimum and maximum x to 0 and 1. Center y at 0.5
    Mutates cp.
    `
    var minx = 0
    var miny = 0
    var maxx = 0
    var maxy = 0
    for(const vertex of cp.vertices){
        minx = Math.min(minx,vertex.x)
        maxx = Math.max(maxx,vertex.x)
        miny = Math.min(miny,vertex.y)
        maxy = Math.max(maxy,vertex.y)
    }
    var scale = (1-0)/(maxx-minx)
    for(const vertex of cp.vertices){
        vertex.x = 0 + (vertex.x-minx)*scale
        vertex.y = 0.5 -vertex.y*scale
    }
    return cp
}