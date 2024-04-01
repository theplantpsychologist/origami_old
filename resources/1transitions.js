/*
Program structure

1. Parse the inputs, clear out old outputs
2. create graph connections
3. find the position of each point

classes
 - vertex: has x and y pos (from origami.js)
 - crease: connects two vertices (from origami.js)
 - cp (from origami.js)
 - input crease: has x intercept, L, P, mv, connections
 - input set (A and B): contain sets of input creases

inputs: A, B, theta, beta0

outputs: a cp 

first figure out how to handle cases where A and B have a crease on the same location. Then will be able to add the imaginary creases

*/

function start(a,b){
    `
    Main function to solve the transition.
    Inputs (fed in from html): a,b,theta,startmv,beta0
    output: cp file, display and/or download
    `
    console.log('=====STARTING=====')
    //setup
    paper.project.clear()
    var state = {
        theta:parseFloat(thetaInput.value) * (2*Math.PI)/360,
        beta_0:parseFloat(beta0input.value) * (2*Math.PI)/360,
        Ainput:a,
        Binput:b,
        startmv:mvInput.value,
    }
    console.log(state)
    console.log("alternating sums are equal:",alternatingSum(a)==alternatingSum(b),state.Ainput,state.Binput)
    state = setup(state)
    state = graph(state)
    state = placeVertices(state)
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
    function initialize(state){
        "Recursively build the graph connections. initialize is called at the beginning or whenever the alternating sum is equal, for example, after closing a transition and returning back to the ridge"
        console.log("initializing graph...",iA,iB)
        var local_firstCrease = state.A[iA].xint<=state.B[iB].xint? state.A[iA]: state.B[iB] //if equal, it's A
        var currentmv = local_firstCrease.mv
        var oppositemv = currentmv == 'V'?'M':'V'
        connect(state.root,local_firstCrease,state,oppositemv)
        connect(state.A[iA],state.B[iB],state,currentmv) //connect across
        //end conditions 
        if(iA==state.A.length-1 && iB==state.B.length-1){
            console.log("===Graph connections complete (initialize)===")
            return state
        }
        if(alternatingSum(state.Ainput.slice(A0,iA+1)) == alternatingSum(state.Binput.slice(B0,iB+1)) && state.A[iA].xint == state.B[iB].xint){
            console.log("reinitializing: equal alternating sums")
            state.root = state.A[iA].xint>=state.B[iB].xint? state.A[iA]: state.B[iB] //if equal, it's A
            iA += 1
            iB += 1
            initialize(state)
            return state
        } else{
            //first and last step are individual, in between need to be two steps at a time
            if(state.A[iA].xint<state.B[iB].xint){
                console.log("initial step A:")
                stepA(state)
            } else if(state.A[iA].xint>state.B[iB].xint){
                console.log("initial step B:")
                stepB(state)
            } else{
                console.log("something went wrong (graph initial step)")
            }
            var stop = 0 
            while(alternatingSum(state.Ainput.slice(A0,iA+1)) != alternatingSum(state.Binput.slice(B0,iB+1)) && stop<1000){
                if(alternatingSum(state.Ainput.slice(A0,iA+2)) == alternatingSum(state.Binput.slice(B0,iB+1))&&((iA==state.A.length-1 || iB==state.B.length-1) || state.A[iA+1].xint < state.B[iB+1].xint)){
                    console.log("final step A")
                    stepA(state)
                    if(iA==state.A.length-1 && iB==state.B.length-1){
                        console.log("===Graph connections complete (while loop)===")
                        return state
                    }
                    state.root = state.A[iA]
                    iA += 1
                    iB += 1
                    initialize(state)
                }else if(alternatingSum(state.Ainput.slice(A0,iA+1)) == alternatingSum(state.Binput.slice(B0,iB+2)) && ((iA==state.A.length-1 || iB==state.B.length-1)||state.A[iA+1].xint > state.B[iB+1].xint)){
                    //this is the last one--final step
                    console.log("final step B")
                    stepB(state)
                    if(iA==state.A.length-1 && iB==state.B.length-1){
                        console.log("===Graph connections complete (while loop)===")
                        return state
                    }
                    state.root = state.B[iB]
                    iA += 1
                    iB += 1
                    initialize(state)
                } else if(Math.abs(alternatingSum(state.Ainput.slice(A0,iA+2))) < Math.abs(alternatingSum(state.Binput.slice(B0,iB+1))) && iA<state.A.length-2){
                    console.log("double step A:")
                    stepA(state)
                    stepA(state)
                } else if(Math.abs(alternatingSum(state.Ainput.slice(A0,iA+1))) > Math.abs(alternatingSum(state.Binput.slice(B0,iB+2)))&& iB<state.B.length-2){
                    console.log("double step B:")
                    stepB(state)
                    stepB(state)
                }
                else{
                    //you're in test8a difficult case
                    console.log("something went wrong (graph while loop). step together:")
                    stepA(state)
                    stepB(state)
                    return initialize(state)
                }
                stop += 1
            }
        }
        // console.log("how did you end up down here")
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

    //uncomment this section to place all of them at L = 1, for debugging graph connections
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
        if(state.A[iA].xint == state.B[iB].xint){
            state.A[iA].L = 0
            state.B[iB].L = 0
            iA += 1
            iB += 1
            console.log("reinitializing: equal xint")
            return initialize(state)
        }
        //first placement will use beta_0
        if(state.A[iA].xint<=state.B[iB].xint){
            console.log("initial step A:")
            state.A[iA].L = 0
            state.B[iB].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.B[iB].xint-state.A[iA].xint)
            state.B[iB].P.x -= state.B[iB].L*Math.cos(state.theta)
            state.B[iB].P.y -= state.B[iB].L*Math.sin(state.theta)
        } else {
            console.log("initial step B")
            state.B[iB].L = 0
            state.A[iA].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.A[iA].xint-state.B[iB].xint)
            state.A[iA].P.x -= state.A[iA].L*Math.cos(state.theta)
            state.A[iA].P.y += state.A[iA].L*Math.sin(state.theta)
        }

        while(stop<1000 && iB != state.B.length & iA != state.A.length){
            if(alternatingSum(state.Ainput.slice(0,iA+1)) == alternatingSum(state.Binput.slice(0,iB+1))){
                console.log("reinitializing: equal alternating sums, end of transition")
                iA += 1
                iB += 1
                return initialize(state)
            }
            if(state.A[iA].connections.length - state.A[iA].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0) == 1 && state.A[iA].connectedCreases.includes(state.A[iA+1])){ //if all of A[iA]'s connections except for one have a defined L. And A[iA+1] is actually connected to A[iA]
                //calculate the position of the remaining connection based on kawasaki
                stepA(state)
            }
            else if(state.B[iB].connections.length - state.B[iB].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0) == 1 && state.B[iB].connectedCreases.includes(state.B[iB+1])){
                stepB(state)
            } else {
                console.log("idk got stuck. undefined connections for A and B:",state.A[iA].connections.length - state.A[iA].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0),state.B[iB].connections.length - state.B[iB].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0), "for iA and iB:",iA,iB,"at xints",state.A[iA].xint,state.B[iB].xint)
                // stop+=1
                break
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
    var vertices = []
    var creases = []
    const upperBound = Math.max(...state.A.map(a => a.P.y))*2+1
    // console.log(state.A.map(a => a.P.y), upperBound)
    const lowerBound = Math.min(...state.B.map(b => b.P.y))*2-1

    for(const c of state.A){
        //c is an input crease
        vertices.push(c.P)
        newV = new Vertex(c.xint-upperBound*Math.cos(state.theta),upperBound*Math.sin(state.theta))
        vertices.push(newV)
        newC = new Crease(c.P,newV,c.mv)
        c.P.creases.push(newC)
        newV.creases.push(newC)
        creases.push(newC)

    }
    for(const c of state.B){
        vertices.push(c.P)
        newV = new Vertex(c.xint+lowerBound*Math.cos(state.theta),lowerBound*Math.sin(state.theta))
        vertices.push(newV)
        newC = new Crease(c.P,newV,c.mv)
        c.P.creases.push(newC)
        newV.creases.push(newC)
        creases.push(newC)
    }
    for(const connection of state.connectorCreases){
        newC = new Crease(connection.creases[0].P,connection.creases[1].P,connection.mv)
        connection.creases[0].P.creases.push(newC)
        connection.creases[1].P.creases.push(newC)
        creases.push(newC)
    }
    vertices.push(state.leftEndpoint.P)
    vertices.push(state.rightEndpoint.P)

    //TODO: if the length of any connector crease is 0, merge the vertices together. If any two creases have the same xint, merge them together (or maybe they need to have the same x and y coordinates for P? don't think it should make a difference)

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


//==============old code================
// function placeVertices2(state){
    //     "an experimental alternative algorithm. currently not used"
    
    //     state.leftEndpoint.L = 0
    //     state.rightEndpoint.L = 0
        
    //     var iA = 0 //iA will mean the most recently finished index
    //     var iB = 0
    //     var stop = 0
    //     var beta = state.beta_0
    //     var steppingFrom = null
    //     var newPlacement = null
        
    //     //hard coding the first in each
    
    //     firstCrease = state.firstCrease
    //     if(firstCrease == state.A[0]){
    //         state.A[0].L = 0
    //         state.B[0].L = state.B[0].xint == state.A[0].xint? 0 : Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.B[0].xint-state.A[0].xint)
    //         state.B[0].P.x -= state.B[0].L*Math.cos(state.theta)
    //         state.B[0].P.y -= state.B[0].L*Math.sin(state.theta)
    //     } else {
    //         state.B[0].L = 0
    //         state.A[0].L = state.A[0].xint == state.B[0].xint? 0 : Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.A[0].xint-state.B[0].xint)
    //         state.A[0].P.x -= state.A[0].L*Math.cos(state.theta)
    //         state.A[0].P.y += state.A[0].L*Math.sin(state.theta)
    //     }
    
    //     while(stop<100 & iB != state.B.length-1 & iA != state.A.length-1){
    //         console.log("iA and iB:", iA, iB)
    //         if(state.A[iA+1].connectedCreases.length == 1){
    //             console.log("A has a zero crease",iA +1 )
    //             state.A[iA+1].L = 0
    //             iA += 1
    //             continue
    //         }
    //         if(state.B[iB+1].connectedCreases.length == 1){
    //             console.log("B has a zero crease",iB + 1)
    //             state.B[iB+1].L = 0
    //             iB += 1
    //             continue
    //         }
    //         "1. Pick which you're stepping from    2. Calculate beta    3. apply beta to place the next one"
    
    //         //pick where stepping from
    //         if(state.A[iA].connections.length>1 & (state.A[iA].L === 0 || state.A[iA].connections.length - state.A[iA].connectedCreases.reduce((sum,connection)=>  connection.L!==null? sum+1:sum+0, 0) == 1)){ //if all of A[iA]'s connections except for one have a defined L, or if A.L is 0
    //             steppingFrom = state.A[iA]
    //             // console.log("A steps forward from",state.A[iA].xint)
    //         } else{
    //             steppingFrom = state.B[iB]
    //             // console.log("B steps forward from",state.B[iB].xint)
    //         }
            
    //         //calculate beta
    //         if(state.A[iA].L == 0 & state.B[iB].L == 0){ //this condition does not pass test 5b
    //             beta = 0
    //         } else if(steppingFrom.L === 0) {
    //             beta = state.beta_0 
    //             //when we're using beta_0, that means we're also using the other direction too because this vertex will have two undefined connections
    //         } else {
    //             steppingFrom.angles = steppingFrom.connectedCreases.map((crease)=>angle(steppingFrom.P,crease.P))
    //             steppingFrom.angles.pop() //because the last one hasn't been set yet, it's P is at 0
    //             steppingFrom.angles = [Math.PI-state.theta].concat(steppingFrom.angles).sort()
    //             beta = alternatingSum(steppingFrom.angles) - Math.PI
    //         }
            
    
    //         // the new placement will be the last one added to connectedCreases
    //         newPlacement = steppingFrom.connectedCreases[steppingFrom.connectedCreases.length-1]
    
    //         //new placement is either iA+1, or iB+1
    
    //         newPlacement.L = steppingFrom.L + Math.sin(beta)/Math.sin(Math.PI-beta-state.theta) * (newPlacement.xint - steppingFrom.xint) //from law of sines
    //         newPlacement.P.x -= Math.abs(newPlacement.L)*Math.cos(state.theta)
    //         newPlacement.P.y += newPlacement.L*Math.sin(state.theta) //watch out, this crease could be in A or in B
    
    //         // if(newPlacement in state.A){iA += 1} else {iB += 1} 
    //         console.log("stepping from",steppingFrom.side,steppingFrom.index, ", beta is",beta,", newplacement is",newPlacement.side,newPlacement.index)
    //         if(newPlacement.side == "side A"){iA += 1} else {iB += 1}
    //         stop+=1
    //     }
    
    //     console.log("== Vertex placement complete ==")
    //     console.log(state)
    //     return state
    // }
    
// function graph(state){
//     "make the graph connections. start with the across connections first (in case there are any zero pleats) and then do the neighbor connections"
//     state.connectorCreases = [] //may want to clear each crease's own connections list if this is is meant to properly reset

//     //Connect the ridge to the first and last crease. A and B are still sorted
//     var firstCrease = state.Ainput[0]<state.Binput[0]? state.A[0]: state.B[0]
//     var lastCrease = state.Ainput[state.Ainput.length-1]>state.Binput[state.Binput.length-1]? state.A[state.A.length-1]: state.B[state.B.length-1]
//     //these creases don't exist, all we want is the connection, so the actual crease is A
//     var leftEndpoint = new InputCrease(firstCrease.xint-0.5,'A')
//     var rightEndpoint = new InputCrease(lastCrease.xint+0.5,'A') 
//     state.firstCrease = firstCrease
//     state.lastCrease = lastCrease
//     state.leftEndpoint = leftEndpoint
//     state.rightEndpoint = rightEndpoint

//     var currentmv = firstCrease.mv
//     var oppositemv = currentmv == 'V'?'M':'V'
//     connect(firstCrease,leftEndpoint,state,oppositemv)
//     connect(lastCrease,rightEndpoint,state,lastCrease.mv)

//     //connect the first creases of each set together
//     connect(state.A[0],state.B[0],state,currentmv)

//     //hard coding first few positions
//     if(firstCrease == state.A[0]){
//         state.B[0].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.B[0].xint-state.A[0].xint)
//         state.B[0].P.x -= state.B[0].L*Math.cos(state.theta)
//         state.B[0].P.y -= state.B[0].L*Math.sin(state.theta)
//         // state.A[1].L = 0-Math.sin(state.beta_0)/Math.sin(state.theta-state.beta_0)*(state.A[1].xint-state.A[0].xint)
//         //this second one doesn't seem right for the n to n no shifting case
//     } else {
//         state.A[0].L = Math.sin(state.theta + state.beta_0)/Math.sin(state.beta_0) * (state.A[0].xint-state.B[0].xint)
//         // state.B[1].L = 0-Math.sin(state.beta_0)/Math.sin(state.theta-state.beta_0)*(state.B[1].xint-state.B[0].xint)
//         state.A[0].P.x -= state.A[0].L*Math.cos(state.theta)
//         state.A[0].P.y += state.A[0].L*Math.sin(state.theta)
//     }

//     var iA = 0
//     var iB = 0
//     var stop = 0 
//     while(stop<100){
//         //end conditions: if you reach the end of A or the end of B, that's the end--connect it to the remainder of the other set
//         if(iA==state.A.length-1){
//             console.log("now on the last A")
//             while(iB < state.B.length-1){
//                 //"pivoting" around A[iA], the last of A
//                 iBmv = state.B[iB].connections.map(c => c.mv)
//                 iBmv.push(state.B[iB].mv)//the mv of iB.P's current connections
//                 bmv = iBmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"

//                 connect(state.B[iB],state.B[iB+1],state,bmv)
//                 connect(state.A[iA],state.B[iB+1],state,bmv=='V'?'M':'V')
//                 iB += 1
//             }
//             return state
//         }
//         if(iB==state.B.length-1){
//             console.log("now on the last B")
//             while(iA < state.A.length-1){
//                 //pivoting around the last of B
//                 iAmv = state.A[iA].connections.map(c => c.mv)
//                 iAmv.push(state.A[iA].mv)//the mv of iB.P's current connections
//                 amv = iAmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"

//                 connect(state.A[iA],state.A[iA+1],state,amv)
//                 connect(state.B[iB],state.A[iA+1],state,amv=='V'?'M':'V')
//                 iA += 1
//             }
//             return state
//         }
//         //main operation. the condition here decides which one steps forward--this seems to be a key thing
//         //maybe take into consideration who is ready by maekawa?
//         // if(state.A[iA].xint < state.B[iB].xint){
//         if(Math.abs(alternatingSum(state.A.slice(0,iA+1).map(a=>a.xint))) < Math.abs(alternatingSum(state.B.slice(0,iB+1).map(a=>a.xint)))){
//             console.log("A steps forward")
//             iAmv = state.A[iA].connections.map(c => c.mv)
//             iAmv.push(state.A[iA].mv)//the mv of iB.P's current connections
//             amv = iAmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"

//             connect(state.A[iA],state.A[iA+1],state,amv)
//             connect(state.B[iB],state.A[iA+1],state,amv=='V'?'M':'V')

//             iA += 1
//         } else{
//             console.log("B steps forward")
//             iBmv = state.B[iB].connections.map(c => c.mv)
//             iBmv.push(state.B[iB].mv)//the mv of iB.P's current connections
//             bmv = iBmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0) > 0? "M":"V"//go with the one there are more of
//             // console.log(iBmv,iBmv.reduce((total,x) => (x=='M' ? total+1 : total-1), 0),bmv)
//             connect(state.B[iB],state.B[iB+1],state,bmv)//oppositemv)
//             connect(state.A[iA],state.B[iB+1],state,bmv=='V'?'M':'V')//currentmv)
//             iB += 1
//         }
//     }
//     // return state
// }