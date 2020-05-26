let boids = [];
let canvas;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight - 100);
    canvas.parent('homecontent');

    spawnBoids();

    let qt = new QuadTree(new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width, canvas.height));

    for(let i = 0;  i < 5; i ++){
        qt.insert(createVector(random(canvas.width), random(canvas.height)));
    }

    let v = createVector(random(canvas.width), random(canvas.height));

    console.log(qt);
}

function draw() {
    background(51);

    ellipse(windowWidth / 2, (windowHeight - 100) / 2, 50, 50);
    resizeCanvas(windowWidth, windowHeight - 100);

    //let quadTree =  new QuadTree(new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width, canvas.height));

    for(let boid of boids){
        boid.show();
        boid.update();
        boid.flock(boids);
    }

    textSize(32);

    text(frameRate(), width / 2, height / 2);
}

function windowResized() {
    spawnBoids();
}

function spawnBoids(){
    boids = [];
    for (let i = 0; i < 400; i++){
        boids.push(new Boid());
    }
}