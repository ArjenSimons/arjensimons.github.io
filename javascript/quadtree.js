class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.halfWidth = this.w / 2;
        this.halfHeight = this.h / 2;
    }

    contains(point) {
        return (
            point.x >= this.x - this.halfWidth &&
            point.x <= this.x + this.halfWidth &&
            point.y >= this.y - this.halfHeight &&
            point.y <= this.y + this.halfHeight
        )
    }

    intersects(range) {
        return !(this.x - this.halfWidth >= range.x + range.halfWidth ||
            this.x + this.halfWidth <= range.x - range.halfWidth ||
            this.y - this.halfHeight >= range.y + range.halfHeight ||
            this.y + this.halfHeight <= range.y - range.halfHeight)
    }
}

class QuadTree {
    constructor(boundry) {
        this.boundry = boundry;
        this.capacity = 10;
        this.boids = [];
        this.divided = false;
    }

    insert(boid) {

        if (!this.boundry.contains(boid.position)) return false;

        if (this.boids.length < this.capacity) {
            this.boids.push(boid);
            return true;
        } else {
            if (!this.divided) {
                this.subdivide();
            }
            if (this.topLeft.insert(boid)) return true;
            if (this.topRight.insert(boid)) return true;
            if (this.bottomLeft.insert(boid)) return true;
            if (this.bottomRight.insert(boid)) return true;
        }
    }

    subdivide() {
        let halfWidth = this.boundry.w / 2;
        let halfHeight = this.boundry.h / 2;
        let quarterWidth = halfWidth / 2;
        let quarterHeight = halfHeight / 2;

        this.topLeft = new QuadTree(new Rectangle(this.boundry.x - quarterWidth, this.boundry.y + quarterHeight, halfWidth, halfHeight));
        this.topRight = new QuadTree(new Rectangle(this.boundry.x + quarterWidth, this.boundry.y + quarterHeight, halfWidth, halfHeight));
        this.bottomLeft = new QuadTree(new Rectangle(this.boundry.x - quarterWidth, this.boundry.y - quarterHeight, halfWidth, halfHeight));
        this.bottomRight = new QuadTree(new Rectangle(this.boundry.x + quarterWidth, this.boundry.y - quarterHeight, halfWidth, halfHeight));

        this.divided = true;
    }

    queryRange(range) {
        let boidsInRange = [];

        //Return empty array when not in range
        if (!this.boundry.intersects(range)) return boidsInRange;

        for (let boid of this.boids) {
            if (range.contains((boid.position))) {
                boidsInRange.push(boid);
            }
        }

        //Stop if there are no child quads
        if (!this.divided) return boidsInRange;

        boidsInRange = boidsInRange.concat(this.topLeft.queryRange(range));
        boidsInRange = boidsInRange.concat(this.topRight.queryRange(range));
        boidsInRange = boidsInRange.concat(this.bottomLeft.queryRange(range));
        boidsInRange = boidsInRange.concat(this.bottomRight.queryRange(range));

        return boidsInRange;
    }

    show() {
        stroke(255);
        strokeWeight(1);
        noFill();
        rect(this.boundry.x, this.boundry.y, this.boundry.w, this.boundry.h);

        if (this.divided) {
            this.topLeft.show();
            this.topRight.show();
            this.bottomLeft.show();
            this.bottomRight.show();
        }
    }
}