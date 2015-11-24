/*jslint browser:true, nomen:true, plusplus:true, regexp:true, vars:true */
/*global $, Prototype, Ajax, Class, Element, sakura, flagrate, dateFormat */
(function () {

	"use strict";

	// for debug
	var PARAM = window.location.search.replace('?', '').toQueryParams();
	var DEBUG = (PARAM.debug === 'on');
	var console = {};
	if ((typeof window.console !== 'object') || (DEBUG === false)) {
		console = {
			log       : Prototype.emptyFunction,
			debug     : Prototype.emptyFunction,
			info      : Prototype.emptyFunction,
			warn      : Prototype.emptyFunction,
			error     : Prototype.emptyFunction,
			assert    : Prototype.emptyFunction,
			dir       : Prototype.emptyFunction,
			dirxml    : Prototype.emptyFunction,
			trace     : Prototype.emptyFunction,
			group     : Prototype.emptyFunction,
			groupEnd  : Prototype.emptyFunction,
			time      : Prototype.emptyFunction,
			timeEnd   : Prototype.emptyFunction,
			profile   : Prototype.emptyFunction,
			profileEnd: Prototype.emptyFunction,
			count     : Prototype.emptyFunction
		};
	} else {
		console = window.console;
	}

	// global
	var global = window.global;

	// chinachu global scope
	if (typeof window.chinachu !== 'undefined') {
		console.error('[conflict]', 'chinachu is already defined.');

		return false;
	}
	var chinachu = window.chinachu = {};

	console.info('[welcome]', 'initializing chinachu class.');

	// Objectをディープコピー
	var objectCloner = chinachu.objectCloner = function _objectCloner(object) {
		return Object.toJSON(object).evalJSON();
	};

	// Dateオブジェクトを見やすい文字列に変換する
	var dateToString = chinachu.dateToString = function _dateToString(date, type) {
		var d = date;

		var dStr = moment(date).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');

		var dDelta = ((new Date().getTime() - d.getTime()) / 1000);
		var dDeltaStr = '';

		if (dDelta < 0) {
			dDelta -= dDelta * 2;

			if (dDelta < 60) {
				dDeltaStr = 'after {0} seconds'.__([Math.round(dDelta) || '0']);
			} else {
				dDelta = dDelta / 60;

				if (dDelta < 60) {
					dDeltaStr = 'after {0} minutes'.__([Math.round(dDelta * 10) / 10 || '0']);
				} else {
					dDelta = dDelta / 60;

					if (dDelta < 24) {
						dDeltaStr = 'after {0} hours'.__([Math.round(dDelta * 10) / 10 || '0']);
					} else {
						dDelta = dDelta / 24;

						dDeltaStr = 'after {0} days'.__([Math.round(dDelta * 10) / 10 || '0']);
					}
				}
			}
		} else {
			if (dDelta < 60) {
				dDeltaStr = '{0} seconds ago'.__([Math.round(dDelta) || '0']);
			} else {
				dDelta = dDelta / 60;

				if (dDelta < 60) {
					dDeltaStr = '{0} minutes ago'.__([Math.round(dDelta * 10) / 10 || '0']);
				} else {
					dDelta = dDelta / 60;

					if (dDelta < 24) {
						dDeltaStr = '{0} hours ago'.__([Math.round(dDelta * 10) / 10 || '0']);
					} else {
						dDelta = dDelta / 24;

						dDeltaStr = '{0} days ago'.__([Math.round(dDelta * 10) / 10 || '0']);
					}
				}
			}
		}

		if (typeof type === 'undefined' || type === 'full') {
			return dStr + ' (' + dDeltaStr + ')';
		} else if (type === 'short') {
			return dStr;
		} else if (type === 'delta') {
			return dDeltaStr;
		}
	};

	// inputType
	var formInputTypeChannels = {
		create: function () {
			return flagrate.createTokenizer({
				placeholder: '...',
				tokenize: function (input) {
					var candidates = global.chinachu.schedule.pluck('id').concat(global.chinachu.schedule.pluck('channel'));

					var i, l;
					for (i = 0, l = candidates.length; i < l; i++) {
						if (input.match(/^[a-z0-9_]+$/i) === null) {
							candidates[i] = null;
						} else if (candidates[i].match(new RegExp('^' + input)) === null) {
							candidates[i] = null;
						}
					}

					candidates = candidates.compact();

					return candidates;
				}
			});
		},
		getVal: function () {
			return this.element.getValues();
		},
		setVal: function (val) {
			this.element.setValues(val);
		},
		enable: function () {
			this.element.enable();
		},
		disable: function () {
			this.element.disable();
		}
	};
	var formInputTypeStrings = {
		create: function () {
			return flagrate.createTokenizer({
				placeholder: '...'
			});
		},
		getVal: function () {
			return this.element.getValues();
		},
		setVal: function (val) {
			this.element.setValues(val);
		},
		enable: function () {
			this.element.enable();
		},
		disable: function () {
			this.element.disable();
		}
	};

	var util = chinachu.util = {};

	/** section: util
	 * class util
	**/

	/**
	 *  util.scotify(program) -> String
	 *  - program (Program Object): Program Data.
	 *
	 *  プログラムデータをSCOT形式の文字列にします
	**/
	util.scotify = function (program) {
		var scot = '';

		scot = program.channel.name + ': ' + program.title +
			' (' + dateToString(new Date(program.start), 'short') + ') ' +
			'[chinachu://' + program.id + ']';

		return scot;
	};

	/**
	 *  util.getProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDでプログラムデータを取得します
	**/
	util.getProgramById = function (id) {
		var i, l, j, m;

		for (i = 0, l = global.chinachu.recorded.length; i < l; i++) {
			if (global.chinachu.recorded[i].id === id) {
				global.chinachu.recorded[i]._isRecorded = true;
				return global.chinachu.recorded[i];
			}
		}

		for (i = 0, l = global.chinachu.recording.length; i < l; i++) {
			if ((global.chinachu.recording[i].id === id) && (global.chinachu.recording[i].pid)) {
				global.chinachu.recording[i]._isRecording = true;
				return global.chinachu.recording[i];
			}
		}

		for (i = 0, l = global.chinachu.reserves.length; i < l; i++) {
			if (global.chinachu.reserves[i].id === id) {
				global.chinachu.reserves[i]._isReserves = true;
				return global.chinachu.reserves[i];
			}
		}

		for (i = 0; i < global.chinachu.schedule.length; i++) {
			for (j = 0, m = global.chinachu.schedule[i].programs.length; j < m; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					return global.chinachu.schedule[i].programs[j];
				}
			}
		}

		return null;
	};

	/**
	 *  util.getNextProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDの次のプログラムを取得します
	**/
	util.getNextProgramById = function (id) {
		var i, l, j, m;

		for (i = 0, l = global.chinachu.schedule.length; i < l; i++) {
			for (j = 0, m = global.chinachu.schedule[i].programs.length; j < m; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					if (typeof global.chinachu.schedule[i].programs[j + 1] !== 'undefined') {
						return util.getProgramById(global.chinachu.schedule[i].programs[j + 1].id);
					}
				}
			}
		}

		return null;
	};

	/**
	 *  util.getPrevProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDの前のプログラムを取得します
	**/
	util.getPrevProgramById = function (id) {
		var i, l, j, m;

		for (i = 0, l = global.chinachu.schedule.length; i < l; i++) {
			for (j = 0, m = global.chinachu.schedule[i].programs.length; j < m; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					if (j - 1 < 0) { return null; }

					if (typeof global.chinachu.schedule[i].programs[j - 1] !== 'undefined') {
						return util.getProgramById(global.chinachu.schedule[i].programs[j - 1].id);
					}
				}
			}
		}

		return null;
	};

	var api = chinachu.api = {};

	/** section: api
	 * class chinachu.api.Client
	**/
	api.Client = Class.create({

		/**
		 *  new chinachu.api.Client(parameter) -> chinachu.api.Client
		 *  - parameter (Object)
		 *
		 *  ##### Parameter
		 *
		 *  * `apiRoot`          (String; default `"./"`):
		 *  * `retryCount`       (Number; default `0`):
		 *  * `onRequest`        (Function):
		 *  * `onRequested`      (Function):
		**/
		initialize: function _initApiClient(p) {
			this.apiRoot = p.apiRoot || './';

			this.onCreateRequest   = p.onCreateRequest   || Prototype.emptyFunction;
			this.onCompleteRequest = p.onCompleteRequest || Prototype.emptyFunction;

			this.requestCount = 0;
			this.requestTable = [];

			this.optionalRequestHeaders = [];
			this.optionalRequestParameter = {};

			return this;
		},

		request: function _requestApiClient(url, p, retryCount) {
			// 完全なURLかどうかを判定
			if (url.match(/^http/) === null) {
				url = this.apiRoot + url;
			}

			var param  = p.param  || {};
			var method = p.method || 'get';

			var requestHeaders = [
				'X-Chinachu-Client-Version', '3'
			].concat(this.optionalRequestHeaders);

			param = Object.extend(param, {
				Count: param.Count || 0
			});

			param = Object.extend(param, this.optionalRequestParameter);

			// インクリメント
			++this.requestCount;

			retryCount  = retryCount || this.retryCount;

			var requestState = this.requestTable[this.requestCount] = {
				id         : this.requestCount,
				requestedAt: new Date().getTime(),
				createdAt  : null,
				completedAt: null,
				latency    : null,
				execution  : null,
				transport  : null,
				param      : param,
				method     : method.toUpperCase(),
				headers    : requestHeaders,
				url        : url,
				p          : p,
				status     : 'init'
			};

			var dummy = new Ajax.Request(url, {
				method        : method,
				requestHeaders: requestHeaders,
				parameters    : Object.toJSON(param).replace(/%/g, '\\u0025'),

				// リクエスト作成時
				onCreate: function _onCreateRequest(t) {
					requestState.status    = 'create';
					requestState.transport = t;

					console.log('api.Client', 'req#' + requestState.id, '(create)', '->', requestState.method, url.replace(this.apiRoot, ''), t);

					requestState.createdAt = new Date().getTime();

					if (p.onCreate) { p.onCreate(t); }

					this.onCreateRequest(t);

					document.fire('chinachu:api:client:request:create', requestState);
				}.bind(this),

				// リクエスト完了時
				onComplete: function _onCompleteRequest(t) {
					requestState.status      = 'complete';
					requestState.transport   = t;
					requestState.completedAt = new Date().getTime();
					requestState.execution   = Math.round((t.getHeader('X-Sakura-Proxy-Microtime') || 0) / 1000);
					requestState.latency     = requestState.completedAt - requestState.createdAt;

					var time = [requestState.execution, requestState.latency].join('|') + 'ms';

					console.log('api.Client', 'req#' + requestState.id, time, '<-', requestState.method, url.replace(this.apiRoot, ''), t.status, t.statusText, t);

					var res = t.responseJSON || {};

					// 結果を評価
					var isSuccess = ((t.status >= 200) && (t.status < 300));
					if (isSuccess) {

						// 成功コールバック
						if (p.onSuccess) { p.onSuccess(t, res); }
					}

					var isFailure = !isSuccess;
					if (isFailure) {

						// 失敗コールバック
						if (p.onFailure) { p.onFailure(t, res); }
					}

					// 最後に完了時の処理を
					if (p.onComplete) { p.onComplete(t, res); }

					this.onCompleteRequest(t, res);

					document.fire('chinachu:api:client:request:complete', requestState);
				}.bind(this)
			});

			return this;
		}
	});

	var ui = chinachu.ui = {};

	ui.ContentLoading = Class.create({
		initialize: function (opt) {
			if (!opt) { opt = {}; }

			this.progress   = 0;
			this.target     = document.body;
			this.onComplete = opt.onComplete || function _empty() {};

			this.create();

			return this;
		},
		create: function _draw() {
			this.entity = {
				container: new Element('div', {className: 'content-loading'}),
				frame    : new Element('div'),
				bar      : new Element('div')
			};

			this.entity.container.insert(this.entity.frame);
			this.entity.frame.insert(this.entity.bar);

			this.redraw();

			return this;
		},
		update: function _update(num) {
			if (num >= 100) {
				setTimeout(this.onComplete, 0);

				num = 100;
			}

			this.progress = num;

			this.redraw();

			return this;
		},
		redraw: function _redraw() {
			this.entity.bar.setStyle({width: this.progress.toString(10) + '%'});

			return this;
		},
		render: function _render(target) {
			$(target.entity || target || this.target).insert({top: this.entity.container});

			return this;
		},
		remove: function _remove() {
			this.entity.bar.remove();
			this.entity.frame.remove();
			this.entity.container.remove();

			this.entity.bar       = null;
			this.entity.frame     = null;
			this.entity.container = null;

			delete this.entity;
			delete this.target;
			delete this.progress;

			return true;
		}
	});

	ui.DynamicTime = Class.create(sakura.ui.Element, {

		init: function (opt) {

			this.tagName = opt.tagName || 'span';

			this.time  = opt.time;
			this.timer = 0;
			this.type  = opt.type || 'delta';

			return this;
		},

		create: function () {

			var wait = 1;

			this.entity = this.entity || new Element(this.tagName, this.attr);

			if (this.id !== null) { this.entity.id = this.id; }

			if (this.style !== null) { this.entity.setStyle(this.style); }

			this.entity.className = 'dynamic-time';

			if (this.className !== null) { this.entity.addClassName(this.className); }

			this.entity.update(chinachu.dateToString(new Date(this.time), this.type));

			var delta = ((new Date().getTime() - this.time) / 1000);

			if (delta < 0) { delta -= delta * 2; }

			if (delta < 9600) { wait = 60 * 60; }
			if (delta < 4800) { wait = 60 * 30; }
			if (delta < 2400) { wait = 60 * 10; }
			if (delta < 1200) {
				wait = 60 * 5;
				this.entity.addClassName('soon');
			}
			if (delta < 360) { wait = 60; }
			if (delta < 120) {
				wait = 30;
				this.entity.addClassName('now');
			}
			if (delta < 60) { wait = 10; }
			if (delta < 30) { wait = 5; }
			if (delta < 10) { wait = 1; }

			this.timer = setTimeout(this.create.bind(this), wait * 1000);

			return this;
		},

		remove: function () {

			clearTimeout(this.timer);

			try {
				this.entity.remove();
				this.entity.fire('sakura:remove');
			} catch (e) {
				//console.debug(e);
			}

			return this;
		}
	});

	ui.ExecuteScheduler = Class.create({
		initialize: function () {
			this.create();

			return this;
		},
		create: function () {
			this.modal = new flagrate.Modal({
				title: 'SCHEDULER EXECUTION'.__(),
				text : 'SCHEDULER EXECUTION INFO'.__(),
				buttons: [
					{
						label   : 'RUN'.__(),
						color   : '@orange',
						onSelect: function (e, modal) {
							this.button.disable();

							var dummy = new Ajax.Request('./api/scheduler.json', {
								method    : 'put',
								onComplete: function () {
									modal.close();
								},
								onSuccess: function (response) {
									var json = response.responseJSON;
									var conflictMsg = '';
									var title = 'SUCCESS'.__();
									if (Array.isArray(json.conflicts) && json.conflicts.length > 0) {
										conflictMsg = '{0} CONFLICTS'.__(json.conflicts.length.toString());
										title = 'CONFLICT DETECTION'.__();
									}
									new flagrate.Modal({
										title: 'SUCCESS'.__(),
										text : 'SCHEDULER SUCCESS'.__() + conflictMsg
									}).show();
								},
								onFailure: function (t) {
									new flagrate.Modal({
										title: 'FAILURE'.__(),
										text : 'SCHEDULER FAILED {0}'.__(t.status)
									}).show();
								}
							});
						}
					},
					{
						label   : 'SUSPEND'.__(),
						onSelect: function (e, modal) {
							modal.close();
						}
					}
				]
			});

			this.modal.show();

			return this;
		}
	});

	ui.Reserve = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				var buttons = [];

				buttons.push({
					label   : 'RESERVE'.__(),
					color   : '@red',
					onSelect: function (e, modal) {
						e.targetButton.disable();

						var dummy = new Ajax.Request('./api/program/' + this.program.id + '.json', {
							method    : 'put',
							onComplete: function () {
								modal.close();
							},
							onSuccess: function () {
								new flagrate.Modal({
									title: 'SUCCESS'.__(),
									text : 'RESERVATION SET'.__()
								}).show();
							},
							onFailure: function (t) {
								new flagrate.Modal({
									title: 'FAILURE'.__(),
									text : 'RESERVATION FAILED {0}'.__(t.status)
								}).show();
							}
						});
					}.bind(this)
				});

				if (this.program.channel.type === 'GR') {
					buttons.push({
						label   : '1SEG RESERVATION'.__(),
						color   : '@red',
						onSelect: function (e, modal) {
							e.targetButton.disable();

							var dummy = new Ajax.Request('./api/program/' + this.program.id + '.json', {
								method    : 'put',
								parameters: {
									mode: '1seg'
								},
								onComplete: function () {
									modal.close();
								},
								onSuccess: function () {
									new flagrate.Modal({
										title: 'SUCCESS'.__(),
										text : 'RESERVATION SET'.__()
									}).show();
								},
								onFailure: function (t) {
									new flagrate.Modal({
										title: 'FAILURE'.__(),
										text : 'RESERVATION FAILED {0}'.__(t.status)
									}).show();
								}
							});
						}.bind(this)
					});
				}

				buttons.push({
					label   : 'CANCEL'.__(),
					onSelect: function (e, modal) {
						modal.close();
					}
				});

				this.modal = new flagrate.Modal({
					title   : 'MANUAL RESERVATION'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'RESERVATION CONFIRMATION'.__(),
					buttons : buttons
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.Unreserve = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : 'CANCEL MANUAL RESERVATION'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'CANCEL RESERVATION CONFIRMATION'.__(),
					buttons: [
						{
							label   : 'CANCEL RESERVATION'.__(),
							color   : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/reserves/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'RESERVATION CANCELLED'.__()
										}).show();
									},
									onFailure: function (t) {
										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'RESERVATION CANCEL FAILED {0}'.__(t.status)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.Skip = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : 'SKIP'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'AUTOMATIC RESERVATION SKIP CONFIRMATION'.__(),
					buttons: [
						{
							label   : 'SKIP'.__(),
							color   : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/reserves/' + this.program.id + '/skip.json', {
									method    : 'put',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'SKIP ENABLED'.__()
										}).show();
									},
									onFailure: function (t) {
										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'SKIP FAILED {0}'.__(t.status)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.Unskip = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : 'CANCEL SKIP'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'CANCEL SKIP CONFIRMATION'.__(),
					buttons: [
						{
							label   : 'CANCEL SKIP'.__(),
							color   : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/reserves/' + this.program.id + '/unskip.json', {
									method    : 'put',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'SKIP CANCELLED'.__()
										}).show();
									},
									onFailure: function (t) {
										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'SKIP CANCEL FAILED {0}'.__(t.status)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.StopRecord = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : 'STOP RECORDING'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'ARE YOU SURE'.__(),
					buttons: [
						{
							label   : 'STOP RECORDING'.__(),
							color   : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/recording/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'RECORDING ABORTED'.__()
										}).show();
									},
									onFailure: function (t) {
										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'FAILED TO ABORT RECORDING {0}'.__(t.status)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.RemoveRecordedProgram = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : 'DELETE RECORDING HISTORY'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'DELETE RECORDING HISTORY INFO'.__(),

					buttons: [
						{
							label  : 'DELETE'.__(),
							color  : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/recorded/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'RECORD DELETED'.__()
										}).show();
									},
									onFailure: function (t) {
										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'RECORD DELETION FAILED {0}'.__(t.status)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label  : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.DownloadRecordedFile = Class.create({
		initialize: function _init(id) {
			window.open('./api/recorded/' + id + '/file.m2ts');
			return this;
		}
	});

	ui.RemoveRecordedFile = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				});
			} else {
				this.modal = new flagrate.Modal({
					title: 'DELETE RECORDED FILE'.__(),
					subtitle: this.program.title + ' #' + this.program.id,
					text : 'DELETE RECORDED FILE INFO'.__(),
					buttons: [
						{
							label  : 'DELETE'.__(),
							color  : '@red',
							onSelect: function (e, modal) {
								e.targetButton.disable();

								var dummy = new Ajax.Request('./api/recorded/' + this.program.id + '/file.json', {
									method    : 'delete',
									onComplete: function () {
										modal.close();
									},
									onSuccess: function () {
										new flagrate.Modal({
											title: 'SUCCESS'.__(),
											text : 'RECORDED FILE DELETED'.__()
										}).show();
									},
									onFailure: function (t) {

										var err = t.status;

										if (err === 410) {
											err += ':既に削除されています';
										}

										new flagrate.Modal({
											title: 'FAILURE'.__(),
											text : 'FAILED TO DELETE RECORDED FILE {0}'.__(err)
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label  : 'CANCEL'.__(),
							onSelect: function (e, modal) {
								modal.close();
							}
						}
					]
				});
			}

			this.modal.show();

			return this;
		}
	});

	ui.Cleanup = Class.create({
		initialize: function _init() {
			this.create();

			return this;
		},
		create: function _create() {
			this.modal = new flagrate.Modal({
				title: 'CLEANUP'.__(),
				text : 'CLEANUP INFO'.__(),
				buttons: [
					{
						label  : 'CLEANUP'.__(),
						color  : '@red',
						onSelect: function (e, modal) {
							e.targetButton.disable();

							var dummy = new Ajax.Request('./api/recorded.json', {
								method    : 'put',
								onComplete: function () {
									modal.close();
								},
								onSuccess: function () {
									new flagrate.Modal({
										title: 'SUCCESS'.__(),
										text : 'CLEANED UP'.__()
									}).show();
								},
								onFailure: function (t) {
									new flagrate.Modal({
										title: 'FAILURE'.__(),
										text : 'CLEANUP FAILED {0}'.__(t.status)
									}).show();
								}
							});
						}.bind(this)
					},
					{
						label  : 'CANCEL'.__(),
						onSelect: function (e, modal) {
							modal.close();
						}
					}
				]
			});

			this.modal.show();

			return this;
		}
	});

	ui.Streamer = Class.create({
		initialize: function _init(id) {

			window.location.hash = '!/program/watch/id=' + id + '/';

			return this;
		}
	});

	ui.EditRule = Class.create({
		initialize: function _init(ruleNum) {
			this.num = ruleNum;

			this.create();

			return this;
		},
		create: function _create() {
			if (this.num === null) {
				var modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'INVALID RULE'.__()
				}).show();
			} else {
				// フォームに表示させるルールを読み込む
				var num = this.num;
				new Ajax.Request('./api/rules/' + num + '.json', {
					method   : 'get',
					onSuccess: function (t) {

						var rule = t.responseJSON;

						var form = flagrate.createForm({
							fields: [
								{
									key  : 'types',
									label: 'TYPE'.__(),
									input: {
										type : 'checkboxes',
										val  : rule.types,
										items: ['GR', 'BS', 'CS', 'EX']
									}
								},
								{
									key  : 'categories',
									label: 'CATEGORY'.__(),
									input: {
										type : 'checkboxes',
										val  : rule.categories,
										items: [
											'anime', 'information', 'news', 'sports',
											'variety', 'drama', 'music', 'cinema', 'etc'
										]
									}
								},
								{
									key  : 'channels',
									label: 'TARGET CHANNELS'.__(),
									input: {
										type : formInputTypeChannels,
										style: { width: '100%' },
										val  : rule.channels
									}
								},
								{
									key  : 'ignore_channels',
									label: 'IGNORE CHANNELS'.__(),
									input: {
										type : formInputTypeChannels,
										style: { width: '100%' },
										val  : rule.ignore_channels
									}
								},
								{
									key  : 'reserve_flags',
									label: 'RESERVE FLAGS'.__(),
									input: {
										type : 'checkboxes',
										val  : rule.reserve_flags,
										items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
									}
								},
								{
									key  : 'ignore_flags',
									label: 'IGNORE FLAGS'.__(),
									input: {
										type : 'checkboxes',
										val  : rule.ignore_flags,
										items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
									}
								},
								{
									key  : 'start',
									point: '/hour/start',
									label: 'START TIME'.__(),
									input: {
										type     : 'number',
										style    : { width: '60px' },
										maxLength: 2,
										max      : 24,
										min      : 0,
										val      : !!rule.hour ? rule.hour.start : 0
									}
								},
								{
									key   : 'end',
									point : '/hour/end',
									label : 'END TIME'.__(),
									input : {
										type     : 'number',
										style    : { width: '60px' },
										maxLength: 2,
										max      : 24,
										min      : 0,
										val      : !!rule.hour ? rule.hour.end : 24
									}
								},
								{
									key  : 'mini',
									point: '/duration/min',
									label: 'SHORTEST DURATION'.__(),
									input: {
										type : 'number',
										style: { width: '80px' },
										val  : !!rule.duration ? rule.duration.min : void 0
									}
								},
								{
									key   : 'maxi',
									point: '/duration/max',
									label : 'MAXIMUM DURATION'.__(),
									input : {
										type : 'number',
										style: { width: '80px' },
										val  : !!rule.duration ? rule.duration.max : void 0
									}
								},
								{
									key   : 'reserve_titles',
									label : 'TARGET TITLE'.__(),
									input : {
										type : formInputTypeStrings,
										style: { width: '100%' },
										val  : rule.reserve_titles
									}
								},
								{
									key   : 'ignore_titles',
									label : 'IGNORE TITLE'.__(),
									input : {
										type : formInputTypeStrings,
										style: { width: '100%' },
										val  : rule.ignore_titles
									}
								},
								{
									key   : 'reserve_descriptions',
									label : 'TARGET DESCRIPTION'.__(),
									input : {
										type : formInputTypeStrings,
										style: { width: '100%' },
										val  : rule.reserve_descriptions
									}
								},
								{
									key   : 'ignore_descriptions',
									label : 'IGNORE DESCRIPTION'.__(),
									input : {
										type : formInputTypeStrings,
										style: { width: '100%' },
										val  : rule.ignore_descriptions
									}
								},
								{
									key	: 'recorded_format',
									label	: 'FILE NAME FORMAT'.__(),
									input	: {
										type	: 'text',
										style	: { width: '100%' },
										val	: rule.recorded_format
									}
								},
								{
									key   : 'isEnabled',
									label : 'RULE STATE'.__(),
									input : {
										type : 'checkbox',
										label: 'ENABLED'.__(),
										val  : !rule.isDisabled
									}
								}
							]
						});

						var modal = new flagrate.Modal({
							title: 'EDIT RULE'.__(),
							element: form.element,
							buttons: [
								{
									label  : 'MODIFY'.__(),
									color  : '@pink',
									onSelect: function (e, modal) {
										e.targetButton.disable();

										var query = form.getResult();

										if (!query.duration.min) {
											delete query.duration.min;
										}
										if (!query.duration.max) {
											delete query.duration.max;
										}
										if (!query.duration.min && !query.duration.max) {
											delete query.duration;
										}

										var i;
										for (i in query) {
											if (typeof query[i] === 'object' && query[i].length === 0) {
												delete query[i];
											}
										}

										console.log(query);

										var xhr = new XMLHttpRequest();

										xhr.addEventListener('load', function () {
											if (xhr.status === 200) {
												flagrate.createModal({
													title: 'SUCCESS'.__(),
													text : 'RULE EDITED'.__()
												}).show();
											} else {
												flagrate.createModal({
													title: 'FAILURE'.__(),
													text : 'RULE EDIT FAILED {0}'.__(xhr.status)
												}).show();
											}
											modal.close();
										});

										xhr.open('PUT', './api/rules/' + num + '.json');
										xhr.setRequestHeader('Content-Type', 'application/json');
										xhr.send(JSON.stringify(query));
									}
								},
								{
									label  : 'CANCEL'.__(),
									onSelect: function(e, modal) {
										modal.close();
									}
								}
							]
						}).show();
					}.bind(this),
					onFailure: function(t) {
					}
				});
			}

			return this;
		}
	});

	ui.NewRule = Class.create({
		initialize: function _init() {

			this.create();

			return this;
		},
		create: function _create() {
			if (false) { //のちにエラー処理を追加
				var modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'NO ACCESS'.__()
				}).show();
			} else {
				var form = flagrate.createForm({
					fields: [
						{
							key  : 'types',
							label: 'TYPE'.__(),
							input: {
								type : 'checkboxes',
								items: ['GR', 'BS', 'CS', 'EX']
							}
						},
						{
							key  : 'categories',
							label: 'CATEGORY'.__(),
							input: {
								type : 'checkboxes',
								items: [
									'anime', 'information', 'news', 'sports',
									'variety', 'drama', 'music', 'cinema', 'etc'
								]
							}
						},
						{
							key  : 'channels',
							label: 'TARGET CHANNELS'.__(),
							input: {
								type : formInputTypeChannels,
								style: { width: '100%' }
							}
						},
						{
							key  : 'ignore_channels',
							label: 'IGNORE CHANNELS'.__(),
							input: {
								type : formInputTypeChannels,
								style: { width: '100%' }
							}
						},
						{
							key  : 'reserve_flags',
							label: 'RESERVE FLAGS'.__(),
							input: {
								type : 'checkboxes',
								items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
							}
						},
						{
							key  : 'ignore_flags',
							label: 'IGNORE FLAGS'.__(),
							input: {
								type : 'checkboxes',
								items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
							}
						},
						{
							key  : 'start',
							point: '/hour/start',
							label: 'START TIME'.__(),
							input: {
								type     : 'number',
								style    : { width: '60px' },
								maxLength: 2,
								max      : 24,
								min      : 0,
								val      : 0
							}
						},
						{
							key   : 'end',
							point : '/hour/end',
							label : 'END TIME'.__(),
							input : {
								type     : 'number',
								style    : { width: '60px' },
								maxLength: 2,
								max      : 24,
								min      : 0,
								val      : 24
							}
						},
						{
							key  : 'mini',
							point: '/duration/min',
							label: 'SHORTEST DURATION'.__(),
							input: {
								type : 'number',
								style: { width: '80px' }
							}
						},
						{
							key   : 'maxi',
							point: '/duration/max',
							label : 'MAXIMUM DURATION'.__(),
							input : {
								type : 'number',
								style: { width: '80px' }
							}
						},
						{
							key   : 'reserve_titles',
							label : 'TARGET TITLE'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key   : 'ignore_titles',
							label : 'IGNORE TITLE'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key   : 'reserve_descriptions',
							label : 'TARGET DESCRIPTION'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key   : 'ignore_descriptions',
							label : 'IGNORE DESCRIPTION'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key	: 'recorded_format',
							label	: 'FILE NAME FORMAT'.__(),
							input	: {
								type	: 'text',
								style	: { width: '100%' },
							}
						},
						{
							key   : 'isEnabled',
							label : 'RULE STATE'.__(),
							input : {
								type : 'checkbox',
								label: 'ENABLED'.__(),
								val  : true
							}
						}
					]
				});

				var modal = flagrate.createModal({
					title: 'CREATE NEW'.__(),
					element: form.element,
					buttons: [
						{
							label  : 'CREATE'.__(),
							color  : '@pink',
							onSelect: function(e, modal) {
								e.targetButton.disable();

								var query = form.getResult();

								if (!query.duration.min) {
									delete query.duration.min;
								}
								if (!query.duration.max) {
									delete query.duration.max;
								}
								if (!query.duration.min && !query.duration.max) {
									delete query.duration;
								}

								var i;
								for (i in query) {
									if (typeof query[i] === 'object' && query[i].length === 0) {
										delete query[i];
									}
								}

								console.log(query);

								var xhr = new XMLHttpRequest();

								xhr.addEventListener('load', function () {
									if (xhr.status === 201) {
										flagrate.createModal({
											title: 'SUCCESS'.__(),
											text : 'RULE CREATED'.__(),
										}).show();
									} else {
										flagrate.createModal({
											title: 'FAILURE'.__(),
											text : 'RULE CREATION FAILED {0}'.__(xhr.status)
										}).show();
									}
									modal.close();
								});

								xhr.open('POST', './api/rules.json');
								xhr.setRequestHeader('Content-Type', 'application/json');
								xhr.send(JSON.stringify(query));
							}
						},
						{
							label  : 'CANCEL'.__(),
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				}).show();
			}

			return this;
		}
	});

	ui.CreateRuleByProgram = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);

			this.create();

			return this;
		},
		create: function _create() {
			if (this.program === null) { //のちにエラー処理を追加
				var modal = new flagrate.Modal({
					title: 'ERROR'.__(),
					text : 'PROGRAM NOT FOUND'.__()
				}).show();
			} else {
				var program = this.program;

				var form = flagrate.createForm({
					fields: [
						{
							key  : 'types',
							label: 'TYPE'.__(),
							input: {
								type : 'checkboxes',
								items: ['GR', 'BS', 'CS', 'EX'],
								val  : [program.channel.type]
							}
						},
						{
							key  : 'categories',
							label: 'CATEGORY'.__(),
							input: {
								type : 'checkboxes',
								items: [
									'anime', 'information', 'news', 'sports',
									'variety', 'drama', 'music', 'cinema', 'etc'
								],
								val  : [program.category]
							}
						},
						{
							key  : 'channels',
							label: 'TARGET CHANNELS'.__(),
							input: {
								type : formInputTypeChannels,
								style: { width: '100%' },
								val  : [program.channel.id]
							}
						},
						{
							key  : 'ignore_channels',
							label: 'IGNORE CHANNELS'.__(),
							input: {
								type : formInputTypeChannels,
								style: { width: '100%' }
							}
						},
						{
							key  : 'reserve_flags',
							label: 'RESERVE FLAGS'.__(),
							input: {
								type : 'checkboxes',
								items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
							}
						},
						{
							key  : 'ignore_flags',
							label: 'IGNORE FLAGS'.__(),
							input: {
								type : 'checkboxes',
								items: ['GAIJI NEW'.__(), 'GAIJI LAST'.__(), 'GAIJI RERUN'.__(), 'GAIJI SUBTITLES'.__(), 'GAIJI DATA BROADCAST'.__(), 'GAIJI COMMENT'.__(), 'GAIJI FREE BROADCAST'.__(), 'GAIJI DUAL LANGUAGE'.__(), 'GAIJI STEREO'.__()]
							}
						},
						{
							key  : 'start',
							point: '/hour/start',
							label: 'START TIME'.__(),
							input: {
								type     : 'number',
								style    : { width: '60px' },
								maxLength: 2,
								max      : 24,
								min      : 0,
								val      : 0
							}
						},
						{
							key   : 'end',
							point : '/hour/end',
							label : 'END TIME'.__(),
							input : {
								type     : 'number',
								style    : { width: '60px' },
								maxLength: 2,
								max      : 24,
								min      : 0,
								val      : 24
							}
						},
						{
							key  : 'mini',
							point: '/duration/min',
							label: 'SHORTEST DURATION'.__(),
							input: {
								type : 'number',
								style: { width: '80px' }
							}
						},
						{
							key   : 'maxi',
							point: '/duration/max',
							label : 'MAXIMUM DURATION'.__(),
							input : {
								type : 'number',
								style: { width: '80px' }
							}
						},
						{
							key   : 'reserve_titles',
							label : 'TARGET TITLE'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' },
								val  : [this.program.title]
							}
						},
						{
							key   : 'ignore_titles',
							label : 'IGNORE TITLE'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key   : 'reserve_descriptions',
							label : 'TARGET DESCRIPTION'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key   : 'ignore_descriptions',
							label : 'IGNORE DESCRIPTION'.__(),
							input : {
								type : formInputTypeStrings,
								style: { width: '100%' }
							}
						},
						{
							key	: 'recorded_format',
							label	: 'FILE NAME FORMAT'.__(),
							input	: {
								type	: 'text',
								style	: { width: '100%' },
							}
						},
						{
							key   : 'isEnabled',
							label : 'RULE STATE'.__(),
							input : {
								type : 'checkbox',
								label: 'ENABLED'.__(),
								val  : true
							}
						}
					]
				});

				var modal = flagrate.createModal({
					title: 'CREATE NEW'.__(),
					element: form.element,
					buttons: [
						{
							label  : 'CREATE'.__(),
							color  : '@pink',
							onSelect: function(e, modal) {
								e.targetButton.disable();

								var query = form.getResult();

								if (!query.duration.min) {
									delete query.duration.min;
								}
								if (!query.duration.max) {
									delete query.duration.max;
								}
								if (!query.duration.min && !query.duration.max) {
									delete query.duration;
								}

								var i;
								for (i in query) {
									if (typeof query[i] === 'object' && query[i].length === 0) {
										delete query[i];
									}
								}

								console.log(query);

								var xhr = new XMLHttpRequest();

								xhr.addEventListener('load', function () {
									if (xhr.status === 201) {
										flagrate.createModal({
											title: 'SUCCESS'.__(),
											text : 'RULE CREATED'.__(),
										}).show();
									} else {
										flagrate.createModal({
											title: 'FAILURE'.__(),
											text : 'RULE CREATION FAILED {0}'.__(xhr.status)
										}).show();
									}
									modal.close();
								});

								xhr.open('POST', './api/rules.json');
								xhr.setRequestHeader('Content-Type', 'application/json');
								xhr.send(JSON.stringify(query));
							}
						},
						{
							label  : 'CANCEL'.__(),
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				}).show();
			}

			return this;
		}
	});

})();
