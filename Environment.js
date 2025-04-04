class MockSelf {  // Used in the perturbation game
    #navigating;
    #location;
    #action_pos_dict = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    #gameType;
    #startLoc;
    #oscillation_dir; // For perturbed contingency game

    constructor(gameType, location) {
        this.#navigating = true;
        this.#location = location;
        this.#startLoc = location;
        this.#gameType = gameType;

        if (this.#gameType === 'contingency_perturbed') {
            this.#oscillation_dir = rand(2) // 0 = Horizontal, 1 = Vertical
        }
    }

    set_location(loc) {
        this.#location = loc;
    }

    start_navigating() {
        this.#navigating = true;
    }

    get_location() {
        return (this.#location);
    }

    is_navigating() {
        return (this.#navigating);
    }

    random_move(move_choices, board) {
        var rn;
        var stay;

        let cc = {}

        function add_choice(value, index, array) {
            cc[value] = 0;
        }

        move_choices.forEach(add_choice);

        do {
            if (Object.values(cc).every(item => item !== 0)) { // stay, cannot move anywhere
                stay = true;
                break;
            }

            // Pick a random direction to move
            rn = move_choices[Math.floor(Math.random() * move_choices.length)];

            if (cc[rn] === 0) {
                cc[rn]++;
            }

        } while (!this.canMove(rn, board)); // iterate if ns cannot move TODO: canMoveNs???

        if (!stay) {
            board[this.#location[0]][this.#location[1]] = 0; // set avatar's old position to grass

            this.#location = [this.#location[0] + this.#action_pos_dict[rn][0],
                this.#location[1] + this.#action_pos_dict[rn][1]];

            board[this.#location[0]][this.#location[1]] = 8;
        }
    }

    // Moving the mock self towards the reward or if not in navigation mode, moves randomly.
    move(board) {
        //console.log("Current location: ", this.get_location(), "Oscil Dir: ", this.#oscillation_dir);
        if (this.#gameType === 'contingency_perturbed') {

            let move_choices = (this.#oscillation_dir === 0) ? [0, 1] : [2, 3];

            // Check if the mock self is in border:
            if (this.#oscillation_dir === 0) {
                if ((this.#startLoc[0] - this.get_location()[0]) === -3) {
                    move_choices = [0];
                } else if ((this.#startLoc[0] - this.get_location()[0]) === 3) {
                    move_choices = [1];
                }
            } else {
                if ((this.#startLoc[1] - this.get_location()[1]) === 3) {
                    move_choices = [3];
                } else if ((this.#startLoc[1] - this.get_location()[1]) === -3) {
                    move_choices = [2];
                }
            }

            this.random_move(move_choices, board)

            return;
        }

        let move_choices = [0, 1, 2, 3];
        let dist_vertical = 10 - this.#location[0];
        let dist_horiz = 10 - this.#location[1];
        let vertical_or_horizontal = rand(2);
        if ((dist_horiz === 0 && (dist_vertical === -1 || dist_vertical === 1)) || (
            dist_vertical === 0 && (dist_horiz === 1 || dist_horiz === -1))) {
            //console.log("Next to goal, not navigating")
            this.#navigating = false;
            if (dist_vertical === -1) {
                move_choices = [0, 2, 3]; // Cannot move down
            } else if (dist_vertical === 1) {
                move_choices = [1, 2, 3]; // Cannot move up
            } else if (dist_horiz === -1) {
                move_choices = [0, 1, 2];
            } else if (dist_horiz === 1) {
                move_choices = [0, 1, 3];
            }
        }

        if (this.is_navigating()) {
            //console.log('Navigating');

            // Navigate to reward
            function check_vertical() {
                if (dist_vertical > 0) {
                    return 1;
                } else if (dist_vertical < 0) {
                    return 0;
                } else {
                    return check_horizontal();
                }
            }

            function check_horizontal() {
                if (dist_horiz > 0) {
                    return 3;
                } else if (dist_horiz < 0) {
                    return 2;
                } else {
                    return check_vertical();
                }
            }

            if (vertical_or_horizontal === 1) {
                let move_dir = check_vertical();
                if (this.canMove(move_dir, board)) {
                    board[this.#location[0]][this.#location[1]] = 0; // set avatar's old position to grass

                    this.#location = [this.#location[0] + this.#action_pos_dict[move_dir][0],
                        this.#location[1] + this.#action_pos_dict[move_dir][1]];

                    board[this.#location[0]][this.#location[1]] = 8;
                }
            } else {
                let move_dir = check_horizontal();
                if (this.canMove(move_dir, board)) {
                    board[this.#location[0]][this.#location[1]] = 0; // set avatar's old position to grass

                    this.#location = [this.#location[0] + this.#action_pos_dict[move_dir][0],
                        this.#location[1] + this.#action_pos_dict[move_dir][1]];

                    board[this.#location[0]][this.#location[1]] = 8;
                }
            }
        } else {
            // Move randomly
            this.random_move(move_choices, board)
        }
    }

    // Checks if the mock self can move to the specified location
    canMove(direction, board) {
        // returns 0 if the ns cannot move to the specified location, 1 if ns can move

        let x = this.#location[0];
        let y = this.#location[1];
        var next = 0;
        switch (direction) {
            case 0: // up
                next = board[x - 1][y];
                break;
            case 1: // down
                next = board[x + 1][y];
                break;
            case 2: // left
                next = board[x][y - 1];
                break;
            case 3: // right
                next = board[x][y + 1];
                break;
        }

        if (next === 1 || next === 8 || next === 3) {
            return 0;
        } else if (next === 0) { // There is grass, can move
            return 1;
        }

    }
}

class Game {
    #board;
    #level_count;
    #avatarPosition;
    #ns_positions;
    #possible_levels = [];
    #gameType;
    #action_count = [];
    #avatar_start_position;
    #ns_interactions = [];
    #wall_interactions = [];
    #maps = [];
    #self_start_locs = [];
    #self_locs = [];
    #ns_locs = []
    #current_self_locs = [];
    #current_ns_locs = [];
    #num_levels;
    #shuffle_key_map;
    #mockSelf;

    constructor(gameType) {
        this.#num_levels = 5;
        this.#gameType = gameType;
        this.#level_count = 0;
        this.#avatarPosition = random_avatar_pos(gameType);
        this.#avatar_start_position = this.#avatarPosition
        this.#self_start_locs.push(JSON.parse(JSON.stringify(this.#avatar_start_position)));
        //this.#current_self_locs.push(JSON.parse(JSON.stringify(this.#avatar_start_position)));
        //console.log(this.#avatarPosition);
        this.#action_count.push(0);
        this.#ns_interactions.push(0);
        this.#wall_interactions.push(0);
        this.shuffle_key_mappings();

        if (gameType === "logic" || gameType === "logic_perturbed") {
            let rn = rand(9);
            logic_levels(this.#possible_levels);
            this.#board = JSON.parse(JSON.stringify(this.#possible_levels[rn]));
        } else if (gameType === "contingency" || gameType === "contingency_perturbed" || gameType === "change_agent" || gameType === "shuffle_keys" ||
            gameType === "change_agent_perturbed") {
            contingency_levels(this.#possible_levels);
            this.#board = JSON.parse(JSON.stringify(this.#possible_levels[0]));

            if (gameType === "change_agent_perturbed" || gameType === "contingency_perturbed") {  // Construct the mock self
                this.#mockSelf = new MockSelf(gameType, random_avatar_pos(gameType, true));

                // Set mock self's position on the board
                this.#board[this.#mockSelf.get_location()[0]][this.#mockSelf.get_location()[1]] = 8;
            }
        }
    }

    isNextToGoal() {
        let dist_vertical = 10 - this.getAvatarPos()[0];
        let dist_horiz = 10 - this.getAvatarPos()[1];

        return ((dist_horiz === 0 && (dist_vertical === -1 || dist_vertical === 1)) || (
            dist_vertical === 0 && (dist_horiz === 1 || dist_horiz === -1)));
    }

    addToMaps(oldMap) {
        this.#maps.push(JSON.parse(JSON.stringify(oldMap)));
    }

    getGameType() {
        return this.#gameType;
    }

    getNumLevels() {
        return this.#num_levels;
    }

    getBoard() {
        return this.#board;
    }

    getNsPositions() {
        return this.#ns_positions;
    }

    getAvatarPos() {
        return this.#avatarPosition;
    }

    getLevelCount() {
        return this.#level_count;
    }

    getCurrentActionCount() {
        return this.#action_count[this.#level_count]
    }

    getLevels() {
        return this.#possible_levels;
    }

    getLevel(levelNo) {
        return this.#possible_levels[levelNo];
    }

    setBoard(board) {
        this.#board = board;
    }

    setAvatarPos(pos) {
        this.#avatarPosition = pos;
    }

    incrementLevelCount() {
        this.#level_count++;
    }

    incrementActionCount() {
        this.#action_count[this.#level_count]++;
    }

    nextLevel() {
        this.addToMaps(this.#board);
        if (this.#gameType === 'logic' || this.#gameType === 'logic_perturbed') {
            if (this.#gameType === 'logic_perturbed') {
                this.#possible_levels = [];
                logic_levels(this.#possible_levels, true);
            }
            let rn = rand(9);
            this.setBoard(JSON.parse(JSON.stringify(this.getLevel(rn))));
            this.setAvatarPos(random_avatar_pos(this.#gameType));
            this.#avatar_start_position = this.#avatarPosition
            this.incrementLevelCount();
        } else if (this.#gameType === 'contingency' || this.#gameType === 'contingency_perturbed' || this.#gameType === "change_agent" ||
            this.#gameType === "shuffle_keys" || this.#gameType === "change_agent_perturbed") {
            this.setBoard(JSON.parse(JSON.stringify(this.getLevel(0))));
            this.setAvatarPos(random_avatar_pos(this.#gameType));
            this.#avatar_start_position = this.#avatarPosition
            this.incrementLevelCount();

            if (this.#gameType === "shuffle_keys") {
                this.shuffle_key_mappings();
            }

            if (this.#gameType === "change_agent_perturbed" || this.#gameType === "contingency_perturbed") {
                // Add the mock self
                this.#mockSelf = new MockSelf(this.#gameType, random_avatar_pos(this.#gameType, true));

                // Set mock self's position on the board
                this.#board[this.#mockSelf.get_location()[0]][this.#mockSelf.get_location()[1]] = 8;
            }
        }

        this.#self_start_locs.push(JSON.parse(JSON.stringify(this.#avatar_start_position)));


        if (this.getLevelCount() === this.#num_levels) {
            //alert("Game Won!");
            //this.#self_locs.push(JSON.parse(JSON.stringify(this.#current_self_locs)))
            this.#self_locs.push(deepCopy(this.#current_self_locs));
            this.#ns_locs.push(deepCopy(this.#current_ns_locs));
            // save the data
        } else {
            this.#action_count.push(0);
            this.#wall_interactions.push(0);
            this.#ns_interactions.push(0);
            //this.#self_locs.push(JSON.parse(JSON.stringify(this.#current_self_locs)))
            this.#self_locs.push(deepCopy(this.#current_self_locs));
            this.#ns_locs.push(deepCopy(this.#current_ns_locs));
            this.#current_self_locs = [];
            this.#current_ns_locs = [];
        }
    }

    shuffle_key_mappings() {
        let random_array = [0, 1, 2, 3];
        this.#shuffle_key_map = rshuffle(random_array);
    }

    // Some of ns sprites will oscillate up and some will oscillate down
    move_ns_contingency() {
        for (let i = 0; i < 3; i++) {
            let curr = this.#ns_positions[i];
            if (curr[2] === 0) {  // horizontal move
                let rn = rand(2); // 0 = left, 1 = right
                if ((this.#ns_positions[i][1] === 17) || (this.#ns_positions[i][1] === 9)) {
                    rn = 0;
                }

                if ((this.#ns_positions[i][1] === 11) || (this.#ns_positions[i][1] === 3)) {
                    rn = 1;
                }

                if (rn === 1) { // right
                    if (this.canMoveNs(3, this.#ns_positions[i]) === 1) {
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 0; // old coor
                        this.#ns_positions[i] = [this.#ns_positions[i][0], this.#ns_positions[i][1] + 1, 0];
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 8; // new coor
                    }
                } else if (rn === 0) { // left
                    if (this.canMoveNs(2, this.#ns_positions[i]) === 1) {
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 0; // old coor
                        this.#ns_positions[i] = [this.#ns_positions[i][0], this.#ns_positions[i][1] - 1, 0];
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 8; // new coor
                    }
                }
            } else if (curr[2] === 1) {  // vertical move
                let rn = rand(2); // 0 = up, 1 = down

                if ((this.#ns_positions[i][0]) === 3 || (this.#ns_positions[i][0] === 11)) {
                    rn = 1;
                }

                if ((this.#ns_positions[i][0] === 9) || (this.#ns_positions[i][0] === 17)) {
                    rn = 0;
                }

                if (rn === 1) { // down
                    if (this.canMoveNs(1, this.#ns_positions[i]) === 1) {
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 0; // old coor
                        this.#ns_positions[i] = [this.#ns_positions[i][0] + 1, this.#ns_positions[i][1], 1];
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 8; // new coor
                    }
                } else if (rn === 0) { // up
                    if (this.canMoveNs(0, this.#ns_positions[i]) === 1) {
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 0; // old coor
                        this.#ns_positions[i] = [this.#ns_positions[i][0] - 1, this.#ns_positions[i][1], 1];
                        this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 8; // new coor
                    }
                }

            }
        }

        if ((this.#gameType === 'change_agent_perturbed') || (this.#gameType === 'contingency_perturbed')) { // Move mock self as well, if it exists
            this.#mockSelf.move(this.getBoard());
        }
    }


    change_agent() {
        if (this.getCurrentActionCount() % 7 !== 0) {
            return;
        }

        let rn = rand(3); // 0, 1, 2
        let temp = this.#avatarPosition;
        //this.getBoard()[temp[0]][temp[1]] = 0; // set avatar's old position to 0
        this.setAvatarPos(this.#ns_positions[rn]);
        this.getBoard()[this.#avatarPosition[0]][this.#avatarPosition[1]] = 8;
        this.#ns_positions[rn] = temp;

        if (this.#mockSelf != null) {
            this.#mockSelf.start_navigating();
        }
    }

    move_ns_change_agent() {
        this.change_agent();
        let action_pos_dict = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let cc = [0, 0, 0, 0];
        var rn;
        var stay = false;
        for (let i = 0; i < 3; i++) {  // Each non-self

            do {
                rn = rand(4); // 0 = left, 1 = right, 2 = up, 3 = down

                if (cc[rn] === 0) {
                    cc[rn]++;
                }

                if (cc[0] !== 0 && cc[1] !== 0 && cc[2] !== 0 && cc[3] !== 0) { // stay, cannot move anywhere
                    stay = true;
                    break;
                }

            } while (this.canMoveNs(rn, this.#ns_positions[i]) === 0); // iterate if ns cannot move

            if (!stay) {
                this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 0; // set avatar's old position to grass

                this.#ns_positions[i] = [this.#ns_positions[i][0] + action_pos_dict[rn][0],
                    this.#ns_positions[i][1] + action_pos_dict[rn][1]];

                this.#board[this.#ns_positions[i][0]][this.#ns_positions[i][1]] = 8;
            }

        }

        if ((this.#gameType === 'change_agent_perturbed') || (this.#gameType === 'contingency_perturbed')) { // Move mock self as well, if it exists
            this.#mockSelf.move(this.getBoard());
        }
    }

    /*
    *
    * up = 0
    * down = 1
    * left = 2
    * right = 3
    *
    */
    move(direction) {
        if ((this.#gameType !== 'logic') && (this.#action_count[this.#level_count] === 0)) {
            this.contingency_ns_pos(); // set initial position of non-self sprites
        }

        if (this.getGameType() === "shuffle_keys") {
            direction = this.#shuffle_key_map[direction];
        }

        // *-*-*-*-*-* Move the non-selves *-*-*-*-*-* //
        if (this.getGameType() === "contingency" || this.getGameType() === "contingency_perturbed" || this.getGameType() === "shuffle_keys") {
            this.move_ns_contingency(); // move non-self sprites
        } else if (this.getGameType() === "change_agent" || this.getGameType() === "change_agent_perturbed") {
            this.move_ns_change_agent(); // move non-self sprites
        } else { // Logic Game
            let poss = [[1, 1], [1, 7], [7, 1], [7, 7]];

            function arraysEqual(a, b) {
                for (var i = 0; i < a.length; ++i) {
                    if (a[i] !== b[i]) return false;
                }
                return true;
            }

            const s = (a) => arraysEqual(a, this.#avatar_start_position);
            poss.splice(poss.findIndex(s), 1);

            //console.log("ns positions: " + poss);
            this.#ns_positions = poss;
        }

        // *-*-*-*-*-* Move the avatar *-*-*-*-*-* //
        if (this.canMove(direction) === 1) { // Can move
            let x = this.getAvatarPos()[0]
            let y = this.getAvatarPos()[1]

            let new_xy = get_new_xy(x, y, direction)
            let new_x = new_xy[0];
            let new_y = new_xy[1];

            this.#board[x][y] = 0; // set avatar's old position to grass
            this.#board[new_x][new_y] = 8;
            this.#avatarPosition = [new_x, new_y];
            this.incrementActionCount();
            this.#current_self_locs.push(deepCopy(this.#avatarPosition));
            this.#current_ns_locs.push(deepCopy(this.#ns_positions));

        } else if (this.canMove(direction) === 2) { // Goal!
            this.nextLevel();
        } else { // cannot move
            if (this.canMove(direction) === 0) { // Wall
                this.#wall_interactions[this.#level_count]++;
            } else if (this.canMove(direction) === -1) { // Non-Self
                this.#ns_interactions[this.#level_count]++;
            }

            this.#current_self_locs.push(deepCopy(this.#avatarPosition));
            this.#current_ns_locs.push(deepCopy(this.#ns_positions));
            this.incrementActionCount();
        }
    }

    // returns 0 if the avatar cannot move to the specified location, -1 if there is a self, 1 if avatar can move
    // and 2 if avatar reaches goal
    canMove(direction) {
        let x = this.getAvatarPos()[0]
        let y = this.getAvatarPos()[1]
        var next = 0;
        switch (direction) {
            case 0: // up
                next = this.getBoard()[x - 1][y];
                break;
            case 1: // down
                next = this.getBoard()[x + 1][y];
                break;
            case 2: // left
                next = this.getBoard()[x][y - 1];
                break;
            case 3: // right
                next = this.getBoard()[x][y + 1];
                break;
        }

        if (next === 1 || next === 8) { // If there is a wall return 0. If there is ns, return -1.
            if (next === 1) {
                return 0;
            } else {
                return -1;
            }
        } else if (next === 0) { // There is grass, can move
            return 1;
        } else if (next === 3) { // Reached Goal!
            return 2;
        }
    }

    // returns 0 if the ns cannot move to the specified location, 1 if ns can move
    canMoveNs(direction, ns) {
        let x = ns[0]
        let y = ns[1]
        var next = 0;
        switch (direction) {
            case 0: // up
                next = this.getBoard()[x - 1][y];
                break;
            case 1: // down
                next = this.getBoard()[x + 1][y];
                break;
            case 2: // left
                next = this.getBoard()[x][y - 1];
                break;
            case 3: // right
                next = this.getBoard()[x][y + 1];
                break;
        }

        if (next === 1 || next === 8 || next === 3) {
            return 0;
        } else if (next === 0) { // There is grass, can move
            return 1;
        }
    }

    // Sets non-self sprite locations and directions
    // (6, 6), (14, 6), (14,14), (6, 14)
    contingency_ns_pos(direction) {
        let positions = [[6, 6], [6, 14], [14, 6], [14, 14]];

        if (this.#action_count[this.#level_count] === 0) {
            // Remove the actual self
            for (let i = 0; i < positions.length; i++) {
                if (positions[i][0] === this.#avatar_start_position[0] &&
                    positions[i][1] === this.#avatar_start_position[1]) {
                    positions.splice(i, 1);
                }
            }
        }

        let v = 2;
        let h = 2;

        // Oscillation direction is randomly assigned
        // 2 horizontal, 2 vertical
        if (direction === 0 || direction === 0) { // vertical
            v--;
        } else { // horizontal
            h--;
        }

        for (let i = 0; i < 3; i++) {
            let rn = rand(2); // 0 or 1.
            if (v === 0) {
                rn = 1;
            } else if (h === 0) {
                rn = 0;
            } else if (v === 0 && h === 0) {
                break;
            }
            // 0 = horizontal, 1 = vertical.
            positions[i].push(rn);
            if (rn === 0) {
                v--;
            } else {
                h--;
            }
        }

        this.#ns_positions = positions;
    }


    getData() {
        this.#self_start_locs.pop();
        var datamap = {
            "steps": this.#action_count,
            "game_type": this.#gameType,
            "wall_interactions": this.#wall_interactions,
            "ns_interactions": this.#ns_interactions,
            "map": this.#maps,
            "self_start_locs": this.#self_start_locs,
            "self_locs": this.#self_locs,
            "ns_locs": this.#ns_locs,
            "n_levels": this.getNumLevels()
        };

        var data = {"data": datamap}
        return data;
    }
}

// Returns random avatar position.
// If mockSelf is true, return the position of the mock self instead
function random_avatar_pos(gameType, mockSelf = false) {
    if (gameType === "logic" || gameType === "logic_perturbed") {
        let positions = [[1, 1], [1, 7], [7, 1], [7, 7]];
        return positions[rand(4)];
    } else if ((gameType === "contingency") || (gameType === "contingency_perturbed") || (gameType === "change_agent") ||
        (gameType === "shuffle_keys") || (gameType === "change_agent_perturbed")) {
        let positions = [[6, 6], [6, 14], [14, 6], [14, 14]];
        if (mockSelf) {
            return [[14, 10], [10, 14], [6, 10], [10, 6]][rand(4)];
        }

        return positions[rand(4)];
    }
}

function rshuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

function rand(level_amt) {
    return Math.floor(Math.random() * level_amt);
}

function logic_levels(levels, perturbed = false) {
    var level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1]];
    if (perturbed) {
        level[1][4] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 1, 1, 0, 0, 0, 8, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[7][4] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 1, 1, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[1][4] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 8, 0, 0, 0, 1, 1, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[1][4] = 8;
    }
    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 0, 0, 0, 1, 1, 8, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 0, 0, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[7][4] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 1, 1, 0, 1, 1, 8, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 8, 1, 1, 0, 1, 1, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[4][1] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 1, 1, 0, 1, 1, 8, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 8, 0, 0, 0, 1, 1, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[4][7] = 8;
    }

    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 1, 1, 0, 1, 1, 8, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 1, 1, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[4][7] = 8;
    }
    levels.push(deepCopy(level));

    // ---------------------------------

    level = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 8, 1, 1, 0, 0, 0, 8, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 8, 1, 1, 0, 0, 0, 8, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    if (perturbed) {
        level[4][1] = 8;
    }

    levels.push(deepCopy(level));
}

function contingency_levels(levels) {
    levels.push([
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]);
}

function get_new_xy(x, y, direction) {
    let new_x = x;
    let new_y = y;
    switch (direction) {
        case 0:
            new_x--;
            break;
        case 1:
            new_x++;
            break;
        case 2:
            new_y--;
            break;
        case 3:
            new_y++;
            break;
    }

    return ([new_x, new_y]);
}

const deepCopy = (arr) => {
    let copy = [];
    arr.forEach(elem => {
        if (Array.isArray(elem)) {
            copy.push(deepCopy(elem))
        } else {
            if (typeof elem === 'object') {
                copy.push(deepCopyObject(elem))
            } else {
                copy.push(elem)
            }
        }
    })
    return copy;
}