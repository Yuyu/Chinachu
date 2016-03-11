P = Class.create(P, {

	init: function() {

		this.view.content.className = 'loading';

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);

		if (!this.self.query.id) {
			this.modal = new flagrate.Modal({
				title: 'CHANNEL NOT FOUND'.__(),
				text : 'CHANNEL NOT FOUND'.__(),
				buttons: [
					{
						label: 'DASHBOARD'.__(),
						color: '@pink',
						onSelect: function(e, modal) {
							window.location.hash = '!/dashboard/top/';
						}
					}
				]
			}).show();
			return this;
		}

		this.channelId = this.self.query.id;

		this.initToolbar();
		this.draw();

		return this;
	}
	,
	deinit: function() {

		if (this.modal) setTimeout(function() { this.modal.close(); }.bind(this), 0);

		document.stopObserving('chinachu:recording', this.onNotify);
		document.stopObserving('chinachu:recorded', this.onNotify);

		return this;
	}
	,
	refresh: function() {

		if (!this.isPlaying) this.app.pm.realizeHash(true);

		return this;
	}
	,
	initToolbar: function _initToolbar() {
		return this;
	}
	,
	draw: function() {

		//var program = this.program;

		this.view.content.className = 'bg-black';
		this.view.content.update();

		var titleHtml = "STREAM".__();

		setTimeout(function() {
			this.view.title.update(titleHtml);
		}.bind(this), 0);

		var modal = this.modal = new flagrate.Modal({
			disableCloseByMask: true,
			disableCloseButton: true,
			target: this.view.content,
			title : 'START STREAMING'.__(),
			buttons: [
				{
					label  : 'PLAYBACK'.__(),
					color  : '@pink',
					onSelect: function(e, modal) {
						if (this.form.validate() === false) { return; }

						var d = this.d = this.form.result();

						if (d.ext === 'm2ts') {
							new flagrate.Modal({
								title: 'ERROR'.__(),
								text : 'MPEG2 PLAYBACK NOT SUPPORTED'.__()
							}).show();
							return;
						}

						modal.close();

						this.play();
					}.bind(this)
				},
				{
					label  : 'XSPF',
					color  : '@orange',
					onSelect: function(e, modal) {
						if (this.form.validate() === false) { return; }

						var d = this.form.result();

						d.prefix = window.location.protocol + '//' + window.location.host;
						d.prefix += window.location.pathname.replace(/\/[^\/]*$/, '') + '/api/channel/' + this.channelId + '/';
						window.open('./api/channel/' + this.channelId + '/watch.xspf?' + Object.toQueryString(d));
					}.bind(this)
				}
			]
		}).show();

		if (Prototype.Browser.MobileSafari) {
			modal.buttons[1].disable();
		}

		this.form = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key  : 'ext',
					label: 'CONTAINER'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : []
					}
				},
				{
					key  : 'c:v',
					label: 'VIDEO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'NO CONVERSION'.__(),
								value     : 'copy',
								isSelected: true
							},
							{
								label     : 'H.264',
								value     : 'libx264'
							},
							{
								label     : 'MPEG-2',
								value     : 'mpeg2video'
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'm2ts' }
					]
				},
				{
					key  : 'c:v',
					label: 'VIDEO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'VP8',
								value     : 'libvpx',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'webm' }
					]
				},
				{
					key  : 'c:v',
					label: 'VIDEO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'mp4' }
					]
				},
				{
					key  : 'c:v',
					label: 'VIDEO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'flv' }
					]
				},
				{
					key  : 'c:a',
					label: 'AUDIO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'NO CONVERSION'.__(),
								value     : 'copy',
								isSelected: true
							},
							{
								label     : 'AAC',
								value     : 'aac'
							},
							{
								label     : 'Vorbis',
								value     : 'libvorbis'
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'm2ts' }
					]
				},
				{
					key  : 'c:a',
					label: 'AUDIO CODEC'.__(),
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'Vorbis',
								value     : 'libvorbis',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'webm' }
					]
				},
				{
					key  : 's',
					label: 'SIZE'.__(),
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '320x180 (16:9)',
								value     : '320x180'
							},
							{
								label     : '640x360 (HVGAW/16:9)',
								value     : '640x360'
							},/*
							{
								label     : '640x480 (VGA/4:3)',
								value     : '640x480'
							},*/
							{
								label     : '960x540 (qHD/16:9)',
								value     : '960x540'
							},
							{
								label     : '1024x576 (WSVGA/16:9)',
								value     : '1024x576'
							},
							{
								label     : '1280x720 (HD/16:9)',
								value     : '1280x720',
								isSelected: true
							},
							{
								label     : '1920x1080 (FHD/16:9)',
								value     : '1920x1080'
							}
						]
					},
					depends: [
						{ key: 'c:v', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'b:v',
					label: 'VIDEO BITRATE'.__(),
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '256kbps',
								value     : '256k'
							},
							{
								label     : '512kbps',
								value     : '512k'
							},
							{
								label     : '1Mbps',
								value     : '1M',
								isSelected: true
							},
							{
								label     : '2Mbps',
								value     : '2M'
							},
							{
								label     : '3Mbps',
								value     : '3M'
							}
						]
					},
					depends: [
						{ key: 'c:v', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'b:a',
					label: 'AUDIO BITRATE'.__(),
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '32kbps',
								value     : '32k'
							},
							{
								label     : '64kbps',
								value     : '64k'
							},
							{
								label     : '96kbps',
								value     : '96k',
								isSelected: true
							},
							{
								label     : '128kbps',
								value     : '128k'
							},
							{
								label     : '192kbps',
								value     : '192k'
							}
						]
					},
					depends: [
						{ key: 'c:a', value: 'copy', operator: '!==' }
					]
				}
			]
		});

		if (!Prototype.Browser.MobileSafari) {
			this.form.fields[0].input.items.push({
				label     : 'M2TS',
				value     : 'm2ts'
			});

			this.form.fields[0].input.items.push({
				label     : 'MP4',
				value     : 'mp4'
			});

			this.form.fields[0].input.items.push({
				label     : 'WebM',
				value     : 'webm',
				isSelected: true
			});
		}

		this.form.render(modal.content);

		return this;
	},
	play: function() {
		this.isPlaying = true;
		var d = this.d;

		d.ss = d.ss || 0;

		// if (p._isRecording) d.ss = '';

		var getRequestURI = function() {

			var r = window.location.protocol + '//' + window.location.host + window.location.pathname.replace(/\/[^\/]*$/, '');
			r += '/api/channel/' + this.channelId + '/watch.' + d.ext;
			var q = Object.toQueryString(d);

			return r + '?' + q;
		}.bind(this);

		var togglePlay = function() {
			if (video.paused) {
				video.play();
				control.getElementByKey('play').setLabel('Pause');
			} else {
				video.pause();
				control.getElementByKey('play').setLabel('Play');
			}
		};

		// create video view

		var videoContainer = new flagrate.Element('div', {
			'class': 'video-container'
		}).insertTo(this.view.content);

		var video = new flagrate.Element('video', {
			src     : getRequestURI(),
			autoplay: true
		}).insertTo(videoContainer);

		video.addEventListener('click', togglePlay);

		//video.load();
		video.volume = 1;

		// create control view

		var control = new flagrate.Toolbar({
			className: 'video-control',
			items: [
				{
					key    : 'play',
					element: new flagrate.Button({ label: 'Pause', onSelect: togglePlay})
				},
				'--',
				{
					key    : 'vol',
					element: new flagrate.Slider({ value: 10, max: 10 })
				}
			]
		}).insertTo(this.view.content);

		control.getElementByKey('vol').addEventListener('slide', function() {

			var vol = control.getElementByKey('vol');

			video.volume = vol.getValue() / 10;
		});

		return this;
	}
});
