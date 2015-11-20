P = Class.create(P, {

	init: function() {

		this.view.content.className = 'loading';

		// Firefox あかん https://bugzilla.mozilla.org/show_bug.cgi?id=378962
		if (/^[%A-Z0-9\.]+$/.test(this.self.query.title) === true) {
			this.self.query.title = decodeURIComponent(this.self.query.title || '');
		}
		if (/^[%A-Z0-9\.]+$/.test(this.self.query.desc) === true) {
			this.self.query.desc = decodeURIComponent(this.self.query.desc || '');
		}

		this.initToolbar();
		this.draw();

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:schedule', this.onNotify);

		return this;
	}
	,
	deinit: function() {

		document.stopObserving('chinachu:schedule', this.onNotify);

		return this;
	}
	,
	refresh: function() {

		this.app.pm.realizeHash(true);

		return this;
	}
	,
	initToolbar: function _initToolbar() {

		this.view.toolbar.add({
			key: 'search',
			ui : new sakura.ui.Button({
				label  : 'SEARCH PROGRAMS'.__(),
				icon   : './icons/magnifier-zoom.png',
				onClick: this.viewSearchModal.bind(this)
			})
		});

		return this;
	}
	,
	draw: function() {

		this.view.content.className = '';
		this.view.content.update();



		this.grid = new flagrate.Grid({
			multiSelect  : false,
			disableSelect: true,
			pagination   : true,
			fill         : true,
			cols: [
				{
					key  : 'type',
					label: 'SIGNAL TYPE'.__(),
					width: 45,
					align: 'center',
					disableResize: true
				},
				{
					key  : 'category',
					label: 'CATEGORY'.__(),
					width: 70,
					align: 'center',
				},
				{
					key  : 'channel',
					label: 'CHANNELS'.__(),
					width: 140
				},
				{
					key  : 'title',
					label: 'TITLE'.__()
				},
				{
					key  : 'datetime',
					label: 'BROADCAST DATE AND TIME'.__(),
					width: 210
				},
				{
					key  : 'duration',
					label: 'DURATION IN MINUTES'.__(),
					width: 50,
					align: 'center',
				}
			],
			onClick: function(e, row) {
				window.location.href = '#!/program/view/id=' + row.data.id + '/';
			},
			onRendered: function() {

				this.self.query.page = this.grid.pagePosition;

				if (Prototype.Browser.Gecko) {
					if (/^[%A-Z0-9]+$/.test(this.self.query.title) === false) {
						this.self.query.title = encodeURIComponent(this.self.query.title);
					}
					if (/^[%A-Z0-9]+$/.test(this.self.query.desc) === false) {
						this.self.query.desc = encodeURIComponent(this.self.query.desc);
					}

					location.hash = '!/search/top/' + Object.toQueryString(this.self.query) + '/';
					this.app.pm._lastHash = location.hash.match(/^#(.+)$/)[1];
				} else {
					this.app.pm._lastHash = '!/search/top/' + Object.toQueryString(this.self.query) + '/';
					history.replaceState(null, null, '#' + this.app.pm._lastHash);
				}
			}.bind(this)
		}).insertTo(this.view.content);

		if (this.self.query.page) {
			this.grid.pagePosition = parseInt(this.self.query.page, 10);
		}

		if (!this.self.query.skip) {
			this.viewSearchModal();
		} else {
			this.drawMain();
		}

		return this;
	}
	,
	drawMain: function() {

		var time = new Date().getTime();

		var rows = [];

		var programs = [];

		var program;
		for (var i = 0, l = global.chinachu.schedule.length; i < l; i++) {
			for (var j = 0, m = global.chinachu.schedule[i].programs.length; j < m; j++) {
				program = global.chinachu.schedule[i].programs[j];

				if (program.end < time) continue;

				if (this.self.query.pgid && this.self.query.pgid !== program.id) continue;
				if (this.self.query.chid && this.self.query.chid !== program.channel.id) continue;
				if (this.self.query.cat && this.self.query.cat !== program.category) continue;
				if (this.self.query.type && this.self.query.type !== program.channel.type) continue;
				if (this.self.query.title && program.fullTitle.match(this.self.query.title) === null) continue;
				if (this.self.query.desc && (!program.detail || program.detail.match(this.self.query.desc) === null)) continue;

				if (this.self.query.start || this.self.query.end) {
					var ruleStart = parseInt(this.self.query.start || 0, 10);
					var ruleEnd   = parseInt(this.self.query.end || 24, 10);

					var progStart = new Date(program.start).getHours();
					var progEnd   = new Date(program.end).getHours();

					if (progStart > progEnd) {
						progEnd += 24;
					}

					if (ruleStart > ruleEnd) {
						if ((ruleStart > progStart) && (ruleEnd < progEnd)) continue;
					} else {
						if ((ruleStart > progStart) || (ruleEnd < progEnd)) continue;
					}
				}

				programs.push(program);
			}
		}

		programs.sort(function(a, b) {
			return a.start - b.start;
		});

		programs.each(function(program, i) {

			var row = {
				data: program,
				cell: {
					id: {
						className: 'id',
						sortAlt  : i,
						text     : program.id
					}
				},
				menuItems: [
					{
						label   : 'RESERVE'.__() + '...',
						icon    : './icons/plus-circle.png',
						onSelect: function() {
							new chinachu.ui.Reserve(program.id);
						}
					},
					'------------------------------------------',
					{
						label   : 'CREATE RULE'.__() + '...',
						icon    : './icons/regular-expression.png',
						onSelect: function() {
							new chinachu.ui.CreateRuleByProgram(program.id);
						}
					},
					'------------------------------------------',
					{
						label   : 'TWEET'.__() + '...',
						icon    : 'https://abs.twimg.com/favicons/favicon.ico',
						onSelect: function() {
							var left = (screen.width - 640) / 2;
							var top  = (screen.height - 265) / 2;

							var tweetWindow = window.open(
								'https://twitter.com/share?url=&text=' + encodeURIComponent(chinachu.util.scotify(program)),
								'chinachu-tweet-' + program.id,
								'width=640,height=265,left=' + left + ',top=' + top + ',menubar=no'
							);
						}
					},
					'------------------------------------------',
					{
						label   : 'COPY SCOT'.__() + '...',
						onSelect: function(e) {
							window.prompt('COPY FOLLOWING'.__(), chinachu.util.scotify(program));
						}
					},
					{
						label   : 'COPY ID'.__() + '...',
						onSelect: function() {
							window.prompt('COPY FOLLOWING'.__(), program.id);
						}
					},
					{
						label   : 'COPY TITLE'.__() + '...',
						onSelect: function() {
							window.prompt('COPY FOLLOWING'.__(), program.title);
						}
					},
					{
						label   : 'COPY DESCRIPTION'.__() + '...',
						onSelect: function() {
							window.prompt('COPY FOLLOWING'.__(), program.detail);
						}
					},
					'------------------------------------------',
					{
						label   : 'RELATED SITES'.__(),
						icon    : './icons/document-page-next.png',
						onSelect: function() {
							window.open("https://www.google.com/search?btnI=I'm+Feeling+Lucky&q=" + program.title);
						}
					},
					{
						label   : 'GOOGLE SEARCH'.__(),
						icon    : './icons/ui-search-field.png',
						onSelect: function() {
							window.open("https://www.google.com/search?q=" + program.title);
						}
					},
					{
						label   : 'Wikipedia',
						icon    : './icons/book-open-text-image.png',
						onSelect: function() {
							window.open("https://ja.wikipedia.org/wiki/" + program.title);
						}
					}
				]
			};

			row.cell.type = {
				sortAlt  : program.channel.type,
				className: 'types',
				html     : '<span class="' + program.channel.type + '">' + program.channel.type + '</span>'
			};

			row.cell.category = {
				sortAlt    : program.category,
				className  : 'categories',
				html       : '<span class="bg-cat-' + program.category + '">' + program.category + '</span>'
			};

			row.cell.channel = {
				sortAlt    : program.channel.id,
				text       : program.channel.name,
				attribute  : {
					title: program.channel.id
				}
			};

			var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
			if (program.subTitle && program.title.indexOf(program.subTitle) !== -1) {
				titleHtml += '<span class="subtitle">' + program.subTitle + '</span>';
			}
			if (typeof program.episode !== 'undefined' && program.episode !== null) {
				titleHtml += '<span class="episode">#' + program.episode + '</span>';
			}
			titleHtml += '<span class="id">#' + program.id + '</span>';

			row.cell.title = {
				sortAlt    : program.title,
				html       : titleHtml,
				attribute  : {
					title: program.fullTitle + ' - ' + program.detail
				}
			};

			row.cell.duration = {
				sortAlt    : program.seconds,
				text       : program.seconds / 60 + 'm'
			};

			row.cell.datetime = {
				sortAlt    : program.start,
				text       : chinachu.dateToString(new Date(program.start))
			};

			rows.push(row);
		});

		this.grid.splice(0, void 0, rows);

		return this;
	}
	,
	viewSearchModal: function() {

		// Firefox あかん https://bugzilla.mozilla.org/show_bug.cgi?id=378962
		if (/^[%A-Z0-9\.]+$/.test(this.self.query.title) === true) {
			this.self.query.title = decodeURIComponent(this.self.query.title || '');
		}
		if (/^[%A-Z0-9\.]+$/.test(this.self.query.desc) === true) {
			this.self.query.desc = decodeURIComponent(this.self.query.desc || '');
		}

		var modal = new flagrate.Modal({
			title  : 'SEARCH PROGRAMS'.__(),
			buttons: [
				{
					label   : 'SEARCH'.__(),
					color   : '@pink',
					onSelect: function(e, modal) {
						e.targetButton.disable();

						var result = viewSearchForm.result();

						result.title = encodeURIComponent(result.title);
						result.desc = encodeURIComponent(result.desc);

						this.self.query = Object.extend(this.self.query, result);
						this.self.query.skip = 1;
						this.self.query.page = 0;

						modal.close();

						window.location.hash = '!/search/top/' + Object.toQueryString(this.self.query) + '/';
						//todo
					}.bind(this)
				}
			]
		}).show();

		var viewSearchForm = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key   : 'cat',
					label : 'CATEGORY'.__(),
					input : {
						type : 'pulldown',
						items: (function() {
							var array = [];

							[
								'anime', 'information', 'news', 'sports',
								'variety', 'drama', 'music', 'cinema', 'etc'
							].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: (this.self.query.cat === a)
								});
							}.bind(this));

							return array;
						}.bind(this))()
					}
				},
				{
					key   : 'title',
					label : 'TITLE'.__(),
					input : {
						type : 'text',
						value: this.self.query.title || ''
					}
				},
				{
					key   : 'desc',
					label : 'DESCRIPTION'.__(),
					input : {
						type : 'text',
						value:  this.self.query.desc || ''
					}
				},
				{
					key   : 'type',
					label : 'TYPE'.__(),
					input : {
						type : 'pulldown',
						items: (function() {
							var array = [];

							['GR', 'BS', 'CS', 'EX'].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: ((this.self.query.type || []).indexOf(a) !== -1)
								});
							}.bind(this));

							return array;
						}.bind(this))()
					}
				},
				{
					key   : 'start',
					label : 'START TIME'.__(),
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: 'HOUR'.__(),
						value   : this.self.query.start || '',
						isNumber: true
					}
				},
				{
					key   : 'end',
					label : 'END TIME'.__(),
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: 'HOUR'.__(),
						value     : this.self.query.end || '',
						isNumber  : true
					}
				},
				{
					key   : 'pgid',
					label : 'PROGRAM ID'.__(),
					input : {
						type : 'text',
						value:  this.self.query.pgid || ''
					}
				},
				{
					key   : 'chid',
					label : 'CHANNEL ID'.__(),
					input : {
						type : 'text',
						value:  this.self.query.chid || ''
					}
				}
			]
		}).render(modal.content);

		return this;
	}
});
