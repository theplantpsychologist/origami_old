/*
Features to add, prioritized
- generate with less errors. main problem right now is in the 5 vertex weird case, which causes overlapping creases and shit (2c)
- fix big/small/big angle rules, and perhaps a more efficient mv assignment
    -try changing the assignment rules--instead of making the vertex be based on the incoming crease,
    have it pick whichever direction it's closest to, and only use the incoming crease in the event of tiebreaker
    -also try having it prioritize radially alternating creases as much as possible
- add css/make look good (put credits at bottom)
- show progression, drawing a new crease every few frames or something. toggleable option [update: why is this so annoying]
- progress update messages, display info like crease count/crease density
- import .cp seed
- separate cp filling/mv assignment tools

- figure out how to sync up with origami simulator--to impress the non folders
- connect to neural network somehow? back propagate to regenerate seed
- teach neural net to create seed for given x ray. once the x ray is close enough, assign mv. now have 2d figure generation
- in the seed: what's the best ratio between lateral and diagonal creases?
*/

function generate(){
    console.log('===========new generation===========')
    paper.project.clear();
    var border = new paper.Path.Rectangle(0,0,400,400);
    border.strokeColor = 'black';
    border.strokeWidth = 4;

    const grid = parseInt(gridsize.value)
    const density = parseFloat(creasedensity.value)
    const even = true //allow diagonals from only certain vertices. idk it's hard to explain
    //showProgress = document.getElementById('progression').checked
    if(density>1 || density<0 || grid<1){
        alert("Something went wrong. Please remember: \n   The grid size must be an integer greater than or equal to 1 \n   The density must be a decimal between 0 and 1")
        return
    } else if(density==1){alert('Sorry, there is a bug caused by a density of 1. Try something like 0.9999 instead.');return}
    
    var newcp = newSeed(grid,density)
    newcp.vertices.forEach(element => {
        element.x /= grid; element.y /= grid
    });
    extend(newcp)
    var invalids = findInvalids(newcp.vertices)
    displayGrid(grid,0,0,400,400)
    displayCp(newcp,0,0,400,400)
    return newcp
}

//step 1 is to create a seed of a few random creases from which the rest of the cp will be deterministically generated (except mv uses some random)
function newSeed(grid,density){
    /*
    Generate a seed of random creases from which the rest of the cp will be drawn to accomodate.
    The number of initial creases drawn is based on the density input.
    The creases are stored in the creases list, and the vertices in the vertices list.
    Each vertex will keep track of all the creases attached to it.
    Of all the possible creases, the chance of it being diagonal is n^2/(3n^2-2n) where n is the grid size
    First decide whether the random crease will be diagonal or lateral
    if diagonal, pick 2 random numbers, both from [0,n-1] and those will be the coords of the diagonal
    if lateral, pick random from [1,n-1] to decide line, and [1,n] to decide segment of the line, then [0,1] to decide horizontal or vertical
    if this crease is already added, choose again.
    */
    var vertices = []
    var creases = []
    initialCreaseNumber = Math.floor(density*(3*grid**2-2*grid))
    mainloop: for(var i = 0; i< initialCreaseNumber; i++){
        if (Math.random()<grid**2/(3*grid**2-2*grid)){
            //generate a random diagonal
            a = Math.floor(Math.random()*(grid))
            b = Math.floor(Math.random()*(grid))
            if((a+b)%2==0){
                //creates diagonal with slope of 1
                v1 = new Vertex(a,b)
                v2 = new Vertex(a+1,b+1)
                //crease = new Crease(v1,v2)
            } else {
                //creates diagonal with slope of -1
                v1 = new Vertex(a+1,b)
                v2 = new Vertex(a,b+1)
            }
        } else {
            //generate a random lateral
            a = Math.floor(Math.random()*(grid-1)) +1
            b = Math.floor(Math.random()*(grid)) 
            if(Math.random()<0.5){
                //vertical crease
                v1 = new Vertex(a,b),
                v2 = new Vertex(a,b+1)
            } else{
                //horizontal crease
                v1 = new Vertex(b,a),
                v2 = new Vertex(b+1,a)
            }
        }
        //now that the vertices of this new crease are set, see if these vertices exist or need to be added
        v1exists = false
        v2exists = false
        for(i = 0; i<vertices.length; i++){
            if(vertices[i].x == v1.x && vertices[i].y == v1.y){
                v1 = vertices[i]
                v1exists = true
            }
            if(vertices[i].x == v2.x && vertices[i].y == v2.y){
                v2 = vertices[i]
                v2exists = true
            }
        }
        if(!v1exists){vertices.push(v1)}
        if(!v2exists){vertices.push(v2)}
        crease = new Crease(v1,v2,'A')
        //check to see if such a crease already exists
        for(var i = 0; i<creases.length; i++){
            if(creases[i].vertices.includes(crease.vertices[0]) && creases[i].vertices.includes(crease.vertices[1])){
                //if this crease has already been done before. Also, if the crease already exists, then the vertices should already exist
                i = i-1;
                //make a new crease to make up for it
                continue mainloop
            }
        }
        creases.push(crease)
        crease.vertices[0].creases.push(crease)
        crease.vertices[1].creases.push(crease)
    }
    return new CP(vertices,creases)
}

//step 2 is to fill in the rest of the creases based on the seed, to satisfy angle flat foldability
function extend(cp){
    /*
    Fill in creases based on the ones generated in step 1.

    Fix all maekawas in the list of invalids
    If there are no more maekawas, fix one kawasaki. 
    Repeat until no more invalids.
    */

    var invalids = findInvalids(cp.vertices)
    var stopper = 0
    while(invalids.length >0 & stopper < 1000){
        for(const vertex of invalids){
            if(vertex.reason = 'odd creases'){
                fixMaekawa(vertex,cp)
                // invalids = findInvalids(cp.vertices)
                // stopper ++
                // continue mainloop
            }
        }
        // try{
        //     fixMaekawa(invalids.find((element) => element.reason = "odd creases") , cp)
        // } catch{ //if there are no maekawas to fix
        //     fixKawasaki(invalids[0]) 
        // }
        invalids = findInvalids(cp.vertices)
        stopper ++
    }
    console.log(stopper)

}
function findInvalids(vertices){
    invalids = []
    for(const vertex of vertices){
        if(!isVertexFlatFoldable(vertex)){
            invalids.push(vertex)
        }
    }
    return invalids
}
function fixMaekawa(vertex,cp){
    if(vertex == null){throw new Error('catch me')}
    //fix a vertex with an odd number of creases
    
    if(vertex.creases.length == 1){
        var othervertex = vertex.creases[0].vertices[ vertex.creases[0].vertices[0]==vertex? 1:0  ]
        var newvertex = cp.vertices.find((element) => eq(element.x,vertex.x + (vertex.x-othervertex.x))&eq(element.y,vertex.y + (vertex.y-othervertex.y)))
        if(newvertex == null){newvertex = new Vertex(vertex.x + (vertex.x-othervertex.x) , vertex.y +(vertex.y-othervertex.y))}

        var newcrease = new Crease(newvertex,vertex,'A')
        vertex.creases.push(newcrease)
        newvertex.creases.push(newcrease)
        cp.creases.push(newcrease)
    }
}
function fixKawasaki(vertex){
    if(vertex.reason != 'angle sum'){console.log(vertex.reason);throw new Error('this is not a kawasaki error')}
}


function assignmv(cp){

}
function displayGrid(grid,x1,y1,x2,y2){
    scale = (y2-y1)/grid //ratio of pixels to grid units

    var gridlines = new paper.Group();
    for(i=1; i<grid; i++){
        line1 = new paper.Path.Line(
            new paper.Point(x1,i*scale),
            new paper.Point(x2,i*scale)
        )
        line2 = new paper.Path.Line(
            new paper.Point(i*scale,y1),
            new paper.Point(i*scale,y2)
        )
        gridlines.addChild(line1);
        gridlines.addChild(line2);
    }
    gridlines.strokeColor = '#CDCDCD'
    gridlines.strokeWidth = 1
    return gridlines
}

// //save as .cp
// function download(){
//     //https://www.delftstack.com/howto/javascript/javascript-download/
//     var cpFile = ""
//     scale = 400/grid
//     for(var i = 0; i<creases.length; i++){
//         //add each crease
//         cpFile += (creases[i].mv=='red'? '2 ':'3 ') + `${creases[i].vertices[0].x*scale-200} ${creases[i].vertices[0].y*-1*scale+200} ${creases[i].vertices[1].x*scale-200} ${creases[i].vertices[1].y*-1*scale+200}\n`
//     }
//     for(var i = 0; i<grid; i++){
//         //add the border
//         cpFile += `1 ${i*scale-200} -200 ${(i+1)*scale-200} -200\n`
//         cpFile += `1 ${i*scale-200} 200 ${(i+1)*scale-200} 200\n`
//         cpFile += `1 -200 ${i*scale-200} -200 ${(i+1)*scale-200}\n`
//         cpFile += `1 200 ${i*scale-200} 200 ${(i+1)*scale-200}\n`
//     }
//     var element = document.createElement('a');
//     element.setAttribute('href','data:text/plain;charset=utf-8,' + encodeURIComponent(cpFile));
//     element.setAttribute('download',"random_cp.cp")
//     document.body.appendChild(element);
//     element.click();
// }

//auxilary functions
function shuffle(array) {
    //https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    let currentIndex = array.length,  randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
}
