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
        theta:parseFloat(angle.value) * (2*Math.PI)/360,
        beta_0:parseFloat(beta0.value) * (2*Math.PI)/360,
        ainput:a,
        binput:b,
        startmv:mvInput.value,
    }
    console.log("alternating sums are equal:",alternatingSum(a)==alternatingSum(b))
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
    constructor(xint,mv){
        this.xint = xint 
        this.mv = mv
        this.P = new Vertex(xint,0)
        this.L = 0
        this.connections = []
    }
}

class Connection{
    //a crease that connects two input creases
    constructor(inputCrease1,inputCrease2){
        this.creases = [inputCrease1,inputCrease2]
        this.mv = 'A'//start out undefined, define later
    }
}

function setup(state){
    "takes parsed input and makes the appropriate objects to represent it. Input are state properties ainput and binput, outputs are the more useful A and B"
    var A = [] //list of inputCrease objects
    var B = [] //list of inputCrease objects
    const startmv = state.startmv
    othermv = startmv=="M"?"V":"M"
    for(i=0;i<state.ainput.length;i++){
        A.push(new InputCrease(state.ainput[i], i%2==0?startmv:othermv))
    }
    for(i=0;i<state.binput.length;i++){
        B.push(new InputCrease(state.binput[i], i%2==0?startmv:othermv))
    }
    state.A = A
    state.B = B
    return state
}

function graph(state){
    "make the graph connections. start with the across connections first (in case there are any zero pleats) and then do the neighbor connections"
    state.connectorCreases = [] //may want to clear each crease's own connections list if this is is meant to properly reset

    //Connect the ridge to the first and last crease. A and B are still sorted
    var firstCrease = state.ainput[0]<state.binput[0]? state.A[0]: state.B[0]
    var lastCrease = state.ainput[state.ainput.length-1]>state.binput[state.binput.length-1]? state.A[state.A.length-1]: state.B[state.B.length-1]
    //these creases don't exist, all we want is the connection, so the actual crease is A
    var leftEndpoint = new InputCrease(firstCrease.xint-0.5,'A')
    var rightEndpoint = new InputCrease(lastCrease.xint+0.5,'A') 
    connect(firstCrease,leftEndpoint,state)
    connect(lastCrease,rightEndpoint,state)

    //connect the first creases of each set together, and the last creases of each set together
    connect(state.A[0],state.B[0],state)
    // connect(state.A[state.A.length-1],state.B[state.B.length-1],state)

    //hard code these two guaranteed connections
    if(firstCrease === state.A[0]){
        connect(state.A[0],state.A[1],state)
        connect(state.B[0],state.A[1],state)
    } else{
        connect(state.B[0],state.B[1],state)
        connect(state.A[0],state.B[1],state)
    }
    //After this, both of the current creases (the first crease of one set and the second crease of the other) have two connections, and each need an odd number of more. In the next move, at least one (or both) will need to connect to neighbor. remember that there may be multiple solutions. for now, let's only allow one at a time to connect to neighbor
    //every step creates a neighbor connection and an across connection
    //the other option is to have every neighbor connect, and use zero pleats to fix where necessary

    /*
    Graph connectoins algorithm (attempt 1)
    start with the left-most crease. If it has an odd number of creases, connect it to the next across crease
    how do you know when it should connect to the next neighbor or not?
    */
    let ia = 0 //the iterator for A. A[ia] is the leftmost crease that still needs more connections
    let ib = 0 //the iterator for B
    var stop = 0
    // while(!(ia>=state.A.length-1 && ib >= state.B.length-1) | stop==1000){
    //     //every turn, someone (x) will have to connect to its neighbor and move on, while the other stays where it is and connects to (x). how do you decide who is x? there are also some cases where they connect to their neighbor. The one that connects to its neighbor is done. "done" will for now mean it has an odd number of connections

    //     var aIsReady = state.A[ai].connections.length %2==0 //a is ready to connect to its final crease, or neighbor
    //     var bIsReady = state.B[bi].connections.length %2==0 



    //     stop += 1
    // }

    //for now, connect all neighbors to each other--this is not necessarily true in all cases
    // for(i=0;i<state.A.length-1;i++){
    //     connect(state.A[i],state.A[i+1],state)
    // }
    // for(i=0;i<state.B.length-1;i++){
    //     connect(state.B[i],state.B[i+1],state)
    // }
    return state
}

function placeVertices(state){
    "move the vertices around. Define a length L for all input creases"

    // for now, let's give everyone L = 1 so we can visualize graph connections
    for(const Ai of state.A){
        Ai.L = 1
    }
    for(const Bi of state.B){
        Bi.L = 1
    }

    //at the end, everyone's P is set based on L and theta
    for(const Ai of state.A){
        Ai.P.x -= Ai.L*Math.cos(state.theta)
        Ai.P.y += Ai.L*Math.sin(state.theta)
    }
    for(const Bi of state.B){
        Bi.P.x -= Bi.L*Math.cos(state.theta)
        Bi.P.y -= Bi.L*Math.sin(state.theta)
    }
    return state
}

function render(state){
    //go through all the data stored in the state and create a cp object to be displayed
    //creases come from state.connections, as well as the input creases (need new vertices for upper and lower bounds)
    //vertices come from P and the newly made upper and lower bound vertices
    //deal with zero pleats
    var vertices = []
    var creases = []
    const upperBound = 2
    const lowerBound = 2
    for(const c of state.A){
        //c is an input crease
        vertices.push(c.P)
        newV = new Vertex(c.xint-upperBound*Math.cos(state.theta),upperBound*Math.sin(state.theta))
        vertices.push(newV)
        creases.push(new Crease(c.P,newV,c.mv))
    }
    for(const c of state.B){
        vertices.push(c.P)
        newV = new Vertex(c.xint-lowerBound*Math.cos(state.theta),-lowerBound*Math.sin(state.theta))
        vertices.push(newV)
        creases.push(new Crease(c.P,newV,c.mv))
    }
    for(const connection of state.connectorCreases){
        creases.push(new Crease(connection.creases[0].P,connection.creases[1].P,'A'))
    }

    //TODO: if the length of any connector crease is 0, merge the vertices together. If any two creases have the same xint, merge them together (or maybe they need to have the same x and y coordinates for P? don't think it should make a difference)

    //rescale everything to fit in the box. xmin goes to 0, xmax goes to 1
    //also, flip the y upside down
    const xmin = Math.min(...state.ainput,...state.binput)-upperBound*Math.cos(state.theta)
    const xmax = Math.max(...state.ainput,...state.binput)+1
    for(const v of vertices){
        v.x = (v.x-xmin)/(xmax-xmin)
        v.y = -1*v.y/(xmax-xmin) + 0.5
    }

    console.log(vertices,creases)
    return new CP(vertices,creases)
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
function connect(inputCrease1,inputCrease2,state){
    var connection = new Connection(inputCrease1,inputCrease2)
    state.connectorCreases.push(connection)
    inputCrease1.connections.push(connection)
    inputCrease2.connections.push(connection)

}
function eq(a,b){
    //return whether a and b are "close enough"
    return Math.abs(a-b)<10**-10
}