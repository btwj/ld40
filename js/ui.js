var $ = require('jQuery');
var _ = require('underscore');
var SVG = require('svg.js');

var ICON_SIZE = 20;
var GROUP_SIZE = 30;
var QUARANTINE_RADIUS = ICON_SIZE / 2 + 5;
var CLOSED_RADIUS = GROUP_SIZE / 2 + 5;
var ARC_RADIUS = 1.3;
var RADIUS = 250;
var GROUP_RADIUS = 100;
var CX = 320;
var CY = 320;

class UI {
	constructor(game) {
		this.svg = SVG.adopt($("svg")[0]);

		this.hover_active = -1;
		this.click_active = -1;
		this.group_hover_active = -1;
		this.group_click_active = -1;

		this.svg.rect(640, 640).fill("#F5F5F5").on('click', function () {
			this.hover_active = -1;
			this.click_active = -1;
			this.group_hover_active = -1;
			this.group_click_active = -1;
			this.update_active();
		}.bind(this));

		this.households_g = this.svg.group();
		this.households_obj = [];
		this.group_connections_g = this.svg.group();
		
		this.groups_obj = [];
		this.connections_g = this.svg.group();
		this.groups_g = this.svg.group();
		this.people_g = this.svg.group();
		this.people_obj = [];

		this.game = game;
		var _this = this;

		$("#person-info, #group-info").hide();

		$("#next-btn").on('click', function () {
			this.game.tutorial_next();
		}.bind(this));

		$("#skip-btn").on('click', function () {
			this.game.tutorial_skip();
		}.bind(this));

		$("#difficulty-btns").on('click', 'div', function () {
			$("#difficulty-btns").find(".active").removeClass("active");
			$(this).addClass("active");
			_this.game.set_difficulty($(this).text());
		});

		$("#next-day-btn").on('click', function () {
			this.game.pass_turn();
		}.bind(this));

		$("#quarantine-btn").on('click', function () {
			if (this.click_active != -1) {
				this.game.quarantine_person(this.click_active);
			}
		}.bind(this));

		$("#diagnose-btn").on('click', function () {
			if (this.click_active != -1) {
				this.game.diagnose_person(this.click_active);
			}
		}.bind(this));

		$("#quarantine-household-btn").on('click', function () {
			if (this.click_active != -1) {
				this.game.quarantine_household(this.click_active);
			}
		}.bind(this));

		$("#diagnose-household-btn").on('click', function () {
			if (this.click_active != -1) {
				this.game.diagnose_household(this.click_active);
			}
		}.bind(this));

		$("#close-btn").on('click', function () {
			if (this.group_click_active != -1) {
				this.game.close_down(this.group_click_active);
			}
		}.bind(this));

		$("#log").on('click', '.name-bubble', function () {
			_this.click_active = $(this).data('id');
			_this.update_active();
		});

		$("#start-game-btn").on('click', function () {
			_this.game.start_game();
		});

		$("#retry-game-btn").on('click', function () {
			window.location.reload(false);
		});
	}

	get_person_position(i) {
		var angle = 2 * Math.PI / this.game.population_size;
		var x = CX + RADIUS * Math.cos(angle * i);
		var y = CY + RADIUS * Math.sin(angle * i);
		return {'x': x, 'y': y};
	}

	get_label_position(i) {
		var angle = 2 * Math.PI / this.game.population_size;
		var x = 35 * Math.cos(angle * i);
		var y = 35 * Math.sin(angle * i);
		return {'x': x, 'y': y};
	}

	get_group_position(i) {
		var angle = 2 * Math.PI / this.game.groups.length;
		var x = CX + GROUP_RADIUS * Math.cos(i*angle + Math.PI / 3);
		var y = CY + GROUP_RADIUS * Math.sin(i*angle + Math.PI / 3);
		return {'x': x, 'y': y};
	}

	get_quarantine_path(quarantine) {
		var quarantine_angle = Math.PI * 2 * quarantine / 3;
		if (quarantine == 3) quarantine_angle -= 0.00001;
		var sweep = quarantine_angle <= Math.PI ? 0 : 1;
		var qx = QUARANTINE_RADIUS * Math.sin(quarantine_angle);
		var qy = QUARANTINE_RADIUS * Math.cos(quarantine_angle);
		return ["M", 0, 0, "L", 0, -QUARANTINE_RADIUS, "A", QUARANTINE_RADIUS, QUARANTINE_RADIUS, 0, sweep, 1, qx, -qy, "Z"].join(" ");
	}

	get_closed_path(closed) {
		var closed_angle = Math.PI * 2 * closed / 2;
		if (closed == 2) closed_angle -= 0.001;
		var sweep = closed_angle <= Math.PI ? 0 : 1;
		var qx = CLOSED_RADIUS * Math.sin(closed_angle);
		var qy = CLOSED_RADIUS * Math.cos(closed_angle);
		return ["M", 0, 0, "L", 0, -CLOSED_RADIUS, "A", CLOSED_RADIUS, CLOSED_RADIUS, 0, sweep, 1, qx, -qy, "Z"].join(" ");
	}

	people_init() {
		var people = this.game.people;
		for (var i = 0; i < people.length; i++) {
			var person_obj = this.people_g.nested();
			person_obj.data('id', i);
			person_obj.path(this.get_quarantine_path(people[i].quarantine))
				.addClass("quarantine").fill("#0D47A1");
			person_obj.group().addClass("icon")
				.circle(ICON_SIZE).attr('fill', 'white').transform({ x: -ICON_SIZE/2, y: -ICON_SIZE/2 });
			person_obj.plain((i+1).toString()).attr(this.get_label_position(i))
				.font({anchor: 'middle', 'alignment-baseline': 'middle'}).addClass("label");

			person_obj.attr(this.get_person_position(i));
			var _this = this;
			person_obj.on('mouseover', function (e) {
				if (_this.hover_active != this.data('id')) {
					_this.hover_active = this.data('id');
					_this.group_hover_active = -1;
					_this.update_active();
				}
			});

			person_obj.on('mouseout', function (e) {
				if (_this.hover_active != -1) {
					_this.hover_active = -1;
					_this.update_active();
				}
			});

			person_obj.on('click', function (e) {
				_this.group_click_active = -1;
				if (_this.click_active != this.data('id')) {
					_this.click_active = this.data('id');
				} else if (_this.click_active != -1) {
					_this.click_active = -1;
				}
				_this.update_active();
			});

			this.people_obj.push(person_obj);
		}
	}

	household_init() {
		var households = this.game.households, people = this.game.people;
		var angle = 2 * Math.PI / people.length;
		var angle_padding = angle / 3;
		var radius_padding = 20;
		var r1 = RADIUS + radius_padding;
		var r2 = RADIUS - radius_padding;
		for (var i = 0; i < households.length; i++) {

			var angle1 = households[i].members[0].id * angle - angle_padding;
			var angle2 = _.last(households[i].members).id * angle + angle_padding;
			
			var household_obj = this.households_g.path(["M", CX + r1 * Math.cos(angle1), CX + r1 * Math.sin(angle1), 
				"A", r1, r1, 0, 0, 1, CX + r1 * Math.cos(angle2), CY + r1 * Math.sin(angle2),
				"L", CX + r2 * Math.cos(angle2), CY + r2 * Math.sin(angle2),
				"A", r2, r2, 0, 0, 0, CX + r2 * Math.cos(angle1), CY + r2 * Math.sin(angle1), "Z"].join(" "))
				.fill("#2196F3");

			household_obj.data('id', i);
			this.households_obj.push(household_obj)
		}
	}

	group_init() {
		var groups = this.game.groups;
		var angle = 2 * Math.PI / groups.length;
		for (var i = 0; i < groups.length; i++) {
			var group_obj = this.groups_g.nested();
			group_obj.data('id', i);
			group_obj.path(this.get_closed_path(groups[i].closed))
				.addClass("closed").fill("#F44336");
			group_obj.group().addClass("icon")
				.circle(GROUP_SIZE).attr('fill', 'white').transform({ x: -GROUP_SIZE/2, y: -GROUP_SIZE/2 });
			group_obj.attr(this.get_group_position(i));
			

			var _this = this;
			group_obj.on('mouseover', function () {
				_this.hover_active = -1;
				_this.group_hover_active = this.data('id');
				_this.update_active();
			});

			group_obj.on('mouseout', function () {
				_this.group_hover_active = -1;
				_this.update_active();
			});

			group_obj.on('click', function () {
				_this.click_active = -1;
				_this.group_click_active = this.data('id');
				_this.update_active();
			});
			this.groups_obj.push(group_obj);
		}
	}

	draw_arcs(active_ids) {
		var people = this.game.people;
		this.connections_g.clear();
		for (var i = 0; i < people.length; i++) {
			for (var j = 0; j < people[i].friends.length; j++) {
				if (active_ids === undefined) {
					if (people[i].friends[j].id > i) {
						this.draw_arc(i, people[i].friends[j].id);
					}
				} else {
					var active = _.contains(active_ids, people[i].friends[j].id) || _.contains(active_ids, i);
					if (people[i].friends[j].id > i) {
						this.draw_arc(i, people[i].friends[j].id, active);
					}
				}
			}
		}
	}

	draw_arc(i1, i2, active) {
		var population = this.game.population_size;
		var pos1 = this.get_person_position(i1);
		var pos2 = this.get_person_position(i2);
		var dx = pos1.x - pos2.x;
		var dy = pos1.y - pos2.y;
		var dist = Math.sqrt(dx*dx + dy*dy);
		var diff = dist;
		var pos_diff = (((i2 - i1) % population) + population) % population;
		var sweep = pos_diff > (population / 2) ? 1 : 0;
		var stroke_params = {width: 2, color: '#607D8B'};
		if (active) stroke_params = {width: 3, color: '#607D8B', opacity: 1};
		else if (active === false) stroke_params = {'width': 1, 'color': '#90A4AE', 'opacity': 0.5};
		this.connections_g.path(["M", pos1.x, pos1.y, "A", ARC_RADIUS * diff, ARC_RADIUS * diff, 0, 0, sweep, pos2.x, pos2.y].join(" "))
			.fill('none').stroke(stroke_params);
	}

	draw_line(person_id, group_id, active) {
		var person_pos = this.get_person_position(person_id);
		var group_pos = this.get_group_position(group_id);
		var stroke_params = {width: 2, color: '#607D8B'};
		if (active) stroke_params = {width: 3, color: '#607D8B', opacity: 1};
		else if (active === false) stroke_params = {'width': 1, 'color': '#90A4AE', 'opacity': 0.5};
		this.group_connections_g.line(person_pos.x, person_pos.y, group_pos.x, group_pos.y)
			.stroke(stroke_params);
	}

	draw_lines(active_ids, is_group) {
		var is_group = is_group || false;
		this.group_connections_g.clear();
		var people = this.game.people;
		if (!is_group) {
			var active_lines = Array(people.length).fill([]);
			if (active_ids !== undefined) {
				for (var i = 0; i < active_ids.length; i++) {
					var person = people[active_ids[i]];
					for (var j = 0; j < person.groups.length; j++) {
						active_lines[person.id].push(person.groups[j].id);
					}
				}
			}

			for (var i = 0; i < people.length; i++) {
				var person = people[i];
				for (var j = 0; j < person.groups.length; j++) {
					if (active_ids === undefined) {
						this.draw_line(i, person.groups[j].id);
					} else {
						if (active_lines[i].indexOf(person.groups[j].id) != -1) {
							this.draw_line(i, person.groups[j].id, true);
						} else {
							this.draw_line(i, person.groups[j].id, false);
						}
					}
				}
			}
		} else {
			var active_group = this.game.groups[active_ids[0]];
			for (var i = 0; i < people.length; i++) {
				var person = people[i];
				for (var j = 0; j < person.groups.length; j++) {
					if (person.groups[j].id == active_group.id) this.draw_line(i, person.groups[j].id, true);
					else this.draw_line(i, person.groups[j].id, false);
				}
			}
		}
	}

	update_active() {
		var active = -1;
		if (this.click_active != -1) active = this.click_active;
		else if (this.hover_active != -1) active = this.hover_active;

		var group_active = -1;
		if (this.group_click_active != -1) group_active = this.group_click_active;
		else if (this.group_hover_active != -1) group_active = this.group_hover_active;

		if (active != -1) {
			$("#group-info").hide();
			$("#person-info").show();
			var person = this.game.people[active];
			this.update_people(this.game.people[active].get_relations().map(function (person) {
				return person.id;
			}));

			$("#person-data").text(person.get_full_name() + ", " + person.age);
			if (person.status_known) {
				if (person.status == "healthy") {
					$("#person-status").text("HEALTHY");
				} else if (person.status == "infected") {
					$("#person-status").text("SICK");
				} else {
					$("#person-status").text("DEAD");
				}
			} else {
				$("#person-status").text("STATUS UNKNOWN");
			}

			if (person.quarantine == 0) {
				$("#quarantine-status").text("NOT QUARANTINED");
			} else {
				$("#quarantine-status").text(person.quarantine + " DAYS OF QUARANTINE LEFT");
			}
		} else if (group_active != -1) {
			$("#person-info").hide();
			$("#group-info").show();
			var group = this.game.groups[group_active];
			$("#group-name").text(group.name);
			$("#group-type").text(group.type);
			if (group.closed == 0) {
				$("#group-status").text("OPEN");
			} else {
				$("#group-status").text("CLOSED FOR " + group.closed + " DAYS");
			}
			this.update_people(this.game.groups[group_active].members.map(function (person) {
				return person.id;
			}));
		}
		this.update_groups();

		if (this.click_active != -1) {
			this.draw_arcs([this.click_active]);
			this.draw_lines([this.click_active]);
		} else if (this.hover_active != -1) {
			this.draw_arcs([this.hover_active]);
			this.draw_lines([this.hover_active]);
		} else if (this.group_click_active != -1) {
			this.draw_lines([this.group_click_active], true);
			this.draw_arcs([]);
		} else if (this.group_hover_active != -1) {
			this.draw_lines([this.group_hover_active], true);
			this.draw_arcs([]);
		} else {
			this.draw_arcs();
			this.draw_lines();
			this.update_people();
		}
	}

	update_info() {
		var active = -1;
		if (this.click_active != -1) active = this.click_active;
		else if (this.hover_active != -1) active = this.hover_active;

		$("#action-points-info h1").text(this.game.action_points);
		var number = {healthy: 0, infected: 0, dead: 0};
		for (var i = 0; i < this.game.population_size; i++) {
			number[this.game.people[i].status]++;
		}
		$("#healthy-info h1").text(number.healthy);
		$("#infected-info h1").text(number.infected);
		$("#dead-info h1").text(number.dead);
	}

	update_people(pointed) {
		var pointed = pointed || [];
		for (var i = 0; i < this.game.population_size; i++) {
			var icon = this.people_obj[i].select('.icon').first();
			var person = this.game.people[i];

			if (person.status_known) {
				if (person.status == "healthy") {
					icon.select('circle').first().fill({color: '#A5D6A7'});
				} else if (person.status == "infected") {
					icon.select('circle').first().fill({color: '#C62828'});
				} else if (person.status == "dead") {
					icon.select('circle').first().fill({color: '#263238'});
				}
			} else {
				icon.select('circle').first().fill('white');
			}

			if (this.hover_active === i || this.click_active === i) {
				icon.select('circle').first().stroke({width: 3, color: '#607D8B'});
			} else if (pointed.indexOf(i) != -1) {
				icon.select('circle').first().stroke({width: 3, color: '#1565C0'});
			} else {
				icon.select('circle').first().stroke({width: 0});
			}

			this.people_obj[i].select('.quarantine').first()
				.attr('d', this.get_quarantine_path(person.quarantine));
		}
	}

	update_groups() {
		for (var i = 0; i < this.game.groups.length; i++) {
			var icon = this.groups_obj[i].select('.icon').first();
			var group = this.game.groups[i];
			if (this.group_hover_active === i || this.group_click_active === i) {
				icon.select('circle').first().stroke({width: 3, color: '#607D8B'});
			} else {
				icon.select('circle').first().stroke({width: 0});
			}

			this.groups_obj[i].select('.closed').attr('d', this.get_closed_path(this.game.groups[i].closed));
		}
	}

	update_people_labels(label_colors) {
		for (var i = 0; i < this.game.population_size; i++) {
			var label = this.people_obj[i].select('.label').first();
			label.font({fill: label_colors[i]});
		}
	}

	update_costs(costs) {
		console.log(costs);
		$("#quarantine-btn h3").text(costs[0]);
		$("#diagnose-btn h3").text(costs[1]);
		$("#quarantine-household-btn h3").text(costs[2]);
		$("#diagnose-household-btn h3").text(costs[3]);
		$("#close-btn h3").text(costs[4]);
	}

	log (text) {
		var arr = text.split(/(\#[0-9]+)/g);
		var log_el = $("<div class='log-item'/>");
		for (var i = 0; i < arr.length; i++) {
			if (arr[i][0] === "#") {
				var id = parseInt(arr[i].substr(1));
				var name_bubble = $("<span class='name-bubble'/>");
				name_bubble.text(this.game.people[id].get_full_name());
				name_bubble.data('id', id);
				log_el.append(name_bubble);
			} else {
				log_el.append($("<span/>").html(arr[i]));
			}
		}
		log_el.slideUp();
		$("#log").prepend(log_el);
		log_el.slideDown();
	}

	self_destruct () {
		this.households_g.clear();
		this.people_g.clear();
		this.group_connections_g.clear();
		this.groups_g.clear();
		this.households_obj = [];
		this.people_obj = [];
		this.groups_obj = [];
	}
}

module.exports.UI = UI;