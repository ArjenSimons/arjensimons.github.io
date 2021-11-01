let boids = [];
let canvas;
let checked = false;
let qt;

function setup() {
    background(51);

    canvas = createCanvas(windowWidth, windowHeight + 30);
    canvas.parent('homecontent');

    spawnBoids();

    rectMode(CENTER);

}

function draw() {
    background(51);
    updateBoids();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight + 30);
    spawnBoids();
}

function updateBoids(){
    qt = new QuadTree(new Rectangle(canvas.width * .5, canvas.height * .5, canvas.width, canvas.height));

    // for(let i = 0;  i < 239; i ++){
    //     qt.insert(createVector(random(canvas.width), random(canvas.height)));
    // }

    //Add boids to quad tree
    for(let boid of boids) {
        qt.insert(boid);
    }

    //Setting stroke for boids
    let weight = width * .01;
    if (weight > 10) {
        weight = 10
    }
    strokeWeight(weight);
    stroke(0, 232, 232);


    for(let boid of boids){
        boid.show();
        boid.update();
        //boid.flock(boids);
        let boidsInRange = qt.queryRange(boid.getRange())
        boid.flock(boidsInRange);
        //if (boidsInRange.length > 10) console.log(boidsInRange.length);
        //if (!checked) console.log(boidsInRange.length);
    }
    checked = true;
    stroke(255);
    //qt.show();

    textSize(32);

    //text(frameRate(), width / 2, height / 2);
}

function spawnBoids(){
    boids = [];
    for (let i = 0; i < 330; i++){
        boids.push(new Boid());
    }
}