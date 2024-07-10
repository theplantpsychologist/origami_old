/*==========================================

This code is published as an implementation of the algorithm described in the paper "Algorithmic Transitions between Parallel Pleats" by Brandon Wong and Erik Demaine, published in 8OSME. 

The program is hosted at the following URL:
https://web.mit.edu/wongb/www/origami/resources/1transitions.html

==========================================*/

function start(a,b){
    `
    Main function to solve the transition.
    Inputs (fed in from html): a,b,theta,startmv,beta0
    output: cp file, display and/or download
    `
    console.log('=====STARTING=====')
    //setup
    var state = {
        theta:parseFloat(thetaInput.value) * (2*Math.PI)/360,
        beta_0:parseFloat(beta0input.value) * (2*Math.PI)/360,
        Ainput:a.sort((x, y) => x - y),
        Binput:b.sort((x, y) => x - y),
        startmv:mvInput.value,
    }
    console.log(state)
    console.log("alternating sums are equal:",eq(alternatingSum(a),alternatingSum(b)),state.Ainput,state.Binput,alternatingSum(a),alternatingSum(b))
    if(eq(alternatingSum(a)==alternatingSum(b))){
        alert("Warning: a flat foldable transtion could not be constructed because the alternating sums are not equal.")
        return
    }
    state = setup(state)

    //draw the input here in case it crashes and won't draw the rest. clear later
    // paper.project.clear()
    // cp = render(state)
    // displaycp = displayCp(cp,10,10,490,490)

    state = graph(state)
    state = placeVertices(state)
    paper.project.clear()
    cp = render(state)
    displaycp = displayCp(cp,10,10,490,490)

    // testv1 = new Vertex(0.2,0.2)
    // testv2 = new Vertex(0.8,0.8)
    // testcrease = new Crease(testv1,testv2,'A')
    // testcp = new CP([testv1,testv2],[testcrease])
    // displaycp = displayCp(testcp,10,10,490,490)

    console.log(state)
    console.log('=====FINISHED=====')
}

class InputCrease{
    //represents the input crease, but is not itself the crease object
    constructor(xint,mv,side,index){
        this.xint = xint 
        this.mv = mv
        this.side = side
        this.index = index
        this.P = new Vertex(xint,0)
        this.L = null
        this.connections = [] 
        this.connectedCreases = []
    }
}

class Connection{
    //a crease that connects two input creases
    constructor(inputCrease1,inputCrease2,mv){
        this.creases = [inputCrease1,inputCrease2]
        this.mv = mv//start out undefined, define later
    }
}

function setup(state){
    "takes parsed input and makes the appropriate objects to represent it. Input are state properties Ainput and Binput, outputs are the more useful A and B"
    var A = [] //list of inputCrease objects
    var B = [] //list of inputCrease objects
    const startmv = state.startmv
    othermv = startmv=="M"?"V":"M"
    for(i=0;i<state.Ainput.length;i++){
        A.push(new InputCrease(state.Ainput[i], i%2==0?startmv:othermv,"side A",A.length))
    }
    for(i=0;i<state.Binput.length;i++){
        B.push(new InputCrease(state.Binput[i], i%2==0?startmv:othermv,"side B",B.length))
    }
    state.A = A
    state.B = B
    state.connectorCreases = []

    //Connect the ridge to the first and last crease. A and B are still sorted
    var firstCrease = state.Ainput[0]<=state.Binput[0]? state.A[0]: state.B[0] //if equal, it's A
    var lastCrease = state.Ainput[state.Ainput.length-1]>=state.Binput[state.Binput.length-1]? state.A[state.A.length-1]: state.B[state.B.length-1]
    //these creases don't exist, all we want is the connection, so the actual crease is A
    var leftEndpoint = new InputCrease(firstCrease.xint-1.5,state.startmv)
    var rightEndpoint = new InputCrease(lastCrease.xint+0.5,state.startmv== "M"?"V":"M") 
    
    state.firstCrease = firstCrease
    state.lastCrease = lastCrease
    state.leftEndpoint = leftEndpoint
    state.rightEndpoint = rightEndpoint

    state.root = leftEndpoint
    connect(lastCrease,rightEndpoint,state,lastCrease.mv)

    return state
}

function graph(state){
    "make the graph connections. start with the across connections first (in case there are any zero pleats) and then do the neighbor connections"
    /*
    you have two rolling indices, iA and iB, which represent the only two vertices that are available for connecting at a given time. We only have 3 possible new connections: iA to iB, iA to iA+1, or iB to iB+1.
    Once you step iA or iB forward, you can't go back.
    
    stepA will step iA forward, meaning connect iA to iA+1, then iA+1 to iB.
    stepB will step iB forward, meaning connect iB to iB+1, then iB+1 to iA.
    */

    state.connectorCreases = [] //may want to clear each crease's own connections list if this is is meant to properly reset
    
    var iA = 0
    var iB = 0
    var A0 = 0
    var B0 = 0

    function stepA(state){
        console.log("A steps forward")
        iAmv = state.A[iA].connections.map(c => c.mv)
        iAmv.push(state.A[iA].mv)//the mv of iB.P's current connections
        amv = iAmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"
        connect(state.A[iA],state.A[iA+1],state,amv)
        connect(state.B[iB],state.A[iA+1],state,amv=='V'?'M':'V')
        iA += 1
    }
    function stepB(state){
        console.log("B steps forward")
        iBmv = state.B[iB].connections.map(c => c.mv)
        iBmv.push(state.B[iB].mv)//the mv of iB.P's current connections
        bmv = iBmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"//go with the one there are more of
        connect(state.B[iB],state.B[iB+1],state,bmv)//oppositemv)
        connect(state.A[iA],state.B[iB+1],state,bmv=='V'?'M':'V')//currentmv)
        iB += 1
    }
    function initialize(state,root = true){
        "Recursively build the graph connections. initialize is called at the beginning or whenever the alternating sum is equal, for example, after closing a transition and returning back to the ridge"
        console.log("initializing graph...",iA,iB,)
        var local_firstCrease = state.A[iA].xint<=state.B[iB].xint? state.A[iA]: state.B[iB] //if equal, it's A
        var currentmv = local_firstCrease.mv
        var oppositemv = currentmv == 'V'?'M':'V'
        if (root){
            connect(state.root,local_firstCrease,state,oppositemv)
        } else if(currentmv = 'A'){
            currentmv = state.startmv == 'M'?'V':'M'
            // console.log(state.B[iB+1].mv,state.A[iA].mv,alternatingSum(state.Ainput.slice(0,iA+1)),alternatingSum(state.Binput.slice(0,iB+2)))
            // if(alternatingSum(state.Ainput.slice(A0,iA+1)) < alternatingSum(state.Binput.slice(B0,iB+2))){
            //     currentmv = state.B[iB+1].mv
            //     console.log("chose B",currentmv)
            // }else{
            //     currentmv = state.A[iA].mv
            //     console.log("chose A",currentmv)
            // }
        }
        connect(state.A[iA],state.B[iB],state,currentmv) //connect across
        //end condition 
        if(iA==state.A.length-1 && iB==state.B.length-1){
            console.log("===Graph connections complete (initialize)===")
            return state
        }
        if(eq(alternatingSum(state.Ainput.slice(A0,iA+1)),alternatingSum(state.Binput.slice(B0,iB+1))) && eq(state.A[iA].xint,state.B[iB].xint)){
            console.log("reinitializing: equal alternating sums")
            state.root = state.A[iA].xint>=state.B[iB].xint? state.A[iA]: state.B[iB] //if equal, it's A
            iA += 1
            iB += 1
            initialize(state)
            return state
        } else{
            //first and last step are individual, otherwise need to be two steps at a time
            if(state.A[iA].xint<state.B[iB].xint){
                console.log("initial step A:")
                stepA(state)
            } else if(state.A[iA].xint>state.B[iB].xint){
                console.log("initial step B:")
                stepB(state)
            } else{
                console.log("something went wrong (graph initial step)")
            }
            //This while loop is basically what's described in the paper--everything outside is for handling edge cases, or cases where multiple transitions are snuck in as one (handling breaks)
            var stop = 0 
            while(stop<1000){
                var SiA_1 = alternatingSum(state.Ainput.slice(A0,iA+2)) //alternating sum up to iA + 1
                var SiA = alternatingSum(state.Ainput.slice(A0,iA+1)) //alternating sum up to iA
                var SiB_1 = alternatingSum(state.Binput.slice(B0,iB+2)) //alternating sum up to iB + 1
                var SiB = alternatingSum(state.Binput.slice(B0,iB+1)) //alternating sum up to iB
                // var xiB = state.B[iB].xint
                // var xiA = state.A[iA].xint
                //finished, return
                if(eq(SiA,SiB)){
                    return state
                }
                //final step before finishing. single step
                else if(eq(SiA_1,SiB)&& ((iA==state.A.length-1 || iB==state.B.length-1) || state.A[iA+1].xint < state.B[iB+1].xint)){
                    console.log("final step A:")
                    stepA(state)
                    if(iA==state.A.length-1 && iB==state.B.length-1){
                        console.log("===Graph connections complete (while loop)===")
                        return state
                    }
                    state.root = state.A[iA]
                    iA += 1
                    iB += 1
                    initialize(state)
                }
                else if(eq(SiA,SiB_1) && ((iA==state.A.length-1 || iB==state.B.length-1) || state.A[iA+1].xint > state.B[iB+1].xint)){
                    //this is the last one--final step
                    console.log("final step B:")
                    stepB(state)
                    if(iA==state.A.length-1 && iB==state.B.length-1){
                        console.log("===Graph connections complete (while loop)===")
                        return state
                    }
                    state.root = state.B[iB]
                    iA += 1
                    iB += 1
                    initialize(state)
                } 
                //core operation: double step
                else if(Math.abs(SiA_1) < Math.abs(SiB) && iA<state.A.length-2){
                    //A has lower alternating sum, and lower position
                    console.log("double step A:")
                    stepA(state)
                    stepA(state)
                } 
                else if(Math.abs(SiA) > Math.abs(SiB_1)&& iB<state.B.length-2){
                    //B has lower alternating sum, and lower position
                    console.log("double step B:")
                    stepB(state)
                    stepB(state)
                }
                //edge case type 1
                else if(!(iA>=state.A.length-1 || iB>=state.B.length-1) & eq(Math.abs(SiA-SiB), Math.min(state.A[iA+1].xint,state.B[iB+1].xint))){
                    console.log("handling edge case type 1, skipping A:")
                    stepB(state)
                    iA += 1
                    // state.A[iA].L = 0
                    state.A[iA].L = 0.0001
                    state.A[iA].P.x -= 0.0001
                    state.A[iA].P.y += 0.0001
                    // state.B[iB].P = state.A[iA].P
                    connect(state.A[iA],state.B[iB],state,'A')
                    iA += 1
                    state.root = state.B[iB]//.xint>=state.B[iB].xint? state.A[iA]: state.B[iB]
                    return initialize(state,false)
                }
                //edge case type 2
                else if(!(iA>=state.A.length-1 || iB>=state.B.length-1) & Math.abs(SiA-SiB) < Math.min(state.A[iA+1].xint,state.B[iB+1].xint)){
                    console.log("handling edge case type 2: adding auxiliary creases")
                    auxposition = Math.abs(SiA-SiB)
                    newA = new InputCrease(auxposition,'A','aux A',iA+1)
                    newB = new InputCrease(auxposition,'A','aux B',iB+1)
                    state.A.splice(iA+1, 0, newA);
                    state.B.splice(iB+1, 0, newB);
                    state.Ainput.splice(iA+1, 0, auxposition);
                    state.Binput.splice(iB+1, 0, auxposition);
                    for (let i = iA + 2; i < state.A.length; i++) {
                        state.A[i].index += 1;
                    }
                    for (let i = iB + 2; i < state.B.length; i++) {
                        state.B[i].index += 1;
                    }
                }
                else {
                    console.log("something went wrong (graph while loop)")
                }
                stop += 1
            }
        }
        console.log("You shouldn't be down here")
        return state
    }
    //Connect the ridge to the first and last crease. A and B are still sorted
    var firstCrease = state.Ainput[0]<=state.Binput[0]? state.A[0]: state.B[0] //if equal, it's A
    var lastCrease = state.Ainput[state.Ainput.length-1]>=state.Binput[state.Binput.length-1]? state.A[state.A.length-1]: state.B[state.B.length-1]
    //these creases don't exist, all we want is the connection, so the actual crease is A
    var leftEndpoint = new InputCrease(firstCrease.xint-1.5,'A')
    var rightEndpoint = new InputCrease(lastCrease.xint+0.5,'A') 
    
    state.firstCrease = firstCrease
    state.lastCrease = lastCrease
    state.leftEndpoint = leftEndpoint
    state.rightEndpoint = rightEndpoint

    state.root = leftEndpoint
    connect(lastCrease,rightEndpoint,state,lastCrease.mv)

    return initialize(state)
}

function placeVertices(state){
    "move the vertices around. Define a length L for all input creases"

    //start by fixing the position of the firstCrease and its guaranteed two connections. From there, any crease whose all connections except for 1 have a defined L, can define the position of the last one based on kawasaki (perhaps a complicated calculation though, but guaranteed to go one at a time. although maybe will need to use beta0 again at some point)

    state.firstCrease.L = 0
    state.leftEndpoint.L = 0
    state.rightEndpoint.L = 0

    // uncomment this section to place all of them at L = 1, for debugging graph connections
    // for(const C of state.A){
    //     C.L = 1
    //     C.P.x = C.xint - 1
    //     C.P.y = 1
    // }
    // for(const C of state.B){
    //     C.L = 1
    //     C.P.x = C.xint -1
    //     C.P.y = -1
    // }
    // return state
    
    var iA = 0
    var iB = 0
    var stop = 0

    function stepA(state){
        "Here, to 'step' A means that A[iA] has only one possible angle for the next crease, so we'll extend using flat foldability angles towards the next crease in A."
        console.log("A steps forward from",state.A[iA].xint)
        // the new placement will be the last one added to connectedCreases
        var newPlacement = state.A[iA].connectedCreases[state.A[iA].connectedCreases.length-1]
        //calculate the necessary angle: beta_i. watch out for multiple solutions. the angles should already be sorted in counter clockwise order
        state.A[iA].angles = state.A[iA].connectedCreases.map((crease)=>angle(state.A[iA].P,crease.P))
        state.A[iA].angles.pop() //because the last one hasn't been set yet, it's P is at 0
        state.A[iA].angles = [Math.PI-state.theta].concat(state.A[iA].angles).sort()
        beta_i = alternatingSum(state.A[iA].angles) - Math.PI
        newPlacement.L = state.A[iA].L + Math.sin(beta_i)/Math.sin(Math.PI-beta_i-state.theta) * (newPlacement.xint - state.A[iA].xint) //from law of sines
        newPlacement.P.x -= Math.abs(newPlacement.L)*Math.cos(state.theta)
        newPlacement.P.y += newPlacement.L*Math.sin(state.theta) //watch out, this crease could be in A or in B
        // state.A[iA].P.angularFoldable = true
        iA += 1
        // console.log(beta_i,newPlacement.L)
    }
    function stepB(state){
        console.log("B steps forward from",state.B[iB].xint)
        var newPlacement = state.B[iB].connectedCreases[state.B[iB].connectedCreases.length-1]

        state.B[iB].angles = state.B[iB].connectedCreases.map((crease)=>angle(state.B[iB].P,crease.P))
        state.B[iB].angles.pop()
        state.B[iB].angles = [Math.PI+state.theta].concat(state.B[iB].angles).sort()
        beta_i = alternatingSum(state.B[iB].angles) - Math.PI
        newPlacement.L = state.B[iB].L + Math.sin(-beta_i)/Math.sin(Math.PI+beta_i-state.theta) * (newPlacement.xint - state.B[iB].xint)
        newPlacement.P.x -= Math.abs(newPlacement.L)*Math.cos(state.theta)
        newPlacement.P.y -= newPlacement.L*Math.sin(state.theta) //watch out, this crease could be in A or in B
        // state.B[iB].P.angularFoldable = true
        iB += 1
    }
    function initialize(state){
        // base case: if reached the end, return
        if(iA>=state.A.length-1 && iB>=state.B.length-1){
            console.log("===vertex placement complete (initialize)===")
            return state
        }
        // equal x intercepts -> recurse
        if(eq(state.A[iA].xint, state.B[iB].xint)){
            state.A[iA].L = 0
            state.B[iB].L = 0
            iA += 1
            iB += 1
            console.log("reinitializing: equal xint")
            return initialize(state)
        }
        //first placement will use beta_0
        if(state.A[iA].xint<state.B[iB].xint){
            console.log("initial step A",iA,iB)
            state.A[iA].L = 0
            state.B[iB].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.B[iB].xint-state.A[iA].xint)
            state.B[iB].P.x -= state.B[iB].L*Math.cos(state.theta)
            state.B[iB].P.y -= state.B[iB].L*Math.sin(state.theta)
        } else {
            console.log("initial step B",iA,iB)
            state.B[iB].L = 0
            state.A[iA].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.A[iA].xint-state.B[iB].xint)
            state.A[iA].P.x -= state.A[iA].L*Math.cos(state.theta)
            state.A[iA].P.y += state.A[iA].L*Math.sin(state.theta)
        }

        while(stop<100 && iB != state.B.length & iA != state.A.length){
            //end of this transition, close up and get ready for next one
            // console.log(iA,iB,"alternating sums:",alternatingSum(state.Ainput.slice(0,iA+1)),alternatingSum(state.Binput.slice(0,iB+1)),"slices",state.Ainput.slice(0,iA+1),state.Binput.slice(0,iB+1))
            if(alternatingSum(state.Ainput.slice(0,iA+1)) == alternatingSum(state.Binput.slice(0,iB+1))){
                console.log("reinitializing: equal alternating sums, end of transition")
                iA += 1
                iB += 1
                if(iB==state.B.length | iA == state.A.length){
                    return initialize(state)
                } 
                //I forget what this was for exactly but I think it was related to edge case type 1
                if(state.B[iB].xint == state.A[iA-1].xint){
                    iB += 1
                    iA -= 1
                    return initialize(state)
                }if(state.B[iB-1].xint == state.A[iA].xint){
                    iA += 1
                    iB -= 1
                    return initialize(state)
                }
                return initialize(state)
            }
            iAneighbors = state.A[iA].connections.length - state.A[iA].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0)
            iBneighbors = state.B[iB].connections.length - state.B[iB].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0)
            //A is ready
            if(iAneighbors == 1 && state.A[iA].connectedCreases.includes(state.A[iA+1])){ //if all of A[iA]'s connections except for one have a defined L. And A[iA+1] is actually connected to A[iA]
                //calculate the position of the remaining connection based on kawasaki
                stepA(state)
            }
            //B is ready
            else if(iBneighbors == 1 && state.B[iB].connectedCreases.includes(state.B[iB+1])){
                stepB(state)
            } else {
                //neither A nor B are ready to step forward
                console.log("got stuck. undefined connections for A and B:",iAneighbors,iBneighbors, "for iA and iB:",iA,iB,"at xints",state.A[iA].xint,state.B[iB].xint)
                if(iAneighbors == 0){
                    iA += 1
                }
                if(iBneighbors == 0){
                    iB += 1
                }
                // iB += 1
                // stop+=1
                // break
            }
            stop+=1
        }
        return state
    }
    console.log("initializing placement...",iA,iB)
    initialize(state)
    console.log("== Vertex placement complete ==")
    return state
}

// 
function render(state){
    //go through all the data stored in the state and create a cp object to be displayed
    //creases come from state.connections, as well as the input creases (need new vertices for upper and lower bounds)
    //vertices come from P and the newly made upper and lower bound vertices
    //deal with zero pleats
    console.log("initializing render...")
    var vertices = []
    var creases = []
    const upperBound = Math.max(...state.A.map(a => a.P.y))*2+1
    // console.log(state.A.map(a => a.P.y), upperBound)
    const lowerBound = Math.min(...state.B.map(b => b.P.y))*2-1

    console.log("scraping A")
    for(const c of state.A){
        newV = new Vertex(c.xint-upperBound*Math.cos(state.theta),upperBound*Math.sin(state.theta))
        vertices.push(newV)
        if(c.connectedCreases.length == 1){
            newC = new Crease(c.connectedCreases[0].P,newV,c.mv)
            c.connectedCreases[0].P.creases.push(newC)
            const index = state.connectorCreases.indexOf(c.connections[0]);
            if (index > -1) { // only splice array when item is found
                state.connectorCreases.splice(index, 1); // 2nd parameter means remove one item only
            }
        } else{
            vertices.push(c.P)
            newC = new Crease(c.P,newV,c.mv)
            c.P.creases.push(newC)
        }
        newV.creases.push(newC)
        if(c.mv!='A'){
            //don't display aux creases
            creases.push(newC)
            // vertices.push(newV)
        }
    }
    console.log("scraping B")
    for(const c of state.B){
        newV = new Vertex(c.xint+lowerBound*Math.cos(state.theta),lowerBound*Math.sin(state.theta))
        vertices.push(newV)
        if(c.connectedCreases.length == 1){
            newC = new Crease(c.connectedCreases[0].P,newV,c.mv)
            c.connectedCreases[0].P.creases.push(newC)
            const index = state.connectorCreases.indexOf(c.connections[0]);
            if (index > -1) { // only splice array when item is found
                state.connectorCreases.splice(index, 1); // 2nd parameter means remove one item only
            }
        } else{
            vertices.push(c.P)
            newC = new Crease(c.P,newV,c.mv)
            c.P.creases.push(newC)
        }
        newV.creases.push(newC)
        if(c.mv!='A'){
            //don't display aux creases
            creases.push(newC)
            // vertices.push(newV)
        }
    }
    console.log("scraping connector creases")
    for(const connection of state.connectorCreases){
        newC = new Crease(connection.creases[0].P,connection.creases[1].P,connection.mv)
        connection.creases[0].P.creases.push(newC)
        connection.creases[1].P.creases.push(newC)
        creases.push(newC)
    }
    vertices.push(state.leftEndpoint.P)
    vertices.push(state.rightEndpoint.P)

    console.log("rescale and output")
    //rescale everything to fit in the box. xmin goes to 0, xmax goes to 1
    //also, flip the y upside down
    const xmin = Math.min(...state.Ainput,...state.Binput)-upperBound*Math.cos(state.theta)
    const xmax = Math.max(...state.Ainput,...state.Binput)+1
    for(const v of vertices){
        v.x = (v.x-xmin)/(xmax-xmin)
        v.y = -1*v.y/(xmax-xmin) + 0.5
    }

    //merge 0 length creases after render? look for A creases

    output = new CP(vertices,creases)
    output.checkFoldability()
    console.log(output)
    console.log("===render complete===")
    return output
}

//=================helper functions==============
function alternatingSum(arr) {
    //calculates alternating sum. by bing ai
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        if (i % 2 === 0) {
            sum += arr[i];
        } else {
            sum -= arr[i];
        }
    }
    return sum;
}
function connect(inputCrease1,inputCrease2,state,mv = "A"){
    var connection = new Connection(inputCrease1,inputCrease2,mv)
    state.connectorCreases.push(connection)
    inputCrease1.connections.push(connection)
    inputCrease2.connections.push(connection)
    inputCrease1.connectedCreases.push(inputCrease2)
    inputCrease2.connectedCreases.push(inputCrease1)

}
function eq(a,b){
    //return whether a and b are "close enough"
    return Math.abs(a-b)<10**-10
}
function angle(v1,v2){
    //take the angle (from the x axis) of vertex v2 away from v1
    output = Math.atan2((v2.y-v1.y),(v2.x-v1.x))
    return output>0? output: output + 2*Math.PI
}
function random(n){
    //return a list of inputs a and b, with n creases in total, such that the alternating sums in a and b are equal. force n to be even
    if (n % 2 !== 0) {
        n += 1;
    }
    a = []
    b = []
    for(i=0;i<n-1;i++){
        x = Math.ceil(Math.random() * 10 * 100) / 100;
        // x = Math.random() * 10
        if (Math.random() < 0.5) {
            a.push(x);
        } else {
            b.push(x);
        }
    }
    a.sort((x, y) => x - y);
    b.sort((x, y) => x - y);
    suma = alternatingSum(a)
    sumb = alternatingSum(b)
    //at this point, the one with an odd number will have a positive, and the one with an even number will have a negative. the position of the last crease will be the sum of their absolutes, and can go on either side
    x = Math.abs(suma) + Math.abs(sumb)
    if (Math.max(...a) < Math.max(...b)) {
        a.push(x);
    } else {
        b.push(x);
    }
    a.sort((x, y) => x - y);
    b.sort((x, y) => x - y);
    suma = alternatingSum(a)
    sumb = alternatingSum(b)
    if(eq(suma,sumb)){
    return [a, b];
    } else{
        return random(n)
    }
}
//infinite loop case. It reaches the point where it says "rescale and output" then freezes:
2.02, 4.95, 8.9
0.46, 1.91, 4.09, 6.19, 8.1, 8.58, 10.000000000000002

1.92, 6.81
0.62, 0.96, 3.01, 4.54, 5.6, 5.76, 6.7, 9.56

2.03, 2.54, 4.18, 7.21, 7.79
2.07, 4.18, 6.05, 8.52, 8.83

//==============old code================
                // else if(xiA = xiB && SiA_1 == SiB){
                //     //you're in test8a difficult case. alternating sums are different but positions are equal.
                //     console.log("handling edge case type 1, skipping B:")
                //     stepA(state)
                //     iB += 1
                //     // state.A[iA].L = 0
                //     state.B[iB].L = 0.0001
                //     state.B[iB].P.x -= 0.0001
                //     state.B[iB].P.y -= 0.0001
                //     // state.B[iB].P = state.A[iA].P
                //     connect(state.A[iA],state.B[iB],state,'A')
                //     iB += 1
                //     state.root = state.A[iA]//.xint>=state.B[iB].xint? state.A[iA]: state.B[iB]
                //     return initialize(state,false)
                // }
                // else if(xiA = xiB && SiA == SiB_1){
                //     console.log("handling edge case type 1, skipping A:")
                //     stepB(state)
                //     iA += 1
                //     // state.A[iA].L = 0
                //     state.A[iA].L = 0.0001
                //     state.A[iA].P.x -= 0.0001
                //     state.A[iA].P.y += 0.0001
                //     // state.B[iB].P = state.A[iA].P
                //     connect(state.A[iA],state.B[iB],state,'A')
                //     iA += 1
                //     state.root = state.B[iB]//.xint>=state.B[iB].xint? state.A[iA]: state.B[iB]
                //     return initialize(state,false)
                // }