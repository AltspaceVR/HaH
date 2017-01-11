/* global TWEEN, THREE, altspace,
	Utils, Behaviors,
	Game, socket, root, tableRadius
*/
'use strict';

window.AudioContext = window.AudioContext || window.webkitAudioContext;

(function(exports, models, sounds)
{
	function preloadAssets(cb)
	{
		var textures = {};

		// kick off preloading
		loadTextures(function(){ loadModels(cb); });
		loadSounds(); // note: sound loading is non-blocking unlike models

		function loadTextures(cb)
		{
			var textureLoader = new THREE.TextureLoader();
			var textureInfo = [
				{name: 'box', url: '/static/models/box.png'},
				{name: 'confettiLeftAO', url: '/static/models/leftao.png'},
				{name: 'confettiRightAO', url: '/static/models/rightao.png'},
				{name: 'check', url: '/static/check.png'},
				{name: 'cross', url: '/static/cross.png'},
				{name: 'suggestionTexture', url: '/static/suggestion.png'},
			];
			var texturesToGo = textureInfo.length;

			textureInfo.forEach(function (texture) {
				textureLoader.load(texture.url, function(tex){
					textures[texture.name] = tex;
					if(--texturesToGo === 0) cb();
				});
			});
		}

		function loadModels(cb)
		{
			var colladaLoader = new THREE.ColladaLoader();
			var objmtlLoader = new altspace.utilities.shims.OBJMTLLoader();
			var modelsToGo = 8;

			// pre-load card model
			colladaLoader.load('/static/models/card.dae', function(result)
			{
				models.card = result.scene.children[0].children[0];
				models.card.scale.set(2,2,2);

				models.blankCard = generateCard({text:''});

				if(--modelsToGo === 0) cb();
			});

			// Set the scale for OBJ models based on the known width of the table model.
			var tableModelWidth = 297.444, tableModelHeight = 103;
			var tableHorizScale = 1 / tableModelWidth * tableRadius * 2;
			var tableVertScale = 0.8 / tableModelHeight;

			// preload nameplate model
			objmtlLoader.load(
				'/static/models/nameplate/HaH_NamePlate.obj',
				'/static/models/nameplate/HaH_NamePlate.mtl',
				function(obj)
				{
					obj.rotation.x = Math.PI / 2;
					obj.scale.multiplyScalar(tableHorizScale);
					var seatZPos = 1.5;
					obj.position.z = -seatZPos + 0.8;
					var seatOffset = tableRadius * -1.05;
					obj.position.y = -seatOffset - tableRadius * 0.94;
					models.nameplate = obj;

					if(--modelsToGo === 0) cb();
				}
			);

			colladaLoader.load('/static/models/box.dae', function(result)
			{
				models.box = new THREE.Group();

				var _box = result.scene.children[0].children[0].clone();
				_box.scale.set(2,2,2);
				_box.material = new THREE.MeshBasicMaterial({map: textures.box});
				new TWEEN.Tween(_box.position)
					.to({z: 0.01}, 1000)
					.repeat(Infinity)
					.yoyo(true)
					.easing(TWEEN.Easing.Sinusoidal.InOut).start(performance.now() + 500);
				models.box.add(_box);

				var startSign = new THREE.Mesh(
					new THREE.PlaneGeometry(1, 1),
					generateStatusTextMaterial('Open To Start')
				);
				startSign.rotation.x = -Math.PI / 2;
				startSign.scale.set(4, 1, 1);
				startSign.scale.multiplyScalar(0.1);
				startSign.position.z = -0.2;
				models.box.add(startSign);

				if(--modelsToGo === 0) cb();
			});

			colladaLoader.load('/static/models/dialog.dae', function(result)
			{
				models.dialog = result.scene.children[0];

				if(--modelsToGo === 0) cb();
			});

			colladaLoader.load('/static/models/confettiball.dae', function(results)
			{
				models.confettiBall = results.scene.children[0];
				models.confettiBall.getObjectByName('left').children[0].material = new THREE.MeshBasicMaterial({
					map: textures.confettiLeftAO, side: THREE.DoubleSide
				});
				models.confettiBall.getObjectByName('right').children[0].material = new THREE.MeshBasicMaterial({
					map: textures.confettiRightAO, side: THREE.DoubleSide
				});

				if(--modelsToGo === 0) cb();
			});

			objmtlLoader.load(
				'/static/models/table/HaH_TableMain.obj',
				'/static/models/table/HaH_TableMain.mtl',
				function (obj) {
					// The surface of the table should always be at 80cm above the ground;
					obj.rotation.x = Math.PI / 2;
					obj.scale.set(tableHorizScale, tableVertScale, tableHorizScale);
					models.table = obj;

					if(--modelsToGo === 0) cb();
				}
			);

			objmtlLoader.load(
				'/static/models/playerIndicator/HaH_PlayerSlice.obj',
				'/static/models/playerIndicator/HaH_PlayerSlice.mtl',
				function (obj) {
					var seatZPos = 1.5;
					var seatOffset = tableRadius * -1.05;
					obj.position.set(0, -seatOffset, -seatZPos);
					obj.rotation.set(Math.PI/2, Math.PI, 0);
					obj.scale.set(tableHorizScale, tableVertScale, tableHorizScale);
					models.playerIndicator = obj;

					// Add an invisible copy to the scene, so that textures ready when a game starts.
					var preload = obj.clone();
					preload.children[1].visible = false;
					root.add(preload);

					if(--modelsToGo === 0) cb();
				}
			);

			objmtlLoader.load(
				'/static/models/trophy/HaH_Trophy.obj',
				'/static/models/trophy/HaH_Trophy.mtl',
				function (obj) {
					models.pointModel = obj;

					if(--modelsToGo === 0) cb();
				}
			);

			// generate models for confirmation boxes
			models.yesBox = new THREE.Mesh(
				new THREE.BoxGeometry(0.01, 0.1, 0.1),
				new THREE.MeshBasicMaterial({
					map: textures.check
				})
			);

			models.noBox = new THREE.Mesh(
				new THREE.BoxGeometry(0.01, 0.1, 0.1),
				new THREE.MeshBasicMaterial({
					map: textures.cross
				})
			);

			models.boxHoverEffect = (function () {
				var boxHoverEffect = new THREE.Group();
					var ringMat = new THREE.MeshBasicMaterial({color: '#199597'})
				var ring1 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.4, 20), ringMat);
				ring1.position.z = 0.7;
				ring1.scale.multiplyScalar(0.1);
				new TWEEN.Tween(ring1.position).to({z: 0.8}, 2000)
					.repeat(Infinity).yoyo(true).easing(TWEEN.Easing.Sinusoidal.InOut).start();
				boxHoverEffect.add(ring1);

				var ring2 = new THREE.Mesh(new THREE.RingGeometry(1.5, 2, 20), ringMat);
				ring2.position.z = -0.12;
				new TWEEN.Tween(ring2.position)
					.to({z: 0.12}, 2000).repeat(Infinity).yoyo(true)
					.easing(TWEEN.Easing.Sinusoidal.InOut).start(performance.now() + 1500);
				ring1.add(ring2);

				var ring3 = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.7, 20), ringMat);
				ring3.position.z = -0.12;
				new TWEEN.Tween(ring3.position)
					.to({z: 0.12}, 2000).repeat(Infinity).yoyo(true)
					.easing(TWEEN.Easing.Sinusoidal.InOut).start(performance.now() + 2000);
				ring2.add(ring3);

				return boxHoverEffect;
			}());
		}

		function loadSound(url, cb)
		{
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = function()
			{
				if(xhr.status === 200 || xhr.status === 304){
					sounds.ctx.decodeAudioData(xhr.response,
						function(buffer){
							var gainNode = sounds.ctx.createGain();
							gainNode.connect(sounds.masterVol);
							cb(buffer, gainNode);
						},
						function(err){
							console.error('Failed to decode audio', url, err);
						}
					);
				}
			};
			xhr.send();
		}

		function loadSounds()
		{
			// set up sound subsystem
			sounds.ctx = new AudioContext();
			sounds.masterVol = sounds.ctx.createGain();
			sounds.masterVol.connect(sounds.ctx.destination);
			sounds.masterVol.gain.value = 0.25;

			// load confetti sound
			loadSound('/static/audio/fanfare with pop.ogg', function(source, volumeControl)
			{
				sounds.fanfare = source;
				sounds.fanfareVol = volumeControl;
			});

			// load ding sound
			loadSound('/static/audio/ding ding.ogg', function(source, volumeControl)
			{
				sounds.ding = source;
				sounds.dingVol = volumeControl;
			});

			// load card sound
			loadSound('/static/audio/card_flick.ogg', function(source, volumeControl)
			{
				sounds.card = source;
				sounds.cardVol = volumeControl;
			});

			loadSound('/static/audio/gameStart.ogg', function(source, volumeControl)
			{
				sounds.gameStart = source;
				sounds.gameStartVol = volumeControl;
			});

			loadSound('/static/audio/playerJoin.ogg', function(source, volumeControl)
			{
				sounds.playerJoin = source;
				sounds.playerJoinVol = volumeControl;
			});

			loadSound('/static/audio/playerKick.ogg', function(source, volumeControl)
			{
				sounds.playerKick = source;
				sounds.playerKickVol = volumeControl;
			});
		}
	}

	sounds.playSound = function(soundName)
	{
		var source = sounds.ctx.createBufferSource();
		source.buffer = sounds[soundName];
		source.connect( sounds[soundName+'Vol'] );

		if(soundName === 'fanfare')
			source.start(0, 1.4);
		else
			source.start(0);
	}

	// ugh, nasty hack
	var fontScale;
	if( /AltspaceVR-App build-[0-9a-f]{7} Mobile/.test(window.navigator.userAgent) ){
		fontScale = 0.85;
	}
	else {
		fontScale = 1.0;
	}

	function makeSafeFont(g, text, maxWidth)
	{
		// get pixel width of longest line
		var textWidth = Math.max.apply(null, text.map(function(s){return g.measureText(s).width;}));

		// if longest line is longer than specified max width
		if( textWidth > maxWidth )
		{
			// scale down font to bring width down to maxWidth
			var font = g.font;
			var fontSize = /[0-9.]+px/.exec(font)[0];
			var fontSizeValue = parseFloat(fontSize);
			fontSizeValue = (maxWidth/textWidth) * fontSizeValue;
			font = font.replace(fontSize, fontSizeValue+'px');

			g.font = font;
		}
	}

	function wrapText(text)
	{
		var words = text.split(' ');
		var size = 0;
		return words.reduce(function (acc, word) {
			if (size + word.length > Math.floor(17 * fontScale)) {
				acc.push('');
				size = 0;
			}
			acc[acc.length - 1] += ' ' + word;
			size += word.length;
			return acc;
		}, ['']);
	}

	function generateCard(card, color)
	{
		if(color === 'black'){
			var fgColor = '#eee';
			var bgColor = 'black';
		}
		else {
			fgColor = 'black';
			bgColor = '#eee';
		}

		// card face texture resolution
		var cardWidth = 256;
		var model = models.card.clone();
		var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

		// set up canvas
		var bmp = document.createElement('canvas');
		var g = bmp.getContext('2d');
		bmp.width = 2*cardWidth;
		bmp.height = 2*cardWidth;
		g.fillStyle = bgColor;
		g.fillRect(0, 0, 2*cardWidth, 2*cardWidth);
		g.fillStyle = fgColor

		// write text
		g.textAlign = 'left';
		g.font = 'bold '+(0.09*cardWidth*fontScale)+'px '+fontStack;
		var text = card.text;
		if (text.indexOf('\n') === -1) {
			text = wrapText(card.text);
		}
		else {
			text = text.split('\n');
		}

		makeSafeFont(g, text, 0.84*cardWidth);
		for(var i=0; i<text.length; i++){
			g.fillText(text[i], 0.08*cardWidth, (0.15+0.12*i)*cardWidth);
		}

		// draw "PICK X" indicator
		if(card.numResponses)
		{
			g.font = 'bold '+(0.07*cardWidth*fontScale)+'px '+fontStack;
			makeSafeFont(g, ['PICK 2'], 0.25*cardWidth);
			g.textAlign = 'right';
			g.fillText('PICK', 0.85*cardWidth, 1.33*cardWidth);

			g.beginPath();
				g.arc(0.91*cardWidth, 1.303*cardWidth, 0.04*cardWidth, 0, 2*Math.PI);
			g.closePath();
			g.fill();
			g.textAlign = 'center';
			g.fillStyle = bgColor;
			g.fillText(card.numResponses, 0.91*cardWidth, 1.33*cardWidth);

			g.fillStyle = fgColor;
			g.textAlign = 'left';
		}

		// draw "DRAW X" indicator
		if(card.numDraws)
		{
			g.font = 'bold '+(0.07*cardWidth*fontScale)+'px '+fontStack;
			makeSafeFont(g, ['DRAW 2'], 0.3*cardWidth);
			g.textAlign = 'right';
			g.fillText('DRAW', 0.85*cardWidth, 1.22*cardWidth);

			g.beginPath();
				g.arc(0.91*cardWidth, 1.192*cardWidth, 0.04*cardWidth, 0, 2*Math.PI);
			g.closePath();
			g.fill();
			g.textAlign = 'center';
			g.fillStyle = bgColor;
			g.fillText(card.numDraws, 0.91*cardWidth, 1.22*cardWidth);

			g.fillStyle = fgColor;
			g.textAlign = 'left';
		}


		// draw logo
		var edgeLength = 1/16*cardWidth;
		var x = 0.08*cardWidth, y = 1.33*cardWidth;
		g.lineWidth = 2;
		g.strokeStyle = fgColor;
		g.moveTo(x, y);
		g.lineTo(x+edgeLength/2, y-edgeLength*Math.sin(Math.PI/3));
		g.lineTo(x+edgeLength, y);
		g.moveTo(x+edgeLength/4, y);
		g.lineTo(x+3*edgeLength/4, y);
		g.stroke();

		// draw footer
		g.textAlign = 'left';
		g.font = (0.05*cardWidth*fontScale)+'px '+fontStack;
		if( card.creator ){
			g.fillText(card.creator, x+1.5*edgeLength, y);
		}
		else if( card.numResponses || card.numDraws ){
			g.fillText("HAH", x+1.5*edgeLength, y);
		}
		else {
			makeSafeFont(g, ['HaH: Unholy Edition'], .6525*cardWidth*fontScale);
			g.fillText("HaH: Unholy Edition", x+1.5*edgeLength, y);
		}

		// draw card back
		g.font = 'bold '+(0.15*cardWidth*fontScale)+'px '+fontStack;
		makeSafeFont(g, ['HaH:','Unholy','Edition'], 0.8*cardWidth);
		g.fillText('HaH:', 1.1*cardWidth, 0.22*cardWidth);
		g.fillText('Unholy', 1.1*cardWidth, 0.37*cardWidth);
		g.fillText('Edition', 1.1*cardWidth, 0.52*cardWidth);

		// assign texture
		model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(bmp)
		});

		model.userData = card;
		return model;
	}

	function generateTitleCard()
	{
		// card face texture resolution
		var cardWidth = 256;
		var model = models.card.clone();
		var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

		// set up canvas
		var bmp = document.createElement('canvas');
		var g = bmp.getContext('2d');
		bmp.width = 2*cardWidth;
		bmp.height = 2*cardWidth;
		g.fillStyle = 'black';
		g.fillRect(0, 0, 2*cardWidth, 2*cardWidth);

		// draw card
		g.font = 'bold '+(0.15*cardWidth*fontScale)+'px '+fontStack;
		makeSafeFont(g, ['HaH:','Unholy Edition','Humanity'], 0.8*cardWidth);
		g.fillStyle = 'white';

		g.fillText('HaH:', 0.1*cardWidth, 0.22*cardWidth);
		g.fillText('Unholy', 0.1*cardWidth, 0.37*cardWidth);
		g.fillText('Edition', 0.1*cardWidth, 0.52*cardWidth);

		g.fillText('HaH:', 1.1*cardWidth, 0.22*cardWidth);
		g.fillText('Unholy', 1.1*cardWidth, 0.37*cardWidth);
		g.fillText('Edition', 1.1*cardWidth, 0.52*cardWidth);

		g.font = 'bold '+(0.05*cardWidth*fontScale)+'px '+fontStack;
		var legal = [
			'© Cards Against Humanity LLC',
			'Licensed under CC BY-NC-SA',
			'cardsagainsthumanity.com',
			'Adapted by: Derogatory, falkrons, schmidtec',
			'Made terrible by: Jacob, Richie, John & others'];
		makeSafeFont(g, legal, 0.86*cardWidth);
		for(var i=0; i<legal.length; i++){
			g.fillText(legal[i], 0.07*cardWidth, (1.06 + 0.07*i)*cardWidth);
			g.fillText(legal[i], 1.07*cardWidth, (1.06 + 0.07*i)*cardWidth);
		}

		// assign texture
		model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(bmp)
		});

		return model;
	}

	function generateTextMaterial(text, options)
	{
		var texWidth = 256;
		var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

		// set up canvas
		var bmp = document.createElement('canvas');
		var ctx = bmp.getContext('2d');
		bmp.width = texWidth;
		bmp.height = options.height || texWidth;

		ctx.fillStyle = options.backgroundColor;
		ctx.fillRect(0, 0, texWidth, options.height || texWidth);

		// TODO: We can simplify this code if the nameplates had a sane UV mapping
		ctx.font = 'bold '+((options.fontScale || 0.1)*bmp.height*fontScale)+'px '+fontStack;
		makeSafeFont(ctx, [text], 0.9*texWidth*fontScale);
		ctx.textAlign = 'center';
		if (options.textBaseline) {
			ctx.textBaseline = options.textBaseline;
		}
		ctx.fillStyle = 'white';
		if (options.single) {
			ctx.lineWidth = 5;
			ctx.strokeText(text, texWidth/2, bmp.height / 2);
			ctx.fillText(text, texWidth/2, bmp.height / 2);
		}
		else {
			ctx.fillText(text, texWidth/2, 35);
			ctx.fillText(text, texWidth/2, 86);
		}

		return new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(bmp)
		});
	}

	function generateStatusTextMaterial(text) {
		var statusMat = generateTextMaterial(text, {
			backgroundColor: 'transparent', height: 50, single: true, fontScale: fontScale, textBaseline: 'middle'
		});
		statusMat.transparent = true;
		statusMat.side = THREE.DoubleSide;
		return statusMat;
	}

	function generateNameplate(name)
	{
		var model = models.nameplate.clone();
		model.name = 'nameplate';
		var backgroundColor;
		if(name === Game.playerInfo.displayName)
			backgroundColor = 'magenta';
		else
			backgroundColor = 'white';
		model.children[0].material = model.children[0].material.clone();
		model.children[0].material.color.setStyle(backgroundColor);

		var nameplateGeo = new THREE.PlaneGeometry(35, 8);
		var nameplateMaterial = generateStatusTextMaterial(name, {single: true})

		var nameSignFront = new THREE.Mesh(nameplateGeo, nameplateMaterial);
		nameSignFront.position.z = 3.5;
		var namePivotFront = new THREE.Object3D();
		namePivotFront.rotation.x = -30 * Math.PI / 180;
		namePivotFront.position.y = 3.5;
		namePivotFront.add(nameSignFront);
		model.add(namePivotFront);

		var nameSignBack = new THREE.Mesh(nameplateGeo, nameplateMaterial);
		nameSignBack.position.z = -3.5;
		nameSignBack.rotation.y = Math.PI;
		var namePivotBack = new THREE.Object3D();
		namePivotBack.rotation.x = 30 * Math.PI / 180;
		namePivotBack.position.y = 3.5;
		namePivotBack.add(nameSignBack);
		model.add(namePivotBack);

		return model;
	}

	function generateDialog(text, acceptCb, declineCb, finallyCb, options)
	{
		options = options || {};

		// card face texture resolution
		var texWidth = 512;
		var model = models.dialog.clone();
		var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

		// set up canvas
		var bmp = document.createElement('canvas');
		var g = bmp.getContext('2d');
		bmp.width = texWidth;
		bmp.height = texWidth;

		// draw background
		g.fillStyle = 'whitesmoke';
		g.fillRect(0, 0, texWidth, texWidth-160);
		g.fillStyle = '#f44336'; // red
		g.fillRect(0, texWidth-166, texWidth/2, 160);
		g.fillStyle = '#4CAF50'; // green
		g.fillRect(texWidth/2, texWidth-160, texWidth/2, 160);

		// set up text
		g.font = 'bold 35px '+fontStack;
		g.textAlign = 'center';
		g.fillStyle = 'black';

		// draw question
		var lines = text.split('\n');
		for(var i=1; i<=lines.length; i++)
			g.fillText(lines[i-1], texWidth/2, 50*i + 50);

		// draw answers
		g.font = 'bold 45px '+fontStack;
		g.fillText('No', 0.25*texWidth, texWidth-70);
		g.fillText(options.acceptLabel || 'Yes', 0.75*texWidth, texWidth-70);

		// assign texture
		var dMaterial = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(bmp)
		});
		model.traverse(function(mesh){
			mesh.material = dMaterial;
		});

		if (options.showDecline !== undefined && !options.showDecline) {
			model.getObjectByName('Decline').children[0].visible = false;
		}

		// assign callbacks
		model.getObjectByName('Accept').addEventListener('cursorup', function(){
			if(acceptCb) acceptCb();
			if(finallyCb) finallyCb();
			model.parent.remove(model);
		});
		model.getObjectByName('Decline').addEventListener('cursorup', function(){
			if(declineCb) declineCb();
			if(finallyCb) finallyCb();
			model.parent.remove(model);
		});


		// point dialog at player
		var seat = root.getObjectByName('seat_'+Game.playerInfo.id);
		model.applyMatrix( sphericalToMatrix(0, Math.PI/8, 1.05*tableRadius, 'yzx') );
		seat.add(model);

		sounds.playSound('ding');

		return model;
	}

	function sphericalToMatrix(theta, phi, radius, basis)
	{
		// basis is ["forward" axis, "up" axis, "side" axis]
		if(!basis || !/^[xyz]{3}$/.test(basis)) basis = 'zyx';

		// determine position
		var x = radius * Math.cos(phi) * Math.sin(theta);
		var y = radius * Math.cos(phi) * Math.cos(theta);
		var z = radius * Math.sin(phi);

		// determine rotation
		var basisMap = {};
		basisMap[basis[0]] = new THREE.Vector3(-x, -y, -z).normalize();
		var temp = new THREE.Vector3().crossVectors( basisMap[basis[0]], new THREE.Vector3(0,0,1) ).normalize();
		basisMap[basis[1]] = new THREE.Vector3().crossVectors( temp, basisMap[basis[0]] );
		basisMap[basis[2]] = basis[0] < basis[1] ? temp : temp.negate();

		// combine into matrix
		var mat = new THREE.Matrix4();
		mat.makeBasis( basisMap.x, basisMap.y, basisMap.z );
		mat.setPosition( new THREE.Vector3(x, y, z) );

		return mat;
	}

	function rebalanceTable(newTurnOrder, oldTurnOrder, newPlayerId)
	{
		newTurnOrder = newTurnOrder || [];
		oldTurnOrder = oldTurnOrder || [];

		var angle = 2*Math.PI/12;
		var players = newTurnOrder.map(function(e){return e.id;});

		// add new players, adjust old players
		for(var i=0; i<newTurnOrder.length; i++)
		{
			// attempt to get seat at index
			var seat = root.getObjectByName('seat_'+newTurnOrder[i].id);
			if(seat)
			{
				// add a kick handler if the seat was added before the current player joined
				if( Game.playerInfo.id === newPlayerId )
				{
					// register "Kick" action
					(function(nameplate, opponentInfo){
						nameplate.addEventListener('cursorup', function()
						{
							generateDialog('Do you want to kick\n'+opponentInfo.displayName+'?', function(){
								console.log('kicking');
								socket.emit('playerKickRequest', opponentInfo.id, opponentInfo.displayName);
							});
						});
					})(seat.getObjectByName('nameplate'), newTurnOrder[i]);
				}
			}
			else
			{
				// TODO Move most of this to seat.js
				// create new seat for player
				var seatNum = newTurnOrder[i].seatNum;
				seat = new Utils.Seat(newTurnOrder[i].id, models);
				seat.position.set(-1.05*tableRadius*Math.sin(seatNum*angle), -1.05*tableRadius*Math.cos(seatNum*angle), 1.5);
				seat.rotation.set(0, 0, -angle*seatNum);

				// add nameplate for the player
				var nameplate = generateNameplate(newTurnOrder[i].displayName);
				// nameplate.position.set(0, 0.25, -0.64);
				// nameplate.rotation.set(0, 0, Math.PI/2);
				nameplate.addBehavior( new Behaviors.CursorFeedback() );
				seat.add(nameplate);

				// add presentation space
				var center = new THREE.Object3D();
				center.name = 'presentation';
				center.position.set(0, 1.05*tableRadius, 1);
				center.rotation.set(0, 0, Math.PI);
				center.scale.set(6,6,6);
				seat.add(center);

				// handle "leave" on self click
				if(newTurnOrder[i].id === Game.playerInfo.id)
				{
					// register "Leave" action
					nameplate.addEventListener('cursorup', function()
					{
						generateDialog('Are you sure you want to\nleave the game?', function()
						{
							socket.emit('playerLeave', Game.playerInfo.id, Game.playerInfo.displayName,
								Game.playerInfo.displayName+' has left the game.'
							);
						});
					});
				}

				// handle "kick" if still a player
				else if(players.indexOf(Game.playerInfo.id) > -1)
				{
					// register "Kick" action
					(function(nameplate, opponentInfo){
						nameplate.addEventListener('cursorup', function()
						{
							generateDialog('Do you want to kick\n'+opponentInfo.displayName+'?', function(){
								console.log('kicking');
								socket.emit('playerKickRequest', opponentInfo.id, opponentInfo.displayName);
							});
						});
					})(nameplate, newTurnOrder[i]);
				}

				var cardRadius = 0.7, row1Angle = Math.PI/5, row2Angle = Math.PI/3,
					row1Sep = Math.PI/10 * 1.3, row2Sep = 1.8*Math.PI/10;

				// set card positions
				for(var j=0; j<12; j++)
				{
					if(j<5){
						var theta = (j-2)*row1Sep;
						var phi = -row1Angle;
					}
					else if(j < 10){
						theta = (j-7)*row2Sep;
						phi = -row2Angle;
					}
					else if(j === 10){
						theta = -3*row1Sep;
						phi = -row1Angle;
					}
					else if(j === 11){
						theta = 3*row1Sep;
						phi = -row1Angle;
					}

					// place card
					var card = new THREE.Object3D();
					card.name = 'card'+j;
					card.applyMatrix( Utils.sphericalToMatrix(theta, phi, cardRadius, 'zyx') );
					card.position.z = card.position.z + 0.15;
					seat.add(card);

					// add hover feedback to your own cards
					if(newTurnOrder[i].id === Game.playerInfo.id)
						card.addBehavior( new Behaviors.CursorFeedback() );
				}

				// add seat to the table
				root.add(seat);
			}
		}

		// remove absent players
		for(var k=0; k<oldTurnOrder.length; k++)
		{
			// determine if old player is in new turn order
			for(var l=0, playerIn=false; l<newTurnOrder.length && !playerIn; l++){
				playerIn = playerIn || newTurnOrder[l].id === oldTurnOrder[k].id;
			}

			if(!playerIn){
				var oldSeat = root.getObjectByName('seat_'+oldTurnOrder[k].id);
				root.remove(oldSeat);
			}
		}
	}

	//add Idle "are you still there "timeout
	var idleTimeout = {};
	var kickTimeout = {};
	var idleCheck = function (){
		idleTimeout = setTimeout(function(){
			clearTimeout(idleTimeout);
			generateDialog('AFK WARNING\nAre you there?', idleClear , function(){
				socket.emit('playerLeave', Game.playerInfo.id, Game.playerInfo.displayName,
				Game.playerInfo.displayName+' has left the game.');
			});
			kickTimeout = setTimeout(function(){
				clearTimeout(kickTimeout);
				Game.emitPlayerLeave();
				console.log("you have been kicked from the game due to inactivity.");
			}, 60000);
		}, 300000);
	}
	var idleClear = function (){
		clearTimeout(kickTimeout);
		clearTimeout(idleTimeout);
	}


	exports.preloadAssets = preloadAssets;
	exports.generateCard = generateCard;
	exports.generateTitleCard = generateTitleCard;
	exports.generateStatusTextMaterial = generateStatusTextMaterial;
	exports.generateNameplate = generateNameplate;
	exports.generateDialog = generateDialog;
	exports.sphericalToMatrix = sphericalToMatrix;
	exports.rebalanceTable = rebalanceTable;
	exports.idleCheck = idleCheck;
	exports.idleClear = idleClear;
})(window.Utils = window.Utils || {}, window.Models = window.Models || {}, window.Sounds = window.Sounds || {});
