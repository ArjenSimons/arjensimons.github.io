class Boid {
    constructor() {
        this.position = createVector(random(0, width), random(0, height));
        this.velocity = p5.Vector.random2D();
        this.velocity.setMag(random(2, 15));
        this.acceleration = createVector();
        this.maxForce = 1;
        this.maxSpeed = 15;
        this.alignmentRange = 70;
        this.cohesionRange = 70;
        this.seperationRange = 40;
        this.alignmentWeight = 1.8;
        this.cohesionWeight = 1;
        this.separationWeight = 1.2;
    }

    update() {
        this.velocity.limit(this.maxSpeed);
        this.position.add(p5.Vector.mult(this.velocity, deltaTime / 50));
        this.velocity.add(this.acceleration);
        this.acceleration.set(0, 0);

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
        let separationBoids = [];

        for (let other of boids) {
            if (other === this) {
                continue;
            }
            let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
            if (distance < this.alignmentRange) {
                alignmentBoids.push(other);
            }
            if (distance < this.cohesionRange) {
                cohesionBoids.push(other);
            }
            if (distance < this.seperationRange) {
                separationBoids.push(other);
            }
        }

        //Alignment
        if (alignmentBoids.length > 0) {
            let alignment = this.alignment(alignmentBoids);
            alignment.mult(this.alignmentWeight);
            this.acceleration.add(alignment);
        }

        //Cohesion
        if (cohesionBoids.length > 0) {
            let cohesion = this.cohesion(cohesionBoids);
            cohesion.mult(this.cohesionWeight);
            this.acceleration.add(cohesion);
        }

        //Separation
        if (separationBoids.length > 0) {
            let separation = this.separation(separationBoids);
            separation.mult(this.separationWeight);
            this.acceleration.add(separation);
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

    separation(boids) {
        let steering = createVector();

        for(let other of boids){
            let distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
            let diff = p5.Vector.sub(this.position, other.position);
            diff.div(distance); //Closer boids will have stronger impact on this void

            steering.add(diff);
        }

        steering.div(boids.length);
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