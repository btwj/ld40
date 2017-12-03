var $ = require('jQuery');
var _ = require('underscore');

var ui = require('./ui');

var NUM_HOUSEHOLDS = 15;
var MIN_HOUSEHOLD_SIZE = 2;
var MAX_HOUSEHOLD_SIZE = 3;
var CHILD_CHANCE = 0.3;
var ADULT_CHANCE = 0.5;
var NUM_SCHOOLS = 2;
var NUM_OFFICES = 2;
var INFECT_FACTOR = 1.5;
var QUARANTINE_COST = 2;
var DIAGNOSE_COST = 1;
var QUARANTINE_HOUSEHOLD_COST = 4;
var DIAGNOSE_HOUSEHOLD_COST = 1;
var CLOSE_COST = 3;

var surnames = _.shuffle(["Smith", "Jones", "Williams", "Taylor", "Johnson", "Brown", "Rogers", "Anderson", "Jackson", "Wilson", "Hernandez", "Garcia", "White", "Thompson", "Williamson", "Robinson", "Moore", "Walker", "Allen", "Gomez", "Turner", "Stewart"]);
var names = _.shuffle(["Emma", "Lucas", "Liam", "Mary", "James", "John", "Robert", "Michael", "Patricia", "Jennifer", "David", "Richard", "Joseph", "Elizabeth", "Linda", "Susan", "Jessica", "Thomas", "Charles", "Chris", "Karen", "Nancy", "Anthony", "Mark", "Dorothy", "Sandra", "Steven", "Kevin", "Brian", "Jason", "Timothy", "Sharon", "Amy", "Deborah", "Eric", "Stephen", "Gary", "Ryan", "Amy", "Shirley", "Brenda", "Frank", "Nicole", "Scott", "Justin", "Noah", "Benjamin", "Michelle", "Kimberly", "Lisa", "Donna", "Jeff", "Sarah", "Ruth", "Ronald", "Kenneth", "Dorothy", "Margaret", "David", "Lee", "Phillip", "Gregory", "Chloe", "Sophia", "Marcus", "Matt", "Jacob", "Olivia", "Grace", "Ryan", "Lily", "Adam", "Abigail", "Ava", "Lauren", "Jordan", "Samantha", "Dylan", "Brandon", "Xavier", "Gavin", "Ethan", "Tyler", "Stephanie", "Melanie", "Anna", "Ashley", "Claire", "Madison", "Lucy"]);
var place_1 = ["North", "South", "East", "West", "Red", "Sierra", "Oak", "Pine"];
var place_2 = ["Valley", "Redlands", "Creek", "River", "Hills"];
var school_3 = ["High", "Elementary", "College", "Academy"];
var office_3 = ["Plaza", "Building", "Place"];

var tutorial_stages = [{
	heading: "Welcome to Patient Zero",
	text: "This is the tutorial. If you've already gone through the tutorial, skip ahead.",
	x: 280,
	y: 250
}, {
	heading: "Introduction",
	text: "Patient Zero is a game about fake epidemiology. A fatal, incurable disease has struck this neighbourhood, and your job is to stop its spread before it kills more than 75% of the population.",
	x: 280,
	y: 250
}, {
	heading: "Meet The Neighbours",
	text: "Over to the left is the neighbourhood web. It shows all the relationships between members in the neighbourhood. Try hovering over one of the white circles to view all of that person's connections more clearly.",
	x: 550,
	y: 250
}, {
	heading: "Neighbourhood Web",
	text: "Each of the small white circles are people of this neighbourhood. They are members of households, represented by the blue arcs. Each of the large white circles in the centre is a communal space. People can transmit diseases if they are in the same household, visit the same communal spaces or are friends.",
	x: 550,
	y: 250
}, {
	heading: "Disease Spreading",
	text: "Every turn, a certain number of people are guaranteed to be infected, based on the current number of sick people. After two days, they will pass away, and will no longer infect others.",
	x: 550,
	y: 250
}, {
	heading: "Actions",
	text: "Each turn, you are given a certain number of action points to spend, as can be seen on the right. Actions cost different amounts of action points. You can perform an action by clicking on either a person or communal space, and then clicking one of the actions to the right.",
	x: 120,
	y: 50
}, {
	heading: "Diagnosis",
	text: "The circles now are all white because you don't know anything about the status of each individual. You must perform diagnoses to determine if people are healthy or sick. You'll find out when a person dies, however.",
	x: 120,
	y: 50
}, {
	heading: "Quarantine",
	text: "If you try clicking on an individual, you'll see the Quarantine action appear on the right. Quarantining an individual who is sick makes him unable to spread the disease, while quarantining a healthy individual makes him unable to catch the disease. Quarantining lasts for three days.",
	x: 120,
	y: 50
}, {
	heading: "Household Actions",
	text: "You'll also see some household actions that can be performed. These may be cheaper to perform on larger households, so they may be useful.",
	x: 120,
	y: 50
}, {
	heading: "Closing",
	text: "If you try clicking on a communal space, you'll see the Close Down action appear. Closing down a communal space means people can no longer spread the disease to another person just because they share that communal space. This lasts for two days.",
	x: 120,
	y: 50
}, {
	heading: "The Log",
	text: "This is the log, which will contain a history of all the actions you've taken. Note that you can click on any names that appear here to select the person.",
	x: 120,
	y: 350
}, {
	heading: "Winning and Losing",
	text: "If you manage to quarantine all infected individuals before 75% of the population is dead, you win the game. Otherwise, you lose the game, and have to live with the guilt of negligently killing an entire neighbourhood.",
	x: 280,
	y: 250
}];

class Person {
	constructor(id) {
		this.id = id;

		var age_chance = Math.random();

		if (age_chance < CHILD_CHANCE) {
			this.age = _.random(5, 15);
		} else if (age_chance < CHILD_CHANCE + ADULT_CHANCE) {
			this.age = _.random(25, 70);
		} else {
			this.age = _.random(16, 24);
		}

		this.name = names[id];

		this.friends = [];
		this.household = null;
		this.groups = [];

		this.status = "healthy"; //healthy, sick, dead
		this.status_known = false;

		this.quarantine = 0;

		this.sick = -1;
	}

	get_relations() {
		var group_member_lists = [];
		group_member_lists.push(this.household.members);
		group_member_lists.push(this.friends);
		for (var i = 0; i < this.groups.length; i++) {
			if (this.groups[i].closed == 0) group_member_lists.push(this.groups[i].members);
		}
		return _.without(_.union.apply(this, group_member_lists), this);
	}

	get_full_name() {
		return this.name + " " + this.household.surname;
	}
}

class Household {
	constructor(id) {
		this.id = id;
		this.surname = surnames[id];

		this.members = [];
	}

	get size() {
		return this.members.length;
	}
}

class Group {
	constructor(id, type) {
		this.id = id;

		this.members = [];
		this.type = type; //office, school

		this.closed = 0;

		if (this.type == "office") {
			this.name = _.sample(place_1) + " " + _.sample(place_2) + " " + _.sample(office_3);
		} else if (this.type == "school") {
			this.name = _.sample(place_1) + " " + _.sample(place_2) + " " + _.sample(school_3);
		}
	}

	get size() {
		return this.members.length;
	}
}

class Game {
	constructor() {
		this.households = [];
		this.people = [];
		this.population_size = 0;
		this.schools = [];
		this.offices = [];
		this.groups = [];

		this.ui = new ui.UI(this);
		this.generate_world();

		this.state = "tutorial";
		if (localStorage.getItem('tutorialCompleted') == "yes") this.change_state("difficulty");

		this.tutorial_stage = 0;

		this.action_points = 3;
		this.turn = 1;

		this.difficulty = "Medium";
	}

	change_state(state) {
		this.state = state;
		if (state == "difficulty") {
			$("#difficulty-modal").show();
			$("#tutorial-overlay").hide();
		}
		if (state == "game") {
			localStorage.setItem('tutorialCompleted', "yes");
			$("#difficulty-modal").hide();
		}
		if (state == "win") {
			$("#game-over-title").text("Hooray!")
			$("#game-over-modal p").text("You've managed to quarantine every sick individual, stopping this disease from potentially spreading any further.")
			$("#game-over-modal").show();
		}
		if (state == "lose") {
			$("#game-over-title").text("Oops, everyone died.")
			$("#game-over-modal p").text("More than 75% of the population is dead. So much for saving them. Maybe try a little harder next time?")
			$("#game-over-modal").show();
		}
	}

	generate_world () {
		var idx = 0;
		this.households = [];
		this.people = [];
		this.population_size = 0;
		this.schools = [];
		this.offices = [];
		this.groups = [];
		for (var i = 0; i < NUM_HOUSEHOLDS; i++) {
			var household_size = _.random(MIN_HOUSEHOLD_SIZE, MAX_HOUSEHOLD_SIZE);
			var household = new Household(i);
			for (var j = 0; j < household_size; j++) {
				var person = new Person(idx + j);
				this.people.push(person);
				person.household = household;
				household.members.push(person);
			}
			this.households.push(household);
			idx += household_size;
		}

		this.population_size = idx;

		for (var i = 0; i < NUM_SCHOOLS; i++) {
			var school = new Group(i, "school")
			this.schools.push(school);
			this.groups.push(school);
		}

		for (var i = 0; i < NUM_OFFICES; i++) {
			var office = new Group(i + NUM_OFFICES, "office");
			this.offices.push(office);
			this.groups.push(office);
		}

		for (var i = 0; i < this.population_size; i++) {
			var person = this.people[i];
			if (person.age <= 15 && Math.random() < 0.5 && NUM_SCHOOLS > 0) {
				var school = _.sample(this.schools)
				person.groups.push(school);
				school.members.push(person);
			}
			if (person.age >= 25 && Math.random() < 0.3 && NUM_OFFICES > 0) {
				var office = _.sample(this.offices)
				person.groups.push(office);
				office.members.push(person);
			}
		}

		//generate friendships
		for (var i = 0; i < this.population_size; i++) {
			var person = this.people[i];
			var total_relations = _.random(2, 3);
			while (person.get_relations().length < total_relations) {
				var random_person = this.people[_.random(0, this.population_size - 1)];

				if (person.friends.indexOf(random_person) == -1 && random_person !== person) {
					person.friends.push(random_person);
					random_person.friends.push(person);
				}
			}
		}

		var random_person = _.sample(this.people);
		random_person.status = "infected";
		random_person.sick = 2;

		this.ui.people_init();
		this.ui.household_init();
		this.ui.group_init();
		this.infect(1);
		this.render();
		this.ui.update_info();
	}

	get_infected () {
		var infected = [];
		for (var i = 0; i < this.population_size; i++) {
			if (this.people[i].status == "infected" && this.people[i].quarantine == 0) {
				infected.push(this.people[i]);
			}
		}

		return infected;
	}

	get_related (infected) {
		var related = [];
		for (var i = 0; i < infected.length; i++) {
			related = _.union(related, infected[i].get_relations());
		}

		return related;
	}

	infect (number_to_infect) {
		var infected = this.get_infected();
		var related = this.get_related(infected);

		var healthy_related = [];
		for (var i = 0; i < related.length; i++) {
			if (related[i].status == "healthy" && related[i].quarantine == 0) {
				healthy_related.push(related[i]);
			}
		}

		//infect
		var to_infect = _.sample(healthy_related, Math.min(healthy_related.length, number_to_infect));
		for (var i = 0; i < to_infect.length; i++) {
			if (healthy_related.length != 0) {
				var infected_person = to_infect[i];
				infected_person.status = "infected";
				infected_person.sick = 2;
			}			
		}
	}

	pass_turn () {
		if (this.state != "game") return;
		var label_colors = [];
		for (var i = 0; i < this.population_size; i++) {
			if (this.people[i].status_known) {
				if (this.people[i].status == "healthy") label_colors.push("#A5D6A7");
				else if (this.people[i].status == "infected") label_colors.push("#C62828");
			} else label_colors.push("black");
		}

		this.ui.update_people_labels(label_colors);
		var number_to_infect = Math.ceil(this.get_infected().length / INFECT_FACTOR);
		this.infect(number_to_infect);
		var death_msg = "";
		for (var i = 0; i < this.population_size; i++) {
			if (this.people[i].quarantine != 0) {
				this.people[i].quarantine -= 1;
			}

			if (this.people[i].sick > 0) {
				this.people[i].sick -= 1;
			} else if (this.people[i].sick == 0 && this.people[i].status != "dead") {
				this.people[i].status = "dead";
				death_msg += "#" + i;
			}
			
			if (this.people[i].status == "dead") {
				this.people[i].status_known = true;
			} else if (this.people[i].status == "sick" && this.people[i].status_known) {
				this.people[i].status_known = true;
			} else {
				this.people[i].status_known = false;
			}
		}

		for (var i = 0; i < this.groups.length; i++) {
			var group = this.groups[i];
			if (group.closed > 0) {
				 group.closed -= 1;
			}
		}

		var dead = 0, non_quarantined_infected = 0;
		for (var i = 0; i < this.people.length; i++) {
			if (this.people[i].status == "dead") dead++;
			if (this.people[i].quarantine == 0 && this.people[i].status == "infected") non_quarantined_infected++;
		}

		if (dead >= 0.75 * this.population_size) {
			this.change_state("lose");
		} else if (non_quarantined_infected == 0) {
			this.change_state("win");
		}

		if (death_msg !== "") this.ui.log(death_msg + " died");

		this.ui.log("Day " + this.turn + " over");
		this.turn++;

		this.ui.update_people();	
		this.action_points = this.get_infected().length * 2;
		this.render();
	}

	quarantine_person (person_id) {
		if (this.state != "game") return;
		var cost = QUARANTINE_COST;
		console.log(person_id);
		if (this.action_points >= cost) {
			this.action_points -= cost;
			this.people[person_id].quarantine = 3;
			this.ui.update_people();
			this.ui.update_active();
			this.ui.log("#" + person_id + " quarantined for 3 days");
		} else {
			this.ui.log("You don't have enough action points!");
		}
		this.ui.update_info();
	}

	diagnose_person (person_id) {
		if (this.state != "game") return;
		var cost = DIAGNOSE_COST;
		console.log(person_id);
		if (this.action_points >= cost && !this.people[person_id].status_known) {
			this.action_points -= cost;
			this.people[person_id].status_known = true;
			this.ui.update_people();
			this.ui.update_active();
			this.ui.log("#" + person_id + " diagnosed " + this.people[person_id].status);
		} else {
			this.ui.log("You don't have enough action points!");
		}
		this.ui.update_info();

	}

	quarantine_household (person_id) {
		if (this.state != "game") return;
		var cost = QUARANTINE_HOUSEHOLD_COST;
		var household = this.people[person_id].household;
		if (this.action_points >= cost) {
			this.action_points -= cost;
			var msg = "";
			for (var i = 0; i < household.members.length; i++) {
				household.members[i].quarantine = 3;
				msg += "#" + household.members[i].id;
			}
			msg += " quarantined for 3 days";
			this.ui.update_people();
			this.ui.update_active();
			this.ui.log(msg);
		} else {
			this.ui.log("You don't have enough action points!");
		}
		this.ui.update_info();
	}

	diagnose_household (person_id) {
		if (this.state != "game") return;
		var cost = DIAGNOSE_HOUSEHOLD_COST;
		var household = this.people[person_id].household;
		if (this.action_points >= cost) {
			this.action_points -= cost;
			var msg = "";
			for (var i = 0; i < household.members.length; i++) {
				household.members[i].status_known = true;
				this.ui.log("#" + household.members[i].id + " diagnosed " + household.members[i].status);
			}
			this.ui.update_people();
			this.ui.update_active();
		} else {
			this.ui.log("You don't have enough action points!");
		}
		this.ui.update_info();
	}

	close_down (group_id) {
		if (this.state != "game") return;
		var cost = CLOSE_COST;
		var group = this.groups[group_id];
		if (this.action_points >= cost) {
			this.action_points -= cost;
			group.closed = 2;
			this.ui.update_groups();
			this.ui.update_active();
			this.ui.log(group.name + " closed");
		} else {
			this.ui.log("You don't have enough action points!");
		}
		this.ui.update_info();
	}

	tutorial_next () {
		this.tutorial_stage++;
		if (this.tutorial_stage > tutorial_stages.length - 1) {
			this.change_state("difficulty");
			return;
		}
		var stage = tutorial_stages[this.tutorial_stage];
		$("#tutorial-title").text(stage.heading);
		$("#tutorial-overlay p").text(stage.text);
		$("#tutorial-overlay").css("top", stage.y).css("left", stage.x);
	}

	tutorial_skip () {
		this.change_state("difficulty");
	}

	set_difficulty (difficulty) {
		this.difficulty = difficulty;
	}

	start_game () {
		if (this.difficulty == "Easy") {
			NUM_HOUSEHOLDS = 12;
			MIN_HOUSEHOLD_SIZE = 1;
			MAX_HOUSEHOLD_SIZE = 3;
			CHILD_CHANCE = 0.3;
			ADULT_CHANCE = 0.3;
			NUM_SCHOOLS = 1;
			NUM_OFFICES = 1;
			INFECT_FACTOR = 2;
			QUARANTINE_COST = 2;
			DIAGNOSE_COST = 1;
			QUARANTINE_HOUSEHOLD_COST = 4;
			DIAGNOSE_HOUSEHOLD_COST = 2;
		}
		if (this.difficulty == "Medium") {
			NUM_HOUSEHOLDS = 15;
			MIN_HOUSEHOLD_SIZE = 2;
			MAX_HOUSEHOLD_SIZE = 3;
			CHILD_CHANCE = 0.3;
			ADULT_CHANCE = 0.5;
			NUM_SCHOOLS = 2;
			NUM_OFFICES = 2;
			INFECT_FACTOR = 1.5;
			QUARANTINE_COST = 2;
			DIAGNOSE_COST = 1;
			QUARANTINE_HOUSEHOLD_COST = 4;
			DIAGNOSE_HOUSEHOLD_COST = 2;
		}
		if (this.difficulty == "Hard") {
			NUM_HOUSEHOLDS = 15;
			MIN_HOUSEHOLD_SIZE = 2;
			MAX_HOUSEHOLD_SIZE = 4;
			CHILD_CHANCE = 0.5;
			ADULT_CHANCE = 0.5;
			NUM_SCHOOLS = 3;
			NUM_OFFICES = 3;
			INFECT_FACTOR = 1.5;
			QUARANTINE_COST = 2;
			DIAGNOSE_COST = 1;
			QUARANTINE_HOUSEHOLD_COST = 4;
			DIAGNOSE_HOUSEHOLD_COST = 2;
		}
		if (this.difficulty == "Very Hard") {
			NUM_HOUSEHOLDS = 20;
			MIN_HOUSEHOLD_SIZE = 2;
			MAX_HOUSEHOLD_SIZE = 5;
			CHILD_CHANCE = 0.5;
			ADULT_CHANCE = 0.5;
			NUM_SCHOOLS = 3;
			NUM_OFFICES = 3;
			INFECT_FACTOR = 1.2;
			QUARANTINE_COST = 2;
			DIAGNOSE_COST = 1;
			QUARANTINE_HOUSEHOLD_COST = 5;
			DIAGNOSE_HOUSEHOLD_COST = 3;
		}

		this.ui.self_destruct();
		this.generate_world();
		this.ui.update_costs([QUARANTINE_COST, DIAGNOSE_COST, QUARANTINE_HOUSEHOLD_COST, DIAGNOSE_HOUSEHOLD_COST, CLOSE_COST]);
		this.change_state("game");
	}

	render () {
		this.ui.draw_arcs();
		this.ui.draw_lines();
		this.ui.update_info();
		this.ui.update_active();
	}
}

module.exports.Game = Game;