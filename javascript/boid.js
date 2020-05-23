class Boid {
    constructor() {
        this.position = createVector(random(0, width), random(0, height));
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(2, 15));
        this.acceleration = createVector();
        this.maxForce = 0.3;
        this.maxSpeed = 15;
        this.alignmentRange = 70;
        this.cohesionRange = 70;
        this.seperationRange = 20;
    }

    update() {
        this.velocity.limit(this.maxSpeed);
        this.position.add(p5.Vector.mult(this.velocity, deltaTime / 50));
        this.velocity.add(this.acceleration);

        this.HandleEdges()
    }

    show() {
        strokeWeight(8);
        stroke(255);
        point(this.position.x, this.position.y);
    }

    flock(boids) {
        //Check for boids in range
        let alignmentBoids = [];
        let cohesionBoids = [];

        for (let other of boids) {
            if (other === this) {
                continue;
            }
            let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
            if (distance < this.alignmentRange) {
                alignmentBoids.push(other);
            }
            if (distance < this.cohesionRange){
                cohesionBoids.push(other);
            }
        }

        this.acceleration.set(0, 0);

        //Alignment
        if (alignmentBoids.length > 0) {
            let alignment = this.alignment(alignmentBoids);
            this.acceleration.add(alignment);
        }

        //Cohesion
        if (cohesionBoids.length > 0){
            let cohesion = this.cohesion(cohesionBoids);
            this.acceleration.add(cohesion);
        }
    }

    alignment(boids) {
        let steering = createVector();

        for (let other of boids) {
            steering.add(other.velocity);
        }

        steering.div(boids.length);
        steering.setMag(this.maxSpeed);
        steering.sub(this.velocity);
        steering.limit(this.maxForce);

        return steering;
    }

    cohesion(boids) {
        let steering = createVector();

        for (let other of boids) {
            steering.add(other.position);
        }

        steering.div(boids.length);
        steering.sub(this.position);
        steering.setMag(this.maxSpeed);
        steering.sub(this.velocity);
        steering.limit(this.maxForce);

        return steering;
    }

    HandleEdges() {
        if (this.position.x < 0) {
            this.position.x = width;
        } else if (this.position.x > width) {
            this.position.x = 0;
        }

        if (this.position.y < 0) {
            this.position.y = height;
        } else if (this.position.y > height) {
            this.position.y = 0;
        }
    }
}